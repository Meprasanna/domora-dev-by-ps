import postgres from "postgres";

const connectionString = process.env.SUPABASE_DATABASE_URL;
if (!connectionString) throw new Error("SUPABASE_DATABASE_URL is required");
const sql = postgres(connectionString, { max: 1, prepare: false });
try {
  const [user] = await sql`
    insert into "users" ("openId", "name", "email", "role")
    values ('domora-demo-owner', 'Domora Demo Owner', 'demo-owner@domora.local', 'super_admin')
    on conflict ("openId") do update set "name" = excluded."name"
    returning "id"
  `;
  const [hotel] = await sql`
    insert into "hotels" ("ownerUserId", "name", "slug", "description", "city", "pincode", "address", "status", "coverImageUrl", "amenities", "cancellationPolicy")
    values (${user.id}, 'Demo Courtyard Stay', 'demo-courtyard-stay', 'A development-only demo listing used to validate Domora’s comparison layout.', 'Bengaluru', '560001', 'Demo address, Bengaluru', 'approved', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85', '["Wi-Fi", "Air conditioning", "Breakfast"]'::json, 'Free cancellation until 24 hours before check-in')
    on conflict ("slug") do update set "status" = excluded."status", "description" = excluded."description"
    returning "id"
  `;
  const [room] = await sql`
    insert into "rooms" ("hotelId", "name", "description", "bedType", "maxGuests", "basePriceInr", "amenities", "cancellationPolicy", "totalUnits")
    values (${hotel.id}, 'Demo Deluxe Room', 'Development-only room inventory for layout testing.', 'King bed', 2, 2400, '["Wi-Fi", "King bed"]'::json, 'Free cancellation until 24 hours before check-in', 3)
    on conflict do nothing
    returning "id"
  `;
  const roomId = room?.id ?? (await sql`select "id" from "rooms" where "hotelId" = ${hotel.id} and "name" = 'Demo Deluxe Room' limit 1`)[0].id;
  await sql`delete from "supplierOffers" where "hotelId" = ${hotel.id} and "roomId" = ${roomId}`;
  await sql`
    insert into "supplierOffers" ("hotelId", "roomId", "providerKey", "providerName", "offerUrl", "sourceRoomDescription", "occupancy", "nightlyPriceInr", "totalPriceInr", "taxesInr", "feesInr", "currency", "cancellationPolicy", "comparable", "status", "isDemo", "checkedAt", "expiresAt")
    values
      (${hotel.id}, ${roomId}, 'demo-direct', 'Domora demo direct rate', null, 'Demo Deluxe Room', 2, 2200, 4400, 528, 0, 'INR', 'Free cancellation until 24 hours before check-in', 1, 'available', 1, now(), now() + interval '15 minutes'),
      (${hotel.id}, ${roomId}, 'demo-market-a', 'Demo market source A', 'https://example.com/demo-source-a', 'Deluxe king room', 2, 2450, 4900, 588, 120, 'INR', 'Non-refundable', 1, 'available', 1, now(), now() + interval '15 minutes'),
      (${hotel.id}, ${roomId}, 'demo-market-b', 'Demo market source B', 'https://example.com/demo-source-b', 'King deluxe room', 2, 2300, 4600, 552, 80, 'INR', 'Free cancellation until 24 hours before check-in', 1, 'available', 1, now(), now() + interval '15 minutes')
  `;
  console.log(`Seeded demo hotel ${hotel.id}, room ${roomId}, and 3 labelled comparison offers.`);
} finally {
  await sql.end({ timeout: 2 });
}
