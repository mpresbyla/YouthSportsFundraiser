# Stripe Wrapper Integration Guide

## Overview

The Stripe Wrapper extension allows you to query Stripe data directly from PostgreSQL using foreign tables. This eliminates the need for separate API calls and enables powerful SQL-based analytics on your payment data.

## Benefits

✅ **Query Stripe data with SQL** - Use standard SQL to query customers, payments, charges, and refunds  
✅ **Real-time analytics** - Build dashboards with live Stripe data  
✅ **Join with local data** - Combine Stripe data with your fundraisers and teams tables  
✅ **Automatic sync** - Keep local pledges in sync with Stripe payment intents  
✅ **Performance** - Materialized views cache frequently accessed data  

---

## Prerequisites

- Supabase project created
- Stripe account with API keys
- Database migrations 01-04 applied
- Supabase CLI installed

---

## Step 1: Enable Wrappers Extension

### Via Supabase Dashboard

1. Go to **Database** → **Extensions**
2. Search for "wrappers"
3. Click **Enable** next to "Supabase Wrappers"
4. Wait for extension to be enabled (~30 seconds)

### Via SQL Editor

```sql
CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions;
```

---

## Step 2: Store Stripe API Key in Vault

Supabase Vault securely stores sensitive credentials.

### Via Supabase Dashboard

1. Go to **Settings** → **Vault**
2. Click **New Secret**
3. **Name**: `stripe_secret_key`
4. **Secret**: Your Stripe secret key (sk_test_... or sk_live_...)
5. Click **Create Secret**

### Via SQL Editor

```sql
-- Insert Stripe secret key into vault
INSERT INTO vault.secrets (name, secret)
VALUES (
  'stripe_secret_key',
  'sk_test_51Se3utPFefapxluXEwq8RC4C5fHRuID75g4gF3oScEoBWo12bWR4K3zGmuF3N9uQkEwrAqDzRdpePuSxzQNWkPUh002d0lhOqY'
);
```

---

## Step 3: Create Stripe Foreign Data Wrapper

Run this SQL in the **SQL Editor**:

```sql
-- Create foreign data wrapper
CREATE FOREIGN DATA WRAPPER stripe_wrapper
  HANDLER stripe_fdw_handler
  VALIDATOR stripe_fdw_validator;

-- Create server with vault reference
CREATE SERVER stripe_server
  FOREIGN DATA WRAPPER stripe_wrapper
  OPTIONS (
    api_key_id 'stripe_secret_key',  -- References vault secret
    api_version '2023-10-16'
  );

-- Grant usage
GRANT USAGE ON FOREIGN SERVER stripe_server TO authenticated, service_role;
```

---

## Step 4: Run Stripe Wrapper Migration

Apply the migration file that creates foreign tables and views:

```bash
# Via Supabase CLI
cd /path/to/youth-sports-fundraiser
supabase db push

# Or run migration manually in SQL Editor
# Copy contents of supabase/migrations/20250103000000_stripe_wrapper.sql
```

This creates:
- 5 foreign tables (customers, payment_intents, charges, refunds, balance_transactions)
- 4 views (successful_payments, failed_payments, refunded_charges, fundraiser_stripe_payments)
- Helper functions for syncing and querying

---

## Step 5: Run Analytics Migration

Apply the analytics migration for advanced metrics:

```bash
# Via Supabase CLI
supabase db push

# Or run migration manually in SQL Editor
# Copy contents of supabase/migrations/20250104000000_stripe_analytics.sql
```

This creates:
- 5 analytics views (daily_summary, performance_metrics, top_donors, etc.)
- 6 sync procedures (sync_all_pending_pledges, reconcile_fundraiser_totals, etc.)
- Scheduled job function (daily_stripe_reconciliation)

---

## Step 6: Deploy Enhanced Payments Edge Function

Deploy the new payments function that leverages Stripe Wrapper:

