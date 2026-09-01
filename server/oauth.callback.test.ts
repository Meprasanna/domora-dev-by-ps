import { describe, expect, it, vi } from "vitest";
import { encodeOAuthState } from "../shared/const";

const mocks = vi.hoisted(() => ({
  exchangeCodeForToken: vi.fn().mockResolvedValue({ accessToken: "access-token" }),
  getUserInfo: vi.fn().mockResolvedValue({ openId: "oauth-user", name: "OAuth User", email: "oauth@example.com", loginMethod: "manus" }),
  createSessionToken: vi.fn().mockResolvedValue("session-token"),
  upsertUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../server/_core/sdk", () => ({ sdk: mocks }));
vi.mock("../server/db", () => ({ upsertUser: mocks.upsertUser }));

import { registerOAuthRoutes } from "../server/_core/oauth";

type FakeResponse = {
  clearCookie: ReturnType<typeof vi.fn>;
  cookie: ReturnType<typeof vi.fn>;
  redirect: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
};

function createRoute() {
  let handler: ((req: any, res: FakeResponse) => Promise<void>) | undefined;
  registerOAuthRoutes({ get: vi.fn((_path: string, next: typeof handler) => { handler = next; }) } as any);
  if (!handler) throw new Error("OAuth callback route was not registered");
  return handler;
}

function createResponse(): FakeResponse {
  const response = {
    clearCookie: vi.fn(),
    cookie: vi.fn(),
    redirect: vi.fn(),
    status: vi.fn(),
    json: vi.fn(),
  } as FakeResponse;
  response.status.mockReturnValue(response);
  return response;
}

async function invoke(returnTo: string) {
  const nonce = "route-test-nonce";
  const state = encodeOAuthState({ redirectUri: "https://domora.example/api/oauth/callback", nonce, returnTo });
  const req = { query: { code: "oauth-code", state }, headers: { cookie: `__Host-oauth_state=${nonce}` } };
  const res = createResponse();
  await createRoute()(req, res);
  return res;
}

describe("/api/oauth/callback", () => {
  it("redirects to a safe encoded return destination after successful login", async () => {
    const response = await invoke("/search?city=Delhi");
    expect(response.redirect).toHaveBeenCalledWith(302, "/search?city=Delhi");
  });

  it("falls back to home for an unsafe encoded return destination", async () => {
    const response = await invoke("https://evil.example/phishing");
    expect(response.redirect).toHaveBeenCalledWith(302, "/");
  });
});
