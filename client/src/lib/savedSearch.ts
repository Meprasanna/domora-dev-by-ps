export type SavedSearch = {
  id: string;
  city: string;
  guests: number;
  maxPriceInr: number;
  checkIn: string;
  checkOut: string;
  cancellationPolicy: string;
  savedAt: number;
};

const STORAGE_KEY = "domora.recent-searches.v1";
const MAX_RECENT_SEARCHES = 4;

type SearchInput = Omit<SavedSearch, "id" | "savedAt">;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function searchId(input: SearchInput) {
  return [input.city.trim().toLowerCase(), input.guests, input.maxPriceInr, input.checkIn, input.checkOut, input.cancellationPolicy].join("|");
}

export function loadRecentSearches(): SavedSearch[] {
  if (!canUseStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SavedSearch => item && typeof item.id === "string" && typeof item.city === "string" && typeof item.guests === "number").slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

export function saveRecentSearch(input: SearchInput) {
  const next: SavedSearch = { ...input, id: searchId(input), savedAt: Date.now() };
  const history = [next, ...loadRecentSearches().filter((item) => item.id !== next.id)].slice(0, MAX_RECENT_SEARCHES);
  if (canUseStorage()) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return history;
}

export function removeRecentSearch(id: string) {
  const history = loadRecentSearches().filter((item) => item.id !== id);
  if (canUseStorage()) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return history;
}

export function clearRecentSearches() {
  if (canUseStorage()) window.localStorage.removeItem(STORAGE_KEY);
  return [] as SavedSearch[];
}
