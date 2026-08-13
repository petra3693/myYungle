export interface VercelRequest {
  method?: string
  body?: unknown
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

export function sendServerError(res: VercelResponse, err: unknown, fallback: string) {
  console.error(err)
  const message = errorMessage(err)
  return res.status(500).json({
    success: false,
    error: message === 'Unknown error' ? fallback : message,
  })
}
