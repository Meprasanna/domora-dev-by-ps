import dns from "node:dns";
import { afterAll, describe, expect, it } from "vitest";

dns.setDefaultResultOrder("ipv4first");
import postgres from "postgres";

describe("Supabase PostgreSQL connection", () => {
  const connectionString = process.env.SUPABASE_DATABASE_URL;
  const client = connectionString ? postgres(connectionString, { max: 1, prepare: false }) : null;

  afterAll(async () => {
    if (client) await client.end({ timeout: 2 });
  });

  it("accepts the configured Supabase connection and executes a lightweight query", async () => {
    expect(connectionString).toMatch(/^postgresql:\/\//);
    expect(client).not.toBeNull();
    const result = await client!`select 1 as ok`;
    expect(result[0]?.ok).toBe(1);
  }, 15_000);
});
