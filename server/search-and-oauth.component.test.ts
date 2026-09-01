// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useQuery, liveQuery } = vi.hoisted(() => ({ useQuery: vi.fn(() => ({ data: [], isLoading: false, isError: false })), liveQuery: vi.fn(() => ({ data: { lowestOffer: null, providerStatuses: [] }, isLoading: false, isError: false })) }));
vi.mock("../client/src/lib/trpc", () => ({ trpc: { hotels: { list: { useQuery }, liveComparison: { useQuery: liveQuery } } } }));

import SearchResults from "../client/src/pages/SearchResults";
import { safeReturnPath } from "../server/oauthReturn";
import { redirectOAuthCallback } from "../server/_core/oauth";
import { encodeOAuthState } from "../shared/const";

describe("Search results invalid-date state", () => {
  beforeEach(() => {
    useQuery.mockClear();
    window.history.replaceState({}, "", "/search?city=Delhi&checkIn=2026-09-12&checkOut=2026-09-10");
  });

  it("shows an inline date error and disables the hotel query", () => {
    render(React.createElement(SearchResults));
    expect(screen.getByRole("alert").textContent).toContain("Check-out must be after check-in.");
    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({ city: "Delhi" }), { enabled: false });
  });
});

describe("Search results live comparison", () => {
  it("renders the live lowest total while retaining the listing card", () => {
    window.history.replaceState({}, "", "/search?city=Delhi&guests=2&checkIn=2026-09-10&checkOut=2026-09-12");
    useQuery.mockReturnValue({ data: [{ id: 1, slug: "demo", name: "Demo Stay", city: "Delhi", coverImageUrl: null, rooms: [{ id: 2 }], lowestSupplierOffer: null }], isLoading: false, isError: false });
    liveQuery.mockReturnValue({ data: { lowestOffer: { providerName: "Hotelbeds", currency: "INR", totalPriceInr: 4200, nightlyPriceInr: 2100, checkedAt: new Date("2026-09-10T10:00:00Z") }, providerStatuses: [{ providerKey: "hotelbeds", providerName: "Hotelbeds", status: "success", offerCount: 1 }] }, isLoading: false, isError: false });
    render(React.createElement(SearchResults));
    expect(screen.getByText(/₹4,200 lowest live total/)).toBeTruthy();
    expect(screen.getByText("Demo Stay")).toBeTruthy();
  });
});

describe("OAuth callback return path", () => {
  it("allows safe internal paths and rejects external redirects", () => {
    expect(safeReturnPath("/search?city=Delhi")).toBe("/search?city=Delhi");
    expect(safeReturnPath("https://evil.example")).toBe("/");
    expect(safeReturnPath("//evil.example")).toBe("/");
  });

  it("redirects the callback response to the encoded safe destination", () => {
    const redirect = vi.fn();
    const state = encodeOAuthState({ redirectUri: "https://domora.example/api/oauth/callback", nonce: "n", returnTo: "/search?city=Delhi" });
    redirectOAuthCallback({ redirect }, state);
    expect(redirect).toHaveBeenCalledWith(302, "/search?city=Delhi");
  });
});
