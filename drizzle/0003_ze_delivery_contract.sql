ALTER TABLE `apiCredentials`
	ADD COLUMN `lastEventId` varchar(255);
--> statement-breakpoint
ALTER TABLE `apiCredentials`
	ALTER COLUMN `scope` SET DEFAULT 'orders/read';
--> statement-breakpoint
ALTER TABLE `orderEvents`
	MODIFY COLUMN `eventType` enum('CREATED','CONFIRMED','READY_FOR_PICKUP','DISPATCHED','CANCELLED','CONCLUDED','EDITED') NOT NULL;
