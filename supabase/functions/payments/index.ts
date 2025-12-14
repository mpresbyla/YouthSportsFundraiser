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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    // CREATE payment intent
    if (req.method === 'POST' && action === 'create-intent') {
      const body = await req.json()
      
      // Get fundraiser details
      const { data: fundraiser } = await supabaseClient
        .from('fundraisers')
        .select('*, teams(*)')
        .eq('id', body.fundraiserId)
        .single()

      if (!fundraiser) throw new Error('Fundraiser not found')

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: body.amount,
        currency: 'usd',
        metadata: {
          fundraiser_id: body.fundraiserId,
          donor_name: body.donorName,
          donor_email: body.donorEmail,
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
          pledge_type: 'direct_donation',
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
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CONFIRM payment
    if (req.method === 'POST' && action === 'confirm') {
      const body = await req.json()

      // Update pledge status
      const { data: pledge } = await supabaseClient
        .from('pledges')
        .update({
          status: 'charged',
          charged_at: new Date().toISOString(),
        })
        .eq('id', body.pledgeId)
        .select()
        .single()

      if (!pledge) throw new Error('Pledge not found')

      // Update fundraiser totals
      await supabaseClient.rpc('increment_fundraiser_totals', {
        fundraiser_id: pledge.fundraiser_id,
        amount: pledge.final_amount,
      })

      // Create charge record
      await supabaseClient.from('charges').insert({
        pledge_id: pledge.id,
        fundraiser_id: pledge.fundraiser_id,
        gross_amount: pledge.final_amount,
        platform_fee: pledge.platform_fee,
        donor_tip: pledge.donor_tip,
        net_amount: pledge.final_amount - pledge.platform_fee,
        stripe_payment_intent_id: pledge.stripe_payment_intent_id,
        status: 'succeeded',
        succeeded_at: new Date().toISOString(),
      })

      return new Response(
        JSON.stringify({ success: true, pledge }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // WEBHOOK handler
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
          
          // Update pledge
          await supabaseClient
            .from('pledges')
            .update({
              status: 'charged',
              charged_at: new Date().toISOString(),
            })
            .eq('stripe_payment_intent_id', paymentIntent.id)

          break
        }

        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object
          
          // Update pledge
          await supabaseClient
            .from('pledges')
            .update({
              status: 'failed',
            })
            .eq('stripe_payment_intent_id', paymentIntent.id)

          break
        }

        case 'charge.refunded': {
          const charge = event.data.object
          
          // Update pledge
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
