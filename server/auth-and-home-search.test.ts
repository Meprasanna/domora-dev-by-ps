import { describe, expect, it, vi } from "vitest";
import { buildManusOAuthUrl } from "../client/src/lib/authFlow";
import { isValidStayRange, normalizeGuestCount, scrollToStayResults, buildSearchResultsPath } from "../client/src/lib/homeSearch";
import { decodeOAuthState, encodeOAuthState } from "../shared/const";
import { handleDomoraLoginClick } from "../client/src/lib/loginAction";

describe("Domora login entry point", () => {
  it("invokes the OAuth launcher from the exact login CTA action", () => {
    const startLogin = vi.fn();
    handleDomoraLoginClick(startLogin);
    expect(startLogin).toHaveBeenCalledOnce();
  });

  it("builds a Manus OAuth sign-in redirect with callback state", () => {
    const redirect = buildManusOAuthUrl({ portalUrl: "https://oauth.example.com", appId: "domora-app", redirectUri: "https://domora.example.com/api/oauth/callback", state: "signed-state" });
    const url = new URL(redirect);
    expect(url.pathname).toBe("/app-auth");
    expect(url.searchParams.get("appId")).toBe("domora-app");
    expect(url.searchParams.get("redirectUri")).toContain("/api/oauth/callback");
    expect(url.searchParams.get("state")).toBe("signed-state");
    expect(url.searchParams.get("type")).toBe("signIn");
  });
});

describe("Domora OAuth return state", () => {
  it("round-trips a return destination through encoded OAuth state", () => {
    const encoded = encodeOAuthState({ redirectUri: "https://domora.example.com/api/oauth/callback", nonce: "nonce", returnTo: "/search?city=Delhi" });
    expect(decodeOAuthState(encoded).returnTo).toBe("/search?city=Delhi");
  });
});

describe("Domora hero search behavior", () => {
  it("bounds guest selection between one and twenty", () => {
    expect(normalizeGuestCount(0)).toBe(1);
    expect(normalizeGuestCount(4.8)).toBe(4);
    expect(normalizeGuestCount(50)).toBe(20);
  });

  it("requires checkout to be after check-in when both dates are supplied", () => {
    expect(isValidStayRange("2026-09-10", "2026-09-12")).toBe(true);
    expect(isValidStayRange("2026-09-12", "2026-09-10")).toBe(false);
    expect(isValidStayRange("", "")).toBe(true);
  });

  it("builds a real results URL with all selected filters", () => {
    expect(buildSearchResultsPath({ city: " Bengaluru ", guests: 3, maxPriceInr: 12000, checkIn: "2026-09-10", checkOut: "2026-09-12", cancellationPolicy: "free" })).toBe("/search?city=Bengaluru&guests=3&maxPriceInr=12000&checkIn=2026-09-10&checkOut=2026-09-12&cancellationPolicy=free");
  });

  it("scrolls to stays when Search is activated", () => {
    const scrollIntoView = vi.fn();
    const documentLike = { getElementById: vi.fn(() => ({ scrollIntoView })) } as unknown as Pick<Document, "getElementById">;
    scrollToStayResults(documentLike);
    expect(documentLike.getElementById).toHaveBeenCalledWith("stays");
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });
});
