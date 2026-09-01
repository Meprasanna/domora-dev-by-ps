import { createHash } from "node:crypto";
import type { NormalizedSupplierOffer } from "./supplierComparison";
import type { SupplierSearchRequest } from "./supplierAdapters";

function signature(apiKey: string, secret: string): string {
  return createHash("sha256").update(`${apiKey}${secret}${Math.floor(Date.now() / 1000)}`).digest("hex");
}

export type HotelbedsSearchInput = SupplierSearchRequest & { hotelCode: string };
export type HotelbedsCatalogProperty = { code: string; name: string; city: string; country: string };

export async function searchHotelbedsCatalog(term: string): Promise<HotelbedsCatalogProperty[]> {
  const apiKey = process.env.HOTELBEDS_API_KEY;
  const secret = process.env.HOTELBEDS_API_SECRET;
  if (!apiKey || !secret) return [];
  const response = await fetch("https://api.test.hotelbeds.com/hotel-content-api/1.0/hotels?fields=all&from=1&to=100&language=ENG&useSecondaryLanguage=false", { headers: { Accept: "application/json", "Api-key": apiKey, "X-Signature": signature(apiKey, secret) } });
  if (!response.ok) throw new Error(`Hotelbeds content catalog failed (${response.status})`);
  const payload = await response.json() as { hotels?: Array<{ code?: number | string; name?: string; city?: { content?: string }; country?: { description?: { content?: string } } }> };
  const needle = term.trim().toLowerCase();
  return (payload.hotels ?? []).map(hotel => ({ code: String(hotel.code ?? ""), name: hotel.name ?? "Unnamed property", city: hotel.city?.content ?? "", country: hotel.country?.description?.content ?? "" })).filter(property => property.code && (!needle || `${property.code} ${property.name} ${property.city} ${property.country}`.toLowerCase().includes(needle))).slice(0, 25);
}

export async function searchHotelbeds(input: HotelbedsSearchInput): Promise<NormalizedSupplierOffer[]> {
  const apiKey = process.env.HOTELBEDS_API_KEY;
  const secret = process.env.HOTELBEDS_API_SECRET;
  if (!apiKey || !secret) return [];
  const response = await fetch("https://api.test.hotelbeds.com/hotel-api/1.0/hotels", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "Api-key": apiKey, "X-Signature": signature(apiKey, secret) },
    body: JSON.stringify({ stay: { checkIn: input.checkIn, checkOut: input.checkOut }, occupancies: [{ rooms: 1, adults: input.guests, children: 0 }], hotels: { hotel: [input.hotelCode] } }),
  });
  if (!response.ok) throw new Error(`Hotelbeds availability failed (${response.status})`);
  const payload = await response.json() as { hotels?: { hotels?: Array<{ rooms?: Array<{ name?: string; rates?: Array<{ net?: string; sellingRate?: string; rateComments?: string; cancellationPolicies?: Array<{ amount?: string; from?: string }> }> }> }> } };
  const hotel = payload.hotels?.hotels?.[0];
  const nights = Math.max(1, Math.round((new Date(input.checkOut).getTime() - new Date(input.checkIn).getTime()) / 86400000));
  return (hotel?.rooms ?? []).flatMap(room => (room.rates ?? []).slice(0, 3).map(rate => {
    const total = Number(rate.sellingRate ?? rate.net ?? 0);
    const nightly = total / nights;
    return { hotelId: input.hotelId, roomId: input.roomId, providerKey: "hotelbeds", providerName: "Hotelbeds evaluation", offerUrl: null, sourceRoomDescription: room.name ?? "Hotelbeds room", occupancy: input.guests, nightlyPriceInr: nightly, totalPriceInr: total, taxesInr: 0, feesInr: 0, currency: "EUR", cancellationPolicy: rate.rateComments ?? (rate.cancellationPolicies?.[0]?.from ? `Cancellation from ${rate.cancellationPolicies[0].from}` : null), comparable: true, status: "available", isDemo: false, checkedAt: new Date(), expiresAt: new Date(Date.now() + 15 * 60 * 1000) } satisfies NormalizedSupplierOffer;
  }));
}
