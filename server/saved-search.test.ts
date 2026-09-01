// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { clearRecentSearches, loadRecentSearches, removeRecentSearch, saveRecentSearch } from "../client/src/lib/savedSearch";

describe("saved searches", () => {
  beforeEach(() => localStorage.clear());

  it("persists the latest search and deduplicates identical preferences", () => {
    const input = { city: "Bengaluru", guests: 2, maxPriceInr: 15000, checkIn: "2026-09-10", checkOut: "2026-09-12", cancellationPolicy: "free" };
    saveRecentSearch(input);
    const history = saveRecentSearch(input);
    expect(history).toHaveLength(1);
    expect(loadRecentSearches()[0]).toMatchObject(input);
  });

  it("keeps recent searches removable and clearable", () => {
    const first = saveRecentSearch({ city: "Goa", guests: 2, maxPriceInr: 12000, checkIn: "", checkOut: "", cancellationPolicy: "free" })[0];
    saveRecentSearch({ city: "Mumbai", guests: 1, maxPriceInr: 9000, checkIn: "", checkOut: "", cancellationPolicy: "" });
    expect(removeRecentSearch(first.id)).toHaveLength(1);
    expect(clearRecentSearches()).toEqual([]);
    expect(loadRecentSearches()).toEqual([]);
  });
});
