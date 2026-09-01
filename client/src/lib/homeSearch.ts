export function normalizeGuestCount(value: number) {
  return Math.max(1, Math.min(20, Math.trunc(value)));
}

export function isValidStayRange(checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) return true;
  return new Date(checkOut).getTime() > new Date(checkIn).getTime();
}

export function scrollToStayResults(documentLike: Pick<Document, "getElementById">) {
  documentLike.getElementById("stays")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function buildSearchResultsPath({ city, guests, maxPriceInr, checkIn, checkOut, cancellationPolicy }: { city: string; guests: number; maxPriceInr: number; checkIn: string; checkOut: string; cancellationPolicy: string }) {
  const params = new URLSearchParams();
  if (city.trim()) params.set("city", city.trim());
  params.set("guests", String(guests));
  if (maxPriceInr) params.set("maxPriceInr", String(maxPriceInr));
  if (checkIn) params.set("checkIn", checkIn);
  if (checkOut) params.set("checkOut", checkOut);
  if (cancellationPolicy) params.set("cancellationPolicy", cancellationPolicy);
  return `/search?${params.toString()}`;
}
