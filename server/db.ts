import { eq, and, or, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  leagues, 
  teams, 
  userRoles, 
  fundraisers,
  pledges,
  charges,
  statsEntries,
  notifications,
  auditLogs,
  type League,
  type Team,
  type UserRole,
  type Fundraiser,
  type Pledge,
  type Charge,
  type StatsEntry
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// User Management
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// Role-Based Access Control
// ============================================================================

export async function getUserRoles(userId: number): Promise<UserRole[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), isNull(userRoles.revokedAt)));
}

export async function isLeagueAdmin(userId: number, leagueId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select()
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.leagueId, leagueId),
        eq(userRoles.role, "league_admin"),
        isNull(userRoles.revokedAt)
      )
    )
    .limit(1);

  return result.length > 0;
}

export async function isTeamManager(userId: number, teamId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db
    .select()
    .from(userRoles)
    .where(
      and(
        eq(userRoles.userId, userId),
        eq(userRoles.teamId, teamId),
        eq(userRoles.role, "team_manager"),
        isNull(userRoles.revokedAt)
      )
    )
    .limit(1);

  return result.length > 0;
}

export async function canManageTeam(userId: number, teamId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Get the team's league
  const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (team.length === 0) return false;

  // Check if user is team manager OR league admin
  const isManager = await isTeamManager(userId, teamId);
  const isAdmin = await isLeagueAdmin(userId, team[0].leagueId);

  return isManager || isAdmin;
}

// ============================================================================
// League Management
// ============================================================================

export async function getAllLeagues(): Promise<League[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(leagues);
}

export async function getLeagueById(leagueId: number): Promise<League | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createLeague(data: {
  name: string;
  description?: string;
  logoUrl?: string;
  defaultFeePercentage?: number;
  allowedFundraiserTypes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(leagues).values({
    name: data.name,
    description: data.description,
    logoUrl: data.logoUrl,
    defaultFeePercentage: data.defaultFeePercentage ?? 5,
    allowedFundraiserTypes: data.allowedFundraiserTypes ?? "direct_donation,micro_fundraiser",
  });
}

// ============================================================================
// Team Management
// ============================================================================

export async function getTeamsByLeague(leagueId: number): Promise<Team[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(teams).where(eq(teams.leagueId, leagueId));
}

export async function getTeamById(teamId: number): Promise<Team | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createTeam(data: {
  leagueId: number;
  name: string;
  description?: string;
  logoUrl?: string;
  feePercentage?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(teams).values({
    leagueId: data.leagueId,
    name: data.name,
    description: data.description,
    logoUrl: data.logoUrl,
    feePercentage: data.feePercentage,
    stripeOnboardingCompleted: false,
    stripeChargesEnabled: false,
    stripePayoutsEnabled: false,
  });
}

export async function updateTeamStripeAccount(
  teamId: number,
  stripeData: {
    stripeAccountId?: string;
    stripeOnboardingCompleted?: boolean;
    stripeChargesEnabled?: boolean;
    stripePayoutsEnabled?: boolean;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(teams).set(stripeData).where(eq(teams.id, teamId));
}

// ============================================================================
// Fundraiser Management
// ============================================================================

export async function getFundraisersByTeam(teamId: number): Promise<Fundraiser[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(fundraisers).where(eq(fundraisers.teamId, teamId));
}

export async function getFundraiserById(fundraiserId: number): Promise<Fundraiser | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(fundraisers).where(eq(fundraisers.id, fundraiserId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createFundraiser(data: {
  teamId: number;
  title: string;
  description?: string;
  fundraiserType: "direct_donation" | "micro_fundraiser";
  goalAmount?: number;
  config?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(fundraisers).values({
    teamId: data.teamId,
    title: data.title,
    description: data.description,
    fundraiserType: data.fundraiserType,
    status: "draft",
    goalAmount: data.goalAmount,
    config: data.config,
    totalAmountPledged: 0,
    totalAmountCharged: 0,
  });
}

export async function updateFundraiser(
  fundraiserId: number,
  data: Partial<Fundraiser>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(fundraisers).set(data).where(eq(fundraisers.id, fundraiserId));
}

// ============================================================================
// Pledge Management
// ============================================================================

export async function getPledgesByFundraiser(fundraiserId: number): Promise<Pledge[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(pledges).where(eq(pledges.fundraiserId, fundraiserId));
}

export async function getPledgeById(pledgeId: number): Promise<Pledge | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(pledges).where(eq(pledges.id, pledgeId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createPledge(data: {
  fundraiserId: number;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  pledgeType: "direct_donation" | "micro_pledge";
  baseAmount: number;
  capAmount?: number;
  finalAmount: number;
  platformFee: number;
  donorTip?: number;
  stripeCustomerId?: string;
  stripeSetupIntentId?: string;
  stripePaymentMethodId?: string;
  stripePaymentIntentId?: string;
  status: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(pledges).values({
    ...data,
    donorTip: data.donorTip ?? 0,
  } as any);
}

export async function updatePledge(pledgeId: number, data: Partial<Pledge>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(pledges).set(data).where(eq(pledges.id, pledgeId));
}

// ============================================================================
// Stats Entry Management
// ============================================================================

export async function getStatsByFundraiser(fundraiserId: number): Promise<StatsEntry[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(statsEntries).where(eq(statsEntries.fundraiserId, fundraiserId));
}

export async function createStatsEntry(data: {
  fundraiserId: number;
  metricName: string;
  metricValue: number;
  enteredBy: number;
  notes?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(statsEntries).values(data);
}

// ============================================================================
// Charge Management
// ============================================================================

export async function getChargesByFundraiser(fundraiserId: number): Promise<Charge[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(charges).where(eq(charges.fundraiserId, fundraiserId));
}

export async function createCharge(data: {
  pledgeId: number;
  fundraiserId: number;
  grossAmount: number;
  platformFee: number;
  donorTip: number;
  netAmount: number;
  stripePaymentIntentId?: string;
  status: "succeeded" | "failed" | "refunded";
  failureCode?: string;
  failureMessage?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(charges).values(data as any);
}

export async function updateCharge(chargeId: number, data: Partial<Charge>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(charges).set(data).where(eq(charges.id, chargeId));
}

// ============================================================================
// Audit Logging
// ============================================================================

export async function logAudit(data: {
  userId?: number;
  action: string;
  entityType?: string;
  entityId?: number;
  metadata?: Record<string, any>;
}) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(auditLogs).values({
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    });
  } catch (error) {
    console.error("[Audit] Failed to log:", error);
  }
}
