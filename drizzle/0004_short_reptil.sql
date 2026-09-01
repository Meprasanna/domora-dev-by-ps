CREATE TABLE "refreshAlertSettings" (
	"id" serial PRIMARY KEY NOT NULL,
	"enabled" integer DEFAULT 1 NOT NULL,
	"failureThreshold" integer DEFAULT 1 NOT NULL,
	"recipientEmail" varchar(320),
	"updatedByUserId" integer,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refreshExecutionRuns" (
	"id" serial PRIMARY KEY NOT NULL,
	"refreshJobId" integer NOT NULL,
	"providerKey" varchar(80) NOT NULL,
	"status" text NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"finishedAt" timestamp,
	"durationMs" integer,
	"offerCount" integer DEFAULT 0 NOT NULL,
	"errorMessage" text
);
--> statement-breakpoint
ALTER TABLE "hotels" ADD COLUMN "hotelbedsCode" varchar(80);