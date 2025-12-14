# Youth Sports Fundraising Platform - Supabase Version

## Architecture Overview

This is the **Supabase-powered version** of the Youth Sports Fundraising Platform, featuring:

- **Frontend**: React 19 + Vite + Tailwind CSS (deployed on Netlify)
- **Backend**: Supabase Edge Functions (Deno runtime)
- **Database**: Supabase PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth (email/password)
- **Payments**: Stripe integration via Edge Functions
- **File Storage**: Supabase Storage (S3-compatible)

---

## Project Structure

```
youth-sports-fundraiser/
├── client/                          # Frontend application
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   ├── contexts/               # React contexts (SupabaseAuthContext)
│   │   ├── lib/
│   │   │   ├── supabase.ts        # Supabase client configuration
│   │   │   └── supabase-api.ts    # API wrapper for Edge Functions
│   │   ├── pages/                  # Page components
│   │   │   ├── LoginSupabase.tsx  # Login page (Supabase Auth)
│   │   │   └── RegisterSupabase.tsx # Register page (Supabase Auth)
│   │   └── main.tsx                # App entry point
│   └── package.json
│
├── supabase/                        # Supabase configuration
│   ├── migrations/                  # Database migrations
│   │   ├── 20250101000000_initial_schema.sql
│   │   └── 20250102000000_helper_functions.sql
│   └── functions/                   # Edge Functions
│       ├── auth/                    # Authentication endpoints
│       ├── leagues/                 # League management
│       ├── teams/                   # Team management
│       ├── fundraisers/             # Fundraiser CRUD
│       ├── payments/                # Stripe payment processing
│       └── templates/               # Template-specific operations
│
├── SUPABASE_DEPLOYMENT_GUIDE.md    # Step-by-step deployment guide
├── CURRENT_ENV_VARS.md              # Current Manus environment variables
└── README.md                        # This file
```

---

## Key Differences from Manus Version

| Feature | Manus Version | Supabase Version |
|---------|--------------|------------------|
| **Backend** | Express + tRPC | Supabase Edge Functions |
| **Database** | TiDB (MySQL) | Supabase PostgreSQL |
| **Auth** | Custom OAuth | Supabase Auth |
| **API Style** | tRPC (type-safe RPC) | REST (Edge Functions) |
| **Deployment** | Manus hosting | Netlify (frontend) + Supabase (backend) |
| **ORM** | Drizzle ORM | Direct SQL + Supabase client |

---

## Environment Variables

### Frontend (.env)

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Application Configuration
VITE_APP_TITLE=Youth Sports Fundraising Platform
VITE_APP_LOGO=https://your-logo-url.com/logo.png
```

### Backend (Supabase Secrets)

```bash
# Set via: supabase secrets set KEY=value

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Database Schema

The platform uses **19 PostgreSQL tables**:

### Core Tables
- `users` - User accounts and profiles
- `leagues` - Top-level organizations
- `teams` - Teams within leagues
- `user_roles` - Permission management
- `fundraisers` - Fundraising campaigns
- `pledges` - Donor commitments
- `charges` - Payment records

### Template Tables
- `raffle_items` - Raffle prizes
- `raffle_tiers` - Raffle pricing tiers
- `calendar_dates` - Pick-a-date fundraiser dates
- `squares_grids` - Super Bowl squares grids
- `squares_purchases` - Square purchases
- `squares_payouts` - Square payouts
- `challenge_goals` - Challenge milestones
- `team_vs_team_matches` - Competitive fundraising
- `donation_matching` - Sponsor matching

### Supporting Tables
- `stats_entries` - Performance metrics
- `audit_logs` - Action tracking
- `notifications` - Email queue

---

## API Endpoints (Edge Functions)

### Authentication
- `GET /functions/v1/auth` - Get current user

### Leagues
- `GET /functions/v1/leagues` - List all leagues
- `GET /functions/v1/leagues?id={id}` - Get league by ID
- `POST /functions/v1/leagues` - Create league
- `PUT /functions/v1/leagues?id={id}` - Update league

### Teams
- `GET /functions/v1/teams?leagueId={id}` - Get teams by league
- `GET /functions/v1/teams?id={id}` - Get team by ID
- `GET /functions/v1/teams?action=my-teams` - Get user's teams
- `POST /functions/v1/teams` - Create team
- `PUT /functions/v1/teams?id={id}` - Update team