```bash
# Deploy payments-v2 function
supabase functions deploy payments-v2

# Set environment variables
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Step 7: Test the Integration

### Test 1: Query Stripe Customers

```sql
SELECT id, email, name, created
FROM stripe_customers
LIMIT 10;
```

### Test 2: Query Recent Payments

```sql
SELECT * FROM stripe_successful_payments
LIMIT 10;
```

### Test 3: Get Fundraiser Payment Stats

```sql
SELECT * FROM fundraiser_stripe_payments
WHERE fundraiser_id = 1;
```

### Test 4: Sync Pending Pledges

```sql
SELECT * FROM sync_all_pending_pledges();
```

### Test 5: Reconcile Fundraiser Totals

```sql
SELECT reconcile_fundraiser_totals(1);
```

---

## Usage Examples

### Example 1: Get Payment History for Fundraiser

```sql
SELECT * FROM get_fundraiser_payment_history(1);
```

Returns:
- payment_intent_id
- amount
- currency
- status
- donor_name
- donor_email
- created_at
- metadata

### Example 2: Get Daily Payment Timeline

```sql
SELECT * FROM get_payment_timeline(1, 30);
```

Returns daily breakdown for last 30 days:
- payment_date
- payment_count
- total_amount
- avg_amount
- successful_count
- failed_count

### Example 3: Get Donor Retention Metrics

```sql
SELECT get_donor_retention_metrics(1);
```

Returns JSON:
```json
{
  "total_donors": 45,
  "repeat_donors": 12,
  "retention_rate": 26.67,
  "first_time_donors": 33
}
```

### Example 4: Get Conversion Funnel

```sql
SELECT get_payment_conversion_funnel(1);
```

Returns JSON:
```json
{
  "total_intents": 100,
  "succeeded": 85,
  "failed": 10,
  "pending": 5,
  "conversion_rate": 85.00
}
```

### Example 5: Get Top Donors

```sql
SELECT * FROM top_donors
LIMIT 10;
```

Returns:
- donor_email
- donor_name
- donation_count
- total_donated
- avg_donation
- last_donation_date

### Example 6: Get Team Revenue Summary

```sql
SELECT * FROM team_revenue_summary
ORDER BY total_revenue DESC;
```

Returns:
- team_id
- team_name
- league_name
- fundraiser_count
- active_fundraisers
- total_revenue
- total_payments
- avg_per_fundraiser

---

## Scheduled Jobs

### Set Up Daily Reconciliation

Use Supabase's pg_cron extension to schedule daily reconciliation:

```sql
-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily reconciliation at 2 AM UTC
SELECT cron.schedule(
  'daily-stripe-reconciliation',
  '0 2 * * *',
  $$SELECT daily_stripe_reconciliation()$$
);
```

### Manual Reconciliation

Run reconciliation manually anytime:

```sql
SELECT daily_stripe_reconciliation();
```

This will:
1. Sync all pending pledges with Stripe
2. Reconcile totals for all active fundraisers
3. Refresh materialized views

---

## Performance Optimization

### Materialized Views

The integration includes a materialized view for today's payments:

```sql
-- Refresh manually
SELECT refresh_stripe_today_payments();

-- Query cached data
SELECT * FROM stripe_today_payments;
```

### Indexes

Foreign tables don't support indexes, but materialized views do:

```sql
-- Already created in migration
CREATE INDEX idx_stripe_today_payments_created 
ON stripe_today_payments(created_at DESC);
```

---

## Monitoring & Debugging

### Check Foreign Table Status

```sql
SELECT * FROM information_schema.foreign_tables
WHERE foreign_table_schema = 'public'
  AND foreign_table_name LIKE 'stripe_%';
