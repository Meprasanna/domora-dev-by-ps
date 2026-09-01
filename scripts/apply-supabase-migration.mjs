import fs from "node:fs/promises";
import postgres from "postgres";

const connectionString = process.env.SUPABASE_DATABASE_URL;
if (!connectionString) throw new Error("SUPABASE_DATABASE_URL is required");

const sql = postgres(connectionString, { max: 1, prepare: false });
try {
  const migrationFile = process.argv[2] ?? "0000_tough_fenris.sql";
  const migration = await fs.readFile(new URL(`../drizzle/${migrationFile}`, import.meta.url), "utf8");
  const statements = migration
    .split(/--> statement-breakpoint/g)
    .map(statement => statement.trim())
    .filter(Boolean);
  for (const statement of statements) await sql.unsafe(statement);
  console.log(`Applied ${statements.length} PostgreSQL statements from ${migrationFile} to Supabase.`);
} finally {
  await sql.end({ timeout: 2 });
}
