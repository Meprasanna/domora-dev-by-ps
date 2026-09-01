ALTER TABLE "refreshAlertSettings" ADD COLUMN "whatsappRecipient" varchar(32);--> statement-breakpoint
ALTER TABLE "refreshAlertSettings" ADD COLUMN "inAppEnabled" integer DEFAULT 1 NOT NULL;