```

### Test Foreign Data Wrapper Connection

```sql
-- Should return data if connection works
SELECT COUNT(*) FROM stripe_customers;
```

### View Wrapper Logs

Check Supabase logs in dashboard:
1. Go to **Logs** → **Database**
2. Filter by "stripe_wrapper"

---

## Troubleshooting

### Issue: "relation stripe_customers does not exist"

**Solution**: Run the Stripe Wrapper migration (step 4)

### Issue: "permission denied for foreign server stripe_server"

**Solution**: Grant permissions:
```sql
GRANT USAGE ON FOREIGN SERVER stripe_server TO authenticated;
```

### Issue: "invalid API key"

**Solution**: Update vault secret with correct Stripe key:
```sql
UPDATE vault.secrets
SET secret = 'sk_test_your_correct_key'
WHERE name = 'stripe_secret_key';
```

### Issue: "no data returned from Stripe"

**Solution**: Check if you're using test vs live keys and have test data in Stripe

### Issue: "foreign table queries are slow"

**Solution**: Use materialized views for frequently accessed data:
```sql
CREATE MATERIALIZED VIEW my_cached_data AS
SELECT * FROM stripe_payment_intents
WHERE created >= EXTRACT(EPOCH FROM CURRENT_DATE - INTERVAL '7 days');

CREATE INDEX ON my_cached_data(created DESC);
```

---

## Security Best Practices

### Row Level Security

Foreign tables respect RLS policies:

```sql
-- Example: Only allow users to see their own payment data
ALTER TABLE stripe_payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
ON stripe_payment_intents
FOR SELECT
TO authenticated
USING (
  metadata->>'donor_email' = auth.jwt() ->> 'email'
);
```

### API Key Rotation

To rotate Stripe API keys:

1. Generate new key in Stripe dashboard
2. Update vault secret:
```sql
UPDATE vault.secrets
SET secret = 'sk_test_new_key'
WHERE name = 'stripe_secret_key';
```
3. Restart foreign server:
```sql
ALTER SERVER stripe_server OPTIONS (SET api_key_id 'stripe_secret_key');
```

---

## Migration from Old Payments Function

### Update API Calls

Replace old payment function calls with new ones:

**Old**:
```typescript
const res = await fetch(`${FUNCTIONS_URL}/payments?action=create-intent`, ...)
```

**New**:
```typescript
const res = await fetch(`${FUNCTIONS_URL}/payments-v2?action=create-intent`, ...)
```

### New Endpoints

The payments-v2 function adds these endpoints:

- `GET /payments-v2?action=history&fundraiserId=1` - Get payment history
- `GET /payments-v2?action=stats&fundraiserId=1` - Get payment stats
- `GET /payments-v2?action=failed` - Get failed payments
- `GET /payments-v2?action=refunds` - Get refunded payments
- `POST /payments-v2?action=refresh-cache` - Refresh payment cache

---

## Cost Considerations

### Stripe API Limits

- Stripe API has rate limits (100 requests/second for test mode)
- Foreign table queries count against this limit
- Use materialized views to reduce API calls

### Supabase Pricing

- Foreign table queries count toward database usage
- Consider caching frequently accessed data
- Monitor query performance in Supabase dashboard

---

## Resources

- [Supabase Wrappers Documentation](https://supabase.com/docs/guides/database/extensions/wrappers)
- [Stripe Wrapper Specific Docs](https://supabase.com/docs/guides/database/extensions/wrappers/stripe)
- [Stripe API Reference](https://stripe.com/docs/api)
- [PostgreSQL Foreign Data Wrappers](https://www.postgresql.org/docs/current/postgres-fdw.html)

---

## Support

For issues or questions:
- Supabase Discord: https://discord.supabase.com
- Supabase GitHub: https://github.com/supabase/wrappers
- Stripe Support: https://support.stripe.com

---

## Your Credentials

**Stripe Test Keys**:
- Secret Key: `sk_test_51Se3utPFefapxluXEwq8RC4C5fHRuID75g4gF3oScEoBWo12bWR4K3zGmuF3N9uQkEwrAqDzRdpePuSxzQNWkPUh002d0lhOqY`
- Publishable Key: `pk_test_51Se3utPFefapxluXZ7mb0EMwvev9q1Qea7WtPqMvRyISFH8kfUTC7j68gt46vH7zp4EbI1v4jeMG4YAyN45tBgHo00FVipUw5w`
- Webhook Secret: `whsec_moaCYzhu4Tm87i2HRFmxxnWREYJ1YNLS`

**Note**: Create your Supabase project to get Supabase-specific credentials.
