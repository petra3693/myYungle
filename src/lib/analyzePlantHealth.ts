import { parseImageDataUrl } from '@/lib/analyzePlant'
import { clampHealthScore } from '@/lib/health-log'

export interface AnalyzePlantHealthApiResponse {
  healthScore: number
  diagnosis: string
  treatmentNotes: string
}

function parseResponseJson(text: string): unknown | null {
  if (!text.trim()) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function getErrorMessageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const message = (body as { error?: unknown }).error
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

function buildNonJsonErrorMessage(status: number, text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    return 'Plant health API is unavailable in this environment. Use vite dev with GEMINI_API_KEY set, or deploy to Vercel.'
  }
  const preview = trimmed.slice(0, 160).replace(/\s+/g, ' ')
  return preview ? `Health analysis failed (${status}): ${preview}` : `Health analysis failed with status ${status}.`
}

export async function analyzePlantHealthImage(
  imageSource: string,
): Promise<{ ok: true; data: AnalyzePlantHealthApiResponse } | { ok: false; error: string }> {
  const { imageBase64, mimeType } = parseImageDataUrl(imageSource)

  let response: Response
  try {
    response = await fetch('/api/analyze-plant-health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType }),
    })
  } catch (error) {
    console.error('[myJungle] analyze-plant-health network error:', error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not reach the plant health analysis service.',
    }
  }

  const responseText = await response.text()

  if (!response.ok) {
    console.error(`[myJungle] analyze-plant-health failed (${response.status}):`, responseText)
    const body = parseResponseJson(responseText)
    if (body) {
      return {
        ok: false,
        error: getErrorMessageFromBody(body, `Health analysis failed (${response.status}).`),
      }
    }
    return { ok: false, error: buildNonJsonErrorMessage(response.status, responseText) }
  }

  const data = parseResponseJson(responseText)
  if (
    typeof data !== 'object' ||
    data === null ||
    !('diagnosis' in data) ||
    typeof (data as AnalyzePlantHealthApiResponse).diagnosis !== 'string' ||
    typeof (data as AnalyzePlantHealthApiResponse).healthScore !== 'number'
  ) {
    return { ok: false, error: 'Invalid health analysis response.' }
  }

  const parsed = data as AnalyzePlantHealthApiResponse
  return {
    ok: true,
    data: {
      healthScore: clampHealthScore(parsed.healthScore),
      diagnosis: parsed.diagnosis,
      treatmentNotes: parsed.treatmentNotes,
    },
  }
}
