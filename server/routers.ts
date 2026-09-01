import { z } from "zod";
import crypto from "node:crypto";
import { parse as parseCookieHeader } from "cookie";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { createHeartbeatJob, listHeartbeatJobs, updateHeartbeatJob } from "./_core/heartbeat";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb, getHotelBySlug, getPartnerApplications, getPartnerDashboard, getRoomWithAvailability, listApprovedHotels } from "./db";
import { availability, bookingStatusAudits, bookings, coupons, hotels, invites, notifications, partnerApplications, priceRefreshJobs, refreshAlertSettings, refreshExecutionRuns, reviews, rooms, supplierCredentialStatuses, supplierOffers, users, wishlists } from "../drizzle/schema";
import { createBookingCheckout, createPartnerOnboardingCheckout } from "./stripe";
import { createCloudinaryUploadSignature } from "./cloudinary";
import { calculateBookingPrice, calculateDomoraTargetPrice } from "./pricing";
import { compareRooms } from "./pricingIntelligence";
import { notifyUser } from "./notifications";
import { canReviewStay } from "./reviewEligibility";
import { getSupplierAdapterStatuses } from "./suppliers";
import { createDemoSupplierAdapter } from "./supplierAdapters";
import { searchHotelbeds, searchHotelbedsCatalog } from "./hotelbedsAdapter";
import { isValidAvailabilityBatch } from "./refreshGuards";
import { runLiveComparison } from "./liveComparison";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  hotels: router({
    list: publicProcedure.input(z.object({ city: z.string().optional(), guests: z.number().int().positive().optional(), maxPriceInr: z.string().optional(), checkIn: z.string().optional(), checkOut: z.string().optional(), cancellationPolicy: z.string().optional() }).optional()).query(({ input }) => listApprovedHotels(input ?? {})),
    bySlug: publicProcedure.input(z.object({ slug: z.string().min(1) })).query(({ input }) => getHotelBySlug(input.slug)),
    liveComparison: publicProcedure.input(z.object({ hotelId: z.number().int().positive(), roomId: z.number().int().positive(), checkIn: z.string(), checkOut: z.string(), guests: z.number().int().positive() })).query(async ({ input }) => { const db = await getDb(); if (!db) return { offers: [], lowestOffer: null, providerStatuses: [], checkedAt: new Date(), displayOnly: true as const }; const hotel = (await db.select({ id: hotels.id, hotelbedsCode: hotels.hotelbedsCode }).from(hotels).where(eq(hotels.id, input.hotelId)).limit(1))[0]; if (!hotel) throw new Error("Hotel not found"); return runLiveComparison({ ...input, hotelbedsCode: hotel.hotelbedsCode ?? undefined, includeDemo: false }); }),
    geocode: publicProcedure.input(z.object({ query: z.string().min(2).max(120) })).query(async ({ input }) => {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", input.query);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("limit", "5");
      const response = await fetch(url, { headers: { "User-Agent": "Domora/1.0 hotel discovery" } });
      if (!response.ok) throw new Error("Location provider unavailable");
      return response.json() as Promise<Array<{ display_name: string; lat: string; lon: string; type: string }>>;
    }),
  }),
  partner: router({
    dashboard: protectedProcedure.query(({ ctx }) => getPartnerDashboard(ctx.user.id)),
    searchHotelbedsCatalog: protectedProcedure.input(z.object({ term: z.string().trim().max(80) })).query(async ({ ctx, input }) => { if (ctx.user.role !== "partner") throw new Error("Only partners can search Hotelbeds properties"); return searchHotelbedsCatalog(input.term); }),
    hotelbedsMappings: protectedProcedure.query(async ({ ctx }) => { if (ctx.user.role !== "partner") throw new Error("Only partners can manage Hotelbeds mappings"); const db = await getDb(); if (!db) return []; return db.select({ id: hotels.id, name: hotels.name, city: hotels.city, hotelbedsCode: hotels.hotelbedsCode, status: hotels.status }).from(hotels).where(eq(hotels.ownerUserId, ctx.user.id)).orderBy(hotels.name); }),
    mapHotelbedsProperty: protectedProcedure.input(z.object({ hotelId: z.number().int().positive(), hotelbedsCode: z.string().trim().min(1).max(80), checkIn: z.string(), checkOut: z.string(), guests: z.number().int().positive() })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "partner") throw new Error("Only partners can manage Hotelbeds mappings"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); const owned = (await db.select({ id: hotels.id }).from(hotels).where(and(eq(hotels.id, input.hotelId), eq(hotels.ownerUserId, ctx.user.id))).limit(1))[0]; if (!owned) throw new Error("Hotel is not owned by this partner"); const room = (await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.hotelId, input.hotelId)).limit(1))[0]; if (!room) throw new Error("Add a room before validating a Hotelbeds property"); const offers = await searchHotelbeds({ hotelId: input.hotelId, roomId: room.id, hotelCode: input.hotelbedsCode, checkIn: input.checkIn, checkOut: input.checkOut, guests: input.guests }); await db.update(hotels).set({ hotelbedsCode: input.hotelbedsCode, updatedAt: new Date() }).where(eq(hotels.id, input.hotelId)); return { mapped: true as const, hotelbedsCode: input.hotelbedsCode, evaluationOfferCount: offers.length, displayOnly: true as const }; }),
    unmapHotelbedsProperty: protectedProcedure.input(z.object({ hotelId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "partner") throw new Error("Only partners can manage Hotelbeds mappings"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); const owned = (await db.select({ id: hotels.id }).from(hotels).where(and(eq(hotels.id, input.hotelId), eq(hotels.ownerUserId, ctx.user.id))).limit(1))[0]; if (!owned) throw new Error("Hotel is not owned by this partner"); await db.update(hotels).set({ hotelbedsCode: null, updatedAt: new Date() }).where(eq(hotels.id, input.hotelId)); return { unmapped: true as const }; }),
    createUploadSignature: protectedProcedure.query(() => createCloudinaryUploadSignature()),
    updateHotel: protectedProcedure.input(z.object({ hotelId: z.number().int().positive(), name: z.string().min(2), city: z.string().min(2), description: z.string().optional(), cancellationPolicy: z.string().optional(), hotelbedsCode: z.string().max(80).optional() })).mutation(async ({ ctx, input }) => { if (ctx.user.role !== "partner") throw new Error("Only partner accounts can update hotel mappings"); const db = await getDb(); if (!db) throw new Error("Database unavailable"); const owned = await db.select({ id: hotels.id }).from(hotels).where(and(eq(hotels.id, input.hotelId), eq(hotels.ownerUserId, ctx.user.id))).limit(1); if (!owned[0]) throw new Error("Hotel is not owned by this partner"); await db.update(hotels).set({ name: input.name, city: input.city, description: input.description, cancellationPolicy: input.cancellationPolicy, hotelbedsCode: input.hotelbedsCode || null, updatedAt: new Date() }).where(eq(hotels.id, input.hotelId)); return { updated: true as const }; }),
    updateRoomRate: protectedProcedure.input(z.object({ roomId: z.number().int().positive(), basePriceInr: z.number().positive() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const owned = await db.select({ roomId: rooms.id }).from(rooms).innerJoin(hotels, eq(rooms.hotelId, hotels.id)).where(and(eq(rooms.id, input.roomId), eq(hotels.ownerUserId, ctx.user.id))).limit(1); if (!owned[0]) throw new Error("Room is not owned by this partner"); await db.update(rooms).set({ basePriceInr: String(input.basePriceInr), updatedAt: new Date() }).where(eq(rooms.id, input.roomId)); return { updated: true as const }; }),
    batchAvailability: protectedProcedure.input(z.object({ roomId: z.number().int().positive(), startDate: z.coerce.date(), endDate: z.coerce.date(), availableUnits: z.number().int().nonnegative(), nightlyPriceInr: z.number().positive() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); if (!isValidAvailabilityBatch(input.startDate, input.endDate)) throw new Error("End date must be on or after start date"); const owned = await db.select({ roomId: rooms.id }).from(rooms).innerJoin(hotels, eq(rooms.hotelId, hotels.id)).where(and(eq(rooms.id, input.roomId), eq(hotels.ownerUserId, ctx.user.id))).limit(1); if (!owned[0]) throw new Error("Room is not owned by this partner"); let updated = 0; for (let day = new Date(input.startDate); day <= input.endDate; day.setUTCDate(day.getUTCDate() + 1)) { const stayDate = new Date(day); const existing = await db.select({ id: availability.id }).from(availability).where(and(eq(availability.roomId, input.roomId), eq(availability.stayDate, stayDate))).limit(1); if (existing[0]) await db.update(availability).set({ availableUnits: input.availableUnits, nightlyPriceInr: String(input.nightlyPriceInr), updatedAt: new Date() }).where(eq(availability.id, existing[0].id)); else await db.insert(availability).values({ roomId: input.roomId, stayDate, availableUnits: input.availableUnits, nightlyPriceInr: String(input.nightlyPriceInr) }); updated++; } return { updated }; }),
    upsertAvailability: protectedProcedure.input(z.object({ roomId: z.number().int().positive(), stayDate: z.coerce.date(), availableUnits: z.number().int().nonnegative(), nightlyPriceInr: z.number().positive() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const owned = await db.select({ roomId: rooms.id }).from(rooms).innerJoin(hotels, eq(rooms.hotelId, hotels.id)).where(and(eq(rooms.id, input.roomId), eq(hotels.ownerUserId, ctx.user.id))).limit(1); if (!owned[0]) throw new Error("Room is not owned by this partner"); const existing = await db.select({ id: availability.id }).from(availability).where(and(eq(availability.roomId, input.roomId), eq(availability.stayDate, input.stayDate))).limit(1); if (existing[0]) await db.update(availability).set({ availableUnits: input.availableUnits, nightlyPriceInr: String(input.nightlyPriceInr), updatedAt: new Date() }).where(eq(availability.id, existing[0].id)); else await db.insert(availability).values({ roomId: input.roomId, stayDate: input.stayDate, availableUnits: input.availableUnits, nightlyPriceInr: String(input.nightlyPriceInr) }); return { updated: true as const }; }),
    updateBookingStatus: protectedProcedure.input(z.object({ bookingId: z.number().int().positive(), status: z.enum(["confirmed", "cancelled", "completed", "failed"]), note: z.string().max(500).optional() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const owned = await db.select({ bookingId: bookings.id, hotelId: bookings.hotelId, status: bookings.status }).from(bookings).innerJoin(hotels, eq(bookings.hotelId, hotels.id)).where(and(eq(bookings.id, input.bookingId), eq(hotels.ownerUserId, ctx.user.id))).limit(1); if (!owned[0]) throw new Error("Booking is not owned by this partner"); await db.update(bookings).set({ status: input.status, updatedAt: new Date() }).where(eq(bookings.id, input.bookingId)); await db.insert(bookingStatusAudits).values({ bookingId: input.bookingId, hotelId: owned[0].hotelId, changedByUserId: ctx.user.id, actorRole: ctx.user.role, fromStatus: owned[0].status, toStatus: input.status, note: input.note }); return { updated: true as const }; }),
    bookingAudits: protectedProcedure.input(z.object({ bookingId: z.number().int().positive() })).query(async ({ ctx, input }) => { const db = await getDb(); if (!db) return []; const owned = await db.select({ id: bookings.id }).from(bookings).innerJoin(hotels, eq(bookings.hotelId, hotels.id)).where(and(eq(bookings.id, input.bookingId), eq(hotels.ownerUserId, ctx.user.id))).limit(1); if (!owned[0]) throw new Error("Booking is not owned by this partner"); return db.select().from(bookingStatusAudits).where(eq(bookingStatusAudits.bookingId, input.bookingId)).orderBy(desc(bookingStatusAudits.createdAt)); }),
    createApplication: protectedProcedure.input(z.object({ name: z.string().min(2), slug: z.string().min(2), city: z.string().min(2), pincode: z.string().optional(), address: z.string().optional(), description: z.string().optional(), coverImageUrl: z.string().url().optional(), phone: z.string().min(7).max(32).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      if (input.phone) await db.update(users).set({ phone: input.phone }).where(eq(users.id, ctx.user.id));
      const hotel = await db.insert(hotels).values({ name: input.name, slug: input.slug, city: input.city, pincode: input.pincode, address: input.address, description: input.description, coverImageUrl: input.coverImageUrl, ownerUserId: ctx.user.id, status: "payment_pending" }).returning({ id: hotels.id });
      const hotelId = hotel[0]?.id;
      if (!hotelId) throw new Error("Unable to create hotel application");
      await db.insert(partnerApplications).values({ hotelId, partnerUserId: ctx.user.id, status: "payment_pending" });
      return { hotelId, onboardingFeeInr: 10000, status: "payment_pending" as const };
    }),
    createOnboardingCheckout: protectedProcedure.input(z.object({ hotelId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const session = await createPartnerOnboardingCheckout({ userId: ctx.user.id, email: ctx.user.email, name: ctx.user.name, hotelId: input.hotelId, origin: ctx.req.headers.origin ?? "http://localhost" });
      return { url: session.url, sessionId: session.id };
    }),
  }),
  rooms: router({
    byId: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getRoomWithAvailability(input.id)),
  }),
  bookings: router({
    createDraft: protectedProcedure.input(z.object({ hotelId: z.number().int().positive(), roomId: z.number().int().positive(), checkIn: z.coerce.date(), checkOut: z.coerce.date(), guests: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      if (input.checkOut <= input.checkIn) throw new Error("Check-out must be after check-in");
      const room = await db.select().from(rooms).where(and(eq(rooms.id, input.roomId), eq(rooms.hotelId, input.hotelId))).limit(1);
      if (!room[0]) throw new Error("Room is unavailable");
      if (input.guests > room[0].maxGuests) throw new Error("Guest count exceeds room capacity");
      const nights = Math.ceil((input.checkOut.getTime() - input.checkIn.getTime()) / 86_400_000);
      const inventory = await db.select().from(availability).where(and(eq(availability.roomId, input.roomId), gte(availability.stayDate, input.checkIn), lt(availability.stayDate, input.checkOut)));
      if (inventory.length > 0 && (inventory.length < nights || inventory.some(day => day.availableUnits < 1))) throw new Error("Room is not available for every selected date");
      const quote = calculateBookingPrice({ nightlyRateInr: Number(room[0].basePriceInr), nights });
      const inserted = await db.insert(bookings).values({ userId: ctx.user.id, hotelId: input.hotelId, roomId: input.roomId, checkIn: input.checkIn, checkOut: input.checkOut, guests: input.guests, subtotalInr: quote.subtotalInr.toFixed(2), taxInr: quote.taxInr.toFixed(2), feeInr: quote.feeInr.toFixed(2), discountInr: quote.discountInr.toFixed(2), totalInr: quote.totalInr.toFixed(2), status: "pending_payment" }).returning({ id: bookings.id });
      return { bookingId: inserted[0]?.id, nights, quote };
    }),
    createCheckout: protectedProcedure.input(z.object({ bookingId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const booking = await db.select().from(bookings).where(and(eq(bookings.id, input.bookingId), eq(bookings.userId, ctx.user.id))).limit(1);
      if (!booking[0] || booking[0].status !== "pending_payment") throw new Error("Booking is not ready for payment");
      const session = await createBookingCheckout({ userId: ctx.user.id, email: ctx.user.email, name: ctx.user.name, bookingId: input.bookingId, totalInr: Number(booking[0].totalInr), origin: ctx.req.headers.origin ?? "http://localhost" });
      return { url: session.url, sessionId: session.id };
    }),
  }),
  suppliers: router({
    status: publicProcedure.query(() => getSupplierAdapterStatuses()),
  }),
  pricing: router({
    quote: publicProcedure.input(z.object({ nightlyRateInr: z.number().nonnegative(), nights: z.number().int().positive(), taxRate: z.number().min(0).max(1).optional(), serviceFeeRate: z.number().min(0).max(1).optional(), coupon: z.object({ type: z.enum(["percent", "fixed_inr"]), value: z.number().nonnegative() }).optional() })).query(({ input }) => calculateBookingPrice(input)),
    targetPrice: publicProcedure.input(z.object({ marketBenchmarkInr: z.number().nonnegative() })).query(({ input }) => ({ targetPriceInr: calculateDomoraTargetPrice(input.marketBenchmarkInr) })),
    compareRooms: adminProcedure.input(z.object({ rooms: z.array(z.object({ sourceRoom: z.string(), candidateRoom: z.string(), sourcePriceInr: z.number().nonnegative(), candidatePriceInr: z.number().nonnegative() })).max(25) })).mutation(({ input }) => compareRooms(input.rooms)),
  }),
  wishlist: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(wishlists).where(eq(wishlists.userId, ctx.user.id));
    }),
    toggle: protectedProcedure.input(z.object({ hotelId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const existing = await db.select().from(wishlists).where(and(eq(wishlists.userId, ctx.user.id), eq(wishlists.hotelId, input.hotelId))).limit(1);
      if (existing[0]) {
        await db.delete(wishlists).where(eq(wishlists.id, existing[0].id));
        return { saved: false };
      }
      await db.insert(wishlists).values({ userId: ctx.user.id, hotelId: input.hotelId });
      return { saved: true };
    }),
  }),
  invites: router({
    accept: protectedProcedure.input(z.object({ token: z.string().min(20) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");
      const invite = await db.select().from(invites).where(eq(invites.tokenHash, tokenHash)).limit(1);
      if (!invite[0] || invite[0].acceptedAt || invite[0].expiresAt <= new Date() || (ctx.user.email ?? "").toLowerCase() !== invite[0].email.toLowerCase()) throw new Error("Invite is invalid or expired");
      await db.update(users).set({ role: invite[0].role }).where(eq(users.id, ctx.user.id));
      await db.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, invite[0].id));
      return { accepted: true as const, role: invite[0].role };
    }),
  }),
  coupons: router({
    validate: publicProcedure.input(z.object({ code: z.string().min(2) })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { valid: false as const };
      const found = await db.select().from(coupons).where(eq(coupons.code, input.code.toUpperCase())).limit(1);
      const coupon = found[0];
      if (!coupon || !coupon.active || coupon.expiresAt <= new Date() || (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)) return { valid: false as const };
      return { valid: true as const, type: coupon.discountType, value: Number(coupon.discountValue), minBookingInr: coupon.minBookingInr ? Number(coupon.minBookingInr) : null };
    }),
  }),
  reviews: router({
    create: protectedProcedure.input(z.object({ hotelId: z.number().int().positive(), bookingId: z.number().int().positive(), rating: z.number().int().min(1).max(5), body: z.string().max(2000).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const booking = await db.select().from(bookings).where(and(eq(bookings.id, input.bookingId), eq(bookings.userId, ctx.user.id), eq(bookings.hotelId, input.hotelId))).limit(1);
      if (!booking[0] || !canReviewStay({ status: booking[0].status, checkOut: booking[0].checkOut })) throw new Error("Reviews are available only after a completed stay");
      const existing = await db.select().from(reviews).where(and(eq(reviews.bookingId, input.bookingId), eq(reviews.userId, ctx.user.id))).limit(1);
      if (existing[0]) throw new Error("You have already reviewed this stay");
      await db.insert(reviews).values({ ...input, userId: ctx.user.id, status: "pending" });
      return { submitted: true as const, status: "pending" as const };
    }),
  }),
  admin: router({
    applications: adminProcedure.query(() => getPartnerApplications()),
    bookings: adminProcedure.input(z.object({ page: z.number().int().positive().default(1), pageSize: z.number().int().min(10).max(100).default(25) })).query(async ({ input }) => { const db = await getDb(); if (!db) return { items: [], total: 0, page: input.page, pageSize: input.pageSize }; const [items, count] = await Promise.all([db.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize), db.select({ count: sql<number>`count(*)` }).from(bookings)]); return { items, total: Number(count[0]?.count ?? 0), page: input.page, pageSize: input.pageSize }; }),
    users: adminProcedure.input(z.object({ page: z.number().int().positive().default(1), pageSize: z.number().int().min(10).max(100).default(25) })).query(async ({ input }) => { const db = await getDb(); if (!db) return { items: [], total: 0, page: input.page, pageSize: input.pageSize }; const [items, count] = await Promise.all([db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, role: users.role, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize), db.select({ count: sql<number>`count(*)` }).from(users)]); return { items, total: Number(count[0]?.count ?? 0), page: input.page, pageSize: input.pageSize }; }),
    reviews: adminProcedure.input(z.object({ page: z.number().int().positive().default(1), pageSize: z.number().int().min(10).max(100).default(25) })).query(async ({ input }) => { const db = await getDb(); if (!db) return { items: [], total: 0, page: input.page, pageSize: input.pageSize }; const [items, count] = await Promise.all([db.select().from(reviews).orderBy(desc(reviews.createdAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize), db.select({ count: sql<number>`count(*)` }).from(reviews)]); return { items, total: Number(count[0]?.count ?? 0), page: input.page, pageSize: input.pageSize }; }),
    coupons: adminProcedure.input(z.object({ page: z.number().int().positive().default(1), pageSize: z.number().int().min(10).max(100).default(25) })).query(async ({ input }) => { const db = await getDb(); if (!db) return { items: [], total: 0, page: input.page, pageSize: input.pageSize }; const [items, count] = await Promise.all([db.select().from(coupons).orderBy(desc(coupons.createdAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize), db.select({ count: sql<number>`count(*)` }).from(coupons)]); return { items, total: Number(count[0]?.count ?? 0), page: input.page, pageSize: input.pageSize }; }),
    approveApplication: adminProcedure.input(z.object({ applicationId: z.number().int().positive(), note: z.string().optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const application = await db.select().from(partnerApplications).where(eq(partnerApplications.id, input.applicationId)).limit(1);
      if (!application[0]) throw new Error("Application not found");
      if (application[0].status !== "payment_confirmed") throw new Error("Payment must be confirmed before approval");
      await db.update(partnerApplications).set({ status: "approved", reviewNote: input.note, reviewedByUserId: ctx.user.id, reviewedAt: new Date() }).where(eq(partnerApplications.id, input.applicationId));
      await db.update(hotels).set({ status: "approved" }).where(eq(hotels.id, application[0].hotelId));
      const partner = await db.select().from(users).where(eq(users.id, application[0].partnerUserId)).limit(1);
      if (partner[0]) await notifyUser({ userId: partner[0].id, email: partner[0].email, phone: partner[0].phone, event: "partner_application_approved", subject: "Your Domora hotel is approved", text: `Your Domora hotel application #${application[0].id} has been approved and is now eligible for publication.` });
      return { approved: true };
    }),
    rejectApplication: adminProcedure.input(z.object({ applicationId: z.number().int().positive(), note: z.string().min(2) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const application = await db.select().from(partnerApplications).where(eq(partnerApplications.id, input.applicationId)).limit(1);
      if (!application[0]) throw new Error("Application not found");
      await db.update(partnerApplications).set({ status: "rejected", reviewNote: input.note, reviewedByUserId: ctx.user.id, reviewedAt: new Date() }).where(eq(partnerApplications.id, input.applicationId));
      await db.update(hotels).set({ status: "rejected" }).where(eq(hotels.id, application[0].hotelId));
      const partner = await db.select().from(users).where(eq(users.id, application[0].partnerUserId)).limit(1);
      if (partner[0]) await notifyUser({ userId: partner[0].id, email: partner[0].email, phone: partner[0].phone, event: "partner_application_rejected", subject: "Update on your Domora hotel application", text: `Your Domora hotel application #${application[0].id} was not approved. Admin note: ${input.note}` });
      return { rejected: true };
    }),
    createInvite: adminProcedure.input(z.object({ email: z.string().email(), role: z.enum(["partner", "super_admin"]), expiresAt: z.coerce.date() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const token = crypto.randomBytes(32).toString("hex");
      await db.insert(invites).values({ email: input.email.toLowerCase(), role: input.role, tokenHash: crypto.createHash("sha256").update(token).digest("hex"), invitedByUserId: ctx.user.id, expiresAt: input.expiresAt });
      return { token, email: input.email, role: input.role };
    }),
    createCoupon: adminProcedure.input(z.object({ code: z.string().min(2).max(40), discountType: z.enum(["percent", "fixed_inr"]), discountValue: z.number().positive(), expiresAt: z.coerce.date(), maxUses: z.number().int().positive().optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.insert(coupons).values({ code: input.code.toUpperCase(), discountType: input.discountType, discountValue: input.discountValue.toFixed(2), expiresAt: input.expiresAt, maxUses: input.maxUses, createdByUserId: ctx.user.id });
      return { created: true as const };
    }),
    updateBookingStatus: adminProcedure.input(z.object({ bookingId: z.number().int().positive(), status: z.enum(["confirmed", "cancelled", "completed", "failed"]) })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.update(bookings).set({ status: input.status }).where(eq(bookings.id, input.bookingId)); return { updated: true as const }; }),
    updateUserRole: adminProcedure.input(z.object({ userId: z.number().int().positive(), role: z.enum(["guest", "partner", "super_admin"]) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); if (input.userId === ctx.user.id && input.role !== "super_admin") throw new Error("You cannot remove your own super-admin role"); await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId)); return { updated: true as const }; }),
    toggleCoupon: adminProcedure.input(z.object({ couponId: z.number().int().positive(), active: z.boolean() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); await db.update(coupons).set({ active: input.active ? 1 : 0 }).where(eq(coupons.id, input.couponId)); return { updated: true as const }; }),
    moderateReview: adminProcedure.input(z.object({ reviewId: z.number().int().positive(), status: z.enum(["published", "rejected"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.update(reviews).set({ status: input.status, moderatedByUserId: ctx.user.id }).where(eq(reviews.id, input.reviewId));
      return { moderated: true as const };
    }),
    supplierOffers: adminProcedure.query(async () => { const db = await getDb(); if (!db) return []; return db.select().from(supplierOffers).orderBy(desc(supplierOffers.checkedAt)).limit(100); }),
    executionRuns: adminProcedure.query(async () => { const db = await getDb(); if (!db) return []; return db.select().from(refreshExecutionRuns).orderBy(desc(refreshExecutionRuns.startedAt)).limit(50); }),
    executionHistory: adminProcedure.input(z.object({ days: z.number().int().min(1).max(365).default(30) })).query(async ({ input }) => { const db = await getDb(); if (!db) return []; const since = new Date(Date.now() - input.days * 86_400_000); return db.select().from(refreshExecutionRuns).where(gte(refreshExecutionRuns.startedAt, since)).orderBy(desc(refreshExecutionRuns.startedAt)).limit(5000); }),
    refreshNotifications: adminProcedure.query(async ({ ctx }) => { const db = await getDb(); if (!db) return []; return db.select().from(notifications).where(and(eq(notifications.userId, ctx.user.id), eq(notifications.eventType, "refresh_failed"))).orderBy(desc(notifications.createdAt)).limit(50); }),
    alertSettings: adminProcedure.query(async () => { const db = await getDb(); if (!db) return { enabled: false, failureThreshold: 1, recipientEmail: null, whatsappRecipient: null, inAppEnabled: true }; const row = (await db.select().from(refreshAlertSettings).limit(1))[0]; return row ?? { enabled: false, failureThreshold: 1, recipientEmail: null, whatsappRecipient: null, inAppEnabled: 1 }; }),
    updateAlertSettings: adminProcedure.input(z.object({ enabled: z.boolean(), failureThreshold: z.number().int().positive(), recipientEmail: z.string().email().nullable(), whatsappRecipient: z.string().trim().max(32).nullable(), inAppEnabled: z.boolean() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const existing = (await db.select({ id: refreshAlertSettings.id }).from(refreshAlertSettings).limit(1))[0]; const values = { enabled: input.enabled ? 1 : 0, failureThreshold: input.failureThreshold, recipientEmail: input.recipientEmail, whatsappRecipient: input.whatsappRecipient, inAppEnabled: input.inAppEnabled ? 1 : 0, updatedByUserId: ctx.user.id, updatedAt: new Date() }; if (existing) await db.update(refreshAlertSettings).set(values).where(eq(refreshAlertSettings.id, existing.id)); else await db.insert(refreshAlertSettings).values(values); return values; }),
    executeHotelbedsComparison: adminProcedure.input(z.object({ hotelId: z.number().int().positive(), roomId: z.number().int().positive(), checkIn: z.string(), checkOut: z.string(), guests: z.number().int().positive() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const mapping = (await db.select({ hotelbedsCode: hotels.hotelbedsCode }).from(hotels).where(eq(hotels.id, input.hotelId)).limit(1))[0]?.hotelbedsCode; if (!mapping) throw new Error("Map a Hotelbeds property code to this hotel first"); const offers = await searchHotelbeds({ ...input, hotelCode: mapping }); for (const offer of offers) await db.insert(supplierOffers).values({ ...offer, comparable: offer.comparable ? 1 : 0, isDemo: 0, taxesInr: String(offer.taxesInr), feesInr: String(offer.feesInr), nightlyPriceInr: String(offer.nightlyPriceInr), totalPriceInr: String(offer.totalPriceInr), currency: offer.currency, status: offer.status }); return { count: offers.length, displayOnly: true as const }; }),
    refreshJobs: adminProcedure.query(async ({ ctx }) => { const db = await getDb(); const session = parseCookieHeader(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? ""; const heartbeat = await listHeartbeatJobs(session, { page: 1, pageSize: 50 }).catch(() => ({ total: 0, actorUserId: "", jobs: [] })); if (db) for (const job of heartbeat.jobs) { const persisted = await db.select({ id: priceRefreshJobs.id }).from(priceRefreshJobs).where(eq(priceRefreshJobs.scheduleCronTaskUid, job.taskUid)).limit(1); if (persisted[0]) await db.update(priceRefreshJobs).set({ nextRunAt: job.nextExecutionAt ? new Date(job.nextExecutionAt) : null, lastRunAt: job.lastExecutedAt ? new Date(job.lastExecutedAt) : undefined, updatedAt: new Date() }).where(eq(priceRefreshJobs.id, persisted[0].id)); } return { jobs: heartbeat.jobs, persisted: db ? await db.select().from(priceRefreshJobs).orderBy(desc(priceRefreshJobs.updatedAt)).limit(50) : [] }; }),
    credentialStatuses: adminProcedure.query(async ({ ctx }) => { const db = await getDb(); const persisted = db ? await db.select().from(supplierCredentialStatuses).where(eq(supplierCredentialStatuses.providerKey, "hotelbeds")).limit(1) : []; return [{ providerKey: "hotelbeds", providerName: "Hotelbeds evaluation", secretEnvKeys: ["HOTELBEDS_API_KEY", "HOTELBEDS_API_SECRET"], configured: Boolean(process.env.HOTELBEDS_API_KEY && process.env.HOTELBEDS_API_SECRET), validationStatus: persisted[0]?.validationStatus ?? "validated_by_test", lastValidatedAt: persisted[0]?.lastValidatedAt ?? null }]; }),
    createRefreshJob: adminProcedure.input(z.object({ name: z.string().min(2), providerKey: z.enum(["hotelbeds", "demo"]), hotelId: z.number().int().positive(), roomId: z.number().int().positive(), providerHotelCode: z.string().optional(), checkIn: z.string(), checkOut: z.string(), guests: z.number().int().positive(), cronExpression: z.string().min(9) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const session = parseCookieHeader(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? ""; const created = await createHeartbeatJob({ name: `domora-price-${input.name}-${Date.now()}`, cron: input.cronExpression, path: "/api/scheduled/refresh-prices", description: `Domora ${input.providerKey} price refresh` }, session); const [row] = await db.insert(priceRefreshJobs).values({ ...input, scheduleCronTaskUid: created.taskUid, nextRunAt: created.nextExecutionAt ? new Date(created.nextExecutionAt) : null, createdByUserId: ctx.user.id }).returning(); return row; }),
    pauseRefreshJob: adminProcedure.input(z.object({ taskUid: z.string().min(1), enabled: z.boolean() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const session = parseCookieHeader(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? ""; const next = await updateHeartbeatJob(input.taskUid, { enable: input.enabled }, session); await db.update(priceRefreshJobs).set({ enabled: input.enabled ? 1 : 0, nextRunAt: next.nextExecutionAt ? new Date(next.nextExecutionAt) : null, updatedAt: new Date() }).where(eq(priceRefreshJobs.scheduleCronTaskUid, input.taskUid)); return { updated: true as const }; }),
    revalidateHotelbeds: adminProcedure.mutation(async ({ ctx }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const apiKey = process.env.HOTELBEDS_API_KEY; const secret = process.env.HOTELBEDS_API_SECRET; const configured = Boolean(apiKey && secret); let validationStatus = configured ? "valid" : "missing"; let lastError: string | null = null; if (configured) { try { const signature = crypto.createHash("sha256").update(`${apiKey}${secret}${Math.floor(Date.now() / 1000)}`).digest("hex"); const response = await fetch("https://api.test.hotelbeds.com/hotel-api/1.0/status", { headers: { Accept: "application/json", "Api-key": apiKey!, "X-Signature": signature } }); if (!response.ok) { validationStatus = "invalid"; lastError = `Hotelbeds returned ${response.status}`; } } catch (error) { validationStatus = "error"; lastError = error instanceof Error ? error.message : String(error); } } const existing = await db.select({ id: supplierCredentialStatuses.id }).from(supplierCredentialStatuses).where(eq(supplierCredentialStatuses.providerKey, "hotelbeds")).limit(1); const values = { providerKey: "hotelbeds", providerName: "Hotelbeds evaluation", secretEnvKeys: "HOTELBEDS_API_KEY,HOTELBEDS_API_SECRET", configured: configured ? 1 : 0, validationStatus, lastValidatedAt: new Date(), lastError, updatedByUserId: ctx.user.id, updatedAt: new Date() }; if (existing[0]) await db.update(supplierCredentialStatuses).set(values).where(eq(supplierCredentialStatuses.id, existing[0].id)); else await db.insert(supplierCredentialStatuses).values(values); return { configured, validationStatus }; }),
    refreshDemoComparison: adminProcedure.input(z.object({ hotelId: z.number().int().positive(), roomId: z.number().int().positive(), checkIn: z.string(), checkOut: z.string(), guests: z.number().int().positive() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new Error("Database unavailable"); const offers = await createDemoSupplierAdapter().search(input); await db.delete(supplierOffers).where(and(eq(supplierOffers.hotelId, input.hotelId), eq(supplierOffers.roomId, input.roomId), eq(supplierOffers.isDemo, 1))); if (offers[0]) await db.insert(supplierOffers).values({ ...offers[0], comparable: offers[0].comparable ? 1 : 0, isDemo: offers[0].isDemo ? 1 : 0, taxesInr: String(offers[0].taxesInr), feesInr: String(offers[0].feesInr), nightlyPriceInr: String(offers[0].nightlyPriceInr), totalPriceInr: String(offers[0].totalPriceInr), currency: offers[0].currency, status: offers[0].status }); return { refreshed: true as const, count: offers.length }; }),
    overview: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { hotels: 0, applications: 0, bookings: 0, reviews: 0 };
      const [hotelCount, applicationCount, bookingCount, reviewCount] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(hotels),
        db.select({ count: sql<number>`count(*)` }).from(partnerApplications),
        db.select({ count: sql<number>`count(*)` }).from(bookings),
        db.select({ count: sql<number>`count(*)` }).from(reviews),
      ]);
      return { hotels: Number(hotelCount[0]?.count ?? 0), applications: Number(applicationCount[0]?.count ?? 0), bookings: Number(bookingCount[0]?.count ?? 0), reviews: Number(reviewCount[0]?.count ?? 0) };
    }),
  }),
});

export type AppRouter = typeof appRouter;
