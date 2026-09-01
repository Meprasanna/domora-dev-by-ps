// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { listQuery, geocodeQuery, liveComparisonQuery, setLocation } = vi.hoisted(() => ({
  listQuery: vi.fn(() => ({ data: [], isLoading: false, isError: false })),
  geocodeQuery: vi.fn(() => ({ data: [], isLoading: false, isError: false })),
  liveComparisonQuery: vi.fn(() => ({ data: { lowestOffer: null, providerStatuses: [] }, isLoading: false, isError: false })),
  setLocation: vi.fn(),
}));
vi.mock("../client/src/lib/trpc", () => ({ trpc: { hotels: { list: { useQuery: listQuery }, geocode: { useQuery: geocodeQuery }, liveComparison: { useQuery: liveComparisonQuery } } } }));
vi.mock("wouter", () => ({ Link: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => React.createElement("a", props, children), useLocation: () => ["/", setLocation] }));

import Home from "../client/src/pages/Home";

describe("Home invalid-date search", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

  beforeEach(() => {
    setLocation.mockClear();
    localStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
    listQuery.mockReturnValue({ data: [], isLoading: false, isError: false });
  });

  it("uses the calendar picker and prevents checkout dates before check-in", () => {
    render(React.createElement(Home));
    fireEvent.click(screen.getByRole("button", { name: /^Check-in/ }));
    const checkInDay = Array.from(document.querySelectorAll("[data-day]:not([disabled])")).at(-1);
    expect(checkInDay).toBeTruthy();
    fireEvent.click(checkInDay!);
    fireEvent.click(screen.getByRole("button", { name: /^Check-out/ }));
    expect(document.querySelectorAll("[data-day][disabled]").length).toBeGreaterThan(0);
    const checkOutDay = Array.from(document.querySelectorAll("[data-day]:not([disabled])")).at(-1);
    expect(checkOutDay).toBeTruthy();
    fireEvent.click(checkOutDay!);
    fireEvent.click(screen.getByRole("button", { name: "Search", exact: true }));
    expect(setLocation).toHaveBeenCalledWith(expect.stringContaining("checkIn="));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders comparison metadata without replacing Domora’s room-booking CTA", () => {
    listQuery.mockReturnValue({ data: [{ id: 1, slug: "demo", name: "Demo Stay", city: "Bengaluru", coverImageUrl: null, lowestSupplierOffer: { providerName: "Demo source", isDemo: true, totalPriceInr: 4400, nightlyPriceInr: 2200, taxesInr: 528, feesInr: 0, cancellationPolicy: "Free cancellation", checkedAt: new Date("2026-08-14T08:00:00Z") } }], isLoading: false, isError: false });
    render(React.createElement(Home));
    expect(screen.getByText(/Demo source/)).toBeTruthy();
    expect(screen.getByText(/demo offer/)).toBeTruthy();
    expect(screen.getByText(/₹4,400/)).toBeTruthy();
    expect(screen.getByText(/₹2,200\/night/)).toBeTruthy();
    expect(screen.getByText(/taxes & fees/)).toBeTruthy();
    expect(screen.getByText("Explore rooms")).toBeTruthy();
    expect(screen.getAllByText("Where are you going?").length).toBeGreaterThan(0);
    expect(screen.getByText("Domora verified")).toBeTruthy();
    expect(screen.getByText("Live price checked")).toBeTruthy();
    expect(screen.getAllByText("Explore by destination").length).toBeGreaterThan(0);
  });

  it("restores a recent search and exposes clear controls on return", () => {
    localStorage.setItem("domora.recent-searches.v1", JSON.stringify([{ id: "bengaluru|2|15000|2026-09-10|2026-09-12|free", city: "Bengaluru", guests: 2, maxPriceInr: 15000, checkIn: "2026-09-10", checkOut: "2026-09-12", cancellationPolicy: "free", savedAt: Date.now() }]));
    render(React.createElement(Home));
    expect(screen.getByText("Recent searches")).toBeTruthy();
    expect((screen.getByPlaceholderText("City or pincode") as HTMLInputElement).value).toBe("Bengaluru");
    expect(screen.getByRole("button", { name: "Clear all" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Bengaluru.*2026-09-10.*2 guests/i }));
    expect((screen.getByPlaceholderText("City or pincode") as HTMLInputElement).value).toBe("Bengaluru");
  });

  it("localizes destination seasonal metadata when Hindi is selected", () => {
    listQuery.mockReturnValue({ data: [{ id: 1, slug: "demo", name: "Demo Stay", city: "Bengaluru", coverImageUrl: null, lowestSupplierOffer: null }], isLoading: false, isError: false });
    render(React.createElement(Home));
    fireEvent.click(screen.getByRole("button", { name: /EN/ }));
    expect(screen.getByText("मौसमी जानकारी:")).toBeTruthy();
    expect(screen.getByText(/बारिश का मौसम/)).toBeTruthy();
    expect(screen.getByText(/बारिश का मौसम/).className).toContain("group-hover:opacity-100");
  });

  it("manually saves the current search alongside automatic history", () => {
    render(React.createElement(Home));
    fireEvent.click(screen.getByRole("button", { name: "Save this search", exact: true }));
    expect(screen.getByText("Saved for later")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("domora.recent-searches.v1") || "[]")).toHaveLength(1);
  });

  it("localizes the full search form and recent-search panel in Hindi", () => {
    localStorage.setItem("domora.recent-searches.v1", JSON.stringify([{ id: "jaipur|2|15000|||free", city: "Jaipur", guests: 2, maxPriceInr: 15000, checkIn: "", checkOut: "", cancellationPolicy: "free", savedAt: Date.now() }]));
    render(React.createElement(Home));
    fireEvent.click(screen.getByRole("button", { name: /EN/ }));
    expect(screen.getByText("कहाँ जाना है?")).toBeTruthy();
    expect(screen.getByPlaceholderText("शहर या पिनकोड")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^चेक-इन/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^चेक-आउट/ })).toBeTruthy();
    expect(screen.getByText("अधिक फ़िल्टर:")).toBeTruthy();
    expect(screen.getByText("हाल की खोजें")).toBeTruthy();
    expect(screen.getByRole("button", { name: "सब साफ़ करें" })).toBeTruthy();
    expect(screen.getByText("ऐसा ठहराव खोजें")).toBeTruthy();
    expect(screen.getByText("जो आपकी योजना के मुताबिक हो।")).toBeTruthy();
    expect(screen.getByText("Domora कैसे काम करता है")).toBeTruthy();
    expect(screen.getByText("हमारे बारे में")).toBeTruthy();
    expect(screen.getByText(/समझदारी से ठहरें/)).toBeTruthy();
  });

  it("shows a smooth success toast after manually saving a search", () => {
    vi.useFakeTimers();
    render(React.createElement(Home));
    fireEvent.click(screen.getByRole("button", { name: "Save this search", exact: true }));
    expect(screen.getByRole("status").textContent).toContain("Your search has been saved");
    act(() => { vi.advanceTimersByTime(2400); });
    expect(screen.queryByRole("status")).toBeNull();
    vi.useRealTimers();
  });

  it("shows the mobile sticky search after the hero leaves view", () => {
    vi.stubGlobal("IntersectionObserver", class {
      constructor(private readonly callback: (entries: IntersectionObserverEntry[]) => void) {}
      observe() { this.callback([{ isIntersecting: false } as IntersectionObserverEntry]); }
      disconnect() {}
    });
    listQuery.mockReturnValue({ data: [{ id: 1, slug: "demo", name: "Demo Stay", city: "Bengaluru", coverImageUrl: null, lowestSupplierOffer: null }], isLoading: false, isError: false });
    render(React.createElement(Home));
    expect(screen.getByRole("button", { name: /Search stays.*Anywhere.*Add dates.*2 guests/i })).toBeTruthy();
  });

  it("updates the search city when a curated destination is selected", () => {
    vi.stubGlobal("Element", Element);
    Element.prototype.scrollIntoView = vi.fn();
    listQuery.mockReturnValue({ data: [{ id: 1, slug: "demo", name: "Demo Stay", city: "Bengaluru", coverImageUrl: null, lowestSupplierOffer: null }], isLoading: false, isError: false });
    render(React.createElement(Home));
    fireEvent.click(screen.getByRole("button", { name: /View stays in Bengaluru/i }));
    expect((screen.getByPlaceholderText("City or pincode") as HTMLInputElement).value).toBe("Bengaluru");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("shows approved Hyderabad and Jaipur inventory in destination collections", () => {
    listQuery.mockReturnValue({ data: [
      { id: 2, slug: "hyderabad-demo", name: "Hyderabad Demo", city: "Hyderabad", coverImageUrl: null, lowestSupplierOffer: null },
      { id: 3, slug: "jaipur-demo", name: "Jaipur Demo", city: "Jaipur", coverImageUrl: null, lowestSupplierOffer: null },
    ], isLoading: false, isError: false });
    render(React.createElement(Home));
    expect(screen.getByRole("button", { name: /View stays in Hyderabad/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /View stays in Jaipur/i })).toBeTruthy();
  });

  it("localizes destination headings and hotel-card pricing copy in Hindi", () => {
    listQuery.mockReturnValue({ data: [{ id: 2, slug: "hyderabad-demo", name: "Hyderabad Demo", city: "Hyderabad", coverImageUrl: null, lowestSupplierOffer: { providerName: "Demo source", isDemo: true, totalPriceInr: 4200, nightlyPriceInr: 4200, taxesInr: 504, feesInr: 0, cancellationPolicy: "Free cancellation", checkedAt: new Date("2026-08-16T08:00:00Z") } }], isLoading: false, isError: false });
    render(React.createElement(Home));
    fireEvent.click(screen.getByRole("button", { name: /EN/ }));
    expect(screen.getByText("गंतव्य के अनुसार देखें")).toBeTruthy();
    expect(screen.getByText("कमरे देखें")).toBeTruthy();
    expect(screen.getByText(/तुलना स्रोत/)).toBeTruthy();
    expect(screen.getByText(/सबसे कम कुल/)).toBeTruthy();
  });

  it("shows distinct toast feedback for restoring, removing, and clearing recent searches", () => {
    const saved = { id: "jaipur|2|15000|||free", city: "Jaipur", guests: 2, maxPriceInr: 15000, checkIn: "", checkOut: "", cancellationPolicy: "free", savedAt: Date.now() };
    localStorage.setItem("domora.recent-searches.v1", JSON.stringify([saved]));
    render(React.createElement(Home));
    fireEvent.click(screen.getByRole("button", { name: /Jaipur.*2 guests/i }));
    expect(screen.getByRole("status").textContent).toContain("Recent search restored");
    fireEvent.click(screen.getByRole("button", { name: /Remove Jaipur/ }));
    expect(screen.getByRole("status").textContent).toContain("Saved search removed");
    localStorage.setItem("domora.recent-searches.v1", JSON.stringify([saved]));
    cleanup();
    render(React.createElement(Home));
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByRole("status").textContent).toContain("Recent searches cleared");
  });

  it("returns focus to the hero location field from sticky search", () => {
    vi.useFakeTimers();
    vi.stubGlobal("IntersectionObserver", class {
      constructor(private readonly callback: (entries: IntersectionObserverEntry[]) => void) {}
      observe() { this.callback([{ isIntersecting: false } as IntersectionObserverEntry]); }
      disconnect() {}
    });
    Element.prototype.scrollIntoView = vi.fn();
    render(React.createElement(Home));
    fireEvent.click(screen.getByRole("button", { name: /Search stays.*Anywhere.*Add dates.*2 guests/i }));
    vi.advanceTimersByTime(350);
    expect(document.activeElement).toBe(screen.getByPlaceholderText("City or pincode"));
    vi.useRealTimers();
  });
});
