export function buildManusOAuthUrl({ portalUrl, appId, redirectUri, state }: { portalUrl: string; appId: string; redirectUri: string; state: string }) {
  const url = new URL(`${portalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  return url.toString();
}
