# Netlify Deployment Guide

## Issue 1: Repository Not Found (SOLVED)

**Error**: `fatal: repository 'https://github.com/mpresbyla/YouthSportsFundraiser.git/' not found`

**Cause**: The repository is **PRIVATE**

**Solution**: You have two options:

### Option A: Make Repository Public (Recommended for Open Source)

```bash
gh repo edit mpresbyla/YouthSportsFundraiser --visibility public
```

### Option B: Keep Private and Use Netlify GitHub Integration

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Click "GitHub" (this will authenticate and give Netlify access to private repos)
4. Select `mpresbyla/YouthSportsFundraiser` from the list
5. Netlify will have access even though it's private

**Recommended**: Use Option B to keep your code private while deploying.

---

## Issue 2: 404 Page Not Found on Netlify (SOLVED)

**Error**: Navigating to any route shows "404 Page Not Found"

**Cause**: Netlify doesn't know how to handle client-side routing (React Router)

**Solution**: Already fixed! Two configuration files have been added:

1. **`netlify.toml`** (at repository root)
   - Configures build settings
   - Sets up SPA redirects
   - Adds security headers

2. **`client/public/_redirects`** (fallback)
   - Simple redirect rule for SPA routing

These files tell Netlify to serve `index.html` for all routes, allowing React Router to handle navigation.

---

## Deployment Steps

### Step 1: Clone Repository (If Private)

You need to authenticate with GitHub first:

```bash
# Authenticate GitHub CLI
gh auth login

# Clone the repository
gh repo clone mpresbyla/YouthSportsFundraiser
cd YouthSportsFundraiser
```

**OR** if you make it public:

```bash
git clone https://github.com/mpresbyla/YouthSportsFundraiser.git
cd YouthSportsFundraiser
```

### Step 2: Deploy to Netlify

#### Option A: Netlify Dashboard (Easiest)

1. Go to https://app.netlify.com
2. Click "**Add new site**" → "**Import an existing project**"
3. Click "**GitHub**"
4. Authorize Netlify to access your GitHub account
5. Select `**mpresbyla/YouthSportsFundraiser**`
6. **Build settings** (should auto-detect from `netlify.toml`):
   - Build command: `cd client && npm install && npm run build`
   - Publish directory: `client/dist`
   - Node version: 18
7. **Environment variables** (click "Add environment variable"):
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51Se3utPFefapxluXZ7mb0EMwvev9q1Qea7WtPqMvRyISFH8kfUTC7j68gt46vH7zp4EbI1v4jeMG4YAyN45tBgHo00FVipUw5w
   ```
8. Click "**Deploy site**"

#### Option B: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site
netlify init

# Deploy
netlify deploy --prod
```

### Step 3: Verify Deployment

1. Wait for build to complete (2-3 minutes)
2. Click on the deployed site URL
3. Test navigation:
   - Homepage: `https://your-site.netlify.app/`
   - Login: `https://your-site.netlify.app/login`
   - Register: `https://your-site.netlify.app/register`
4. All routes should work without 404 errors

---

## Environment Variables Required

After deploying to Supabase (using `./deploy-supabase.sh`), you'll get these values:

| Variable | Example Value | Where to Get It |
|----------|---------------|-----------------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase dashboard → Settings → API → anon/public |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_test_51Se3utPFefapxluX...` | Already have: `pk_test_51Se3utPFefapxluXZ7mb0EMwvev9q1Qea7WtPqMvRyISFH8kfUTC7j68gt46vH7zp4EbI1v4jeMG4YAyN45tBgHo00FVipUw5w` |

### How to Set Environment Variables in Netlify

1. Go to your site in Netlify dashboard
2. Click "**Site configuration**" → "**Environment variables**"
3. Click "**Add a variable**"
4. Enter key and value
5. Click "**Create variable**"
6. Repeat for all three variables
7. **Trigger redeploy**: Deploys → Trigger deploy → Deploy site

---

## Troubleshooting

### Build Fails: "npm: command not found"

**Solution**: Set Node version in Netlify

1. Go to Site configuration → Environment variables
2. Add: `NODE_VERSION` = `18`
3. Redeploy

### Build Fails: "Cannot find module"

**Solution**: Clear cache and redeploy

1. Go to Deploys
2. Click "**Trigger deploy**" → "**Clear cache and deploy site**"

### 404 on Routes After Deployment

**Solution**: Verify redirect files exist

```bash
# Check netlify.toml exists at root
ls netlify.toml

# Check _redirects exists in client/public
ls client/public/_redirects
```

If missing, they've been added to the repository. Pull latest changes:

```bash
git pull origin main
```

Then redeploy.

### Environment Variables Not Working

**Solution**: Ensure variables start with `VITE_`

Vite only exposes environment variables that start with `VITE_` to the client.

**Correct**: `VITE_SUPABASE_URL`  
**Wrong**: `SUPABASE_URL`

### Site Deployed But Shows Blank Page

**Solution**: Check browser console for errors

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors related to:
   - Missing environment variables
   - CORS issues
   - API connection failures

Common fix: Ensure all environment variables are set in Netlify.

---

## Complete Deployment Checklist

- [ ] Repository is accessible (public or Netlify has access)
- [ ] `netlify.toml` exists at repository root
- [ ] `client/public/_redirects` exists
- [ ] Supabase project deployed (run `./deploy-supabase.sh`)
- [ ] Netlify site created and connected to GitHub
- [ ] Environment variables set in Netlify:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `VITE_STRIPE_PUBLISHABLE_KEY`
- [ ] Build successful
- [ ] Site accessible at Netlify URL
- [ ] All routes work (no 404 errors)
- [ ] Login/Register functional
- [ ] Stripe payments working

---

## Repository Access Summary

**Repository**: `mpresbyla/YouthSportsFundraiser`  
**Visibility**: PRIVATE  
**URL**: https://github.com/mpresbyla/YouthSportsFundraiser

**To clone**:
```bash
gh auth login
gh repo clone mpresbyla/YouthSportsFundraiser
```

**To make public** (if desired):
```bash
gh repo edit mpresbyla/YouthSportsFundraiser --visibility public
```

---

## Next Steps After Successful Deployment

1. **Custom Domain**: Add your own domain in Netlify → Domain settings
2. **HTTPS**: Automatically enabled by Netlify
3. **Continuous Deployment**: Enabled by default - every push to `main` triggers redeploy
4. **Preview Deploys**: Every PR gets a preview URL
5. **Monitoring**: View analytics in Netlify dashboard

---

## Support

- **Netlify Docs**: https://docs.netlify.com
- **Netlify Support**: https://answers.netlify.com
- **GitHub CLI**: https://cli.github.com/manual

---

## Quick Reference

**Clone (Private Repo)**:
```bash
gh repo clone mpresbyla/YouthSportsFundraiser
```

**Deploy to Netlify**:
```bash
cd YouthSportsFundraiser
netlify init
netlify deploy --prod
```

**Set Environment Variable**:
```bash
netlify env:set VITE_SUPABASE_URL "https://xxxxx.supabase.co"
```

**Trigger Redeploy**:
```bash
netlify deploy --prod
```

**View Logs**:
```bash
netlify logs
```
