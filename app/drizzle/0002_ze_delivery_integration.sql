CREATE TABLE `apiCredentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientId` varchar(255) NOT NULL,
	`clientSecret` varchar(255) NOT NULL,
	`merchantIds` text NOT NULL,
	`scope` varchar(255) NOT NULL DEFAULT 'orders/read reports/read',
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSyncedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `apiCredentials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `apiSyncLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`apiCredentialId` int NOT NULL,
	`endpoint` varchar(255) NOT NULL,
	`status` enum('success','failed','partial') NOT NULL,
	`recordsProcessed` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`syncedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `apiSyncLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `apiKpiCache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`merchantId` varchar(255) NOT NULL,
	`grossRevenue` decimal(12,2) NOT NULL,
	`netMargin` decimal(12,2) NOT NULL,
	`totalOrders` int NOT NULL,
	`deliveredOrders` int NOT NULL,
	`cancelledOrders` int NOT NULL,
	`platformCommissions` decimal(12,2) NOT NULL,
	`operationalCosts` decimal(12,2) NOT NULL,
	`dataSource` enum('api','excel','hybrid') NOT NULL DEFAULT 'api',
	`syncedAt` timestamp NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `apiKpiCache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orderEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` varchar(255) NOT NULL,
	`orderId` varchar(100) NOT NULL,
	`merchantId` varchar(255) NOT NULL,
	`eventType` enum('CREATED','CONFIRMED','DISPATCHED','CANCELLED','CONCLUDED','EDITED') NOT NULL,
	`sourceAppId` varchar(255),
	`isAcknowledged` boolean NOT NULL DEFAULT false,
	`acknowledgedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`eventCreatedAt` datetime,
	CONSTRAINT `orderEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `orderEvents_eventId_unique` UNIQUE(`eventId`)
);
