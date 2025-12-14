import { pgTable, pgEnum, serial, integer, text, timestamp, varchar, boolean, numeric } from "drizzle-orm/pg-core";

// Enum definitions

import { pgTable, pgEnum, serial, integer, text, timestamp, varchar, boolean, numeric } from "drizzle-orm/pg-core";

// Enum definitions
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const fundraiserTypeEnum = pgEnum("fundraiserType", ["direct_donation", "micro_fundraiser"]);
export const statusEnum = pgEnum("status", ["draft", "active", "paused", "completed", "cancelled"]);
export const pledgeTypeEnum = pgEnum("pledgeType", ["direct_donation", "micro_pledge"]);
export const fundraiserTemplateEnum = pgEnum("fundraiserTemplate", [
  "direct_donation",
  "micro_fundraiser",
  "raffle",
  "squares",
  "challenge",
  "team_vs_team",
  "calendar",
  "donation_matching"
]);
export const notificationStatusEnum = pgEnum("notificationStatus", ["pending", "sent", "failed"]);


/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(), // Optional for email/password auth
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(), // Now required and unique
  passwordHash: varchar("passwordHash", { length: 255 }), // For email/password auth
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Leagues - top-level organizations that contain teams
 */
export const leagues = pgTable("leagues", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  logoUrl: text("logoUrl"),
  defaultFeePercentage: integer("defaultFeePercentage").default(5).notNull(), // Platform fee percentage (stored as integer, e.g., 5 = 5%)
  allowedFundraiserTypes: text("allowedFundraiserTypes").notNull(), // Comma-separated list
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type League = typeof leagues.$inferSelect;
export type InsertLeague = typeof leagues.$inferInsert;

/**
 * Teams - belong to leagues, run fundraisers
 */
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  leagueId: integer("leagueId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  logoUrl: text("logoUrl"),
  stripeAccountId: varchar("stripeAccountId", { length: 255 }),
  stripeOnboardingCompleted: boolean("stripeOnboardingCompleted").default(false).notNull(),
  stripeChargesEnabled: boolean("stripeChargesEnabled").default(false).notNull(),
  stripePayoutsEnabled: boolean("stripePayoutsEnabled").default(false).notNull(),
  feePercentage: integer("feePercentage"), // Override league default if set (stored as integer)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

/**
 * User roles - defines permissions for users within leagues/teams
 */
export const userRoles = pgTable("userRoles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  leagueId: integer("leagueId"), // Null for team-only roles
  teamId: integer("teamId"), // Null for league-only roles
  role: roleEnum("role").notNull(),
  grantedBy: integer("grantedBy"), // User ID who granted this role
  grantedAt: timestamp("grantedAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
});

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = typeof userRoles.$inferInsert;

/**
 * Fundraisers - campaigns run by teams
 */
export const fundraisers = pgTable("fundraisers", {
  id: serial("id").primaryKey(),
  teamId: integer("teamId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  fundraiserType: fundraiserTypeEnum("fundraiserType").notNull(),
  fundraiserTemplate: fundraiserTemplateEnum("fundraiserTemplate").default("direct_donation").notNull(),
  status: statusEnum("status").default("draft").notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  goalAmount: integer("goalAmount"), // Goal in cents
  // Micro-fundraiser specific config stored as JSON
  config: text("config"), // JSON: { metricName, metricUnit, defaultPledgeAmount, defaultCap, estimatedRange, eventDate }
  publishedAt: timestamp("publishedAt"),
  completedAt: timestamp("completedAt"),
  totalAmountPledged: integer("totalAmountPledged").default(0).notNull(), // Total in cents
  totalAmountCharged: integer("totalAmountCharged").default(0).notNull(), // Total in cents
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Fundraiser = typeof fundraisers.$inferSelect;
export type InsertFundraiser = typeof fundraisers.$inferInsert;

/**
 * Pledges - donor commitments (immediate for direct donations, deferred for micro-fundraisers)
 */
export const pledges = pgTable("pledges", {
  id: serial("id").primaryKey(),
  fundraiserId: integer("fundraiserId").notNull(),
  donorName: varchar("donorName", { length: 255 }).notNull(),
  donorEmail: varchar("donorEmail", { length: 320 }).notNull(),
  donorPhone: varchar("donorPhone", { length: 50 }),
  pledgeType: pledgeTypeEnum("pledgeType").notNull(),
  
  // For direct donations: final amount
  // For micro-pledges: amount per unit
  baseAmount: integer("baseAmount").notNull(), // In cents
  
  // For micro-pledges only
  capAmount: integer("capAmount"), // Maximum charge in cents
  multiplier: integer("multiplier"), // Final metric value (e.g., 12 runs)
  calculatedAmount: integer("calculatedAmount"), // baseAmount * multiplier (capped)
  
  // Final amount including any tips
  finalAmount: integer("finalAmount").notNull(), // In cents
  platformFee: integer("platformFee").notNull(), // In cents
  donorTip: integer("donorTip").default(0).notNull(), // In cents
  
  // Stripe references
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSetupIntentId: varchar("stripeSetupIntentId", { length: 255 }), // For micro-pledges
  stripePaymentMethodId: varchar("stripePaymentMethodId", { length: 255 }), // Saved payment method
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }), // For actual charge
  
  status: statusEnum("status").notNull(),
  authorizedAt: timestamp("authorizedAt"),
  chargedAt: timestamp("chargedAt"),
  refundedAt: timestamp("refundedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Pledge = typeof pledges.$inferSelect;
export type InsertPledge = typeof pledges.$inferInsert;

/**
 * Stats entries - performance data for micro-fundraisers
 */
export const statsEntries = pgTable("statsEntries", {
  id: serial("id").primaryKey(),
  fundraiserId: integer("fundraiserId").notNull(),
  metricName: varchar("metricName", { length: 255 }).notNull(),
  metricValue: integer("metricValue").notNull(), // The actual performance (e.g., 12 runs)
  enteredBy: integer("enteredBy").notNull(), // User ID
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type StatsEntry = typeof statsEntries.$inferSelect;
export type InsertStatsEntry = typeof statsEntries.$inferInsert;

/**
 * Charges - record of payment attempts
 */
export const charges = pgTable("charges", {
  id: serial("id").primaryKey(),
  pledgeId: integer("pledgeId").notNull(),
  fundraiserId: integer("fundraiserId").notNull(),
  grossAmount: integer("grossAmount").notNull(), // Total charged in cents
  platformFee: integer("platformFee").notNull(), // Platform fee in cents
  donorTip: integer("donorTip").default(0).notNull(), // Donor tip in cents
  netAmount: integer("netAmount").notNull(), // Amount to team in cents
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  status: statusEnum("status").notNull(),
  failureCode: varchar("failureCode", { length: 255 }),
  failureMessage: text("failureMessage"),
  refundAmount: integer("refundAmount"), // In cents
  refundReason: text("refundReason"),
  succeededAt: timestamp("succeededAt"),
  failedAt: timestamp("failedAt"),
  refundedAt: timestamp("refundedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Charge = typeof charges.$inferSelect;
export type InsertCharge = typeof charges.$inferInsert;

/**
 * Audit logs - track important actions
 */
export const auditLogs = pgTable("auditLogs", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entityType", { length: 100 }),
  entityId: integer("entityId"),
  metadata: text("metadata"), // JSON
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * Notifications - email notification queue
 */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  templateName: varchar("templateName", { length: 100 }).notNull(),
  templateData: text("templateData"), // JSON
  status: notificationStatusEnum("status").default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  failureReason: text("failureReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Raffle Items - prizes for raffle fundraisers
 */
export const raffleItems = pgTable("raffleItems", {
  id: serial("id").primaryKey(),
  fundraiserId: integer("fundraiserId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: varchar("imageUrl", { length: 500 }),
  sponsorName: varchar("sponsorName", { length: 255 }),
  sponsorLogoUrl: varchar("sponsorLogoUrl", { length: 500 }),
  totalEntries: integer("totalEntries").default(0).notNull(),
  winnerPledgeId: integer("winnerPledgeId"),
  drawnAt: timestamp("drawnAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RaffleItem = typeof raffleItems.$inferSelect;
export type InsertRaffleItem = typeof raffleItems.$inferInsert;

/**
 * Raffle Tiers - pricing tiers for raffle entries
 */
export const raffleTiers = pgTable("raffleTiers", {
  id: serial("id").primaryKey(),
  fundraiserId: integer("fundraiserId").notNull(),
  price: integer("price").notNull(), // in cents
  entries: integer("entries").notNull(),
  label: varchar("label", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RaffleTier = typeof raffleTiers.$inferSelect;
export type InsertRaffleTier = typeof raffleTiers.$inferInsert;

/**
 * Squares Grids - Super Bowl squares and event squares
 */
export const squaresGrids = pgTable("squaresGrids", {
  id: serial("id").primaryKey(),
  fundraiserId: integer("fundraiserId").notNull(),
  gridSize: integer("gridSize").default(100).notNull(), // 10x10 = 100 squares
  pricePerSquare: integer("pricePerSquare").notNull(), // in cents
  homeTeam: varchar("homeTeam", { length: 255 }),
  awayTeam: varchar("awayTeam", { length: 255 }),
  eventDate: timestamp("eventDate"),
  homeNumbers: text("homeNumbers"), // JSON array [0,1,2,3,4,5,6,7,8,9]
  awayNumbers: text("awayNumbers"), // JSON array
  numbersLocked: integer("numbersLocked").default(0).notNull(), // boolean as int
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SquaresGrid = typeof squaresGrids.$inferSelect;
export type InsertSquaresGrid = typeof squaresGrids.$inferInsert;

/**
 * Squares Purchases - individual square purchases
 */
export const squaresPurchases = pgTable("squaresPurchases", {
  id: serial("id").primaryKey(),
  gridId: integer("gridId").notNull(),
  pledgeId: integer("pledgeId").notNull(),
  squarePosition: integer("squarePosition").notNull(), // 0-99 for 10x10 grid
  donorName: varchar("donorName", { length: 255 }),
  purchasedAt: timestamp("purchasedAt").defaultNow().notNull(),
});

export type SquaresPurchase = typeof squaresPurchases.$inferSelect;
export type InsertSquaresPurchase = typeof squaresPurchases.$inferInsert;

/**
 * Squares Payouts - quarter/final payouts for squares
 */
export const squaresPayouts = pgTable("squaresPayouts", {
  id: serial("id").primaryKey(),
  gridId: integer("gridId").notNull(),
  quarter: integer("quarter"), // 1,2,3,4 or NULL for final
  homeScore: integer("homeScore"),
  awayScore: integer("awayScore"),
  winnerSquareId: integer("winnerSquareId"),
  payoutAmount: integer("payoutAmount"), // in cents
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SquaresPayout = typeof squaresPayouts.$inferSelect;
export type InsertSquaresPayout = typeof squaresPayouts.$inferInsert;

/**
 * Challenge Goals - milestone-based challenges
 */
export const challengeGoals = pgTable("challengeGoals", {
  id: serial("id").primaryKey(),
  fundraiserId: integer("fundraiserId").notNull(),
  goalAmount: integer("goalAmount").notNull(), // in cents
  challengeDescription: text("challengeDescription").notNull(),
  completedDescription: text("completedDescription"),
  isCompleted: integer("isCompleted").default(0).notNull(), // boolean as int
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChallengeGoal = typeof challengeGoals.$inferSelect;
export type InsertChallengeGoal = typeof challengeGoals.$inferInsert;

/**
 * Team vs Team Matches - competitive fundraising
 */
export const teamVsTeamMatches = pgTable("teamVsTeamMatches", {
  id: serial("id").primaryKey(),
  fundraiser1Id: integer("fundraiser1Id").notNull(),
  fundraiser2Id: integer("fundraiser2Id").notNull(),
  loserChallenge: text("loserChallenge"),
  winnerId: integer("winnerId"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TeamVsTeamMatch = typeof teamVsTeamMatches.$inferSelect;
export type InsertTeamVsTeamMatch = typeof teamVsTeamMatches.$inferInsert;

/**
 * Calendar Dates - pick-a-date fundraisers
 */
export const calendarDates = pgTable("calendarDates", {
  id: serial("id").primaryKey(),
  fundraiserId: integer("fundraiserId").notNull(),
  dateValue: varchar("dateValue", { length: 10 }).notNull(), // YYYY-MM-DD
  amount: integer("amount").notNull(), // in cents
  purchaserPledgeId: integer("purchaserPledgeId"),
  purchaserName: varchar("purchaserName", { length: 255 }),
  purchasedAt: timestamp("purchasedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CalendarDate = typeof calendarDates.$inferSelect;
export type InsertCalendarDate = typeof calendarDates.$inferInsert;

/**
 * Donation Matching - sponsor-matched donations
 */
export const donationMatching = pgTable("donationMatching", {
  id: serial("id").primaryKey(),
  fundraiserId: integer("fundraiserId").notNull(),
  sponsorName: varchar("sponsorName", { length: 255 }).notNull(),
  sponsorLogoUrl: varchar("sponsorLogoUrl", { length: 500 }),
  matchAmount: integer("matchAmount").notNull(), // max amount to match in cents
  matchRatio: integer("matchRatio").default(100).notNull(), // 100 = 100% match, 50 = 50% match
  currentMatched: integer("currentMatched").default(0).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DonationMatching = typeof donationMatching.$inferSelect;
export type InsertDonationMatching = typeof donationMatching.$inferInsert;
