import { describe, expect, it } from "vitest";
import { canReviewStay } from "./reviewEligibility";
import { whatsappTemplate } from "./notifications";

describe("completed-stay review eligibility", () => {
  const now = new Date("2026-08-14T00:00:00.000Z");
  it("allows a completed booking after checkout", () => {
    expect(canReviewStay({ status: "completed", checkOut: new Date("2026-08-13T00:00:00.000Z"), now })).toBe(true);
  });
  it("rejects pending or future stays", () => {
    expect(canReviewStay({ status: "confirmed", checkOut: new Date("2026-08-13T00:00:00.000Z"), now })).toBe(false);
    expect(canReviewStay({ status: "completed", checkOut: new Date("2026-08-15T00:00:00.000Z"), now })).toBe(false);
  });
});

describe("WhatsApp templates", () => {
  it("uses the event-specific heading and support footer", () => {
    const message = whatsappTemplate("partner_application_approved", "Your hotel is approved.");
    expect(message).toContain("Domora partner application approved");
    expect(message).toContain("Your hotel is approved.");
    expect(message).toContain("Reply to this message");
  });
});
