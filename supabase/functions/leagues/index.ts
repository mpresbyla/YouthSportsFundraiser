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

    // GET all leagues
    if (req.method === 'GET' && !id) {
      const { data, error } = await supabaseClient
        .from('leagues')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(
        JSON.stringify({ leagues: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET single league
    if (req.method === 'GET' && id) {
      const { data, error } = await supabaseClient
        .from('leagues')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ league: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CREATE league
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
        .from('leagues')
        .insert({
          name: body.name,
          description: body.description,
          logo_url: body.logoUrl,
          default_fee_percentage: body.defaultFeePercentage || 5,
          allowed_fundraiser_types: body.allowedFundraiserTypes || 'direct_donation,raffle',
        })
        .select()
        .single()

      if (error) throw error

      // Grant league_admin role to creator
      await supabaseClient.from('user_roles').insert({
        user_id: user.id,
        league_id: data.id,
        role: 'league_admin',
      })

      return new Response(
        JSON.stringify({ league: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // UPDATE league
    if (req.method === 'PUT' && id) {
      const body = await req.json()
      const { data, error } = await supabaseClient
        .from('leagues')
        .update(body)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ league: data }),
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
