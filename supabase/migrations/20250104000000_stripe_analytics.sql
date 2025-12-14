-- Advanced Stripe Analytics and Sync Procedures
-- Leverages Stripe Wrapper for real-time payment analytics

-- ============================================================================
-- ANALYTICS VIEWS
-- ============================================================================

-- View: Daily payment summary
CREATE OR REPLACE VIEW stripe_daily_summary AS
SELECT 
  DATE(to_timestamp(pi.created)) AS payment_date,
  COUNT(*) AS total_payments,
  COUNT(*) FILTER (WHERE pi.status = 'succeeded') AS successful_payments,
  COUNT(*) FILTER (WHERE pi.status IN ('canceled', 'payment_failed')) AS failed_payments,
  SUM(pi.amount) FILTER (WHERE pi.status = 'succeeded') AS total_revenue,
  AVG(pi.amount) FILTER (WHERE pi.status = 'succeeded') AS avg_payment_amount,
  pi.currency
FROM stripe_payment_intents pi
WHERE pi.created >= EXTRACT(EPOCH FROM CURRENT_DATE - INTERVAL '30 days')
GROUP BY DATE(to_timestamp(pi.created)), pi.currency
ORDER BY payment_date DESC;

-- View: Fundraiser performance metrics
CREATE OR REPLACE VIEW fundraiser_performance_metrics AS
SELECT 
  f.id AS fundraiser_id,
  f.title AS fundraiser_title,
  f.status AS fundraiser_status,
  f.goal_amount,
  f.total_amount_charged AS local_total,
  COALESCE(sps.total_amount, 0) AS stripe_total,
  COALESCE(sps.payment_count, 0) AS payment_count,
  COALESCE(sps.successful_count, 0) AS successful_count,
  COALESCE(sps.failed_count, 0) AS failed_count,
  CASE 
    WHEN f.goal_amount > 0 THEN (COALESCE(sps.total_amount, 0)::FLOAT / f.goal_amount * 100)
    ELSE 0
  END AS goal_percentage,
  CASE 
    WHEN COALESCE(sps.payment_count, 0) > 0 
    THEN (COALESCE(sps.successful_count, 0)::FLOAT / sps.payment_count * 100)
    ELSE 0
  END AS success_rate
FROM fundraisers f
LEFT JOIN fundraiser_stripe_payments sps ON sps.fundraiser_id = f.id
WHERE f.status IN ('active', 'completed')
ORDER BY stripe_total DESC;

-- View: Top donors by total contribution
CREATE OR REPLACE VIEW top_donors AS
SELECT 
  pi.metadata->>'donor_email' AS donor_email,
  pi.metadata->>'donor_name' AS donor_name,
  COUNT(*) AS donation_count,
  SUM(pi.amount) AS total_donated,
  AVG(pi.amount) AS avg_donation,
  MAX(to_timestamp(pi.created)) AS last_donation_date,
  pi.currency
FROM stripe_payment_intents pi
WHERE pi.status = 'succeeded'
  AND pi.metadata->>'donor_email' IS NOT NULL
GROUP BY pi.metadata->>'donor_email', pi.metadata->>'donor_name', pi.currency
HAVING COUNT(*) > 0
ORDER BY total_donated DESC
LIMIT 100;

-- View: Payment method distribution
CREATE OR REPLACE VIEW payment_method_distribution AS
SELECT 
  c.attrs->>'payment_method_details'->>'type' AS payment_method,
  COUNT(*) AS usage_count,
  SUM(c.amount) AS total_amount,
  AVG(c.amount) AS avg_amount,
  c.currency
FROM stripe_charges c
WHERE c.status = 'succeeded'
GROUP BY c.attrs->>'payment_method_details'->>'type', c.currency
ORDER BY usage_count DESC;

-- View: Revenue by team
CREATE OR REPLACE VIEW team_revenue_summary AS
SELECT 
  t.id AS team_id,
  t.name AS team_name,
  l.name AS league_name,
  COUNT(DISTINCT f.id) AS fundraiser_count,
  COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'active') AS active_fundraisers,
  COALESCE(SUM(sps.total_amount), 0) AS total_revenue,
  COALESCE(SUM(sps.payment_count), 0) AS total_payments,
  COALESCE(AVG(sps.total_amount), 0) AS avg_per_fundraiser
