import { describe, expect, it } from "vitest";
import { formatInr, formatIndianDate, formatIndianDateRange } from "../client/src/lib/locale";

describe("Indian locale formatters", () => {
  it("formats INR values with Indian grouping", () => {
    expect(formatInr(125000, "en-IN")).toContain("1,25,000");
    expect(formatInr(125000, "hi-IN")).toContain("1,25,000");
  });

  it("formats dates for Indian users", () => {
    expect(formatIndianDate("2026-08-16T00:00:00.000Z", "en-IN")).toMatch(/16 Aug 2026/);
    expect(formatIndianDate("2026-08-16T00:00:00.000Z", "hi-IN")).toContain("2026");
  });

  it("formats a localized stay date range", () => {
    expect(formatIndianDateRange("2026-08-16", "2026-08-19", "en-IN")).toContain("–");
    expect(formatIndianDateRange("2026-08-16", "2026-08-19", "en-IN")).toMatch(/Aug 2026/);
  });
});
