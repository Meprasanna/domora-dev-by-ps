CREATE TABLE "bookingStatusAudits" (
	"id" serial PRIMARY KEY NOT NULL,
	"bookingId" integer NOT NULL,
	"hotelId" integer NOT NULL,
	"changedByUserId" integer NOT NULL,
	"actorRole" text NOT NULL,
	"fromStatus" text,
	"toStatus" text NOT NULL,
	"note" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "priceRefreshJobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"providerKey" varchar(80) NOT NULL,
	"name" varchar(120) NOT NULL,
	"scheduleCronTaskUid" varchar(65),
	"cronExpression" varchar(80) NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"lastRunAt" timestamp,
	"nextRunAt" timestamp,
	"lastSuccessAt" timestamp,
	"lastError" text,
	"lastRunKey" varchar(160),
	"enabled" integer DEFAULT 1 NOT NULL,
	"createdByUserId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplierCredentialStatuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"providerKey" varchar(80) NOT NULL,
	"providerName" varchar(120) NOT NULL,
	"secretEnvKeys" text NOT NULL,
	"configured" integer DEFAULT 0 NOT NULL,
	"validationStatus" text DEFAULT 'not_checked' NOT NULL,
	"lastValidatedAt" timestamp,
	"lastError" text,
	"updatedByUserId" integer,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