FROM teams t
INNER JOIN leagues l ON l.id = t.league_id
LEFT JOIN fundraisers f ON f.team_id = t.id
LEFT JOIN fundraiser_stripe_payments sps ON sps.fundraiser_id = f.id
GROUP BY t.id, t.name, l.name
ORDER BY total_revenue DESC;

-- ============================================================================
-- SYNC PROCEDURES
-- ============================================================================

-- Procedure: Sync all pending pledges with Stripe
CREATE OR REPLACE FUNCTION sync_all_pending_pledges()
RETURNS TABLE (
  pledge_id BIGINT,
  payment_intent_id TEXT,
  old_status TEXT,
  new_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pledge_record RECORD;
BEGIN
  FOR pledge_record IN 
    SELECT id, stripe_payment_intent_id, status
    FROM pledges
    WHERE status = 'pending_authorization'
      AND stripe_payment_intent_id IS NOT NULL
  LOOP
    -- Sync each pledge
    PERFORM sync_stripe_payment_to_pledge(pledge_record.stripe_payment_intent_id);
    
    -- Return the result
    RETURN QUERY
    SELECT 
      pledge_record.id,
      pledge_record.stripe_payment_intent_id,
      pledge_record.status,
      p.status
    FROM pledges p
    WHERE p.id = pledge_record.id;
  END LOOP;
END;
$$;

-- Procedure: Reconcile local totals with Stripe
CREATE OR REPLACE FUNCTION reconcile_fundraiser_totals(fundraiser_id_param BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  local_total BIGINT;
  stripe_total BIGINT;
  difference BIGINT;
  result JSON;
BEGIN
  -- Get local total
  SELECT total_amount_charged INTO local_total
  FROM fundraisers
  WHERE id = fundraiser_id_param;

  -- Get Stripe total
  SELECT COALESCE(SUM(pi.amount), 0) INTO stripe_total
  FROM stripe_payment_intents pi
  WHERE (pi.metadata->>'fundraiser_id')::BIGINT = fundraiser_id_param
    AND pi.status = 'succeeded';

  -- Calculate difference
  difference := stripe_total - local_total;

  -- If there's a difference, update local total
  IF difference != 0 THEN
    UPDATE fundraisers
    SET 
      total_amount_charged = stripe_total,
      total_amount_pledged = stripe_total
    WHERE id = fundraiser_id_param;
  END IF;

  -- Return reconciliation result
  result := json_build_object(
    'fundraiser_id', fundraiser_id_param,
    'local_total', local_total,
    'stripe_total', stripe_total,
    'difference', difference,
    'reconciled', difference != 0
  );

  RETURN result;
END;
$$;

-- Procedure: Get payment timeline for a fundraiser
CREATE OR REPLACE FUNCTION get_payment_timeline(
  fundraiser_id_param BIGINT,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  payment_date DATE,
  payment_count BIGINT,
  total_amount BIGINT,
  avg_amount NUMERIC,
  successful_count BIGINT,
  failed_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(to_timestamp(pi.created)) AS payment_date,
    COUNT(*) AS payment_count,
    SUM(pi.amount) AS total_amount,
    AVG(pi.amount) AS avg_amount,
    COUNT(*) FILTER (WHERE pi.status = 'succeeded') AS successful_count,
    COUNT(*) FILTER (WHERE pi.status IN ('canceled', 'payment_failed')) AS failed_count
  FROM stripe_payment_intents pi
  WHERE (pi.metadata->>'fundraiser_id')::BIGINT = fundraiser_id_param
    AND pi.created >= EXTRACT(EPOCH FROM CURRENT_DATE - INTERVAL '1 day' * days_back)
  GROUP BY DATE(to_timestamp(pi.created))
  ORDER BY payment_date DESC;
END;
$$;

-- Procedure: Get donor retention metrics
CREATE OR REPLACE FUNCTION get_donor_retention_metrics(fundraiser_id_param BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_donors BIGINT;
  repeat_donors BIGINT;
  retention_rate NUMERIC;
  result JSON;
BEGIN
  -- Count total unique donors
  SELECT COUNT(DISTINCT pi.metadata->>'donor_email') INTO total_donors
  FROM stripe_payment_intents pi
  WHERE (pi.metadata->>'fundraiser_id')::BIGINT = fundraiser_id_param
    AND pi.status = 'succeeded';

  -- Count repeat donors (donated more than once)
  SELECT COUNT(*) INTO repeat_donors
  FROM (
    SELECT pi.metadata->>'donor_email'
    FROM stripe_payment_intents pi
    WHERE (pi.metadata->>'fundraiser_id')::BIGINT = fundraiser_id_param
      AND pi.status = 'succeeded'
    GROUP BY pi.metadata->>'donor_email'
    HAVING COUNT(*) > 1
  ) AS repeat_donor_emails;

  -- Calculate retention rate
  IF total_donors > 0 THEN
    retention_rate := (repeat_donors::NUMERIC / total_donors * 100);
  ELSE
    retention_rate := 0;
  END IF;

  result := json_build_object(
    'total_donors', total_donors,
    'repeat_donors', repeat_donors,
    'retention_rate', retention_rate,
    'first_time_donors', total_donors - repeat_donors
  );

  RETURN result;
END;
$$;

-- Procedure: Get payment conversion funnel
CREATE OR REPLACE FUNCTION get_payment_conversion_funnel(fundraiser_id_param BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_intents BIGINT;
  succeeded_intents BIGINT;
  failed_intents BIGINT;
  pending_intents BIGINT;
  conversion_rate NUMERIC;
  result JSON;
BEGIN
  -- Count payment intents by status
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE pi.status = 'succeeded'),
    COUNT(*) FILTER (WHERE pi.status IN ('canceled', 'payment_failed')),
    COUNT(*) FILTER (WHERE pi.status IN ('requires_payment_method', 'requires_confirmation', 'requires_action', 'processing'))
  INTO total_intents, succeeded_intents, failed_intents, pending_intents
  FROM stripe_payment_intents pi
  WHERE (pi.metadata->>'fundraiser_id')::BIGINT = fundraiser_id_param;

  -- Calculate conversion rate
  IF total_intents > 0 THEN
    conversion_rate := (succeeded_intents::NUMERIC / total_intents * 100);
  ELSE
    conversion_rate := 0;
  END IF;

  result := json_build_object(
    'total_intents', total_intents,
    'succeeded', succeeded_intents,
    'failed', failed_intents,
    'pending', pending_intents,
    'conversion_rate', conversion_rate
  );

  RETURN result;
END;
$$;

-- ============================================================================
-- SCHEDULED JOBS (to be configured in Supabase)
-- ============================================================================

-- Function to run daily reconciliation
CREATE OR REPLACE FUNCTION daily_stripe_reconciliation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  fundraiser_record RECORD;
BEGIN
  -- Sync all pending pledges
  PERFORM sync_all_pending_pledges();

  -- Reconcile totals for all active fundraisers
  FOR fundraiser_record IN 
    SELECT id FROM fundraisers WHERE status IN ('active', 'completed')
  LOOP
    PERFORM reconcile_fundraiser_totals(fundraiser_record.id);
  END LOOP;

  -- Refresh materialized views
  PERFORM refresh_stripe_today_payments();
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON stripe_daily_summary TO authenticated;
GRANT SELECT ON fundraiser_performance_metrics TO authenticated;
GRANT SELECT ON top_donors TO authenticated;
GRANT SELECT ON payment_method_distribution TO authenticated;
GRANT SELECT ON team_revenue_summary TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON VIEW stripe_daily_summary IS 'Daily payment summary with success/failure rates';
COMMENT ON VIEW fundraiser_performance_metrics IS 'Comprehensive fundraiser performance metrics';
COMMENT ON VIEW top_donors IS 'Top 100 donors by total contribution';
COMMENT ON VIEW team_revenue_summary IS 'Revenue summary grouped by team';
COMMENT ON FUNCTION sync_all_pending_pledges IS 'Syncs all pending pledges with Stripe data';
COMMENT ON FUNCTION reconcile_fundraiser_totals IS 'Reconciles local fundraiser totals with Stripe';
COMMENT ON FUNCTION get_payment_timeline IS 'Returns payment timeline for a fundraiser';
COMMENT ON FUNCTION get_donor_retention_metrics IS 'Calculates donor retention metrics';
COMMENT ON FUNCTION get_payment_conversion_funnel IS 'Returns payment conversion funnel metrics';
COMMENT ON FUNCTION daily_stripe_reconciliation IS 'Runs daily reconciliation of Stripe data';
