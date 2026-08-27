export interface VercelRequest {
  method?: string
  body?: unknown
  headers?: Record<string, string | string[] | undefined>
}

export interface VercelResponse {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
}

/** Parse JSON string bodies (some Vercel runtimes deliver raw strings). */
export function parseRequestBody(body: unknown): unknown {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as unknown
    } catch {
      return body
    }
  }
  return body
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message
  if (typeof err === 'string' && err.trim()) return err
  return 'Unknown error'
}

/**
 * Sends a generic error to the client and logs the real one server-side.
 * Never forwards err.message to the client — an unexpected exception here
 * (a missing env var, an upstream API failure, a stack trace) is exactly the
 * kind of internal detail that must not leak. Handlers that already produce a
 * genuine user-facing message (e.g. friendlyGeminiError for a bad photo)
 * build that response themselves and never reach this function.
 */
export function sendServerError(res: VercelResponse, err: unknown, fallback: string) {
  console.error(err)
  return res.status(500).json({ success: false, error: fallback })
}
