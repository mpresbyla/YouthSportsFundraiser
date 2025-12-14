CREATE TABLE `calendarDates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fundraiserId` int NOT NULL,
	`dateValue` varchar(10) NOT NULL,
	`amount` int NOT NULL,
	`purchaserPledgeId` int,
	`purchaserName` varchar(255),
	`purchasedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `calendarDates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `challengeGoals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fundraiserId` int NOT NULL,
	`goalAmount` int NOT NULL,
	`challengeDescription` text NOT NULL,
	`completedDescription` text,
	`isCompleted` int NOT NULL DEFAULT 0,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `challengeGoals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `donationMatching` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fundraiserId` int NOT NULL,
	`sponsorName` varchar(255) NOT NULL,
	`sponsorLogoUrl` varchar(500),
	`matchAmount` int NOT NULL,
	`matchRatio` int NOT NULL DEFAULT 100,
	`currentMatched` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `donationMatching_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raffleItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fundraiserId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`imageUrl` varchar(500),
	`sponsorName` varchar(255),
	`sponsorLogoUrl` varchar(500),
	`totalEntries` int NOT NULL DEFAULT 0,
	`winnerPledgeId` int,
	`drawnAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `raffleItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raffleTiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fundraiserId` int NOT NULL,
	`price` int NOT NULL,
	`entries` int NOT NULL,
	`label` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `raffleTiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `squaresGrids` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fundraiserId` int NOT NULL,
	`gridSize` int NOT NULL DEFAULT 100,
	`pricePerSquare` int NOT NULL,
	`homeTeam` varchar(255),
	`awayTeam` varchar(255),
	`eventDate` timestamp,
	`homeNumbers` text,
	`awayNumbers` text,
	`numbersLocked` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `squaresGrids_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `squaresPayouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gridId` int NOT NULL,
	`quarter` int,
	`homeScore` int,
	`awayScore` int,
	`winnerSquareId` int,
	`payoutAmount` int,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `squaresPayouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `squaresPurchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gridId` int NOT NULL,
	`pledgeId` int NOT NULL,
	`squarePosition` int NOT NULL,
	`donorName` varchar(255),
	`purchasedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `squaresPurchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teamVsTeamMatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fundraiser1Id` int NOT NULL,
	`fundraiser2Id` int NOT NULL,
	`loserChallenge` text,
	`winnerId` int,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teamVsTeamMatches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `fundraisers` ADD `fundraiserTemplate` enum('direct_donation','micro_fundraiser','raffle','squares','challenge','team_vs_team','calendar','donation_matching') DEFAULT 'direct_donation' NOT NULL;