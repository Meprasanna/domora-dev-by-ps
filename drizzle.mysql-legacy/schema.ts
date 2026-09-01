import { decimal, integer, json, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: text("role").default("guest").notNull(),
  preferredLanguage: text("preferredLanguage").default("en").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const invites = pgTable("invites", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  role: text("role").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  invitedByUserId: integer("invitedByUserId").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const hotels = pgTable("hotels", {
  id: serial("id").primaryKey(),
  ownerUserId: integer("ownerUserId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  slug: varchar("slug", { length: 220 }).notNull().unique(),
  description: text("description"),
  city: varchar("city", { length: 120 }).notNull(),
  pincode: varchar("pincode", { length: 20 }),
  address: text("address"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  status: text("status").default("draft").notNull(),
  coverImageUrl: text("coverImageUrl"),
  amenities: json("amenities"),
  cancellationPolicy: text("cancellationPolicy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const hotelImages = pgTable("hotelImages", {
  id: serial("id").primaryKey(),
  hotelId: integer("hotelId").notNull(),
  url: text("url").notNull(),
  publicId: varchar("publicId", { length: 255 }),
  altText: varchar("altText", { length: 255 }),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  hotelId: integer("hotelId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  description: text("description"),
  bedType: varchar("bedType", { length: 80 }),
  maxGuests: integer("maxGuests").notNull(),
  basePriceInr: decimal("basePriceInr", { precision: 12, scale: 2 }).notNull(),
  amenities: json("amenities"),
  cancellationPolicy: text("cancellationPolicy"),
  totalUnits: integer("totalUnits").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const availability = pgTable("availability", {
  id: serial("id").primaryKey(),
  roomId: integer("roomId").notNull(),
  stayDate: timestamp("stayDate").notNull(),
  availableUnits: integer("availableUnits").notNull(),
  nightlyPriceInr: decimal("nightlyPriceInr", { precision: 12, scale: 2 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const partnerApplications = pgTable("partnerApplications", {
  id: serial("id").primaryKey(),
  hotelId: integer("hotelId").notNull(),
  partnerUserId: integer("partnerUserId").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  status: text("status").default("payment_pending").notNull(),
  reviewNote: text("reviewNote"),
  reviewedByUserId: integer("reviewedByUserId"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  hotelId: integer("hotelId").notNull(),
  roomId: integer("roomId").notNull(),
  checkIn: timestamp("checkIn").notNull(),
  checkOut: timestamp("checkOut").notNull(),
  guests: integer("guests").notNull(),
  subtotalInr: decimal("subtotalInr", { precision: 12, scale: 2 }).notNull(),
  taxInr: decimal("taxInr", { precision: 12, scale: 2 }).notNull(),
  feeInr: decimal("feeInr", { precision: 12, scale: 2 }).notNull(),
  discountInr: decimal("discountInr", { precision: 12, scale: 2 }).default("0").notNull(),
  totalInr: decimal("totalInr", { precision: 12, scale: 2 }).notNull(),
  status: text("status").default("pending_payment").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  couponId: integer("couponId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const wishlists = pgTable("wishlists", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  hotelId: integer("hotelId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  hotelId: integer("hotelId").notNull(),
  bookingId: integer("bookingId").notNull(),
  rating: integer("rating").notNull(),
  body: text("body"),
  status: text("status").default("pending").notNull(),
  moderatedByUserId: integer("moderatedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  discountType: text("discountType").notNull(),
  discountValue: decimal("discountValue", { precision: 12, scale: 2 }).notNull(),
  minBookingInr: decimal("minBookingInr", { precision: 12, scale: 2 }),
  maxUses: integer("maxUses"),
  usedCount: integer("usedCount").default(0).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  active: integer("active").default(1).notNull(),
  createdByUserId: integer("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  channel: text("channel").notNull(),
  eventType: varchar("eventType", { length: 80 }).notNull(),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  status: text("status").default("queued").notNull(),
  providerMessageId: varchar("providerMessageId", { length: 255 }),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const priceComparisons = pgTable("priceComparisons", {
  id: serial("id").primaryKey(),
  hotelId: integer("hotelId").notNull(),
  roomId: integer("roomId").notNull(),
  sourceName: varchar("sourceName", { length: 120 }).notNull(),
  sourceRoomDescription: text("sourceRoomDescription").notNull(),
  comparable: integer("comparable").default(0).notNull(),
  marketPriceInr: decimal("marketPriceInr", { precision: 12, scale: 2 }).notNull(),
  targetPriceInr: decimal("targetPriceInr", { precision: 12, scale: 2 }).notNull(),
  anomalyScore: decimal("anomalyScore", { precision: 5, scale: 2 }),
  checkedAt: timestamp("checkedAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Hotel = typeof hotels.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
