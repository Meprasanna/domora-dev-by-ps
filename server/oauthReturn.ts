export function safeReturnPath(returnTo: string | undefined) {
  return returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
}
