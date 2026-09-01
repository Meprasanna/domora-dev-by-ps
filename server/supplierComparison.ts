export type NormalizedSupplierOffer = {
  hotelId: number;
  roomId: number;
  providerKey: string;
  providerName: string;
  offerUrl?: string | null;
  sourceRoomDescription: string;
  occupancy: number;
  nightlyPriceInr: number;
  totalPriceInr: number;
  taxesInr: number;
  feesInr: number;
  currency: string;
  cancellationPolicy?: string | null;
  comparable: boolean;
  status: "available" | "sold_out" | "error";
  isDemo: boolean;
  checkedAt: Date;
  expiresAt?: Date | null;
};

export function isFreshOffer(offer: Pick<NormalizedSupplierOffer, "status" | "comparable" | "checkedAt" | "expiresAt">, now = new Date()) {
  return offer.status === "available" && offer.comparable && offer.checkedAt <= now && (!offer.expiresAt || offer.expiresAt > now);
}

export function selectLowestOffer<T extends NormalizedSupplierOffer>(offers: T[], now = new Date()) {
  return offers
    .filter(offer => isFreshOffer(offer, now) && offer.currency === "INR")
    .sort((a, b) => a.totalPriceInr - b.totalPriceInr || a.nightlyPriceInr - b.nightlyPriceInr)[0] ?? null;
}

export function normalizeSupplierOffer(input: {
  hotelId: number;
  roomId: number;
  providerKey: string;
  providerName: string;
  offerUrl?: string | null;
  sourceRoomDescription: string;
  occupancy: number;
  nightlyPriceInr: number;
  totalPriceInr: number;
  taxesInr?: number;
  feesInr?: number;
  currency?: string;
  cancellationPolicy?: string | null;
  comparable?: boolean;
  status?: NormalizedSupplierOffer["status"];
  isDemo?: boolean;
  checkedAt?: Date;
  expiresAt?: Date | null;
}): NormalizedSupplierOffer {
  return {
    ...input,
    taxesInr: input.taxesInr ?? 0,
    feesInr: input.feesInr ?? 0,
    currency: (input.currency ?? "INR").toUpperCase(),
    comparable: input.comparable ?? true,
    status: input.status ?? "available",
    isDemo: input.isDemo ?? false,
    checkedAt: input.checkedAt ?? new Date(),
    expiresAt: input.expiresAt ?? null,
  };
}
