import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

describe("Hotelbeds credentials", () => {
  it("validates configured evaluation credentials without logging them", async () => {
    const apiKey = process.env.HOTELBEDS_API_KEY;
    const secret = process.env.HOTELBEDS_API_SECRET;
    if (!apiKey || !secret) return;
    const signature = createHash("sha256").update(`${apiKey}${secret}${Math.floor(Date.now() / 1000)}`).digest("hex");
    const response = await fetch("https://api.test.hotelbeds.com/hotel-api/1.0/status", { headers: { Accept: "application/json", "Api-key": apiKey, "X-Signature": signature } });
    expect([200, 204]).toContain(response.status);
  }, 15000);
});
