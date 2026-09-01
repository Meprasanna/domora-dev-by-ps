CREATE TABLE "availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"roomId" integer NOT NULL,
	"stayDate" timestamp NOT NULL,
	"availableUnits" integer NOT NULL,
	"nightlyPriceInr" numeric(12, 2) NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"hotelId" integer NOT NULL,
	"roomId" integer NOT NULL,
	"checkIn" timestamp NOT NULL,
	"checkOut" timestamp NOT NULL,
	"guests" integer NOT NULL,
	"subtotalInr" numeric(12, 2) NOT NULL,
	"taxInr" numeric(12, 2) NOT NULL,
	"feeInr" numeric(12, 2) NOT NULL,
	"discountInr" numeric(12, 2) DEFAULT '0' NOT NULL,
	"totalInr" numeric(12, 2) NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"stripePaymentIntentId" varchar(255),
	"couponId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"discountType" text NOT NULL,
	"discountValue" numeric(12, 2) NOT NULL,
	"minBookingInr" numeric(12, 2),
	"maxUses" integer,
	"usedCount" integer DEFAULT 0 NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"createdByUserId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "hotelImages" (
	"id" serial PRIMARY KEY NOT NULL,
	"hotelId" integer NOT NULL,
	"url" text NOT NULL,
	"publicId" varchar(255),
	"altText" varchar(255),
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotels" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerUserId" integer NOT NULL,
	"name" varchar(180) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"description" text,
	"city" varchar(120) NOT NULL,
	"pincode" varchar(20),
	"address" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"status" text DEFAULT 'draft' NOT NULL,
	"coverImageUrl" text,
	"amenities" json,
	"cancellationPolicy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hotels_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"role" text NOT NULL,
	"tokenHash" varchar(128) NOT NULL,
	"invitedByUserId" integer NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"acceptedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invites_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"channel" text NOT NULL,
	"eventType" varchar(80) NOT NULL,
	"recipient" varchar(320) NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"providerMessageId" varchar(255),
	"errorMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partnerApplications" (
	"id" serial PRIMARY KEY NOT NULL,
	"hotelId" integer NOT NULL,
	"partnerUserId" integer NOT NULL,
	"stripePaymentIntentId" varchar(255),
	"status" text DEFAULT 'payment_pending' NOT NULL,
	"reviewNote" text,
	"reviewedByUserId" integer,
	"reviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "priceComparisons" (
	"id" serial PRIMARY KEY NOT NULL,
	"hotelId" integer NOT NULL,
	"roomId" integer NOT NULL,
	"sourceName" varchar(120) NOT NULL,
	"sourceRoomDescription" text NOT NULL,
	"comparable" integer DEFAULT 0 NOT NULL,
	"marketPriceInr" numeric(12, 2) NOT NULL,
	"targetPriceInr" numeric(12, 2) NOT NULL,
	"anomalyScore" numeric(5, 2),
	"checkedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"hotelId" integer NOT NULL,
	"bookingId" integer NOT NULL,
	"rating" integer NOT NULL,
	"body" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"moderatedByUserId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"hotelId" integer NOT NULL,
	"name" varchar(180) NOT NULL,
	"description" text,
	"bedType" varchar(80),
	"maxGuests" integer NOT NULL,
	"basePriceInr" numeric(12, 2) NOT NULL,
	"amenities" json,
	"cancellationPolicy" text,
	"totalUnits" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"phone" varchar(32),
	"loginMethod" varchar(64),
	"role" text DEFAULT 'guest' NOT NULL,
	"preferredLanguage" text DEFAULT 'en' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "wishlists" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"hotelId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
