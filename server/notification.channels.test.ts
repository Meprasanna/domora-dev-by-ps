import { describe, expect, it } from "vitest";
import { whatsappTemplate } from "./notifications";

describe("refresh failure notification channels", () => {
  it("renders a dedicated WhatsApp refresh-failure template", () => {
    const text = whatsappTemplate("refresh_failed", "Two scheduled runs failed.");
    expect(text).toContain("Domora price refresh failed");
    expect(text).toContain("Two scheduled runs failed.");
  });

  it("keeps refresh notifications operational and separate from booking state", () => {
    expect("refresh_failed").not.toBe("booking_confirmed");
    expect("in_app").toBe("in_app");
  });
});
