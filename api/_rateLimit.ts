/**
 * Shared in-memory rate limiter for /api/* endpoints.
 *
 * This is a per-instance fallback, not a distributed guarantee: Vercel can run
 * several concurrent instances of the same function, each with its own copy
 * of this module's state, so a determined client spread across instances (or
 * one that survives a cold start) can exceed the nominal limit. It still
 * meaningfully raises the cost of casual abuse and caps a single hot instance.
 * See docs/deploy.md for the tradeoff and how to swap in a durable store
 * (e.g. Upstash/Vercel KV) if a hard guarantee is ever needed.
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Opportunistic cleanup so long-running instances don't accumulate one entry
// per distinct IP forever — cheap, and only runs once the map gets large.
function sweepExpired(now: number) {
  if (buckets.size < 5000) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export interface RateLimitResult {
  allowed: boolean
  /** Seconds until the caller may retry — 0 when allowed. */
  retryAfterSeconds: number
}

/** `now` is injectable so tests can simulate the window advancing without real timers. */
export function checkRateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()): RateLimitResult {
  sweepExpired(now)
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) }
  }

  existing.count += 1
  return { allowed: true, retryAfterSeconds: 0 }
}

/** Test-only: clears all buckets so cases don't leak state into each other. */
export function __resetRateLimitStoreForTests(): void {
  buckets.clear()
}