### Fundraisers
- `GET /functions/v1/fundraisers?teamId={id}` - Get fundraisers by team
- `GET /functions/v1/fundraisers?id={id}` - Get fundraiser by ID
- `GET /functions/v1/fundraisers?action=active` - Get active fundraisers
- `POST /functions/v1/fundraisers` - Create fundraiser
- `PUT /functions/v1/fundraisers?id={id}` - Update fundraiser
- `POST /functions/v1/fundraisers?action=publish&id={id}` - Publish fundraiser
- `POST /functions/v1/fundraisers?action=pause&id={id}` - Pause fundraiser
- `POST /functions/v1/fundraisers?action=resume&id={id}` - Resume fundraiser
- `POST /functions/v1/fundraisers?action=complete&id={id}` - Complete fundraiser

### Payments
- `POST /functions/v1/payments?action=create-intent` - Create payment intent
- `POST /functions/v1/payments?action=confirm` - Confirm payment
- `POST /functions/v1/payments?action=webhook` - Stripe webhook handler

### Templates
- **Raffle**: `raffle-items`, `raffle-tiers`, `raffle-item`, `raffle-tier`
- **Calendar**: `calendar-dates`, `calendar-date`, `purchase-date`
- **Squares**: `squares-grid`, `purchase-square`
- **Challenge**: `challenge-goals`, `challenge-goal`
- **Matching**: `donation-matching`

---

## Local Development

### Prerequisites
- Node.js 18+
- pnpm
- Supabase CLI

### Setup

1. **Clone repository**:
   ```bash
   git clone https://github.com/mpresbyla/YouthSportsFundraiser.git
   cd YouthSportsFundraiser
   ```

2. **Install dependencies**:
   ```bash
   cd client
   pnpm install
   ```

3. **Set up Supabase project** (see SUPABASE_DEPLOYMENT_GUIDE.md)

4. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

5. **Run development server**:
   ```bash
   pnpm dev
   ```

6. **Deploy Edge Functions** (optional for local dev):
   ```bash
   supabase functions deploy auth
   supabase functions deploy leagues
   # ... deploy other functions
   ```

---

## Deployment

See **SUPABASE_DEPLOYMENT_GUIDE.md** for complete step-by-step instructions.

### Quick Summary:

1. **Create Supabase project** and run migrations
2. **Deploy Edge Functions** via Supabase CLI
3. **Set Supabase secrets** for Stripe keys
4. **Deploy frontend to Netlify** with environment variables
5. **Configure Stripe webhooks** to point to Edge Function
6. **Update Supabase redirect URLs** with Netlify domain

---

## Testing

### Stripe Test Cards

Use these test cards for payment testing:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Auth**: `4000 0025 0000 3155`

Expiry: Any future date  
CVC: Any 3 digits  
ZIP: Any 5 digits

### Test Users

Create test users through the registration flow. To make a user an admin:

1. Go to Supabase **Table Editor** → **users**
2. Find the user
3. Change `role` from `user` to `admin`

---

## Security

### Row Level Security (RLS)

All tables have RLS enabled with policies for:
- Public read access for active fundraisers
- User-specific access for profile data
- Team manager access for team management
- League admin access for league management

### Authentication

- Supabase Auth handles all authentication
- JWT tokens are automatically managed
- Session persistence across page reloads
- Email verification required for new accounts

### Payments

- Stripe handles all payment processing
- No credit card data touches our servers
- PCI compliance handled by Stripe
- Webhook signature verification for security

---

## Monitoring & Logging

### Supabase Dashboard

- **Logs**: View Edge Function logs in real-time
- **Database**: Monitor query performance
- **Auth**: Track user signups and logins
- **Storage**: Monitor file uploads

### Error Tracking

Consider integrating:
- **Sentry** for frontend error tracking
- **LogRocket** for session replay
- **Datadog** for comprehensive monitoring

---

## Migration from Manus Version

If you have data in the Manus version and want to migrate:

1. **Export data** from TiDB (MySQL)
2. **Transform schema** (MySQL → PostgreSQL)
3. **Import data** into Supabase
4. **Update IDs** and foreign keys as needed
5. **Test thoroughly** before switching

Contact support for migration assistance.

---

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Stripe Docs**: https://stripe.com/docs
- **Netlify Docs**: https://docs.netlify.com
- **React Docs**: https://react.dev

---

## License

MIT License - See LICENSE file for details

---

## Contributors

- Michael Presbyla (@mpresbyla)
- Built with assistance from Manus AI

---

## Changelog

### Version 2.0.0 (Supabase Migration)
- Migrated from Manus/TiDB to Supabase/PostgreSQL
- Replaced tRPC with Edge Functions
- Implemented Supabase Auth
- Added comprehensive RLS policies
- Created deployment automation

### Version 1.0.0 (Manus Version)
- Initial release with tRPC + Express
- 8 fundraiser templates
- Stripe Connect integration
- Team and league management
