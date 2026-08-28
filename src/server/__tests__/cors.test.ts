import { describe, it, expect } from 'vitest'
import { applyCors, handlePreflight } from '../../../api/_cors.js'
import type { VercelRequest, VercelResponse } from '../../../api/_shared.js'

function req(method: string, origin?: string): VercelRequest {
  return { method, headers: origin ? { origin } : {} }
}

/** Minimal in-memory VercelResponse so tests can inspect what a handler actually sent. */
function makeRes() {
  const headers: Record<string, string> = {}
  let statusCode: number | undefined
  let jsonBody: unknown
  let ended = false
  const res: VercelResponse = {
    status(code: number) {
      statusCode = code
      return res
    },
    json(body: unknown) {
      jsonBody = body
    },
    setHeader(name: string, value: string) {
      headers[name] = value
    },
    end() {
      ended = true
    },
  }
  return {
    res,
    headers,
    statusCode: () => statusCode,
    jsonBody: () => jsonBody,
    ended: () => ended,
  }
}

const NATIVE_ORIGIN = 'capacitor://localhost'
const DISALLOWED_ORIGIN = 'https://evil.example.com'

describe('applyCors', () => {
  it('echoes an allowed origin back as Access-Control-Allow-Origin, plus Vary: Origin', () => {
    const { res, headers } = makeRes()
    applyCors(req('POST', NATIVE_ORIGIN), res)
    expect(headers['Access-Control-Allow-Origin']).toBe(NATIVE_ORIGIN)
    expect(headers['Vary']).toBe('Origin')
  })

  it('never echoes a disallowed origin, and never falls back to a wildcard', () => {
    const { res, headers } = makeRes()
    applyCors(req('POST', DISALLOWED_ORIGIN), res)
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined()
    expect(Object.values(headers)).not.toContain('*')
  })

  it('sets no Access-Control-Allow-Origin when the request has no Origin header at all', () => {
    const { res, headers } = makeRes()
    applyCors(req('POST'), res)
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined()
  })

  it('accepts the production web origin', () => {
    const { res, headers } = makeRes()
    applyCors(req('POST', 'https://my-jungle-app.vercel.app'), res)
    expect(headers['Access-Control-Allow-Origin']).toBe('https://my-jungle-app.vercel.app')
  })
})

describe('handlePreflight', () => {
  it('responds 204 to an OPTIONS request, with the CORS preflight headers, and no token required', () => {
    const { res, headers, statusCode, ended, jsonBody } = makeRes()
    // No X-App-Token on this request at all — a real preflight never carries one.
    const handled = handlePreflight(req('OPTIONS', NATIVE_ORIGIN), res)

    expect(handled).toBe(true)
    expect(statusCode()).toBe(204)
    expect(ended()).toBe(true)
    expect(jsonBody()).toBeUndefined()
    expect(headers['Access-Control-Allow-Methods']).toBe('POST, OPTIONS')
    expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type, X-App-Token')
    expect(headers['Access-Control-Max-Age']).toBe('86400')
  })

  it('does nothing and returns false for a non-OPTIONS request', () => {
    const { res, headers, statusCode, ended } = makeRes()
    const handled = handlePreflight(req('POST', NATIVE_ORIGIN), res)

    expect(handled).toBe(false)
    expect(statusCode()).toBeUndefined()
    expect(ended()).toBe(false)
    expect(headers['Access-Control-Allow-Methods']).toBeUndefined()
  })
})

describe('applyCors + handlePreflight together, as a handler wires them', () => {
  function runCorsPrelude(request: VercelRequest) {
    const mock = makeRes()
    applyCors(request, mock.res)
    const preflightHandled = handlePreflight(request, mock.res)
    return { ...mock, preflightHandled }
  }

  it('an OPTIONS preflight from an allowed origin gets 204 plus Access-Control-Allow-Origin', () => {
    const { headers, statusCode, preflightHandled } = runCorsPrelude(req('OPTIONS', NATIVE_ORIGIN))
    expect(preflightHandled).toBe(true)
    expect(statusCode()).toBe(204)
    expect(headers['Access-Control-Allow-Origin']).toBe(NATIVE_ORIGIN)
    expect(headers['Access-Control-Allow-Methods']).toBe('POST, OPTIONS')
  })

  it('a POST response still carries the CORS header for an allowed origin', () => {
    const { res, headers, preflightHandled } = runCorsPrelude(req('POST', NATIVE_ORIGIN))
    expect(preflightHandled).toBe(false)
    // Simulates the real POST success path a handler would take after the CORS prelude.
    res.status(200).json({ success: true })
    expect(headers['Access-Control-Allow-Origin']).toBe(NATIVE_ORIGIN)
  })

  it('a 401 Unauthorized response still carries the CORS header for an allowed origin', () => {
    const { res, headers, statusCode, jsonBody, preflightHandled } = runCorsPrelude(req('POST', NATIVE_ORIGIN))
    expect(preflightHandled).toBe(false)
    // Simulates the real 401 path a handler would take after the CORS prelude.
    res.status(401).json({ success: false, error: 'Unauthorized' })
    expect(statusCode()).toBe(401)
    expect(jsonBody()).toEqual({ success: false, error: 'Unauthorized' })
    expect(headers['Access-Control-Allow-Origin']).toBe(NATIVE_ORIGIN)
  })
})
