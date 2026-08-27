import { timingSafeEqual } from 'node:crypto'
import type { VercelRequest } from './_shared.js'

function headerValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

/** Left-most entry of X-Forwarded-For is the original client — Vercel's edge always sets this. */
export function getClientIp(req: VercelRequest): string {
  const forwarded = headerValue(req.headers?.['x-forwarded-for'])
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const real = headerValue(req.headers?.['x-real-ip'])?.trim()
  return real || 'unknown'
}

let warnedMissingToken = false

/**
 * Constant-time comparison of the client-supplied X-App-Token against
 * APP_API_TOKEN, so a mistimed guess can't leak how many leading characters
 * matched. Fails OPEN: if the server has no APP_API_TOKEN configured, every
 * request is let through (so a deploy that forgot to set the env var doesn't
 * take the whole API down) — but a warning is logged once per process so the
 * misconfiguration doesn't go unnoticed.
 */
export function isAuthorizedRequest(req: VercelRequest): boolean {
  const expected = process.env.APP_API_TOKEN?.trim()
  if (!expected) {
    if (!warnedMissingToken) {
      console.warn('[myJungle] APP_API_TOKEN is not set — the X-App-Token check is disabled and every request is being allowed through.')
      warnedMissingToken = true
    }
    return true
  }

  const provided = headerValue(req.headers?.['x-app-token'])?.trim()
  if (!provided) return false

  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  // timingSafeEqual throws on mismatched lengths — the length check itself is
  // a minor, unavoidable timing signal (Node offers no length-blind variant),
  // but it never reveals anything about the token's actual content.
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** Test-only: resets the once-per-process warning flag so cases don't leak state into each other. */
export function __resetAuthWarningForTests(): void {
  warnedMissingToken = false
}
