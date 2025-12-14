# Netlify Environment Variables Configuration

## Required Environment Variables

Your Netlify deployment needs these environment variables to work correctly:

### Critical (App Won't Work Without These)

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-from-supabase
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_KEY
```

### Optional (For Full Functionality)

```
VITE_APP_ID=your-app-id
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your-api-key
```

## How to Add Environment Variables in Netlify

### Step 1: Go to Site Settings

1. Log in to Netlify: https://app.netlify.com
2. Select your site: **youthsportsfundraiser**
3. Click **Site settings** in the top menu
4. Click **Environment variables** in the left sidebar

### Step 2: Add Each Variable

For each variable above:

1. Click **Add a variable** button
2. Select **Add a single variable**
3. Enter the **Key** (e.g., `VITE_SUPABASE_URL`)
4. Enter the **Value** (your actual URL/key)
5. Click **Create variable**

### Step 3: Redeploy

After adding all variables:

1. Go to **Deploys** tab
2. Click **Trigger deploy** button
3. Select **Deploy site**
4. Wait for deployment to complete (~2 minutes)

## Where to Get These Values

### Supabase Variables

Get from Supabase Dashboard:

1. Go to: https://app.supabase.com
2. Select your project
3. Click **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### Stripe Variables

Get from Stripe Dashboard:

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy **Publishable key** → `VITE_STRIPE_PUBLISHABLE_KEY`

Use your test key:
```
pk_test_51Se3utPFefapxluXZ7mb0EMwvev9q1Qea7WtPqMvRyISFH8kfUTC7j68gt46vH7zp4EbI1v4jeMG4YAyN45tBgHo00FVipUw5w
```

## Quick Copy-Paste Template

Once you have your Supabase project set up, fill in this template:

```bash
# REQUIRED - Get from Supabase Dashboard
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# REQUIRED - Stripe Test Key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51Se3utPFefapxluXZ7mb0EMwvev9q1Qea7WtPqMvRyISFH8kfUTC7j68gt46vH7zp4EbI1v4jeMG4YAyN45tBgHo00FVipUw5w
```

## Troubleshooting

### Still Getting "Invalid URL" Error?

1. **Check variable names** - Must match exactly (case-sensitive)
2. **No quotes** - Don't wrap values in quotes in Netlify UI
3. **Redeploy** - Changes only apply after redeployment
4. **Check browser console** - Look for which URL is invalid

### How to Verify Variables Are Set

After deployment, check the deploy log:

1. Go to **Deploys** tab
2. Click on latest deploy
3. Scroll to **Build** section
4. Look for "Environment variables" - should show your VITE_ variables

### Common Mistakes

❌ **Wrong:** `VITE_SUPABASE_URL="https://..."`  (has quotes)
✅ **Right:** `VITE_SUPABASE_URL=https://...`  (no quotes)

❌ **Wrong:** `SUPABASE_URL=https://...`  (missing VITE_ prefix)
✅ **Right:** `VITE_SUPABASE_URL=https://...`  (has VITE_ prefix)

## Need Help Setting Up Supabase?

If you haven't set up Supabase yet:

1. Run the deployment script: `./deploy-supabase.sh` (in Git Bash)
2. Or follow: [SUPABASE_DEPLOYMENT_GUIDE.md](./SUPABASE_DEPLOYMENT_GUIDE.md)

## Next Steps

After adding environment variables and redeploying:

1. Visit your site: https://youthsportsfundraiser.netlify.app
2. Should load without errors
3. Test login/registration
4. Create a league and fundraiser
5. Test payment flow

If you still see errors, check the browser console (F12) for specific error messages.
