import { Capacitor } from '@capacitor/core'

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

/** Where the /api/* serverless functions live when there's no same-origin web page to relatively fetch from. */
const DEFAULT_NATIVE_API_BASE_URL = 'https://my-jungle-app.vercel.app'

/**
 * Resolves a `/api/...` path to a fetchable URL. On web this is a no-op — a
 * relative path is correct there, since the page is already being served
 * from the right origin (production, a Vercel preview, or local dev).
 *
 * On a native Capacitor build there is no such origin: the WebView serves
 * the bundled app from a local scheme (e.g. `capacitor://localhost`), which
 * has no /api routes of its own. A relative fetch there either fails
 * outright or gets served the SPA's own index.html for the unmatched path —
 * both of which callers were previously misreading as "the AI couldn't
 * identify this photo" instead of "this request never reached the server".
 * So on native, always target the deployed API's absolute origin.
 */
export function apiUrl(path: string): string {
  if (!Capacitor.isNativePlatform()) return path
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || DEFAULT_NATIVE_API_BASE_URL
  return `${base.replace(/\/+$/, '')}${path}`
}
