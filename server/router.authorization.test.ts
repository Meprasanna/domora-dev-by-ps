import { describe, expect, it, vi } from "vitest";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, getDb: vi.fn() };
});

import { getDb } from "./db";
import { appRouter } from "./routers";

function callerFor(role: "guest" | "partner" | "super_admin", id = 19) {
  return appRouter.createCaller({
    req: {} as never,
    res: {} as never,
    user: { id, openId: "test", name: "Test", email: "test@example.com", role } as never,
  });
}

describe("partner Hotelbeds mapping authorization", () => {
  it("rejects a guest before any database update can occur", async () => {
    await expect(callerFor("guest").partner.updateHotel({ hotelId: 1, name: "Demo", city: "Aveiro", hotelbedsCode: "3424" })).rejects.toThrow("Only partner accounts can update hotel mappings");
  });

  it("allows an owning partner to update the Hotelbeds mapping", async () => {
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ id: 1 }] }) }) }),
      update: () => ({ set: () => ({ where: async () => undefined }) }),
    };
    vi.mocked(getDb).mockResolvedValue(db as never);
    await expect(callerFor("partner").partner.updateHotel({ hotelId: 1, name: "Demo", city: "Aveiro", hotelbedsCode: "3424" })).resolves.toEqual({ updated: true });
  });
});
