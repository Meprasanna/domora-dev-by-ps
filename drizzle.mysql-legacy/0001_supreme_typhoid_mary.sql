CREATE TABLE `availability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`stayDate` timestamp NOT NULL,
	`availableUnits` int NOT NULL,
	`nightlyPriceInr` decimal(12,2) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `availability_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`hotelId` int NOT NULL,
	`roomId` int NOT NULL,
	`checkIn` timestamp NOT NULL,
	`checkOut` timestamp NOT NULL,
	`guests` int NOT NULL,
	`subtotalInr` decimal(12,2) NOT NULL,
	`taxInr` decimal(12,2) NOT NULL,
	`feeInr` decimal(12,2) NOT NULL,
	`discountInr` decimal(12,2) NOT NULL DEFAULT '0',
	`totalInr` decimal(12,2) NOT NULL,
	`status` enum('pending_payment','confirmed','cancelled','completed','failed') NOT NULL DEFAULT 'pending_payment',
	`stripePaymentIntentId` varchar(255),
	`couponId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`discountType` enum('percent','fixed_inr') NOT NULL,
	`discountValue` decimal(12,2) NOT NULL,
	`minBookingInr` decimal(12,2),
	`maxUses` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`active` int NOT NULL DEFAULT 1,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `hotelImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hotelId` int NOT NULL,
	`url` text NOT NULL,
	`publicId` varchar(255),
	`altText` varchar(255),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hotelImages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `hotels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`slug` varchar(220) NOT NULL,
	`description` text,
	`city` varchar(120) NOT NULL,
	`pincode` varchar(20),
	`address` text,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`status` enum('draft','payment_pending','pending_approval','approved','rejected','suspended') NOT NULL DEFAULT 'draft',
	`coverImageUrl` text,
	`amenities` json,
	`cancellationPolicy` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hotels_id` PRIMARY KEY(`id`),
	CONSTRAINT `hotels_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('partner','super_admin') NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`invitedByUserId` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `invites_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`channel` enum('email','whatsapp') NOT NULL,
	`eventType` varchar(80) NOT NULL,
	`recipient` varchar(320) NOT NULL,
	`status` enum('queued','sent','failed','disabled') NOT NULL DEFAULT 'queued',
	`providerMessageId` varchar(255),
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partnerApplications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hotelId` int NOT NULL,
	`partnerUserId` int NOT NULL,
	`stripePaymentIntentId` varchar(255),
	`status` enum('payment_pending','payment_confirmed','approved','rejected') NOT NULL DEFAULT 'payment_pending',
	`reviewNote` text,
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partnerApplications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `priceComparisons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hotelId` int NOT NULL,
	`roomId` int NOT NULL,
	`sourceName` varchar(120) NOT NULL,
	`sourceRoomDescription` text NOT NULL,
	`comparable` int NOT NULL DEFAULT 0,
	`marketPriceInr` decimal(12,2) NOT NULL,
	`targetPriceInr` decimal(12,2) NOT NULL,
	`anomalyScore` decimal(5,2),
	`checkedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `priceComparisons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`hotelId` int NOT NULL,
	`bookingId` int NOT NULL,
	`rating` int NOT NULL,
	`body` text,
	`status` enum('pending','published','rejected') NOT NULL DEFAULT 'pending',
	`moderatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hotelId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`description` text,
	`bedType` varchar(80),
	`maxGuests` int NOT NULL,
	`basePriceInr` decimal(12,2) NOT NULL,
	`amenities` json,
	`cancellationPolicy` text,
	`totalUnits` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rooms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wishlists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`hotelId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wishlists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('guest','partner','super_admin') NOT NULL DEFAULT 'guest';--> statement-breakpoint
ALTER TABLE `users` ADD `preferredLanguage` enum('en','hi') DEFAULT 'en' NOT NULL;