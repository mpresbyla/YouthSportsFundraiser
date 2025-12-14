-- Enable Stripe Wrapper Extension
-- This allows querying Stripe data directly from PostgreSQL

-- Enable the wrappers extension
CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions;

-- Create foreign data wrapper for Stripe
CREATE FOREIGN DATA WRAPPER stripe_wrapper
  HANDLER stripe_fdw_handler
  VALIDATOR stripe_fdw_validator;

-- Create server connection to Stripe API
-- Note: Replace 'your_stripe_secret_key' with actual key via Supabase Vault
CREATE SERVER stripe_server
  FOREIGN DATA WRAPPER stripe_wrapper
  OPTIONS (
    api_key 'your_stripe_secret_key',  -- Will be replaced with vault reference
    api_version '2023-10-16'
  );

-- Grant usage to authenticated users
GRANT USAGE ON FOREIGN SERVER stripe_server TO authenticated;

-- ============================================================================
-- STRIPE FOREIGN TABLES
-- ============================================================================

-- Customers table (maps to Stripe customers)
CREATE FOREIGN TABLE stripe_customers (
  id TEXT,
  email TEXT,
  name TEXT,
  description TEXT,
  created BIGINT,
  balance BIGINT,
  currency TEXT,
  delinquent BOOLEAN,
  metadata JSONB,
  attrs JSONB
)
SERVER stripe_server
OPTIONS (
  object 'customers'
);

-- Payment Intents table (maps to Stripe payment_intents)
CREATE FOREIGN TABLE stripe_payment_intents (
  id TEXT,
  amount BIGINT,
  currency TEXT,
  customer TEXT,
  description TEXT,
  status TEXT,
  created BIGINT,
  metadata JSONB,
  charges JSONB,
  attrs JSONB
)
SERVER stripe_server
OPTIONS (
  object 'payment_intents'
);

-- Charges table (maps to Stripe charges)
CREATE FOREIGN TABLE stripe_charges (
  id TEXT,
  amount BIGINT,
  currency TEXT,
  customer TEXT,
  description TEXT,
  status TEXT,
  payment_intent TEXT,
  created BIGINT,
  metadata JSONB,
  receipt_url TEXT,
  refunded BOOLEAN,
  attrs JSONB
)
SERVER stripe_server
OPTIONS (
  object 'charges'
);

-- Refunds table (maps to Stripe refunds)
CREATE FOREIGN TABLE stripe_refunds (
  id TEXT,
  amount BIGINT,
  currency TEXT,
  charge TEXT,
  payment_intent TEXT,
  status TEXT,
  reason TEXT,
  created BIGINT,
  metadata JSONB,
  attrs JSONB
)
SERVER stripe_server
OPTIONS (
  object 'refunds'
);

-- Balance Transactions table (maps to Stripe balance_transactions)
CREATE FOREIGN TABLE stripe_balance_transactions (
  id TEXT,
  amount BIGINT,
  currency TEXT,
  description TEXT,
  fee BIGINT,
  net BIGINT,
  status TEXT,
  type TEXT,
  created BIGINT,
  available_on BIGINT,
  attrs JSONB
)
SERVER stripe_server
OPTIONS (
  object 'balance_transactions'
);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Recent successful payments
CREATE OR REPLACE VIEW stripe_successful_payments AS
SELECT 
  pi.id,
  pi.amount,
  pi.currency,
  pi.customer,
  pi.description,
  pi.status,
  pi.created,
  pi.metadata,
  to_timestamp(pi.created) AS created_at
FROM stripe_payment_intents pi
WHERE pi.status = 'succeeded'
ORDER BY pi.created DESC;

-- View: Failed payments
CREATE OR REPLACE VIEW stripe_failed_payments AS
SELECT 
  pi.id,
  pi.amount,
  pi.currency,
  pi.customer,
  pi.description,
  pi.status,
  pi.created,
  pi.metadata,
  to_timestamp(pi.created) AS created_at
FROM stripe_payment_intents pi
WHERE pi.status IN ('canceled', 'payment_failed', 'requires_payment_method')
ORDER BY pi.created DESC;

-- View: Refunded charges
CREATE OR REPLACE VIEW stripe_refunded_charges AS
SELECT 
  c.id AS charge_id,
  c.amount AS original_amount,
  c.currency,
  c.customer,
  c.payment_intent,
  r.id AS refund_id,
  r.amount AS refund_amount,
  r.reason AS refund_reason,
  r.status AS refund_status,
  to_timestamp(c.created) AS charge_created_at,
  to_timestamp(r.created) AS refund_created_at
FROM stripe_charges c
INNER JOIN stripe_refunds r ON r.charge = c.id
WHERE c.refunded = true
ORDER BY r.created DESC;

-- View: Payment summary by fundraiser
CREATE OR REPLACE VIEW fundraiser_stripe_payments AS
SELECT 
  (pi.metadata->>'fundraiser_id')::BIGINT AS fundraiser_id,
  COUNT(*) AS payment_count,
  SUM(pi.amount) AS total_amount,
  pi.currency,
  COUNT(*) FILTER (WHERE pi.status = 'succeeded') AS successful_count,
  COUNT(*) FILTER (WHERE pi.status IN ('canceled', 'payment_failed')) AS failed_count
