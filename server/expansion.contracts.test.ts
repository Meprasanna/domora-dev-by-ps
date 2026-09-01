import { afterEach, describe, expect, it, vi } from "vitest";
import { searchHotelbedsCatalog } from "./hotelbedsAdapter";
import { createDemoSupplierAdapter } from "./supplierAdapters";
import { configuredRefreshAlertChannels, sendWhatsApp } from "./notifications";
import { getSupplierAdapterStatuses } from "./suppliers";
import { toRefreshHistoryCsv } from "../shared/telemetry";

describe("partner mapping and admin telemetry contracts", () => {
  afterEach(() => vi.restoreAllMocks());

  it("filters authenticated Hotelbeds catalog results by code, name, city, or country", async () => {
    vi.stubEnv("HOTELBEDS_API_KEY", "key");
    vi.stubEnv("HOTELBEDS_API_SECRET", "secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ hotels: [
      { code: 3424, name: "Aveiro Demo Hotel", city: { content: "Aveiro" }, country: { description: { content: "Portugal" } } },
      { code: 9999, name: "Other Stay", city: { content: "Delhi" }, country: { description: { content: "India" } } },
    ] }), { status: 200 })));
    await expect(searchHotelbedsCatalog("Aveiro")).resolves.toEqual([{ code: "3424", name: "Aveiro Demo Hotel", city: "Aveiro", country: "Portugal" }]);
  });

  it("exports refresh history with a stable CSV header and escaped error text", () => {
    const csv = toRefreshHistoryCsv([{ id: 1, providerKey: "hotelbeds", status: "failed", startedAt: new Date("2026-08-14T10:00:00Z"), finishedAt: new Date("2026-08-14T10:00:02Z"), durationMs: 2000, offerCount: 0, errorMessage: "HTTP 500" }]);
    expect(csv).toContain("id,provider,status,startedAt,finishedAt,durationMs,offerCount,errorMessage");
    expect(csv).toContain('"HTTP 500"');
  });

  it("plans email, WhatsApp, and in-dashboard channels independently", () => {
    expect(configuredRefreshAlertChannels({ email: "admin@example.com", whatsapp: "+919999999999", inAppEnabled: true })).toEqual(["email", "whatsapp", "in_app"]);
    expect(configuredRefreshAlertChannels({ inAppEnabled: false })).toEqual([]);
  });

  it("returns only masked provider metadata and never raw credential values", () => {
    const statuses = getSupplierAdapterStatuses({ HOTELBEDS_API_KEY: "super-secret-key" });
    expect(statuses.find(status => status.key === "hotelbeds")).toMatchObject({ configured: true, availability: "ready" });
    expect(JSON.stringify(statuses)).not.toContain("super-secret-key");
  });

  it("keeps supplier comparison offers display-only and separate from Domora bookings", async () => {
    const offer = (await createDemoSupplierAdapter().search({ hotelId: 1, roomId: 1, checkIn: "2026-09-10", checkOut: "2026-09-12", guests: 2 }))[0];
    expect(offer).toMatchObject({ providerKey: "demo", isDemo: true, status: "available" });
    expect(offer).not.toHaveProperty("bookingId");
    expect(offer).not.toHaveProperty("bookingStatus");
  });

  it("does not attempt WhatsApp delivery when the channel is unconfigured", async () => {
    vi.stubEnv("META_WHATSAPP_ACCESS_TOKEN", "");
    vi.stubEnv("META_WHATSAPP_PHONE_NUMBER_ID", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(sendWhatsApp({ phone: "+919999999999", event: "refresh_failed", text: "failure" })).resolves.toEqual({ enabled: false });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
