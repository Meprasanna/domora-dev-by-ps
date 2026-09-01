ALTER TABLE "priceRefreshJobs" ADD COLUMN "hotelId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "priceRefreshJobs" ADD COLUMN "roomId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "priceRefreshJobs" ADD COLUMN "providerHotelCode" varchar(80);--> statement-breakpoint
ALTER TABLE "priceRefreshJobs" ADD COLUMN "checkIn" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "priceRefreshJobs" ADD COLUMN "checkOut" varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE "priceRefreshJobs" ADD COLUMN "guests" integer DEFAULT 2 NOT NULL;