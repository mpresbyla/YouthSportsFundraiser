CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(255) NOT NULL,
	`entityType` varchar(100),
	`entityId` int,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `charges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pledgeId` int NOT NULL,
	`fundraiserId` int NOT NULL,
	`grossAmount` int NOT NULL,
	`platformFee` int NOT NULL,
	`donorTip` int NOT NULL DEFAULT 0,
	`netAmount` int NOT NULL,
	`stripePaymentIntentId` varchar(255),
	`status` enum('succeeded','failed','refunded') NOT NULL,
	`failureCode` varchar(255),
	`failureMessage` text,
	`refundAmount` int,
	`refundReason` text,
	`succeededAt` timestamp,
	`failedAt` timestamp,
	`refundedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `charges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fundraisers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`fundraiserType` enum('direct_donation','micro_fundraiser') NOT NULL,
	`status` enum('draft','active','paused','completed','cancelled') NOT NULL DEFAULT 'draft',
	`startDate` timestamp,
	`endDate` timestamp,
	`goalAmount` int,
	`config` text,
	`publishedAt` timestamp,
	`completedAt` timestamp,
	`totalAmountPledged` int NOT NULL DEFAULT 0,
	`totalAmountCharged` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fundraisers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leagues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`logoUrl` text,
	`defaultFeePercentage` int NOT NULL DEFAULT 5,
	`allowedFundraiserTypes` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leagues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`subject` varchar(500) NOT NULL,
	`templateName` varchar(100) NOT NULL,
	`templateData` text,
	`status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`failureReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pledges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fundraiserId` int NOT NULL,
	`donorName` varchar(255) NOT NULL,
	`donorEmail` varchar(320) NOT NULL,
	`donorPhone` varchar(50),
	`pledgeType` enum('direct_donation','micro_pledge') NOT NULL,
	`baseAmount` int NOT NULL,
	`capAmount` int,
	`multiplier` int,
	`calculatedAmount` int,
	`finalAmount` int NOT NULL,
	`platformFee` int NOT NULL,
	`donorTip` int NOT NULL DEFAULT 0,
	`stripeCustomerId` varchar(255),
	`stripeSetupIntentId` varchar(255),
	`stripePaymentMethodId` varchar(255),
	`stripePaymentIntentId` varchar(255),
	`status` enum('pending_authorization','authorized','charged','failed','refunded') NOT NULL,
	`authorizedAt` timestamp,
	`chargedAt` timestamp,
	`refundedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pledges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `statsEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fundraiserId` int NOT NULL,
	`metricName` varchar(255) NOT NULL,
	`metricValue` int NOT NULL,
	`enteredBy` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `statsEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leagueId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`logoUrl` text,
	`stripeAccountId` varchar(255),
	`stripeOnboardingCompleted` boolean NOT NULL DEFAULT false,
	`stripeChargesEnabled` boolean NOT NULL DEFAULT false,
	`stripePayoutsEnabled` boolean NOT NULL DEFAULT false,
	`feePercentage` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userRoles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`leagueId` int,
	`teamId` int,
	`role` enum('league_admin','team_manager') NOT NULL,
	`grantedBy` int,
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `userRoles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
