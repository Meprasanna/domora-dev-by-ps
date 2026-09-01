import { describe, expect, it, vi } from "vitest";
import { buildManusOAuthUrl } from "./authFlow";
import { isValidStayRange, normalizeGuestCount, scrollToStayResults } from "./homeSearch";

describe("Domora login entry point", () => {
  it("builds a Manus OAuth sign-in redirect with the callback state", () => {
    const redirect = buildManusOAuthUrl({ portalUrl: "https://oauth.example.com", appId: "domora-app", redirectUri: "https://domora.example.com/api/oauth/callback", state: "signed-state" });
    const url = new URL(redirect);
    expect(url.pathname).toBe("/app-auth");
    expect(url.searchParams.get("appId")).toBe("domora-app");
    expect(url.searchParams.get("redirectUri")).toContain("/api/oauth/callback");
    expect(url.searchParams.get("state")).toBe("signed-state");
    expect(url.searchParams.get("type")).toBe("signIn");
  });
});

describe("Domora hero search behavior", () => {
  it("keeps guest selection between one and twenty guests", () => {
    expect(normalizeGuestCount(0)).toBe(1);
    expect(normalizeGuestCount(4.8)).toBe(4);
    expect(normalizeGuestCount(50)).toBe(20);
  });

  it("rejects a checkout date that is not after check-in", () => {
    expect(isValidStayRange("2026-09-10", "2026-09-12")).toBe(true);
    expect(isValidStayRange("2026-09-12", "2026-09-10")).toBe(false);
    expect(isValidStayRange("", "")).toBe(true);
  });

  it("scrolls to stays when the search CTA is activated", () => {
    const scrollIntoView = vi.fn();
    const documentLike = { getElementById: vi.fn(() => ({ scrollIntoView })) } as unknown as Pick<Document, "getElementById">;
    scrollToStayResults(documentLike);
    expect(documentLike.getElementById).toHaveBeenCalledWith("stays");
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });
});
