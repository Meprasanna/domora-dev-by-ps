import { afterEach, describe, expect, it, vi } from "vitest";
import { runLiveComparison } from "./liveComparison";
import { normalizeSupplierOffer, selectLowestOffer } from "./supplierComparison";

describe("live provider comparison", () => {
  afterEach(() => vi.restoreAllMocks());

  it("normalizes a live Hotelbeds offer into INR and keeps the result display-only", async () => {
    vi.stubEnv("HOTELBEDS_API_KEY", "key");
    vi.stubEnv("HOTELBEDS_API_SECRET", "secret");
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url.includes("frankfurter.app")) return Promise.resolve(new Response(JSON.stringify({ rates: { INR: 90 } }), { status: 200 }));
      return Promise.resolve(new Response(JSON.stringify({ hotels: { hotels: [{ rooms: [{ name: "Mapped room", rates: [{ sellingRate: "100", rateComments: "Free cancellation" }] }] }] } }), { status: 200 }));
    }));
    const result = await runLiveComparison({ hotelId: 1, roomId: 1, hotelbedsCode: "3424", checkIn: "2026-09-10", checkOut: "2026-09-12", guests: 2 });
    expect(result.displayOnly).toBe(true);
    expect(result.lowestOffer?.currency).toBe("INR");
    expect(result.lowestOffer?.totalPriceInr).toBe(9000);
    expect(result.lowestOffer).not.toHaveProperty("bookingId");
  });

  it("selects the lowest fresh comparable total across providers", () => {
    const base = { hotelId: 1, roomId: 1, sourceRoomDescription: "same room", occupancy: 2, currency: "INR", cancellationPolicy: "Free cancellation", checkedAt: new Date("2026-09-10T10:00:00Z"), expiresAt: new Date("2026-09-10T11:00:00Z") };
    const offers = [normalizeSupplierOffer({ ...base, providerKey: "a", providerName: "A", nightlyPriceInr: 2500, totalPriceInr: 5000 }), normalizeSupplierOffer({ ...base, providerKey: "b", providerName: "B", nightlyPriceInr: 2100, totalPriceInr: 4200 })];
    expect(selectLowestOffer(offers, new Date("2026-09-10T10:30:00Z"))?.providerKey).toBe("b");
  });

  it("isolates provider failures and still returns successful demo offers", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("provider offline")));
    const result = await runLiveComparison({ hotelId: 1, roomId: 1, checkIn: "2026-09-10", checkOut: "2026-09-12", guests: 2, includeDemo: true });
    expect(result.lowestOffer?.providerKey).toBe("demo");
    expect(result.providerStatuses).toEqual([{ providerKey: "demo", providerName: "Domora demo comparison source", status: "success", offerCount: 1 }]);
  });
});
