import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(), // Optional for email/password auth
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(), // Now required and unique
  passwordHash: varchar("passwordHash", { length: 255 }), // For email/password auth
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Leagues - top-level organizations that contain teams
 */
export const leagues = mysqlTable("leagues", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  logoUrl: text("logoUrl"),
  defaultFeePercentage: int("defaultFeePercentage").default(5).notNull(), // Platform fee percentage (stored as integer, e.g., 5 = 5%)
  allowedFundraiserTypes: text("allowedFundraiserTypes").notNull(), // Comma-separated list
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type League = typeof leagues.$inferSelect;
export type InsertLeague = typeof leagues.$inferInsert;

/**
 * Teams - belong to leagues, run fundraisers
 */
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  leagueId: int("leagueId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  logoUrl: text("logoUrl"),
  stripeAccountId: varchar("stripeAccountId", { length: 255 }),
  stripeOnboardingCompleted: boolean("stripeOnboardingCompleted").default(false).notNull(),
  stripeChargesEnabled: boolean("stripeChargesEnabled").default(false).notNull(),
  stripePayoutsEnabled: boolean("stripePayoutsEnabled").default(false).notNull(),
  feePercentage: int("feePercentage"), // Override league default if set (stored as integer)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

/**
 * User roles - defines permissions for users within leagues/teams
 */
export const userRoles = mysqlTable("userRoles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  leagueId: int("leagueId"), // Null for team-only roles
  teamId: int("teamId"), // Null for league-only roles
  role: mysqlEnum("role", ["league_admin", "team_manager"]).notNull(),
  grantedBy: int("grantedBy"), // User ID who granted this role
  grantedAt: timestamp("grantedAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
});

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = typeof userRoles.$inferInsert;

/**
 * Fundraisers - campaigns run by teams
 */
export const fundraisers = mysqlTable("fundraisers", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  fundraiserType: mysqlEnum("fundraiserType", ["direct_donation", "micro_fundraiser"]).notNull(),
  fundraiserTemplate: mysqlEnum("fundraiserTemplate", [
    "direct_donation",
    "micro_fundraiser",
    "raffle",
    "squares",
    "challenge",
    "team_vs_team",
    "calendar",
    "donation_matching"
  ]).default("direct_donation").notNull(),
  status: mysqlEnum("status", ["draft", "active", "paused", "completed", "cancelled"]).default("draft").notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  goalAmount: int("goalAmount"), // Goal in cents
  // Micro-fundraiser specific config stored as JSON
  config: text("config"), // JSON: { metricName, metricUnit, defaultPledgeAmount, defaultCap, estimatedRange, eventDate }
  publishedAt: timestamp("publishedAt"),
  completedAt: timestamp("completedAt"),
  totalAmountPledged: int("totalAmountPledged").default(0).notNull(), // Total in cents
  totalAmountCharged: int("totalAmountCharged").default(0).notNull(), // Total in cents
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Fundraiser = typeof fundraisers.$inferSelect;
export type InsertFundraiser = typeof fundraisers.$inferInsert;

/**
 * Pledges - donor commitments (immediate for direct donations, deferred for micro-fundraisers)
 */
export const pledges = mysqlTable("pledges", {
  id: int("id").autoincrement().primaryKey(),
  fundraiserId: int("fundraiserId").notNull(),
  donorName: varchar("donorName", { length: 255 }).notNull(),
  donorEmail: varchar("donorEmail", { length: 320 }).notNull(),
  donorPhone: varchar("donorPhone", { length: 50 }),
  pledgeType: mysqlEnum("pledgeType", ["direct_donation", "micro_pledge"]).notNull(),
  
  // For direct donations: final amount
  // For micro-pledges: amount per unit
  baseAmount: int("baseAmount").notNull(), // In cents
  
  // For micro-pledges only
  capAmount: int("capAmount"), // Maximum charge in cents
  multiplier: int("multiplier"), // Final metric value (e.g., 12 runs)
  calculatedAmount: int("calculatedAmount"), // baseAmount * multiplier (capped)
  
  // Final amount including any tips
  finalAmount: int("finalAmount").notNull(), // In cents
  platformFee: int("platformFee").notNull(), // In cents
  donorTip: int("donorTip").default(0).notNull(), // In cents
  
  // Stripe references
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSetupIntentId: varchar("stripeSetupIntentId", { length: 255 }), // For micro-pledges
  stripePaymentMethodId: varchar("stripePaymentMethodId", { length: 255 }), // Saved payment method
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }), // For actual charge
  
  status: mysqlEnum("status", ["pending_authorization", "authorized", "charged", "failed", "refunded"]).notNull(),
  authorizedAt: timestamp("authorizedAt"),
  chargedAt: timestamp("chargedAt"),
  refundedAt: timestamp("refundedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Pledge = typeof pledges.$inferSelect;
export type InsertPledge = typeof pledges.$inferInsert;

/**
 * Stats entries - performance data for micro-fundraisers
 */
export const statsEntries = mysqlTable("statsEntries", {
  id: int("id").autoincrement().primaryKey(),
  fundraiserId: int("fundraiserId").notNull(),
  metricName: varchar("metricName", { length: 255 }).notNull(),
  metricValue: int("metricValue").notNull(), // The actual performance (e.g., 12 runs)
  enteredBy: int("enteredBy").notNull(), // User ID
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StatsEntry = typeof statsEntries.$inferSelect;
export type InsertStatsEntry = typeof statsEntries.$inferInsert;

/**
 * Charges - record of payment attempts
 */
export const charges = mysqlTable("charges", {
  id: int("id").autoincrement().primaryKey(),
  pledgeId: int("pledgeId").notNull(),
  fundraiserId: int("fundraiserId").notNull(),
  grossAmount: int("grossAmount").notNull(), // Total charged in cents
  platformFee: int("platformFee").notNull(), // Platform fee in cents
  donorTip: int("donorTip").default(0).notNull(), // Donor tip in cents
  netAmount: int("netAmount").notNull(), // Amount to team in cents
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  status: mysqlEnum("status", ["succeeded", "failed", "refunded"]).notNull(),
  failureCode: varchar("failureCode", { length: 255 }),
  failureMessage: text("failureMessage"),
  refundAmount: int("refundAmount"), // In cents
  refundReason: text("refundReason"),
  succeededAt: timestamp("succeededAt"),
  failedAt: timestamp("failedAt"),
  refundedAt: timestamp("refundedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Charge = typeof charges.$inferSelect;
export type InsertCharge = typeof charges.$inferInsert;

/**
 * Audit logs - track important actions
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entityType", { length: 100 }),
  entityId: int("entityId"),
  metadata: text("metadata"), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Notifications - email notification queue
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  templateName: varchar("templateName", { length: 100 }).notNull(),
  templateData: text("templateData"), // JSON
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  failureReason: text("failureReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Raffle Items - prizes for raffle fundraisers
 */
export const raffleItems = mysqlTable("raffleItems", {
  id: int("id").autoincrement().primaryKey(),
  fundraiserId: int("fundraiserId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: varchar("imageUrl", { length: 500 }),
  sponsorName: varchar("sponsorName", { length: 255 }),
  sponsorLogoUrl: varchar("sponsorLogoUrl", { length: 500 }),
  totalEntries: int("totalEntries").default(0).notNull(),
  winnerPledgeId: int("winnerPledgeId"),
  drawnAt: timestamp("drawnAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RaffleItem = typeof raffleItems.$inferSelect;
export type InsertRaffleItem = typeof raffleItems.$inferInsert;

/**
 * Raffle Tiers - pricing tiers for raffle entries
 */
export const raffleTiers = mysqlTable("raffleTiers", {
  id: int("id").autoincrement().primaryKey(),
  fundraiserId: int("fundraiserId").notNull(),
  price: int("price").notNull(), // in cents
  entries: int("entries").notNull(),
  label: varchar("label", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RaffleTier = typeof raffleTiers.$inferSelect;
export type InsertRaffleTier = typeof raffleTiers.$inferInsert;

/**
 * Squares Grids - Super Bowl squares and event squares
 */
export const squaresGrids = mysqlTable("squaresGrids", {
  id: int("id").autoincrement().primaryKey(),
  fundraiserId: int("fundraiserId").notNull(),
  gridSize: int("gridSize").default(100).notNull(), // 10x10 = 100 squares
  pricePerSquare: int("pricePerSquare").notNull(), // in cents
  homeTeam: varchar("homeTeam", { length: 255 }),
  awayTeam: varchar("awayTeam", { length: 255 }),
  eventDate: timestamp("eventDate"),
  homeNumbers: text("homeNumbers"), // JSON array [0,1,2,3,4,5,6,7,8,9]
  awayNumbers: text("awayNumbers"), // JSON array
  numbersLocked: int("numbersLocked").default(0).notNull(), // boolean as int
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SquaresGrid = typeof squaresGrids.$inferSelect;
export type InsertSquaresGrid = typeof squaresGrids.$inferInsert;

/**
 * Squares Purchases - individual square purchases
 */
export const squaresPurchases = mysqlTable("squaresPurchases", {
  id: int("id").autoincrement().primaryKey(),
  gridId: int("gridId").notNull(),
  pledgeId: int("pledgeId").notNull(),
  squarePosition: int("squarePosition").notNull(), // 0-99 for 10x10 grid
  donorName: varchar("donorName", { length: 255 }),
  purchasedAt: timestamp("purchasedAt").defaultNow().notNull(),
});

export type SquaresPurchase = typeof squaresPurchases.$inferSelect;
export type InsertSquaresPurchase = typeof squaresPurchases.$inferInsert;

/**
 * Squares Payouts - quarter/final payouts for squares
 */
export const squaresPayouts = mysqlTable("squaresPayouts", {
  id: int("id").autoincrement().primaryKey(),
  gridId: int("gridId").notNull(),
  quarter: int("quarter"), // 1,2,3,4 or NULL for final
  homeScore: int("homeScore"),
  awayScore: int("awayScore"),
  winnerSquareId: int("winnerSquareId"),
  payoutAmount: int("payoutAmount"), // in cents
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SquaresPayout = typeof squaresPayouts.$inferSelect;
export type InsertSquaresPayout = typeof squaresPayouts.$inferInsert;

/**
 * Challenge Goals - milestone-based challenges
 */
export const challengeGoals = mysqlTable("challengeGoals", {
  id: int("id").autoincrement().primaryKey(),
  fundraiserId: int("fundraiserId").notNull(),
  goalAmount: int("goalAmount").notNull(), // in cents
  challengeDescription: text("challengeDescription").notNull(),
  completedDescription: text("completedDescription"),
  isCompleted: int("isCompleted").default(0).notNull(), // boolean as int
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChallengeGoal = typeof challengeGoals.$inferSelect;
export type InsertChallengeGoal = typeof challengeGoals.$inferInsert;

/**
 * Team vs Team Matches - competitive fundraising
 */
export const teamVsTeamMatches = mysqlTable("teamVsTeamMatches", {
  id: int("id").autoincrement().primaryKey(),
  fundraiser1Id: int("fundraiser1Id").notNull(),
  fundraiser2Id: int("fundraiser2Id").notNull(),
  loserChallenge: text("loserChallenge"),
  winnerId: int("winnerId"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TeamVsTeamMatch = typeof teamVsTeamMatches.$inferSelect;
export type InsertTeamVsTeamMatch = typeof teamVsTeamMatches.$inferInsert;

/**
 * Calendar Dates - pick-a-date fundraisers
 */
export const calendarDates = mysqlTable("calendarDates", {
  id: int("id").autoincrement().primaryKey(),
  fundraiserId: int("fundraiserId").notNull(),
  dateValue: varchar("dateValue", { length: 10 }).notNull(), // YYYY-MM-DD
  amount: int("amount").notNull(), // in cents
  purchaserPledgeId: int("purchaserPledgeId"),
  purchaserName: varchar("purchaserName", { length: 255 }),
  purchasedAt: timestamp("purchasedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CalendarDate = typeof calendarDates.$inferSelect;
export type InsertCalendarDate = typeof calendarDates.$inferInsert;

/**
 * Donation Matching - sponsor-matched donations
 */
export const donationMatching = mysqlTable("donationMatching", {
  id: int("id").autoincrement().primaryKey(),
  fundraiserId: int("fundraiserId").notNull(),
  sponsorName: varchar("sponsorName", { length: 255 }).notNull(),
  sponsorLogoUrl: varchar("sponsorLogoUrl", { length: 500 }),
  matchAmount: int("matchAmount").notNull(), // max amount to match in cents
  matchRatio: int("matchRatio").default(100).notNull(), // 100 = 100% match, 50 = 50% match
  currentMatched: int("currentMatched").default(0).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DonationMatching = typeof donationMatching.$inferSelect;
export type InsertDonationMatching = typeof donationMatching.$inferInsert;
