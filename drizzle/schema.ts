import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
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
