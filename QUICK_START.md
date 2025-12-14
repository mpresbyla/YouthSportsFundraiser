# Quick Start - Deploy to Supabase in 5 Minutes

## Prerequisites

- Node.js 18+ installed
- GitHub account (already set up ✓)
- Stripe account with API keys (already have ✓)

## Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

## Step 2: Clone Your Repository

```bash
git clone https://github.com/mpresbyla/YouthSportsFundraiser.git
cd YouthSportsFundraiser
```

## Step 3: Run Automated Deployment

```bash
./deploy-supabase.sh
```

This script will:
- ✅ Log you into Supabase
- ✅ Create or link to a Supabase project
- ✅ Run all database migrations (19 tables + views + functions)
- ✅ Configure environment secrets (Stripe keys)
- ✅ Deploy all 7 Edge Functions
- ✅ Provide you with project URL and API keys

## Step 4: Enable Stripe Wrapper (Manual - 2 minutes)

The script will pause and ask you to:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Database** → **Extensions**
4. Enable "**Supabase Wrappers**"
5. Go to **Settings** → **Vault**
6. Click "**New Secret**"
7. Name: `stripe_secret_key`
8. Value: `sk_test_51Se3utPFefapxluXEwq8RC4C5fHRuID75g4gF3oScEoBWo12bWR4K3zGmuF3N9uQkEwrAqDzRdpePuSxzQNWkPUh002d0lhOqY`
9. Click "**Create Secret**"
10. Press Enter in terminal to continue

## Step 5: Deploy Frontend to Netlify

### Option A: Netlify Dashboard (Recommended)

1. Go to https://app.netlify.com
2. Click "**Add new site**" → "**Import an existing project**"
3. Connect to GitHub and select `mpresbyla/YouthSportsFundraiser`
4. **Build settings**:
   - Build command: `cd client && npm install && npm run build`
   - Publish directory: `client/dist`
5. **Environment variables** (from deployment script output):
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51Se3utPFefapxluXZ7mb0EMwvev9q1Qea7WtPqMvRyISFH8kfUTC7j68gt46vH7zp4EbI1v4jeMG4YAyN45tBgHo00FVipUw5w
   ```
6. Click "**Deploy site**"

### Option B: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd client
netlify deploy --prod

# Follow prompts and set environment variables
```

## Step 6: Configure Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click "**Add endpoint**"
3. **Endpoint URL**: `https://xxxxx.supabase.co/functions/v1/payments-v2?action=webhook`
   (Replace with your Supabase project URL from Step 3)
4. **Events to send**:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Click "**Add endpoint**"
6. Copy the "**Signing secret**" (starts with `whsec_`)
7. Update in Supabase:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

## Step 7: Test Your Deployment

1. Visit your Netlify URL
2. Click "**Get Started**" → "**Register**"
3. Create an account
4. Create a league and team
5. Create a fundraiser
6. Test a donation

## 🎉 You're Live!

Your platform is now deployed and ready to accept donations!

---

## Your Credentials Reference

### Stripe (Test Mode)
- **Secret Key**: `sk_test_51Se3utPFefapxluXEwq8RC4C5fHRuID75g4gF3oScEoBWo12bWR4K3zGmuF3N9uQkEwrAqDzRdpePuSxzQNWkPUh002d0lhOqY`
- **Publishable Key**: `pk_test_51Se3utPFefapxluXZ7mb0EMwvev9q1Qea7WtPqMvRyISFH8kfUTC7j68gt46vH7zp4EbI1v4jeMG4YAyN45tBgHo00FVipUw5w`
- **Webhook Secret**: `whsec_moaCYzhu4Tm87i2HRFmxxnWREYJ1YNLS`

### Supabase
- Will be provided after running `deploy-supabase.sh`

---

## Troubleshooting

### "supabase: command not found"
```bash
npm install -g supabase
```

### "Permission denied: ./deploy-supabase.sh"
```bash
chmod +x deploy-supabase.sh
```

### "Migration failed"
- Check Supabase dashboard logs
- Ensure Wrappers extension is enabled
- Verify Stripe key is in Vault

### "Edge Function deployment failed"
- Check function logs in Supabase dashboard
- Verify secrets are set: `supabase secrets list`
- Redeploy specific function: `supabase functions deploy function-name`

### "Frontend build failed"
- Ensure environment variables are set in Netlify
- Check build logs in Netlify dashboard
- Verify `client/dist` exists after build

---

## Advanced Configuration

### Custom Domain

**Netlify**:
1. Go to **Domain settings**
2. Click "**Add custom domain**"
3. Follow DNS configuration steps

**Supabase**:
- Custom domains available on Pro plan
- Configure in Settings → API

### Production Stripe Keys

Replace test keys with live keys:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxx
```

Update Netlify env vars with live publishable key.

### Enable Analytics

Supabase provides built-in analytics:
- Go to **Reports** in dashboard
- View API usage, database performance, Edge Function metrics

### Set Up Backups

Supabase Pro includes:
- Daily automated backups
- Point-in-time recovery
- Download backups anytime

---

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Netlify Docs**: https://docs.netlify.com
- **Stripe Docs**: https://stripe.com/docs
- **Project Docs**: See `SUPABASE_README.md`, `STRIPE_WRAPPER_GUIDE.md`

---

## What's Deployed

✅ **Database** (19 tables)
- Users, leagues, teams, fundraisers
- Pledges, charges, refunds
- Raffle items, calendar dates, squares
- Challenges, donation matching
- User roles, team members

✅ **Stripe Wrapper** (5 foreign tables)
- Direct SQL queries to Stripe API
- Real-time payment data
- Analytics views

✅ **Edge Functions** (7 functions)
- auth, leagues, teams, fundraisers
- payments, payments-v2 (with Stripe Wrapper)
- templates (raffle, calendar, squares)

✅ **Frontend** (React + Vite)
- Homepage, auth pages
- Dashboard, league/team management
- Fundraiser creation wizard
- Template-specific pages
- Payment processing

---

## Next Steps After Deployment

1. **Customize branding** - Update logo, colors, copy
2. **Add team members** - Invite coaches and managers
3. **Create first fundraiser** - Test the full flow
4. **Set up email notifications** - Configure SMTP
5. **Add custom domain** - Professional URL
6. **Go live with real Stripe keys** - Accept real payments

---

**Estimated Total Time**: 10-15 minutes

**Cost**: 
- Supabase Free tier: $0/month (500MB database, 2GB bandwidth)
- Netlify Free tier: $0/month (100GB bandwidth)
- Stripe: 2.9% + $0.30 per transaction