FROM stripe_payment_intents pi
WHERE pi.metadata->>'fundraiser_id' IS NOT NULL
GROUP BY (pi.metadata->>'fundraiser_id')::BIGINT, pi.currency;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to sync Stripe payment intent to local pledges table
CREATE OR REPLACE FUNCTION sync_stripe_payment_to_pledge(payment_intent_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pi_record RECORD;
BEGIN
  -- Get payment intent from Stripe
  SELECT * INTO pi_record
  FROM stripe_payment_intents
  WHERE id = payment_intent_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment intent % not found in Stripe', payment_intent_id;
  END IF;

  -- Update local pledge record
  UPDATE pledges
  SET 
    status = CASE 
      WHEN pi_record.status = 'succeeded' THEN 'charged'
      WHEN pi_record.status IN ('canceled', 'payment_failed') THEN 'failed'
      ELSE 'pending_authorization'
    END,
    charged_at = CASE 
      WHEN pi_record.status = 'succeeded' THEN to_timestamp(pi_record.created)
      ELSE NULL
    END
  WHERE stripe_payment_intent_id = payment_intent_id;

  -- If payment succeeded, create charge record
  IF pi_record.status = 'succeeded' THEN
    INSERT INTO charges (
      pledge_id,
      fundraiser_id,
      gross_amount,
      platform_fee,
      donor_tip,
      net_amount,
      stripe_payment_intent_id,
      status,
      succeeded_at
    )
    SELECT 
      p.id,
      p.fundraiser_id,
      p.final_amount,
      p.platform_fee,
      p.donor_tip,
      p.final_amount - p.platform_fee,
      payment_intent_id,
      'succeeded',
      to_timestamp(pi_record.created)
    FROM pledges p
    WHERE p.stripe_payment_intent_id = payment_intent_id
    ON CONFLICT (stripe_payment_intent_id) DO NOTHING;
  END IF;
END;
$$;

-- Function to get Stripe customer by email
CREATE OR REPLACE FUNCTION get_stripe_customer_by_email(customer_email TEXT)
RETURNS TABLE (
  id TEXT,
  email TEXT,
  name TEXT,
  created TIMESTAMP,
  balance BIGINT,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.email,
    c.name,
    to_timestamp(c.created) AS created,
    c.balance,
    c.metadata
  FROM stripe_customers c
  WHERE c.email = customer_email
  LIMIT 1;
END;
$$;

-- Function to get payment history for a fundraiser
CREATE OR REPLACE FUNCTION get_fundraiser_payment_history(fundraiser_id_param BIGINT)
RETURNS TABLE (
  payment_intent_id TEXT,
  amount BIGINT,
  currency TEXT,
  status TEXT,
  donor_name TEXT,
  donor_email TEXT,
  created_at TIMESTAMP,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pi.id AS payment_intent_id,
    pi.amount,
    pi.currency,
    pi.status,
    pi.metadata->>'donor_name' AS donor_name,
    pi.metadata->>'donor_email' AS donor_email,
    to_timestamp(pi.created) AS created_at,
    pi.metadata
  FROM stripe_payment_intents pi
  WHERE (pi.metadata->>'fundraiser_id')::BIGINT = fundraiser_id_param
  ORDER BY pi.created DESC;
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant read access to foreign tables for authenticated users
GRANT SELECT ON stripe_customers TO authenticated;
GRANT SELECT ON stripe_payment_intents TO authenticated;
GRANT SELECT ON stripe_charges TO authenticated;
GRANT SELECT ON stripe_refunds TO authenticated;
GRANT SELECT ON stripe_balance_transactions TO authenticated;

-- Grant read access to views
GRANT SELECT ON stripe_successful_payments TO authenticated;
GRANT SELECT ON stripe_failed_payments TO authenticated;
GRANT SELECT ON stripe_refunded_charges TO authenticated;
GRANT SELECT ON fundraiser_stripe_payments TO authenticated;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Note: Foreign tables don't support indexes, but we can create materialized views
-- for frequently accessed data if needed

-- Example: Materialized view for today's payments (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS stripe_today_payments AS
SELECT 
  pi.id,
  pi.amount,
  pi.currency,
  pi.status,
  pi.metadata,
  to_timestamp(pi.created) AS created_at
FROM stripe_payment_intents pi
WHERE pi.created >= EXTRACT(EPOCH FROM CURRENT_DATE)
ORDER BY pi.created DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_stripe_today_payments_created 
ON stripe_today_payments(created_at DESC);

-- Function to refresh today's payments
CREATE OR REPLACE FUNCTION refresh_stripe_today_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW stripe_today_payments;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FOREIGN TABLE stripe_customers IS 'Foreign table mapping to Stripe customers API';
COMMENT ON FOREIGN TABLE stripe_payment_intents IS 'Foreign table mapping to Stripe payment_intents API';
COMMENT ON FOREIGN TABLE stripe_charges IS 'Foreign table mapping to Stripe charges API';
COMMENT ON FOREIGN TABLE stripe_refunds IS 'Foreign table mapping to Stripe refunds API';
COMMENT ON VIEW stripe_successful_payments IS 'View of all successful payment intents';
COMMENT ON VIEW fundraiser_stripe_payments IS 'Payment summary grouped by fundraiser';
COMMENT ON FUNCTION sync_stripe_payment_to_pledge IS 'Syncs Stripe payment intent data to local pledges table';
