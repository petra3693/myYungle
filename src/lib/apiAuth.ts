/**
 * Headers for calls to our own /api/* endpoints. Attaches X-App-Token from
 * VITE_APP_API_TOKEN so the server's isAuthorizedRequest() check (api/_auth.ts)
 * accepts the request — see docs/deploy.md for how this pairs with the
 * server-side APP_API_TOKEN env var.
 */
export function appApiHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = import.meta.env.VITE_APP_API_TOKEN as string | undefined
  return {
    ...extra,
    ...(token?.trim() ? { 'X-App-Token': token.trim() } : {}),
  }
}
