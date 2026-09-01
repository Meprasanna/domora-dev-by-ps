import { searchHotelbeds } from "./hotelbedsAdapter";
import { createDemoSupplierAdapter, type SupplierAdapter, type SupplierSearchRequest } from "./supplierAdapters";
import { isFreshOffer, selectLowestOffer, type NormalizedSupplierOffer } from "./supplierComparison";

export type LiveComparisonResult = {
  offers: NormalizedSupplierOffer[];
  lowestOffer: NormalizedSupplierOffer | null;
  providerStatuses: Array<{ providerKey: string; providerName: string; status: "success" | "unavailable" | "failed"; offerCount: number; error?: string }>;
  checkedAt: Date;
  displayOnly: true;
};

const fxCache = new Map<string, { rate: number; expiresAt: number }>();
const comparisonCache = new Map<string, { result: LiveComparisonResult; expiresAt: number }>();

async function toInr(offers: NormalizedSupplierOffer[]): Promise<NormalizedSupplierOffer[]> {
  const currencies = Array.from(new Set(offers.map(offer => offer.currency).filter(currency => currency !== "INR")));
  const rates = new Map<string, number>([["INR", 1]]);
  for (const currency of currencies) {
    const cached = fxCache.get(currency);
    if (cached && cached.expiresAt > Date.now()) { rates.set(currency, cached.rate); continue; }
    try {
      const response = await fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(currency)}&to=INR`);
      if (!response.ok) throw new Error(`FX provider returned ${response.status}`);
      const payload = await response.json() as { rates?: Record<string, number> };
      const rate = Number(payload.rates?.INR ?? 0);
      if (!rate) throw new Error(`No INR rate for ${currency}`);
      fxCache.set(currency, { rate, expiresAt: Date.now() + 15 * 60_000 });
      rates.set(currency, rate);
    } catch { rates.set(currency, 0); }
  }
  return offers.map(offer => { const rate = rates.get(offer.currency) ?? 0; return rate > 0 ? { ...offer, currency: "INR", nightlyPriceInr: offer.nightlyPriceInr * rate, totalPriceInr: offer.totalPriceInr * rate, taxesInr: offer.taxesInr * rate, feesInr: offer.feesInr * rate } : { ...offer, comparable: false }; });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Provider timeout")), timeoutMs))]);
}

export function buildHotelbedsAdapter(hotelCode?: string): SupplierAdapter | null {
  if (!hotelCode || !process.env.HOTELBEDS_API_KEY || !process.env.HOTELBEDS_API_SECRET) return null;
  return { key: "hotelbeds", name: "Hotelbeds evaluation", mode: "licensed_feed", search: (request: SupplierSearchRequest) => searchHotelbeds({ ...request, hotelCode }) };
}

export async function runLiveComparison(input: SupplierSearchRequest & { hotelbedsCode?: string; includeDemo?: boolean; timeoutMs?: number }): Promise<LiveComparisonResult> {
  const cacheKey = JSON.stringify({ hotelId: input.hotelId, roomId: input.roomId, checkIn: input.checkIn, checkOut: input.checkOut, guests: input.guests, hotelbedsCode: input.hotelbedsCode, includeDemo: input.includeDemo });
  const cached = comparisonCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  const hotelbedsAdapter = buildHotelbedsAdapter(input.hotelbedsCode);
  const adapters = [hotelbedsAdapter, input.includeDemo ? createDemoSupplierAdapter() : null].filter((adapter): adapter is SupplierAdapter => Boolean(adapter));
  const checkedAt = new Date();
  const settled = await Promise.all(adapters.map(async adapter => {
    try {
      const offers = await withTimeout(adapter.search(input), input.timeoutMs ?? 7000);
      return { providerKey: adapter.key, providerName: adapter.name, status: "success" as const, offerCount: offers.length, offers };
    } catch (error) {
      return { providerKey: adapter.key, providerName: adapter.name, status: "failed" as const, offerCount: 0, offers: [] as NormalizedSupplierOffer[], error: error instanceof Error ? error.message : String(error) };
    }
  }));
  const offers = (await toInr(settled.flatMap(item => item.offers))).filter(offer => isFreshOffer(offer, new Date()));
  const providerStatuses: LiveComparisonResult["providerStatuses"] = settled.map(({ offers: _offers, ...status }) => status);
  if (!hotelbedsAdapter && !input.includeDemo) providerStatuses.push({ providerKey: "hotelbeds", providerName: "Hotelbeds evaluation", status: "unavailable", offerCount: 0, error: input.hotelbedsCode ? "Hotelbeds credentials are not configured" : "Hotelbeds property mapping is missing" });
  const result = { offers, lowestOffer: selectLowestOffer(offers, new Date()), providerStatuses, checkedAt, displayOnly: true as const };
  comparisonCache.set(cacheKey, { result, expiresAt: Date.now() + 30_000 });
  return result;
}
