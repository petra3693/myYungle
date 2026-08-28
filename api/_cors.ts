import type { VercelRequest, VercelResponse } from './_shared.js'

function headerValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

/**
 * Origins allowed to call these /api/* endpoints cross-origin.
 *
 * A native Capacitor build has no same-origin web page to relatively fetch
 * against (see src/lib/apiAuth.ts's apiUrl()) — its WebView serves the
 * bundled app from a local scheme and calls the deployed API cross-origin
 * from there, so the browser sends a CORS preflight ahead of every POST.
 * `capacitor://localhost` is that origin on iOS; `ionic://localhost` and
 * `http://localhost` cover Android/older Capacitor configurations that use
 * a different local scheme. `http://localhost:5173` and `http://localhost:8443`
 * are the web dev server (Vite's own default port, and this project's
 * configured default via `PORT` in AGENTS.md/vite.config.ts) — same-origin in
 * practice, but included defensively in case a proxy or a different host
 * setup ever makes a dev request look cross-origin. The production web
 * origin is same-origin with itself too, but is listed explicitly rather
 * than relying on that.
 *
 * Deliberately NOT a wildcard '*': that would let any third-party site
 * script these endpoints using a visitor's browser as a relay, and would
 * also be incompatible with ever sending credentialed requests. Adding a
 * new native scheme or dev origin means adding it here, explicitly.
 */
const ALLOWED_ORIGINS = new Set([
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:8443',
  'https://my-jungle-app.vercel.app',
])

function isAllowedOrigin(origin: string | null): origin is string {
  return origin !== null && ALLOWED_ORIGINS.has(origin)
}

/**
 * Sets the CORS response headers for the given request. Call this on EVERY
 * response path — success and error alike (401, 429, 405, 500) — not just
 * the happy path: a response without these headers is invisible to the
 * calling JS on a cross-origin request too, so the caller sees a generic
 * network failure instead of the real status and body. Since it only calls
 * `res.setHeader()`, calling it once up front (before the handler's own
 * try/catch) is enough — the headers stick on the response object no matter
 * which status code the handler ends up sending.
 *
 * Echoes the request's Origin back as Access-Control-Allow-Origin only when
 * it's in the allowlist — never '*'. Always sets Vary: Origin so a shared or
 * CDN cache never serves one origin's CORS headers to a different origin.
 */
export function applyCors(req: VercelRequest, res: VercelResponse): void {
  const origin = headerValue(req.headers?.['origin'])
  res.setHeader('Vary', 'Origin')
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
}

/**
 * Handles a CORS preflight (OPTIONS) request, if this is one. Must be called
 * BEFORE any auth or rate-limit check — a real browser preflight never
 * carries the app's own X-App-Token header (the browser sends only its own
 * standard OPTIONS probe, not a copy of the real request's custom headers),
 * so gating OPTIONS behind isAuthorizedRequest() would reject every
 * cross-origin preflight before the real POST is even attempted. That was
 * exactly the bug: OPTIONS never reached the token check to *fail* — it hit
 * the earlier `method !== 'POST'` branch and got a bare 405 with no CORS
 * headers at all, which the browser treats as a failed preflight and never
 * sends the real POST for.
 *
 * Returns true when it handled the request as a preflight (the caller must
 * `return` immediately in that case); false for any other method, so the
 * caller's normal method/auth/rate-limit/handler chain proceeds unchanged.
 */
export function handlePreflight(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method !== 'OPTIONS') return false
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-App-Token')
  res.setHeader('Access-Control-Max-Age', '86400')
  res.status(204).end()
  return true
}
