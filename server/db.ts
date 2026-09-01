import { and, desc, eq, gte, like, lt } from "drizzle-orm";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { InsertUser, availability, bookings, hotelImages, hotels, partnerApplications, reviews, rooms, supplierOffers, users } from "../drizzle/schema";
import { selectLowestOffer, type NormalizedSupplierOffer } from "./supplierComparison";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      const client = postgres(ENV.databaseUrl, { max: 5, prepare: false });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "phone", "loginMethod"] as const;
        type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'super_admin';
      updateSet.role = 'super_admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

async function getLowestSupplierOffer(hotelId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(supplierOffers).where(eq(supplierOffers.hotelId, hotelId));
  const normalized: NormalizedSupplierOffer[] = rows.map(row => ({
    ...row,
    offerUrl: row.offerUrl ?? null,
    taxesInr: Number(row.taxesInr),
    feesInr: Number(row.feesInr),
    nightlyPriceInr: Number(row.nightlyPriceInr),
    totalPriceInr: Number(row.totalPriceInr),
    currency: row.currency.toUpperCase(),
    comparable: Boolean(row.comparable),
    isDemo: Boolean(row.isDemo),
    status: row.status as NormalizedSupplierOffer["status"],
  }));
  return selectLowestOffer(normalized);
}

export async function listApprovedHotels(filters: { city?: string; guests?: number; maxPriceInr?: string; checkIn?: string; checkOut?: string; cancellationPolicy?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(hotels.status, "approved" as const)];
  if (filters.city) conditions.push(like(hotels.city, `%${filters.city}%`));
  const rows = await db.select().from(hotels).where(and(...conditions)).orderBy(desc(hotels.createdAt));
  if (!filters.guests && !filters.maxPriceInr && !filters.checkIn && !filters.cancellationPolicy) return Promise.all(rows.map(async hotel => ({ ...hotel, rooms: await db.select().from(rooms).where(eq(rooms.hotelId, hotel.id)), lowestSupplierOffer: await getLowestSupplierOffer(hotel.id) })));

  const withRooms = await Promise.all(rows.map(async hotel => ({ ...hotel, rooms: await db.select().from(rooms).where(eq(rooms.hotelId, hotel.id)) })));
  return Promise.all(withRooms.filter(hotel => {
    const matchesGuests = !filters.guests || hotel.rooms.some(room => room.maxGuests >= filters.guests!);
    const matchesPrice = !filters.maxPriceInr || hotel.rooms.some(room => Number(room.basePriceInr) <= Number(filters.maxPriceInr));
    const matchesPolicy = !filters.cancellationPolicy || hotel.rooms.some(room => (room.cancellationPolicy || "").toLowerCase().includes(filters.cancellationPolicy!.toLowerCase()));
    return matchesGuests && matchesPrice && matchesPolicy;
  }).map(async hotel => {
    if (!filters.checkIn || !filters.checkOut) return hotel;
    const checkIn = new Date(filters.checkIn); const checkOut = new Date(filters.checkOut);
    const nights = Math.max(0, Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86_400_000));
    if (!nights) return null;
    const availableRooms = await Promise.all(hotel.rooms.map(async room => {
      const inventory = await db.select().from(availability).where(and(eq(availability.roomId, room.id), gte(availability.stayDate, checkIn), lt(availability.stayDate, checkOut)));
      return inventory.length === 0 || (inventory.length >= nights && inventory.every(day => day.availableUnits > 0));
    }));
    return availableRooms.some(Boolean) ? hotel : null;
  })).then(result => Promise.all(result.filter((hotel): hotel is NonNullable<typeof hotel> => Boolean(hotel)).map(async hotel => ({ ...hotel, lowestSupplierOffer: await getLowestSupplierOffer(hotel.id) }))));
}

export async function getHotelBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const hotel = await db.select().from(hotels).where(eq(hotels.slug, slug)).limit(1);
  if (!hotel[0]) return undefined;
  const hotelRooms = await db.select().from(rooms).where(eq(rooms.hotelId, hotel[0].id));
  const images = await db.select().from(hotelImages).where(eq(hotelImages.hotelId, hotel[0].id));
  const publishedReviews = await db.select().from(reviews).where(and(eq(reviews.hotelId, hotel[0].id), eq(reviews.status, "published")));
  return { ...hotel[0], rooms: hotelRooms, images, reviews: publishedReviews };
}

export async function getRoomWithAvailability(roomId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (!room[0]) return undefined;
  const inventory = await db.select().from(availability).where(eq(availability.roomId, roomId));
  return { ...room[0], inventory };
}

export async function getPartnerApplications() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(partnerApplications).orderBy(desc(partnerApplications.createdAt));
}

export async function getPartnerDashboard(userId: number) {
  const db = await getDb();
  if (!db) return { hotels: [], bookings: [] };
  const ownedHotels = await db.select().from(hotels).where(eq(hotels.ownerUserId, userId)).orderBy(desc(hotels.createdAt));
  const hotelsWithRooms = await Promise.all(ownedHotels.map(async hotel => ({ ...hotel, rooms: await db.select().from(rooms).where(eq(rooms.hotelId, hotel.id)) })));
  const ownedBookings = (await Promise.all(ownedHotels.map(hotel => db.select().from(bookings).where(eq(bookings.hotelId, hotel.id))))).flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return { hotels: hotelsWithRooms, bookings: ownedBookings };
}
