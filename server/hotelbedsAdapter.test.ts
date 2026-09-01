import { afterEach, describe, expect, it, vi } from "vitest";
import { searchHotelbeds } from "./hotelbedsAdapter";

afterEach(() => vi.unstubAllGlobals());

describe("Hotelbeds adapter", () => {
  it("maps an availability rate into Domora supplier-offer fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ hotels: { hotels: [{ rooms: [{ name: "Standard", rates: [{ net: "100", sellingRate: "120", rateComments: "Free cancellation" }] }] }] } }), { status: 200 })));
    const offers = await searchHotelbeds({ hotelId: 7, roomId: 8, hotelCode: "HB-1", checkIn: "2026-09-10", checkOut: "2026-09-12", guests: 2 });
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({ hotelId: 7, roomId: 8, providerKey: "hotelbeds", comparable: true, isDemo: false, totalPriceInr: 120, nightlyPriceInr: 60, cancellationPolicy: "Free cancellation" });
  });
});
