import { describe, expect, it } from "vitest";
import { getSupplierAdapterStatuses, supplierComparisonIsConfigured } from "./suppliers";

describe("supplier adapter readiness", () => {
  it("reports credential-required state when providers are not configured", () => {
    const statuses = getSupplierAdapterStatuses({});
    expect(statuses.length).toBeGreaterThanOrEqual(3);
    expect(statuses.every(status => status.availability === "credentials_required")).toBe(true);
    expect(supplierComparisonIsConfigured({})).toBe(false);
  });

  it("reports configured official or licensed adapters without exposing credentials", () => {
    const statuses = getSupplierAdapterStatuses({ RAPID_API_KEY: "configured" });
    const rapid = statuses.find(status => status.key === "expedia_rapid");
    expect(rapid?.configured).toBe(true);
    expect(rapid?.mode).toBe("official_api");
    expect(supplierComparisonIsConfigured({ RAPID_API_KEY: "configured" })).toBe(true);
  });
});
