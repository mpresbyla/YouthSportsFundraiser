# Fix Database Setup - Step by Step Guide

## Issues Found

Your database has **0 tables** because migrations haven't been run yet. Also found configuration issues in your `.env` file.

## Step 1: Fix Your .env File

### Option A: Copy the Corrected File (Easiest)

```powershell
# In PowerShell, run:
copy .env.corrected .env
```

### Option B: Manually Edit Your .env

Open your `.env` file and make these changes:

1. **Fix DATABASE_URL** - Change `&` to `%26`:
   ```
   # OLD (WRONG):
   DATABASE_URL=postgresql://postgres:tatY3h3jXsvFt&v@db...
   
   # NEW (CORRECT):
   DATABASE_URL=postgresql://postgres:tatY3h3jXsvFt%26v@db...
   ```

2. **Fix JWT_SECRET** - Replace with this secure random string:
   ```
   JWT_SECRET=kgmTcU9ztVqjg3Ft56bXwjMGzbb/cQ8W9QDjyqLsY6M=
   ```

3. **Fix Stripe Keys** - Get your REAL test keys from https://dashboard.stripe.com/test/apikeys
   ```
   # Your keys should start with sk_test_ and pk_test_, NOT mk_
   STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY_HERE
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_ACTUAL_KEY_HERE
   ```

## Step 2: Run Database Migrations

### Option A: Use PowerShell Script (Recommended)

```powershell
# In PowerShell, run:
.\run-migrations.ps1
```

This script will:
- ✅ Check your setup
- ✅ Install dependencies
- ✅ Run migrations to create all 19 tables
- ✅ Show success message

### Option B: Manual Commands

```powershell
# Install dependencies
pnpm install

# Run migrations
pnpm db:push
```

## Step 3: Verify Database Tables Were Created

After running migrations, you should see output like:

```
✓ Applying migrations...
✓ Created table: users
✓ Created table: leagues
✓ Created table: teams
✓ Created table: fundraisers
... (15 more tables)
✓ Migrations completed!
```

## Step 4: Start the Dev Server

```powershell
pnpm dev
```

## Step 5: Test the Application

1. Open http://localhost:3000
2. Click **Register** and create an account
3. Login with your new account
4. You should see the Dashboard without any database errors!

## Troubleshooting

### Error: "relation 'users' does not exist"
- Migrations didn't run successfully
- Check your DATABASE_URL has `%26` not `&`
- Run `pnpm db:push` again

### Error: "Invalid connection string"
- Your DATABASE_URL has the wrong format
- Copy from `.env.corrected` file

### Error: "Stripe error 401 Unauthorized"
- Your Stripe keys are invalid
- Get real test keys from https://dashboard.stripe.com/test/apikeys
- Update STRIPE_SECRET_KEY and VITE_STRIPE_PUBLISHABLE_KEY in .env

### Migrations Still Failing?
1. Check Supabase project is active: https://app.supabase.com/project/vxtkjzdzaaqhypgiyhyj
2. Verify password is correct
3. Try resetting your Supabase database password

## What Gets Created

The migrations will create these 19 tables:

1. **users** - User accounts and authentication
2. **leagues** - Sports leagues
3. **teams** - Teams within leagues
4. **fundraisers** - Fundraising campaigns
5. **pledges** - Donor pledges/donations
6. **charges** - Payment charges
7. **raffleItems** - Raffle prizes
8. **raffleTiers** - Raffle entry tiers
9. **calendarDates** - Calendar fundraiser dates
10. **squaresGrids** - Squares game grids
11. **squaresCells** - Individual squares
12. **challengeMilestones** - Challenge goals
13. **donationMatches** - Matching donations
14. **teamCompetitions** - Team vs team competitions
15. **teamStats** - Team performance stats
16. **activityLogs** - Audit trail
17. **teamRoles** - User roles in teams
18. **leagueRoles** - User roles in leagues
19. **fundraiserStats** - Fundraiser analytics

## Need Help?

If you're still stuck after following these steps, share:
1. The exact error message you're seeing
2. Which step failed
3. Output from running `pnpm db:push`
