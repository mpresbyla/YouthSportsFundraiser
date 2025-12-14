-- Youth Sports Fundraising Platform - Initial Schema Migration for Supabase
-- This migration converts the Drizzle/MySQL schema to PostgreSQL

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS TABLE
-- Note: Supabase Auth handles authentication, but we keep this for additional user data
-- ============================================================================
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  open_id VARCHAR(64) UNIQUE,
  name TEXT,
  email VARCHAR(320) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  login_method VARCHAR(64),
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_signed_in TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_open_id ON users(open_id);

-- ============================================================================
-- LEAGUES TABLE
-- ============================================================================
CREATE TABLE leagues (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  logo_url TEXT,
  default_fee_percentage INTEGER NOT NULL DEFAULT 5,
  allowed_fundraiser_types TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leagues_name ON leagues(name);

-- ============================================================================
-- TEAMS TABLE
-- ============================================================================
CREATE TABLE teams (
  id BIGSERIAL PRIMARY KEY,
  league_id BIGINT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  logo_url TEXT,
  stripe_account_id VARCHAR(255),
  stripe_onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  fee_percentage INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teams_league_id ON teams(league_id);
CREATE INDEX idx_teams_name ON teams(name);

-- ============================================================================
-- USER ROLES TABLE
-- ============================================================================
CREATE TABLE user_roles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  league_id BIGINT REFERENCES leagues(id) ON DELETE CASCADE,
  team_id BIGINT REFERENCES teams(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('league_admin', 'team_manager')),
  granted_by BIGINT REFERENCES users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_league_id ON user_roles(league_id);
CREATE INDEX idx_user_roles_team_id ON user_roles(team_id);

-- ============================================================================
-- FUNDRAISERS TABLE
-- ============================================================================
CREATE TABLE fundraisers (
  id BIGSERIAL PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  fundraiser_type VARCHAR(30) NOT NULL CHECK (fundraiser_type IN ('direct_donation', 'micro_fundraiser')),
  fundraiser_template VARCHAR(30) NOT NULL DEFAULT 'direct_donation' CHECK (fundraiser_template IN (
    'direct_donation', 'micro_fundraiser', 'raffle', 'squares', 'challenge', 
    'team_vs_team', 'calendar', 'donation_matching'
  )),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  goal_amount BIGINT,
  config JSONB,
  published_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_amount_pledged BIGINT NOT NULL DEFAULT 0,
  total_amount_charged BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fundraisers_team_id ON fundraisers(team_id);
CREATE INDEX idx_fundraisers_status ON fundraisers(status);
CREATE INDEX idx_fundraisers_template ON fundraisers(fundraiser_template);

-- ============================================================================
-- PLEDGES TABLE
-- ============================================================================
CREATE TABLE pledges (
  id BIGSERIAL PRIMARY KEY,
  fundraiser_id BIGINT NOT NULL REFERENCES fundraisers(id) ON DELETE CASCADE,
  donor_name VARCHAR(255) NOT NULL,
  donor_email VARCHAR(320) NOT NULL,
  donor_phone VARCHAR(50),
  pledge_type VARCHAR(20) NOT NULL CHECK (pledge_type IN ('direct_donation', 'micro_pledge')),
  base_amount BIGINT NOT NULL,
  cap_amount BIGINT,
  multiplier INTEGER,
  calculated_amount BIGINT,
  final_amount BIGINT NOT NULL,
  platform_fee BIGINT NOT NULL,
  donor_tip BIGINT NOT NULL DEFAULT 0,
  stripe_customer_id VARCHAR(255),
  stripe_setup_intent_id VARCHAR(255),
  stripe_payment_method_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  status VARCHAR(30) NOT NULL CHECK (status IN ('pending_authorization', 'authorized', 'charged', 'failed', 'refunded')),
  authorized_at TIMESTAMPTZ,
  charged_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pledges_fundraiser_id ON pledges(fundraiser_id);
CREATE INDEX idx_pledges_donor_email ON pledges(donor_email);
CREATE INDEX idx_pledges_status ON pledges(status);

-- ============================================================================
-- STATS ENTRIES TABLE
-- ============================================================================
CREATE TABLE stats_entries (
  id BIGSERIAL PRIMARY KEY,
  fundraiser_id BIGINT NOT NULL REFERENCES fundraisers(id) ON DELETE CASCADE,
  metric_name VARCHAR(255) NOT NULL,
  metric_value INTEGER NOT NULL,
  entered_by BIGINT NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stats_entries_fundraiser_id ON stats_entries(fundraiser_id);

-- ============================================================================
-- CHARGES TABLE
-- ============================================================================
CREATE TABLE charges (
  id BIGSERIAL PRIMARY KEY,
  pledge_id BIGINT NOT NULL REFERENCES pledges(id) ON DELETE CASCADE,
  fundraiser_id BIGINT NOT NULL REFERENCES fundraisers(id) ON DELETE CASCADE,
  gross_amount BIGINT NOT NULL,
  platform_fee BIGINT NOT NULL,
  donor_tip BIGINT NOT NULL DEFAULT 0,
  net_amount BIGINT NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  status VARCHAR(20) NOT NULL CHECK (status IN ('succeeded', 'failed', 'refunded')),
  failure_code VARCHAR(255),
  failure_message TEXT,
  refund_amount BIGINT,
  refund_reason TEXT,
  succeeded_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_charges_pledge_id ON charges(pledge_id);
CREATE INDEX idx_charges_fundraiser_id ON charges(fundraiser_id);
CREATE INDEX idx_charges_status ON charges(status);

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id BIGINT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  recipient_email VARCHAR(320) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  template_data JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_email);

-- ============================================================================
-- RAFFLE ITEMS TABLE
-- ============================================================================
CREATE TABLE raffle_items (
  id BIGSERIAL PRIMARY KEY,
  fundraiser_id BIGINT NOT NULL REFERENCES fundraisers(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  sponsor_name VARCHAR(255),
  sponsor_logo_url VARCHAR(500),
  total_entries INTEGER NOT NULL DEFAULT 0,
  winner_pledge_id BIGINT REFERENCES pledges(id),
  drawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raffle_items_fundraiser_id ON raffle_items(fundraiser_id);

-- ============================================================================
-- RAFFLE TIERS TABLE
-- ============================================================================
CREATE TABLE raffle_tiers (
  id BIGSERIAL PRIMARY KEY,
  fundraiser_id BIGINT NOT NULL REFERENCES fundraisers(id) ON DELETE CASCADE,
  price BIGINT NOT NULL,
  entries INTEGER NOT NULL,
  label VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_raffle_tiers_fundraiser_id ON raffle_tiers(fundraiser_id);

-- ============================================================================
-- SQUARES GRIDS TABLE
-- ============================================================================
CREATE TABLE squares_grids (
  id BIGSERIAL PRIMARY KEY,
  fundraiser_id BIGINT NOT NULL REFERENCES fundraisers(id) ON DELETE CASCADE,
  grid_size INTEGER NOT NULL DEFAULT 100,
  price_per_square BIGINT NOT NULL,
  home_team VARCHAR(255),
  away_team VARCHAR(255),
  event_date TIMESTAMPTZ,
  home_numbers JSONB,
  away_numbers JSONB,
  numbers_locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_squares_grids_fundraiser_id ON squares_grids(fundraiser_id);

-- ============================================================================
-- SQUARES PURCHASES TABLE
-- ============================================================================
CREATE TABLE squares_purchases (
  id BIGSERIAL PRIMARY KEY,
  grid_id BIGINT NOT NULL REFERENCES squares_grids(id) ON DELETE CASCADE,
  pledge_id BIGINT NOT NULL REFERENCES pledges(id) ON DELETE CASCADE,
  square_position INTEGER NOT NULL,
  donor_name VARCHAR(255),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_squares_purchases_grid_id ON squares_purchases(grid_id);
CREATE INDEX idx_squares_purchases_pledge_id ON squares_purchases(pledge_id);

-- ============================================================================
-- SQUARES PAYOUTS TABLE
-- ============================================================================
CREATE TABLE squares_payouts (
  id BIGSERIAL PRIMARY KEY,
  grid_id BIGINT NOT NULL REFERENCES squares_grids(id) ON DELETE CASCADE,
  quarter INTEGER,
  home_score INTEGER,
  away_score INTEGER,
  winner_square_id BIGINT,
  payout_amount BIGINT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_squares_payouts_grid_id ON squares_payouts(grid_id);

-- ============================================================================
-- CHALLENGE GOALS TABLE
-- ============================================================================
CREATE TABLE challenge_goals (
  id BIGSERIAL PRIMARY KEY,
  fundraiser_id BIGINT NOT NULL REFERENCES fundraisers(id) ON DELETE CASCADE,
  goal_amount BIGINT NOT NULL,
  challenge_description TEXT NOT NULL,
  completed_description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_challenge_goals_fundraiser_id ON challenge_goals(fundraiser_id);

-- ============================================================================
-- TEAM VS TEAM MATCHES TABLE
-- ============================================================================
CREATE TABLE team_vs_team_matches (
  id BIGSERIAL PRIMARY KEY,
  fundraiser_1_id BIGINT NOT NULL REFERENCES fundraisers(id) ON DELETE CASCADE,
  fundraiser_2_id BIGINT NOT NULL REFERENCES fundraisers(id) ON DELETE CASCADE,
  loser_challenge TEXT,
  winner_id BIGINT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_vs_team_matches_fundraiser_1 ON team_vs_team_matches(fundraiser_1_id);
CREATE INDEX idx_team_vs_team_matches_fundraiser_2 ON team_vs_team_matches(fundraiser_2_id);

-- ============================================================================
-- CALENDAR DATES TABLE
-- ============================================================================
CREATE TABLE calendar_dates (
  id BIGSERIAL PRIMARY KEY,
  fundraiser_id BIGINT NOT NULL REFERENCES fundraisers(id) ON DELETE CASCADE,
  date_value DATE NOT NULL,
  amount BIGINT NOT NULL,
  purchaser_pledge_id BIGINT REFERENCES pledges(id),
  purchaser_name VARCHAR(255),
  purchased_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calendar_dates_fundraiser_id ON calendar_dates(fundraiser_id);
CREATE INDEX idx_calendar_dates_date_value ON calendar_dates(date_value);

-- ============================================================================
-- DONATION MATCHING TABLE
-- ============================================================================
CREATE TABLE donation_matching (
  id BIGSERIAL PRIMARY KEY,
  fundraiser_id BIGINT NOT NULL REFERENCES fundraisers(id) ON DELETE CASCADE,
  sponsor_name VARCHAR(255) NOT NULL,
  sponsor_logo_url VARCHAR(500),
  match_amount BIGINT NOT NULL,
  match_ratio INTEGER NOT NULL DEFAULT 100,
  current_matched BIGINT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_donation_matching_fundraiser_id ON donation_matching(fundraiser_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leagues_updated_at BEFORE UPDATE ON leagues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fundraisers_updated_at BEFORE UPDATE ON fundraisers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pledges_updated_at BEFORE UPDATE ON pledges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stats_entries_updated_at BEFORE UPDATE ON stats_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_charges_updated_at BEFORE UPDATE ON charges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fundraisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE raffle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE raffle_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE squares_grids ENABLE ROW LEVEL SECURITY;
ALTER TABLE squares_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE squares_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_vs_team_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_matching ENABLE ROW LEVEL SECURITY;

-- Public read access for leagues and teams
CREATE POLICY "Public can view leagues" ON leagues FOR SELECT USING (true);
CREATE POLICY "Public can view teams" ON teams FOR SELECT USING (true);

-- Public read access for active fundraisers
CREATE POLICY "Public can view active fundraisers" ON fundraisers 
  FOR SELECT USING (status = 'active');

-- Public read access for fundraiser-related data (when fundraiser is active)
CREATE POLICY "Public can view raffle items" ON raffle_items 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fundraisers 
      WHERE fundraisers.id = raffle_items.fundraiser_id 
      AND fundraisers.status = 'active'
    )
  );

CREATE POLICY "Public can view raffle tiers" ON raffle_tiers 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fundraisers 
      WHERE fundraisers.id = raffle_tiers.fundraiser_id 
      AND fundraisers.status = 'active'
    )
  );

-- Users can view their own data
CREATE POLICY "Users can view own profile" ON users 
  FOR SELECT USING (auth.uid()::text = open_id);

CREATE POLICY "Users can update own profile" ON users 
  FOR UPDATE USING (auth.uid()::text = open_id);

-- Team managers can manage their teams
CREATE POLICY "Team managers can view their teams" ON teams 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.team_id = teams.id 
      AND user_roles.role = 'team_manager'
      AND user_roles.user_id IN (SELECT id FROM users WHERE open_id = auth.uid()::text)
    )
  );

-- More RLS policies can be added as needed for specific use cases

-- ============================================================================
-- SEED DATA (Optional - for development)
-- ============================================================================

-- Insert a default admin user (you should change this in production)
-- INSERT INTO users (name, email, role, open_id) 
-- VALUES ('Admin User', 'admin@example.com', 'admin', 'admin-open-id');

COMMENT ON TABLE users IS 'User accounts with authentication data';
COMMENT ON TABLE leagues IS 'Top-level organizations containing teams';
COMMENT ON TABLE teams IS 'Teams that belong to leagues and run fundraisers';
COMMENT ON TABLE fundraisers IS 'Fundraising campaigns run by teams';
COMMENT ON TABLE pledges IS 'Donor commitments and donations';
COMMENT ON TABLE raffle_items IS 'Prizes for raffle fundraisers';
COMMENT ON TABLE raffle_tiers IS 'Pricing tiers for raffle entries';
