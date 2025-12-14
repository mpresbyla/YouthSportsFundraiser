-- Helper function to increment fundraiser totals
CREATE OR REPLACE FUNCTION increment_fundraiser_totals(
  fundraiser_id BIGINT,
  amount BIGINT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE fundraisers
  SET 
    total_amount_charged = total_amount_charged + amount,
    total_amount_pledged = total_amount_pledged + amount
  WHERE id = fundraiser_id;
END;
$$;

-- Helper function to get user stats
CREATE OR REPLACE FUNCTION get_user_stats(user_open_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  internal_user_id BIGINT;
BEGIN
  -- Get internal user ID
  SELECT id INTO internal_user_id
  FROM users
  WHERE open_id = user_open_id;

  IF internal_user_id IS NULL THEN
    RETURN json_build_object(
      'teamsManaged', 0,
      'activeFundraisers', 0,
      'totalRaised', 0,
      'myDonations', 0
    );
  END IF;

  -- Calculate stats
  SELECT json_build_object(
    'teamsManaged', (
      SELECT COUNT(DISTINCT team_id)
      FROM user_roles
      WHERE user_id = internal_user_id
        AND role = 'team_manager'
        AND revoked_at IS NULL
    ),
    'activeFundraisers', (
      SELECT COUNT(*)
      FROM fundraisers f
      INNER JOIN teams t ON f.team_id = t.id
      INNER JOIN user_roles ur ON ur.team_id = t.id
      WHERE ur.user_id = internal_user_id
        AND ur.role = 'team_manager'
        AND ur.revoked_at IS NULL
        AND f.status = 'active'
    ),
    'totalRaised', COALESCE((
      SELECT SUM(f.total_amount_charged)
      FROM fundraisers f
      INNER JOIN teams t ON f.team_id = t.id
      INNER JOIN user_roles ur ON ur.team_id = t.id
      WHERE ur.user_id = internal_user_id
        AND ur.role = 'team_manager'
        AND ur.revoked_at IS NULL
    ), 0),
    'myDonations', COALESCE((
      SELECT COUNT(*)
      FROM pledges p
      INNER JOIN users u ON p.donor_email = u.email
      WHERE u.id = internal_user_id
        AND p.status = 'charged'
    ), 0)
  ) INTO result;

  RETURN result;
END;
$$;

-- Helper function to check if user is team manager
CREATE OR REPLACE FUNCTION is_team_manager(user_open_id TEXT, team_id_param BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  internal_user_id BIGINT;
  is_manager BOOLEAN;
BEGIN
  -- Get internal user ID
  SELECT id INTO internal_user_id
  FROM users
  WHERE open_id = user_open_id;

  IF internal_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user is team manager
  SELECT EXISTS(
    SELECT 1
    FROM user_roles
    WHERE user_id = internal_user_id
      AND team_id = team_id_param
      AND role = 'team_manager'
      AND revoked_at IS NULL
  ) INTO is_manager;

  RETURN is_manager;
END;
$$;

-- Helper function to check if user is league admin
CREATE OR REPLACE FUNCTION is_league_admin(user_open_id TEXT, league_id_param BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  internal_user_id BIGINT;
  is_admin BOOLEAN;
BEGIN
  -- Get internal user ID
  SELECT id INTO internal_user_id
  FROM users
  WHERE open_id = user_open_id;

  IF internal_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user is league admin
  SELECT EXISTS(
    SELECT 1
    FROM user_roles
    WHERE user_id = internal_user_id
      AND league_id = league_id_param
      AND role = 'league_admin'
      AND revoked_at IS NULL
  ) INTO is_admin;

  RETURN is_admin;
END;
$$;
