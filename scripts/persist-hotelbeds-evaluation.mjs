import { eq } from "drizzle-orm";
import { getDb } from "../server/db.ts";
import { hotels, rooms, supplierOffers } from "../drizzle/schema.ts";
import { searchHotelbeds } from "../server/hotelbedsAdapter.ts";

const db = await getDb();
if (!db) throw new Error("Database unavailable");
const hotel = (await db.select().from(hotels).where(eq(hotels.id, 1)).limit(1))[0];
if (!hotel) throw new Error("Demo hotel #1 was not found");
const room = (await db.select().from(rooms).where(eq(rooms.hotelId, hotel.id)).limit(1))[0];
if (!room) throw new Error("No room exists for demo hotel #1");
await db.update(hotels).set({ hotelbedsCode: "3424", updatedAt: new Date() }).where(eq(hotels.id, hotel.id));
const offers = await searchHotelbeds({ hotelId: hotel.id, roomId: room.id, hotelCode: "3424", checkIn: "2026-09-10", checkOut: "2026-09-12", guests: 2 });
for (const offer of offers) await db.insert(supplierOffers).values({ ...offer, comparable: 1, isDemo: 0, taxesInr: String(offer.taxesInr), feesInr: String(offer.feesInr), nightlyPriceInr: String(offer.nightlyPriceInr), totalPriceInr: String(offer.totalPriceInr), currency: offer.currency, status: offer.status });
console.log(JSON.stringify({ hotelId: hotel.id, roomId: room.id, hotelbedsCode: "3424", offersPersisted: offers.length, displayOnly: true }, null, 2));
