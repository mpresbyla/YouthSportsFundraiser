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
    const leagueId = url.searchParams.get('leagueId')

    // GET teams by league
    if (req.method === 'GET' && leagueId) {
      const { data, error } = await supabaseClient
        .from('teams')
        .select('*')
        .eq('league_id', leagueId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(
        JSON.stringify({ teams: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET single team
    if (req.method === 'GET' && id) {
      const { data, error } = await supabaseClient
        .from('teams')
        .select('*, leagues(*)')
        .eq('id', id)
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ team: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET my teams (teams user manages)
    if (req.method === 'GET' && action === 'my-teams') {
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      // Get user's internal ID
      const { data: userData } = await supabaseClient
        .from('users')
        .select('id')
        .eq('open_id', user.id)
        .single()

      if (!userData) throw new Error('User not found')

      // Get teams where user is a manager
      const { data, error } = await supabaseClient
        .from('user_roles')
        .select('teams(*, leagues(*))')
        .eq('user_id', userData.id)
        .eq('role', 'team_manager')
        .is('revoked_at', null)

      if (error) throw error

      const teams = data.map(role => role.teams).filter(Boolean)

      return new Response(
        JSON.stringify({ teams }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CREATE team
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
        .from('teams')
        .insert({
          league_id: body.leagueId,
          name: body.name,
          description: body.description,
          logo_url: body.logoUrl,
        })
        .select()
        .single()

      if (error) throw error

      // Get user's internal ID
      const { data: userData } = await supabaseClient
        .from('users')
        .select('id')
        .eq('open_id', user.id)
        .single()

      // Grant team_manager role to creator
      await supabaseClient.from('user_roles').insert({
        user_id: userData.id,
        team_id: data.id,
        role: 'team_manager',
      })

      return new Response(
        JSON.stringify({ team: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // UPDATE team
    if (req.method === 'PUT' && id) {
      const body = await req.json()
      const { data, error } = await supabaseClient
        .from('teams')
        .update(body)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ team: data }),
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
