import { eq } from "drizzle-orm";
import { getDb } from "../server/db.ts";
import { hotels, users } from "../drizzle/schema.ts";
const db = await getDb();
if (!db) throw new Error("Database unavailable");
const rows = await db.select({ hotelId: hotels.id, ownerUserId: hotels.ownerUserId, ownerRole: users.role }).from(hotels).leftJoin(users, eq(hotels.ownerUserId, users.id)).limit(20);
console.log(JSON.stringify(rows, null, 2));
