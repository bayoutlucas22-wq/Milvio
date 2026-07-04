CREATE TABLE `cancellations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`reason` varchar(255) NOT NULL,
	`valueLost` decimal(10,2) NOT NULL,
	`productsReturned` int NOT NULL DEFAULT 0,
	`productsLost` int NOT NULL DEFAULT 0,
	`deliveryCostLost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`responsibleParty` varchar(100),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cancellations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dailyClosings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`closingDate` datetime NOT NULL,
	`totalOrders` int NOT NULL,
	`totalDeliveredOrders` int NOT NULL,
	`totalCancelledOrders` int NOT NULL,
	`grossRevenue` decimal(10,2) NOT NULL,
	`platformCommissions` decimal(10,2) NOT NULL,
	`extraFees` decimal(10,2) NOT NULL,
	`productCosts` decimal(10,2) NOT NULL,
	`deliveryCosts` decimal(10,2) NOT NULL,
	`packagingCosts` decimal(10,2) NOT NULL,
	`discounts` decimal(10,2) NOT NULL,
	`refunds` decimal(10,2) NOT NULL,
	`totalNetMargin` decimal(10,2) NOT NULL,
	`netMarginPercent` decimal(5,2) NOT NULL,
	`ordersWithLoss` int NOT NULL DEFAULT 0,
	`averageDelayMinutes` int NOT NULL DEFAULT 0,
	`onTimeDeliveryPercent` decimal(5,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailyClosings_id` PRIMARY KEY(`id`),
	CONSTRAINT `dailyClosings_closingDate_unique` UNIQUE(`closingDate`)
);
--> statement-breakpoint
CREATE TABLE `deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`driverId` int NOT NULL,
	`neighborhood` varchar(255),
	`startedAt` timestamp,
	`deliveredAt` timestamp,
	`estimatedMinutes` int,
	`actualMinutes` int,
	`delayMinutes` int NOT NULL DEFAULT 0,
	`status` enum('pending','in_transit','delivered','failed') NOT NULL DEFAULT 'pending',
	`issueReason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `deliveries_orderId_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
CREATE TABLE `drivers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(20),
	`status` enum('available','one_order','two_orders','unavailable','delayed','paused') NOT NULL DEFAULT 'available',
	`activeOrderCount` int NOT NULL DEFAULT 0,
	`maxActiveOrders` int NOT NULL DEFAULT 2,
	`averageDeliveryTime` int DEFAULT 0,
	`delayRate` decimal(5,2) DEFAULT '0.00',
	`completedOrdersToday` int NOT NULL DEFAULT 0,
	`paymentDue` decimal(10,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drivers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feeRules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100),
	`productId` int,
	`platformFeePercent` decimal(5,2) NOT NULL,
	`extraFeePercent` decimal(5,2) NOT NULL DEFAULT '0.00',
	`paymentFeePercent` decimal(5,2) NOT NULL DEFAULT '0.00',
	`validFrom` datetime,
	`validTo` datetime,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feeRules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` decimal(10,2) NOT NULL,
	`unitCost` decimal(10,2) NOT NULL,
	`categoryFeePercent` decimal(5,2) NOT NULL,
	`extraFeePercent` decimal(5,2) NOT NULL DEFAULT '0.00',
	`grossAmount` decimal(10,2) NOT NULL,
	`feeAmount` decimal(10,2) NOT NULL,
	`costAmount` decimal(10,2) NOT NULL,
	`netMarginAmount` decimal(10,2) NOT NULL,
	`netMarginPercent` decimal(5,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalOrderId` varchar(100),
	`platform` varchar(50),
	`customerNeighborhood` varchar(255),
	`grossAmount` decimal(10,2) NOT NULL,
	`platformFeePercent` decimal(5,2) NOT NULL DEFAULT '20.00',
	`platformFeeAmount` decimal(10,2) NOT NULL,
	`extraFeeAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`productCostTotal` decimal(10,2) NOT NULL DEFAULT '0.00',
	`deliveryCost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`packagingCost` decimal(10,2) NOT NULL DEFAULT '0.00',
	`discountAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`refundAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`netMarginAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`netMarginPercent` decimal(5,2) NOT NULL DEFAULT '0.00',
	`slaPromisedMinutes` int NOT NULL DEFAULT 30,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`acceptedAt` timestamp,
	`pickingStartedAt` timestamp,
	`readyAt` timestamp,
	`dispatchedAt` timestamp,
	`deliveredAt` timestamp,
	`status` enum('pending','accepted','picking','ready','dispatched','delivered','cancelled') NOT NULL DEFAULT 'pending',
	`delayMinutes` int NOT NULL DEFAULT 0,
	`delayReason` varchar(255),
	`riskLevel` enum('none','low','medium','high') NOT NULL DEFAULT 'none',
	`driverId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_externalOrderId_unique` UNIQUE(`externalOrderId`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`sku` varchar(100),
	`category` varchar(100) NOT NULL,
	`salePrice` decimal(10,2) NOT NULL,
	`unitCost` decimal(10,2) NOT NULL,
	`stockTotal` int NOT NULL DEFAULT 0,
	`stockCold` int NOT NULL DEFAULT 0,
	`minimumStock` int NOT NULL DEFAULT 0,
	`platformFeePercent` decimal(5,2) NOT NULL DEFAULT '20.00',
	`extraFeePercent` decimal(5,2) NOT NULL DEFAULT '0.00',
	`marginTargetPercent` decimal(5,2) NOT NULL DEFAULT '15.00',
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `systemSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `systemSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `systemSettings_key_unique` UNIQUE(`key`)
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
