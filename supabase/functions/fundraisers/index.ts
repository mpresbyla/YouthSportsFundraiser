import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    const id = url.searchParams.get('id')
    const teamId = url.searchParams.get('teamId')

    // GET fundraisers by team
    if (req.method === 'GET' && teamId) {
      const { data, error } = await supabaseClient
        .from('fundraisers')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(
        JSON.stringify({ fundraisers: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET single fundraiser
    if (req.method === 'GET' && id) {
      const { data, error} = await supabaseClient
        .from('fundraisers')
        .select('*, teams(*, leagues(*))')
        .eq('id', id)
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ fundraiser: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET all active fundraisers
    if (req.method === 'GET' && action === 'active') {
      const { data, error } = await supabaseClient
        .from('fundraisers')
        .select('*, teams(*, leagues(*))')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(
        JSON.stringify({ fundraisers: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CREATE fundraiser
    if (req.method === 'POST') {
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      const body = await req.json()
      const { data, error } = await supabaseClient
        .from('fundraisers')
        .insert({
          team_id: body.teamId,
          title: body.title,
          description: body.description,
          fundraiser_type: body.fundraiserType || 'direct_donation',
          fundraiser_template: body.fundraiserTemplate || 'direct_donation',
          status: 'draft',
          start_date: body.startDate,
          end_date: body.endDate,
          goal_amount: body.goalAmount,
          config: body.config,
        })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ fundraiser: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // UPDATE fundraiser
    if (req.method === 'PUT' && id) {
      const body = await req.json()
      const { data, error } = await supabaseClient
        .from('fundraisers')
        .update(body)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ fundraiser: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUBLISH fundraiser
    if (req.method === 'POST' && action === 'publish' && id) {
      const { data, error } = await supabaseClient
        .from('fundraisers')
        .update({
          status: 'active',
          published_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ fundraiser: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PAUSE fundraiser
    if (req.method === 'POST' && action === 'pause' && id) {
      const { data, error } = await supabaseClient
        .from('fundraisers')
        .update({ status: 'paused' })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ fundraiser: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // RESUME fundraiser
    if (req.method === 'POST' && action === 'resume' && id) {
      const { data, error } = await supabaseClient
        .from('fundraisers')
        .update({ status: 'active' })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ fundraiser: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // COMPLETE fundraiser
    if (req.method === 'POST' && action === 'complete' && id) {
      const { data, error } = await supabaseClient
        .from('fundraisers')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ fundraiser: data }),
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
