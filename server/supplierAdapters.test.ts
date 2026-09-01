import { describe, expect, it, vi } from "vitest";
import { createAuthenticatedJsonAdapter, createDemoSupplierAdapter } from "./supplierAdapters";

describe("supplier adapters", () => {
  it("provides clearly labelled demo offers behind the same adapter contract", async () => {
    const offers = await createDemoSupplierAdapter().search({ hotelId: 1, roomId: 1, checkIn: "2026-09-10", checkOut: "2026-09-12", guests: 2 });
    expect(offers[0]?.isDemo).toBe(true);
    expect(offers[0]?.totalPriceInr).toBe(4400);
    expect(offers[0]?.providerName).toContain("demo");
  });

  it("normalizes an approved authenticated JSON provider response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ offers: [{ nightlyPriceInr: 2000, totalPriceInr: 4000, taxesInr: 480, feesInr: 50, currency: "INR", sourceRoomDescription: "King room" }] }), { status: 200 })));
    const offers = await createAuthenticatedJsonAdapter({ key: "licensed", name: "Licensed source", mode: "licensed_feed", endpoint: "https://provider.example/offers", apiKey: "secret" }).search({ hotelId: 1, roomId: 1, checkIn: "2026-09-10", checkOut: "2026-09-12", guests: 2 });
    expect(offers[0]).toMatchObject({ providerKey: "licensed", totalPriceInr: 4000, taxesInr: 480, feesInr: 50, isDemo: false });
    expect(fetch).toHaveBeenCalledWith("https://provider.example/offers", expect.objectContaining({ method: "POST" }));
    vi.unstubAllGlobals();
  });
});
