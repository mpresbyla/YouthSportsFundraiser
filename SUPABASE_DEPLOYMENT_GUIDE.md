# Supabase Deployment Guide

## Overview

This guide will help you deploy the Youth Sports Fundraising Platform using Supabase (PostgreSQL + Auth + Edge Functions) and Netlify (frontend hosting).

## Prerequisites

- Supabase account (https://supabase.com)
- Netlify account (https://netlify.com)
- Stripe account (https://stripe.com)
- GitHub repository access

---

## Part 1: Supabase Setup

### Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - **Project name**: youth-sports-fundraiser
   - **Database password**: (generate a strong password and save it)
   - **Region**: Choose closest to your users
4. Wait for project to be created (~2 minutes)

### Step 2: Run Database Migration

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase/migrations/20250101000000_initial_schema.sql`
4. Paste into the SQL editor
5. Click "Run" to execute the migration
6. Verify all 19 tables were created in the **Table Editor**

### Step 3: Configure Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates:
   - Go to **Authentication** → **Email Templates**
   - Customize confirmation and password reset emails
4. Set **Site URL** to your Netlify domain (you'll get this later)
5. Add **Redirect URLs**:
   - `http://localhost:5173/*` (for local development)
   - `https://your-netlify-domain.netlify.app/*` (for production)

### Step 4: Get Supabase Credentials

1. Go to **Project Settings** → **API**
2. Copy these values (you'll need them later):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep secret!)

### Step 5: Deploy Edge Functions

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   cd /path/to/youth-sports-fundraiser
   supabase link --project-ref your-project-ref
   ```

4. Deploy all Edge Functions:
   ```bash
   supabase functions deploy auth
   supabase functions deploy leagues
   supabase functions deploy teams
   supabase functions deploy fundraisers
   supabase functions deploy payments
   supabase functions deploy templates
   ```

5. Set Edge Function secrets:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_test_...
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
   ```

---

## Part 2: Stripe Setup

### Step 1: Get Stripe Keys

1. Go to https://dashboard.stripe.com
2. Navigate to **Developers** → **API keys**
3. Copy:
   - **Publishable key**: `pk_test_...` or `pk_live_...`
   - **Secret key**: `sk_test_...` or `sk_live_...`

### Step 2: Configure Webhooks

1. Go to **Developers** → **Webhooks**
2. Click "Add endpoint"
3. **Endpoint URL**: `https://your-project-ref.supabase.co/functions/v1/payments/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy the **Signing secret**: `whsec_...`

---

## Part 3: Netlify Deployment

### Step 1: Connect GitHub Repository

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select `mpresbyla/YouthSportsFundraiser`
4. Configure build settings:
   - **Base directory**: `client`
   - **Build command**: `pnpm build`
   - **Publish directory**: `client/dist`

### Step 2: Set Environment Variables

In Netlify dashboard, go to **Site settings** → **Environment variables** and add:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51Se3utPFefapxluXZ7mb0EMwvev9q1Qea7WtPqMvRyISFH8kfUTC7j68gt46vH7zp4EbI1v4jeMG4YAyN45tBgHo00FVipUw5w

# Application Configuration
VITE_APP_TITLE=Youth Sports Fundraising Platform
VITE_APP_LOGO=https://your-logo-url.com/logo.png
```

### Step 3: Deploy

1. Click "Deploy site"
2. Wait for build to complete (~2-3 minutes)
3. Your site will be live at `https://random-name-12345.netlify.app`

### Step 4: Configure Custom Domain (Optional)

1. Go to **Domain settings**
2. Click "Add custom domain"
3. Follow instructions to configure DNS
4. Enable HTTPS (automatic with Netlify)

---

## Part 4: Post-Deployment Configuration

### Update Supabase Redirect URLs

1. Go back to Supabase dashboard
2. **Authentication** → **URL Configuration**
3. Add your Netlify domain to **Redirect URLs**:
   - `https://your-site.netlify.app/*`

### Update Stripe Webhook URL

1. Go to Stripe dashboard
2. **Developers** → **Webhooks**
3. Update endpoint URL to use your Supabase project URL

### Create Admin User

1. Register a new account through your deployed site
2. Go to Supabase **Table Editor** → **users**
3. Find your user and change `role` from `user` to `admin`

---

## Environment Variables Summary

### For Netlify (Frontend)

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51Se3utPFefapxluXZ7mb0EMwvev9q1Qea7WtPqMvRyISFH8kfUTC7j68gt46vH7zp4EbI1v4jeMG4YAyN45tBgHo00FVipUw5w
VITE_APP_TITLE=Youth Sports Fundraising Platform
VITE_APP_LOGO=https://your-logo-url.com/logo.png
```

### For Supabase Edge Functions (Backend)

```bash
STRIPE_SECRET_KEY=sk_test_51Se3utPFefapxluXEwq8RC4C5fHRuID75g4gF3oScEoBWo12bWR4K3zGmuF3N9uQkEwrAqDzRdpePuSxzQNWkPUh002d0lhOqY
STRIPE_WEBHOOK_SECRET=whsec_moaCYzhu4Tm87i2HRFmxxnWREYJ1YNLS
```

### For Local Development

Create `.env` file in project root:

```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_APP_TITLE=Youth Sports Fundraising Platform
VITE_APP_LOGO=https://your-logo-url.png
```

---

## Testing the Deployment

1. **Test Registration**:
   - Go to `/register`
   - Create a new account
   - Check email for confirmation link

2. **Test Login**:
   - Go to `/login`
   - Login with your credentials
   - Should redirect to `/dashboard`

3. **Test League Creation**:
   - Click "Create a League"
   - Fill in league details
   - Verify league appears in database

4. **Test Fundraiser Creation**:
   - Create a team
   - Create a fundraiser
   - Verify fundraiser is visible

5. **Test Payment** (use Stripe test cards):
   - Card number: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

---

## Troubleshooting

### Database Connection Issues
- Verify Supabase project is active
- Check that migration ran successfully
- Ensure RLS policies are configured correctly

### Authentication Issues
- Verify redirect URLs are configured in Supabase
- Check that email provider is enabled
- Ensure anon key is correct in environment variables

### Payment Issues
- Verify Stripe keys are correct
- Check webhook endpoint is accessible
- Test with Stripe test cards first

### Edge Function Issues
- Check function logs in Supabase dashboard
- Verify secrets are set correctly
- Ensure CORS headers are configured

---

## Next Steps

1. **Configure Email Service**: Set up custom SMTP for transactional emails
2. **Add Analytics**: Integrate Google Analytics or Plausible
3. **Set up Monitoring**: Use Sentry for error tracking
4. **Enable Backups**: Configure automated database backups
5. **Performance Optimization**: Add CDN for static assets

---

## Support

For issues or questions:
- Supabase Docs: https://supabase.com/docs
- Netlify Docs: https://docs.netlify.com
- Stripe Docs: https://stripe.com/docs

---

## Your Current Credentials

**Stripe (Test Mode)**:
- Publishable Key: `pk_test_51Se3utPFefapxluXZ7mb0EMwvev9q1Qea7WtPqMvRyISFH8kfUTC7j68gt46vH7zp4EbI1v4jeMG4YAyN45tBgHo00FVipUw5w`
- Secret Key: `sk_test_51Se3utPFefapxluXEwq8RC4C5fHRuID75g4gF3oScEoBWo12bWR4K3zGmuF3N9uQkEwrAqDzRdpePuSxzQNWkPUh002d0lhOqY`
- Webhook Secret: `whsec_moaCYzhu4Tm87i2HRFmxxnWREYJ1YNLS`

**Note**: You'll need to create your own Supabase project to get the Supabase URL and keys.
