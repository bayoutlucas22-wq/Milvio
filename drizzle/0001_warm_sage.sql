CREATE TABLE `importBatches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importId` varchar(180) NOT NULL,
	`reportType` enum('orders_report','drivers_report','restitution_summary') NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`sourceSheet` varchar(255) NOT NULL,
	`importedRows` int NOT NULL,
	`dateFrom` datetime,
	`dateTo` datetime,
	`importedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `importBatches_id` PRIMARY KEY(`id`),
	CONSTRAINT `importBatches_importId_unique` UNIQUE(`importId`)
);
--> statement-breakpoint
CREATE TABLE `importDriverRows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importId` varchar(180) NOT NULL,
	`rowIndex` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`deliveredOrders` int NOT NULL DEFAULT 0,
	`cashTotal` decimal(10,2) NOT NULL DEFAULT '0.00',
	`cardTotal` decimal(10,2) NOT NULL DEFAULT '0.00',
	`onlineTotal` decimal(10,2) NOT NULL DEFAULT '0.00',
	`total` decimal(10,2) NOT NULL DEFAULT '0.00',
	`rawJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `importDriverRows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `importOrderProductRows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importId` varchar(180) NOT NULL,
	`rowIndex` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	`total` decimal(10,2) NOT NULL DEFAULT '0.00',
	`rawJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `importOrderProductRows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `importOrderRows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importId` varchar(180) NOT NULL,
	`rowIndex` int NOT NULL,
	`orderDateLabel` varchar(50),
	`status` varchar(100),
	`courierName` varchar(255),
	`paymentMethod` varchar(120),
	`subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
	`discount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`freight` decimal(10,2) NOT NULL DEFAULT '0.00',
	`total` decimal(10,2) NOT NULL DEFAULT '0.00',
	`rawJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `importOrderRows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `importRestitutionRows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importId` varchar(180) NOT NULL,
	`rowIndex` int NOT NULL,
	`dateLabel` varchar(20) NOT NULL,
	`grossRevenue` decimal(10,2) NOT NULL DEFAULT '0.00',
	`storeCostTotal` decimal(10,2) NOT NULL DEFAULT '0.00',
	`driverCostTotal` decimal(10,2) NOT NULL DEFAULT '0.00',
	`finalCostAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`totalNetMargin` decimal(10,2) NOT NULL DEFAULT '0.00',
	`netMarginPercent` decimal(5,2) NOT NULL DEFAULT '0.00',
	`restitutionFreight` decimal(10,2) NOT NULL DEFAULT '0.00',
	`restitutionMarkup` decimal(10,2) NOT NULL DEFAULT '0.00',
	`marketplaceCommission` decimal(10,2) NOT NULL DEFAULT '0.00',
	`restitutionPromotions` decimal(10,2) NOT NULL DEFAULT '0.00',
	`restitutionTotal` decimal(10,2) NOT NULL DEFAULT '0.00',
	`manualAdjustments` decimal(10,2) NOT NULL DEFAULT '0.00',
	`rawJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `importRestitutionRows_id` PRIMARY KEY(`id`)
);
