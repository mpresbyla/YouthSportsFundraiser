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
    const fundraiserId = url.searchParams.get('fundraiserId')

    // ============================================================================
    // RAFFLE OPERATIONS
    // ============================================================================

    // GET raffle items
    if (req.method === 'GET' && action === 'raffle-items' && fundraiserId) {
      const { data, error } = await supabaseClient
        .from('raffle_items')
        .select('*')
        .eq('fundraiser_id', fundraiserId)
        .order('created_at', { ascending: true })

      if (error) throw error

      return new Response(
        JSON.stringify({ items: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET raffle tiers
    if (req.method === 'GET' && action === 'raffle-tiers' && fundraiserId) {
      const { data, error } = await supabaseClient
        .from('raffle_tiers')
        .select('*')
        .eq('fundraiser_id', fundraiserId)
        .order('price', { ascending: true })

      if (error) throw error

      return new Response(
        JSON.stringify({ tiers: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CREATE raffle item
    if (req.method === 'POST' && action === 'raffle-item') {
      const body = await req.json()
      const { data, error } = await supabaseClient
        .from('raffle_items')
        .insert({
          fundraiser_id: body.fundraiserId,
          title: body.title,
          description: body.description,
          image_url: body.imageUrl,
          sponsor_name: body.sponsorName,
          sponsor_logo_url: body.sponsorLogoUrl,
        })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ item: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CREATE raffle tier
    if (req.method === 'POST' && action === 'raffle-tier') {
      const body = await req.json()
      const { data, error } = await supabaseClient
        .from('raffle_tiers')
        .insert({
          fundraiser_id: body.fundraiserId,
          price: body.price,
          entries: body.entries,
          label: body.label,
        })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ tier: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================================================
    // CALENDAR OPERATIONS
    // ============================================================================

    // GET calendar dates
    if (req.method === 'GET' && action === 'calendar-dates' && fundraiserId) {
      const { data, error } = await supabaseClient
        .from('calendar_dates')
        .select('*')
        .eq('fundraiser_id', fundraiserId)
        .order('date_value', { ascending: true })

      if (error) throw error

      return new Response(
        JSON.stringify({ dates: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CREATE calendar date
    if (req.method === 'POST' && action === 'calendar-date') {
      const body = await req.json()
      const { data, error } = await supabaseClient
        .from('calendar_dates')
        .insert({
          fundraiser_id: body.fundraiserId,
          date_value: body.dateValue,
          amount: body.amount,
        })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ date: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PURCHASE calendar date
    if (req.method === 'POST' && action === 'purchase-date') {
      const body = await req.json()
      const { data, error } = await supabaseClient
        .from('calendar_dates')
        .update({
          purchaser_pledge_id: body.pledgeId,
          purchaser_name: body.purchaserName,
          purchased_at: new Date().toISOString(),
        })
        .eq('id', body.dateId)
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ date: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================================================
    // SQUARES OPERATIONS
    // ============================================================================

    // GET squares grid
    if (req.method === 'GET' && action === 'squares-grid' && fundraiserId) {
      const { data, error } = await supabaseClient
        .from('squares_grids')
        .select('*')
        .eq('fundraiser_id', fundraiserId)
        .single()

      if (error) throw error

      // Get purchases for this grid
      const { data: purchases } = await supabaseClient
        .from('squares_purchases')
        .select('*')
        .eq('grid_id', data.id)

      return new Response(
        JSON.stringify({ grid: data, purchases }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CREATE squares grid
    if (req.method === 'POST' && action === 'squares-grid') {
      const body = await req.json()
      const { data, error } = await supabaseClient
        .from('squares_grids')
        .insert({
          fundraiser_id: body.fundraiserId,
          grid_size: body.gridSize || 100,
          price_per_square: body.pricePerSquare,
          home_team: body.homeTeam,
          away_team: body.awayTeam,
          event_date: body.eventDate,
        })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ grid: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PURCHASE square
    if (req.method === 'POST' && action === 'purchase-square') {
      const body = await req.json()
      const { data, error } = await supabaseClient
        .from('squares_purchases')
        .insert({
          grid_id: body.gridId,
          pledge_id: body.pledgeId,
          square_position: body.squarePosition,
          donor_name: body.donorName,
        })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ purchase: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================================================
    // CHALLENGE OPERATIONS
    // ============================================================================

    // GET challenge goals
    if (req.method === 'GET' && action === 'challenge-goals' && fundraiserId) {
      const { data, error } = await supabaseClient
        .from('challenge_goals')
        .select('*')
        .eq('fundraiser_id', fundraiserId)
        .order('goal_amount', { ascending: true })

      if (error) throw error

      return new Response(
        JSON.stringify({ goals: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CREATE challenge goal
    if (req.method === 'POST' && action === 'challenge-goal') {
      const body = await req.json()
      const { data, error } = await supabaseClient
        .from('challenge_goals')
        .insert({
          fundraiser_id: body.fundraiserId,
          goal_amount: body.goalAmount,
          challenge_description: body.challengeDescription,
          completed_description: body.completedDescription,
        })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ goal: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================================================
    // DONATION MATCHING OPERATIONS
    // ============================================================================

    // GET donation matching
    if (req.method === 'GET' && action === 'donation-matching' && fundraiserId) {
      const { data, error } = await supabaseClient
        .from('donation_matching')
        .select('*')
        .eq('fundraiser_id', fundraiserId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(
        JSON.stringify({ matching: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CREATE donation matching
    if (req.method === 'POST' && action === 'donation-matching') {
      const body = await req.json()
      const { data, error } = await supabaseClient
        .from('donation_matching')
        .insert({
          fundraiser_id: body.fundraiserId,
          sponsor_name: body.sponsorName,
          sponsor_logo_url: body.sponsorLogoUrl,
          match_amount: body.matchAmount,
          match_ratio: body.matchRatio || 100,
          expires_at: body.expiresAt,
        })
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ matching: data }),
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
