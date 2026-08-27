import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getClientIp, isAuthorizedRequest, __resetAuthWarningForTests } from '../../../api/_auth.js'
import { checkRateLimit, __resetRateLimitStoreForTests } from '../../../api/_rateLimit.js'
import type { VercelRequest } from '../../../api/_shared.js'

function req(headers: Record<string, string | string[] | undefined> = {}): VercelRequest {
  return { method: 'POST', headers }
}

describe('isAuthorizedRequest', () => {
  const ORIGINAL_TOKEN = process.env.APP_API_TOKEN

  beforeEach(() => {
    __resetAuthWarningForTests()
  })

  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.APP_API_TOKEN
    else process.env.APP_API_TOKEN = ORIGINAL_TOKEN
    vi.restoreAllMocks()
  })

  it('lets every request through when APP_API_TOKEN is not configured (fails open)', () => {
    delete process.env.APP_API_TOKEN
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(isAuthorizedRequest(req({ 'x-app-token': 'anything' }))).toBe(true)
    expect(isAuthorizedRequest(req())).toBe(true)
  })

  it('warns about the missing token only once, not on every request', () => {
    delete process.env.APP_API_TOKEN
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    isAuthorizedRequest(req())
    isAuthorizedRequest(req())
    isAuthorizedRequest(req())
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('APP_API_TOKEN')
  })

  it('rejects a request with no X-App-Token header', () => {
    process.env.APP_API_TOKEN = 'secret-token-123'
    expect(isAuthorizedRequest(req())).toBe(false)
  })

  it('rejects a request with the wrong token', () => {
    process.env.APP_API_TOKEN = 'secret-token-123'
    expect(isAuthorizedRequest(req({ 'x-app-token': 'wrong-token' }))).toBe(false)
  })

  it('rejects a token that only differs in length', () => {
    process.env.APP_API_TOKEN = 'secret-token-123'
    expect(isAuthorizedRequest(req({ 'x-app-token': 'secret-token-123-extra' }))).toBe(false)
  })

  it('accepts a request with the exact matching token', () => {
    process.env.APP_API_TOKEN = 'secret-token-123'
    expect(isAuthorizedRequest(req({ 'x-app-token': 'secret-token-123' }))).toBe(true)
  })

  it('is case-sensitive on the token value itself', () => {
    process.env.APP_API_TOKEN = 'Secret-Token-123'
    expect(isAuthorizedRequest(req({ 'x-app-token': 'secret-token-123' }))).toBe(false)
  })

  it('trims incidental whitespace from the configured token and the header value', () => {
    process.env.APP_API_TOKEN = '  secret-token-123  '
    expect(isAuthorizedRequest(req({ 'x-app-token': ' secret-token-123 ' }))).toBe(true)
  })
})

describe('getClientIp', () => {
  it('takes the left-most address from X-Forwarded-For', () => {
    expect(getClientIp(req({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }))).toBe('203.0.113.5')
  })

  it('falls back to X-Real-IP when there is no X-Forwarded-For', () => {
    expect(getClientIp(req({ 'x-real-ip': '198.51.100.7' }))).toBe('198.51.100.7')
  })

  it('falls back to "unknown" when neither header is present', () => {
    expect(getClientIp(req())).toBe('unknown')
  })
})

describe('checkRateLimit', () => {
  beforeEach(() => {
    __resetRateLimitStoreForTests()
  })

  it('allows requests up to the limit within the window', () => {
    const now = 1_000_000
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('bucket-a', 5, 60_000, now).allowed).toBe(true)
    }
  })

  it('blocks the request that exceeds the limit', () => {
    const now = 1_000_000
    for (let i = 0; i < 5; i++) checkRateLimit('bucket-b', 5, 60_000, now)
    const result = checkRateLimit('bucket-b', 5, 60_000, now)
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('resets once the window has elapsed', () => {
    const start = 1_000_000
    for (let i = 0; i < 5; i++) checkRateLimit('bucket-c', 5, 60_000, start)
    expect(checkRateLimit('bucket-c', 5, 60_000, start).allowed).toBe(false)
    expect(checkRateLimit('bucket-c', 5, 60_000, start + 60_001).allowed).toBe(true)
  })

  it('tracks separate keys independently', () => {
    const now = 1_000_000
    for (let i = 0; i < 3; i++) checkRateLimit('ip-1', 3, 60_000, now)
    expect(checkRateLimit('ip-1', 3, 60_000, now).allowed).toBe(false)
    expect(checkRateLimit('ip-2', 3, 60_000, now).allowed).toBe(true)
  })
})
