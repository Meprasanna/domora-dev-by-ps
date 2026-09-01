import { normalizeSupplierOffer, type NormalizedSupplierOffer } from "./supplierComparison";

export type SupplierSearchRequest = {
  hotelId: number;
  roomId: number;
  checkIn: string;
  checkOut: string;
  guests: number;
};

export interface SupplierAdapter {
  readonly key: string;
  readonly name: string;
  readonly mode: "official_api" | "licensed_feed" | "demo";
  search(request: SupplierSearchRequest): Promise<NormalizedSupplierOffer[]>;
}

export function createDemoSupplierAdapter(): SupplierAdapter {
  return {
    key: "demo",
    name: "Domora demo comparison source",
    mode: "demo",
    async search(request) {
      const nights = Math.max(1, Math.ceil((new Date(request.checkOut).getTime() - new Date(request.checkIn).getTime()) / 86_400_000));
      return [normalizeSupplierOffer({
        hotelId: request.hotelId,
        roomId: request.roomId,
        providerKey: "demo",
        providerName: "Domora demo comparison source",
        sourceRoomDescription: "Demo comparable room",
        occupancy: request.guests,
        nightlyPriceInr: 2200,
        totalPriceInr: 2200 * nights,
        taxesInr: 528,
        feesInr: 0,
        cancellationPolicy: "Free cancellation until 24 hours before check-in",
        isDemo: true,
        expiresAt: new Date(Date.now() + 15 * 60_000),
      })];
    },
  };
}

export function createAuthenticatedJsonAdapter(config: {
  key: string;
  name: string;
  mode: "official_api" | "licensed_feed";
  endpoint: string;
  apiKey: string;
}): SupplierAdapter {
  return {
    key: config.key,
    name: config.name,
    mode: config.mode,
    async search(request) {
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error(`${config.name} returned ${response.status}`);
      const payload = await response.json() as { offers?: Array<Record<string, unknown>> };
      return (payload.offers ?? []).map(offer => normalizeSupplierOffer({
        hotelId: request.hotelId,
        roomId: request.roomId,
        providerKey: config.key,
        providerName: config.name,
        offerUrl: typeof offer.offerUrl === "string" ? offer.offerUrl : null,
        sourceRoomDescription: String(offer.sourceRoomDescription ?? "Comparable room"),
        occupancy: Number(offer.occupancy ?? request.guests),
        nightlyPriceInr: Number(offer.nightlyPriceInr ?? 0),
        totalPriceInr: Number(offer.totalPriceInr ?? 0),
        taxesInr: Number(offer.taxesInr ?? 0),
        feesInr: Number(offer.feesInr ?? 0),
        currency: String(offer.currency ?? "INR"),
        cancellationPolicy: typeof offer.cancellationPolicy === "string" ? offer.cancellationPolicy : null,
        isDemo: false,
        expiresAt: new Date(Date.now() + 15 * 60_000),
      }));
    },
  };
}
