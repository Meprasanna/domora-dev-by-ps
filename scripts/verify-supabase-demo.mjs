import postgres from "postgres";

const connectionString = process.env.SUPABASE_DATABASE_URL;
if (!connectionString) throw new Error("SUPABASE_DATABASE_URL is required");
const sql = postgres(connectionString, { max: 1, prepare: false });
try {
  const [hotelCount] = await sql`select count(*)::int as count from "hotels" where "slug" = 'demo-courtyard-stay'`;
  const [offerCount] = await sql`select count(*)::int as count from "supplierOffers" where "hotelId" = (select "id" from "hotels" where "slug" = 'demo-courtyard-stay') and "isDemo" = 1`;
  const [reviewCount] = await sql`select count(*)::int as count from "reviews" where "hotelId" = (select "id" from "hotels" where "slug" = 'demo-courtyard-stay')`;
  if (hotelCount.count !== 1 || offerCount.count !== 3 || reviewCount.count !== 0) throw new Error(`Unexpected demo counts: hotels=${hotelCount.count}, offers=${offerCount.count}, reviews=${reviewCount.count}`);
  console.log("Supabase demo verification passed: 1 hotel, 3 demo offers, 0 reviews.");
} finally {
  await sql.end({ timeout: 2 });
}
