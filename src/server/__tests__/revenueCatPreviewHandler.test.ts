import { describe, it, expect, afterEach } from 'vitest'
import { handleProPreviewRequest, isValidRevenueCatAppUserId } from '../revenueCatPreviewHandler'

describe('isValidRevenueCatAppUserId', () => {
  it('accepts a well-formed RevenueCat anonymous id', () => {
    expect(isValidRevenueCatAppUserId('$RCAnonymousID:0123456789abcdef0123456789abcdef')).toBe(true)
  })

  it('accepts a bounded developer-assigned id', () => {
    expect(isValidRevenueCatAppUserId('user_12345')).toBe(true)
  })

  it('rejects an empty string', () => {
    expect(isValidRevenueCatAppUserId('')).toBe(false)
  })

  it('rejects an id containing whitespace', () => {
    expect(isValidRevenueCatAppUserId('user 12345')).toBe(false)
  })

  it('rejects an id longer than 64 characters', () => {
    expect(isValidRevenueCatAppUserId('a'.repeat(65))).toBe(false)
  })

  it('rejects an id with disallowed characters (injection attempt)', () => {
    expect(isValidRevenueCatAppUserId('user";DROP TABLE--')).toBe(false)
  })
})

describe('handleProPreviewRequest', () => {
  const ORIGINAL_SECRET = process.env.REVENUECAT_SECRET_API_KEY

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.REVENUECAT_SECRET_API_KEY
    else process.env.REVENUECAT_SECRET_API_KEY = ORIGINAL_SECRET
  })

  it('rejects a body missing appUserId', async () => {
    const result = await handleProPreviewRequest({}, '203.0.113.5')
    expect(result.status).toBe(400)
    expect(result.body.success).toBe(false)
  })

  it('rejects an appUserId with an invalid format before touching RevenueCat', async () => {
    process.env.REVENUECAT_SECRET_API_KEY = 'sk_test'
    const result = await handleProPreviewRequest({ appUserId: 'not a valid id!!' }, '203.0.113.5')
    expect(result.status).toBe(400)
    expect(result.body.error).toBe('Invalid request.')
  })

  it('reports the server as unconfigured when REVENUECAT_SECRET_API_KEY is missing, for an otherwise valid id', async () => {
    delete process.env.REVENUECAT_SECRET_API_KEY
    const result = await handleProPreviewRequest(
      { appUserId: '$RCAnonymousID:0123456789abcdef0123456789abcdef' },
      '203.0.113.5',
    )
    expect(result.status).toBe(503)
  })
})
