CREATE TYPE "public"."fundraiserTemplate" AS ENUM('direct_donation', 'micro_fundraiser', 'raffle', 'squares', 'challenge', 'team_vs_team', 'calendar', 'donation_matching');--> statement-breakpoint
CREATE TYPE "public"."fundraiserType" AS ENUM('direct_donation', 'micro_fundraiser');--> statement-breakpoint
CREATE TYPE "public"."notificationStatus" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."pledgeType" AS ENUM('direct_donation', 'micro_pledge');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('draft', 'active', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "auditLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"action" varchar(255) NOT NULL,
	"entityType" varchar(100),
	"entityId" integer,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendarDates" (
	"id" serial PRIMARY KEY NOT NULL,
	"fundraiserId" integer NOT NULL,
	"dateValue" varchar(10) NOT NULL,
	"amount" integer NOT NULL,
	"purchaserPledgeId" integer,
	"purchaserName" varchar(255),
	"purchasedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challengeGoals" (
	"id" serial PRIMARY KEY NOT NULL,
	"fundraiserId" integer NOT NULL,
	"goalAmount" integer NOT NULL,
	"challengeDescription" text NOT NULL,
	"completedDescription" text,
	"isCompleted" integer DEFAULT 0 NOT NULL,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "charges" (
	"id" serial PRIMARY KEY NOT NULL,
	"pledgeId" integer NOT NULL,
	"fundraiserId" integer NOT NULL,
	"grossAmount" integer NOT NULL,
	"platformFee" integer NOT NULL,
	"donorTip" integer DEFAULT 0 NOT NULL,
	"netAmount" integer NOT NULL,
	"stripePaymentIntentId" varchar(255),
	"status" "status" NOT NULL,
	"failureCode" varchar(255),
	"failureMessage" text,
	"refundAmount" integer,
	"refundReason" text,
	"succeededAt" timestamp,
	"failedAt" timestamp,
	"refundedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donationMatching" (
	"id" serial PRIMARY KEY NOT NULL,
	"fundraiserId" integer NOT NULL,
	"sponsorName" varchar(255) NOT NULL,
	"sponsorLogoUrl" varchar(500),
	"matchAmount" integer NOT NULL,
	"matchRatio" integer DEFAULT 100 NOT NULL,
	"currentMatched" integer DEFAULT 0 NOT NULL,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fundraisers" (
	"id" serial PRIMARY KEY NOT NULL,
	"teamId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"fundraiserType" "fundraiserType" NOT NULL,
	"fundraiserTemplate" "fundraiserTemplate" DEFAULT 'direct_donation' NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL,
	"startDate" timestamp,
	"endDate" timestamp,
	"goalAmount" integer,
	"config" text,
	"publishedAt" timestamp,
	"completedAt" timestamp,
	"totalAmountPledged" integer DEFAULT 0 NOT NULL,
	"totalAmountCharged" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leagues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"logoUrl" text,
	"defaultFeePercentage" integer DEFAULT 5 NOT NULL,
	"allowedFundraiserTypes" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipientEmail" varchar(320) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"templateName" varchar(100) NOT NULL,
	"templateData" text,
	"status" "notificationStatus" DEFAULT 'pending' NOT NULL,
	"sentAt" timestamp,
	"failureReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pledges" (
	"id" serial PRIMARY KEY NOT NULL,
	"fundraiserId" integer NOT NULL,
	"donorName" varchar(255) NOT NULL,
	"donorEmail" varchar(320) NOT NULL,
	"donorPhone" varchar(50),
	"pledgeType" "pledgeType" NOT NULL,
	"baseAmount" integer NOT NULL,
	"capAmount" integer,
	"multiplier" integer,
	"calculatedAmount" integer,
	"finalAmount" integer NOT NULL,
	"platformFee" integer NOT NULL,
	"donorTip" integer DEFAULT 0 NOT NULL,
	"stripeCustomerId" varchar(255),
	"stripeSetupIntentId" varchar(255),
	"stripePaymentMethodId" varchar(255),
	"stripePaymentIntentId" varchar(255),
	"status" "status" NOT NULL,
	"authorizedAt" timestamp,
	"chargedAt" timestamp,
	"refundedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raffleItems" (
	"id" serial PRIMARY KEY NOT NULL,
	"fundraiserId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"imageUrl" varchar(500),
	"sponsorName" varchar(255),
	"sponsorLogoUrl" varchar(500),
	"totalEntries" integer DEFAULT 0 NOT NULL,
	"winnerPledgeId" integer,
	"drawnAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raffleTiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"fundraiserId" integer NOT NULL,
	"price" integer NOT NULL,
	"entries" integer NOT NULL,
	"label" varchar(100),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "squaresGrids" (
	"id" serial PRIMARY KEY NOT NULL,
	"fundraiserId" integer NOT NULL,
	"gridSize" integer DEFAULT 100 NOT NULL,
	"pricePerSquare" integer NOT NULL,
	"homeTeam" varchar(255),
	"awayTeam" varchar(255),
	"eventDate" timestamp,
	"homeNumbers" text,
	"awayNumbers" text,
	"numbersLocked" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "squaresPayouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"gridId" integer NOT NULL,
	"quarter" integer,
	"homeScore" integer,
	"awayScore" integer,
	"winnerSquareId" integer,
	"payoutAmount" integer,
	"paidAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "squaresPurchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"gridId" integer NOT NULL,
	"pledgeId" integer NOT NULL,
	"squarePosition" integer NOT NULL,
	"donorName" varchar(255),
	"purchasedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "statsEntries" (
	"id" serial PRIMARY KEY NOT NULL,
	"fundraiserId" integer NOT NULL,
	"metricName" varchar(255) NOT NULL,
	"metricValue" integer NOT NULL,
	"enteredBy" integer NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teamVsTeamMatches" (
	"id" serial PRIMARY KEY NOT NULL,
	"fundraiser1Id" integer NOT NULL,
	"fundraiser2Id" integer NOT NULL,
	"loserChallenge" text,
	"winnerId" integer,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"leagueId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"logoUrl" text,
	"stripeAccountId" varchar(255),
	"stripeOnboardingCompleted" boolean DEFAULT false NOT NULL,
	"stripeChargesEnabled" boolean DEFAULT false NOT NULL,
	"stripePayoutsEnabled" boolean DEFAULT false NOT NULL,
	"feePercentage" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "userRoles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"leagueId" integer,
	"teamId" integer,
	"role" "role" NOT NULL,
	"grantedBy" integer,
	"grantedAt" timestamp DEFAULT now() NOT NULL,
	"revokedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64),
	"name" text,
	"email" varchar(320) NOT NULL,
	"passwordHash" varchar(255),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
