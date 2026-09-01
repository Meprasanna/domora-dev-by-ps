import { describe, expect, it } from "vitest";
import { isHotelbedsMappingUpdateAllowed, isValidAvailabilityBatch, shouldSendRefreshFailureAlert, shouldSkipRefreshRun } from "./refreshGuards";

describe("refresh and availability guards", () => {
  it("accepts same-day and forward date batches but rejects inverted ranges", () => {
    expect(isValidAvailabilityBatch(new Date("2026-09-10"), new Date("2026-09-10"))).toBe(true);
    expect(isValidAvailabilityBatch(new Date("2026-09-10"), new Date("2026-09-12"))).toBe(true);
    expect(isValidAvailabilityBatch(new Date("2026-09-12"), new Date("2026-09-10"))).toBe(false);
  });

  it("only alerts after the configured number of consecutive failures", () => {
    expect(shouldSendRefreshFailureAlert(["failed"], 1)).toBe(true);
    expect(shouldSendRefreshFailureAlert(["failed", "failed"], 2)).toBe(true);
    expect(shouldSendRefreshFailureAlert(["failed", "success"], 2)).toBe(false);
    expect(shouldSendRefreshFailureAlert(["failed"], 2)).toBe(false);
  });

  it("allows Hotelbeds mapping only for an owning partner", () => {
    expect(isHotelbedsMappingUpdateAllowed("partner", true)).toBe(true);
    expect(isHotelbedsMappingUpdateAllowed("partner", false)).toBe(false);
    expect(isHotelbedsMappingUpdateAllowed("super_admin", true)).toBe(false);
  });

  it("skips a recently successful refresh with the same run key", () => {
    const now = Date.parse("2026-09-01T12:00:00Z");
    expect(shouldSkipRefreshRun("task:2026-09-10:2026-09-12", "task:2026-09-10:2026-09-12", new Date(now - 60_000), now)).toBe(true);
    expect(shouldSkipRefreshRun("task:old", "task:new", new Date(now - 60_000), now)).toBe(false);
    expect(shouldSkipRefreshRun("task:same", "task:same", new Date(now - 11 * 60_000), now)).toBe(false);
  });

  it("keeps comparison mapping display-only", () => {
    expect({ hotelbedsCode: "3424", createsBooking: false, providerOwnsStatus: false }).toMatchObject({ hotelbedsCode: "3424", createsBooking: false, providerOwnsStatus: false });
  });
});
