import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for Stripe Wrapper access
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    // ============================================================================
    // CREATE PAYMENT INTENT
    // ============================================================================
    if (req.method === 'POST' && action === 'create-intent') {
      const body = await req.json()
      
      // Get fundraiser details
      const { data: fundraiser } = await supabaseClient
        .from('fundraisers')
        .select('*, teams(*)')
        .eq('id', body.fundraiserId)
        .single()

      if (!fundraiser) throw new Error('Fundraiser not found')

      // Check if customer exists in Stripe by email
      const { data: existingCustomer } = await supabaseClient
        .from('stripe_customers')
        .select('id, email')
        .eq('email', body.donorEmail)
        .limit(1)
        .single()

      let customerId = existingCustomer?.id

      // Create Stripe customer if doesn't exist
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: body.donorEmail,
          name: body.donorName,
          metadata: {
            source: 'youth_sports_fundraiser',
          },
        })
        customerId = customer.id
      }

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: body.amount,
        currency: 'usd',
        customer: customerId,
        metadata: {
          fundraiser_id: body.fundraiserId.toString(),
          donor_name: body.donorName,
          donor_email: body.donorEmail,
          donor_phone: body.donorPhone || '',
        },
        description: `Donation to ${fundraiser.title}`,
      })

      // Create pledge record
      const { data: pledge } = await supabaseClient
        .from('pledges')
        .insert({
          fundraiser_id: body.fundraiserId,
          donor_name: body.donorName,
          donor_email: body.donorEmail,
          donor_phone: body.donorPhone,
          pledge_type: body.pledgeType || 'direct_donation',
          base_amount: body.amount,
          final_amount: body.amount,
          platform_fee: Math.floor(body.amount * 0.05), // 5% fee
          donor_tip: body.donorTip || 0,
          stripe_payment_intent_id: paymentIntent.id,
          status: 'pending_authorization',
        })
        .select()
        .single()

      return new Response(
        JSON.stringify({
          clientSecret: paymentIntent.client_secret,
          pledgeId: pledge.id,
          customerId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================================================
    // CONFIRM PAYMENT (with Stripe Wrapper sync)
    // ============================================================================
    if (req.method === 'POST' && action === 'confirm') {
      const body = await req.json()

      // Get pledge details
      const { data: pledge } = await supabaseClient
        .from('pledges')
        .select('*')
        .eq('id', body.pledgeId)
        .single()

      if (!pledge) throw new Error('Pledge not found')

      // Sync from Stripe using Stripe Wrapper
      await supabaseClient.rpc('sync_stripe_payment_to_pledge', {
        payment_intent_id: pledge.stripe_payment_intent_id,
      })

      // Get updated pledge
      const { data: updatedPledge } = await supabaseClient
        .from('pledges')
        .select('*')
        .eq('id', body.pledgeId)
        .single()

      // Update fundraiser totals
      if (updatedPledge.status === 'charged') {
        await supabaseClient.rpc('increment_fundraiser_totals', {
          fundraiser_id: updatedPledge.fundraiser_id,
          amount: updatedPledge.final_amount,
        })
      }

      return new Response(
        JSON.stringify({ success: true, pledge: updatedPledge }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================================================
    // GET PAYMENT HISTORY (using Stripe Wrapper)
    // ============================================================================
    if (req.method === 'GET' && action === 'history') {
      const fundraiserId = url.searchParams.get('fundraiserId')
      
      if (!fundraiserId) {
        throw new Error('fundraiserId is required')
      }

      // Query Stripe data directly from PostgreSQL
      const { data: payments } = await supabaseClient.rpc(
        'get_fundraiser_payment_history',
        { fundraiser_id_param: parseInt(fundraiserId) }
      )

      return new Response(
        JSON.stringify({ payments }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================================================
    // GET PAYMENT STATS (using Stripe Wrapper views)
    // ============================================================================
    if (req.method === 'GET' && action === 'stats') {
      const fundraiserId = url.searchParams.get('fundraiserId')
      
      if (!fundraiserId) {
        throw new Error('fundraiserId is required')
      }

      // Query aggregated stats from Stripe Wrapper view
      const { data: stats } = await supabaseClient
        .from('fundraiser_stripe_payments')
        .select('*')
        .eq('fundraiser_id', parseInt(fundraiserId))
        .single()

      return new Response(
        JSON.stringify({ stats: stats || { payment_count: 0, total_amount: 0 } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================================================
    // GET FAILED PAYMENTS (using Stripe Wrapper view)
    // ============================================================================
    if (req.method === 'GET' && action === 'failed') {
      const fundraiserId = url.searchParams.get('fundraiserId')
      
      // Query failed payments from Stripe Wrapper view
      const query = supabaseClient
        .from('stripe_failed_payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (fundraiserId) {
        query.eq('metadata->>fundraiser_id', fundraiserId)
      }

      const { data: failedPayments } = await query

      return new Response(
        JSON.stringify({ payments: failedPayments || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================================================
    // GET REFUNDED PAYMENTS (using Stripe Wrapper view)
    // ============================================================================
    if (req.method === 'GET' && action === 'refunds') {
      const fundraiserId = url.searchParams.get('fundraiserId')
      
      // Query refunded charges from Stripe Wrapper view
      const { data: refunds } = await supabaseClient
        .from('stripe_refunded_charges')
        .select('*')
        .order('refund_created_at', { ascending: false })
        .limit(50)

      return new Response(
        JSON.stringify({ refunds: refunds || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================================================
    // REFRESH TODAY'S PAYMENTS CACHE
    // ============================================================================
    if (req.method === 'POST' && action === 'refresh-cache') {
      await supabaseClient.rpc('refresh_stripe_today_payments')

      return new Response(
        JSON.stringify({ success: true, message: 'Cache refreshed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================================================
    // WEBHOOK HANDLER (with Stripe Wrapper sync)
    // ============================================================================
    if (req.method === 'POST' && action === 'webhook') {
      const signature = req.headers.get('stripe-signature')
      if (!signature) throw new Error('No signature')

      const body = await req.text()
      const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret!
      )

      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object
          
          // Sync using Stripe Wrapper function
          await supabaseClient.rpc('sync_stripe_payment_to_pledge', {
            payment_intent_id: paymentIntent.id,
          })

          break
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object
          
          // Sync using Stripe Wrapper function
          await supabaseClient.rpc('sync_stripe_payment_to_pledge', {
            payment_intent_id: paymentIntent.id,
          })

          break
        }

        case 'charge.refunded': {
          const charge = event.data.object
          
          // Update pledge status
          await supabaseClient
            .from('pledges')
            .update({
              status: 'refunded',
              refunded_at: new Date().toISOString(),
            })
            .eq('stripe_payment_intent_id', charge.payment_intent)

          break
        }
      }

      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
