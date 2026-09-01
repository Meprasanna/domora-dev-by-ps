import { describe, expect, it } from "vitest";
import { normalizeSupplierOffer, selectLowestOffer } from "./supplierComparison";

describe("supplier comparison", () => {
  it("normalizes provider values and defaults INR metadata", () => {
    const offer = normalizeSupplierOffer({
      hotelId: 1,
      roomId: 2,
      providerKey: "demo-a",
      providerName: "Demo Provider A",
      sourceRoomDescription: "Deluxe room",
      occupancy: 2,
      nightlyPriceInr: 1800,
      totalPriceInr: 3600,
      currency: "inr",
      isDemo: true,
    });
    expect(offer.currency).toBe("INR");
    expect(offer.taxesInr).toBe(0);
    expect(offer.isDemo).toBe(true);
  });

  it("selects the lowest fresh comparable total price", () => {
    const now = new Date("2026-08-14T00:00:00.000Z");
    const offers = [
      normalizeSupplierOffer({ hotelId: 1, roomId: 1, providerKey: "a", providerName: "A", sourceRoomDescription: "Room", occupancy: 2, nightlyPriceInr: 2100, totalPriceInr: 4200, checkedAt: now }),
      normalizeSupplierOffer({ hotelId: 1, roomId: 1, providerKey: "b", providerName: "B", sourceRoomDescription: "Room", occupancy: 2, nightlyPriceInr: 1900, totalPriceInr: 3800, checkedAt: now }),
      normalizeSupplierOffer({ hotelId: 1, roomId: 1, providerKey: "expired", providerName: "Expired", sourceRoomDescription: "Room", occupancy: 2, nightlyPriceInr: 100, totalPriceInr: 200, checkedAt: now, expiresAt: new Date("2026-08-13T23:59:00.000Z") }),
    ];
    expect(selectLowestOffer(offers, now)?.providerKey).toBe("b");
  });

  it("does not allow non-INR or unavailable offers to win", () => {
    const now = new Date("2026-08-14T00:00:00.000Z");
    const offers = [
      normalizeSupplierOffer({ hotelId: 1, roomId: 1, providerKey: "usd", providerName: "USD Provider", sourceRoomDescription: "Room", occupancy: 2, nightlyPriceInr: 1, totalPriceInr: 2, currency: "USD", checkedAt: now }),
      normalizeSupplierOffer({ hotelId: 1, roomId: 1, providerKey: "sold", providerName: "Sold Provider", sourceRoomDescription: "Room", occupancy: 2, nightlyPriceInr: 1, totalPriceInr: 3, status: "sold_out", checkedAt: now }),
    ];
    expect(selectLowestOffer(offers, now)).toBeNull();
  });
});
