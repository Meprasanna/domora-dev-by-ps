import { describe, expect, it } from "vitest";

const cloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
);

describe("configured external integrations", () => {
  it("validates Cloudinary credentials with the ping endpoint", async () => {
    if (!cloudinaryConfigured) {
      return;
    }

    const credentials = Buffer.from(
      `${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`,
    ).toString("base64");
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/ping`,
      { headers: { Authorization: `Basic ${credentials}` } },
    );

    expect(response.ok).toBe(true);
    const body = (await response.json()) as { status?: string };
    expect(body.status).toBe("ok");
  }, 15_000);
});
