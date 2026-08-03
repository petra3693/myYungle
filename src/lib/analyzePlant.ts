import type { AnalyzePlantResult } from '@/server/analyzePlantHandler'

export interface AnalyzePlantApiResponse extends AnalyzePlantResult {}

export function parseImageDataUrl(dataUrl: string): { imageBase64: string; mimeType: string } {
  const match = dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/)
  if (match) {
    return { mimeType: match[1], imageBase64: match[2] }
  }
  return {
    mimeType: 'image/jpeg',
    imageBase64: dataUrl.replace(/^data:image\/\w+;base64,/, ''),
  }
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
    return 'Plant analysis API is unavailable in this environment. Use vite dev with GEMINI_API_KEY set, or deploy to Vercel.'
  }
  const preview = trimmed.slice(0, 160).replace(/\s+/g, ' ')
  return preview
    ? `Analysis failed (${status}): ${preview}`
    : `Analysis failed with status ${status}.`
}

export async function analyzePlantImage(
  imageSource: string,
  preferredDays: string[] = [],
): Promise<{ ok: true; data: AnalyzePlantApiResponse } | { ok: false; error: string }> {
  const { imageBase64, mimeType } = parseImageDataUrl(imageSource)

  let response: Response
  try {
    response = await fetch('/api/analyze-plant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64,
        mimeType,
        preferredDays: preferredDays.length > 0 ? preferredDays : undefined,
      }),
    })
  } catch (error) {
    console.error('[myJungle] analyze-plant network error:', error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not reach the plant analysis service.',
    }
  }

  const responseText = await response.text()

  if (!response.ok) {
    console.error(`[myJungle] analyze-plant failed (${response.status}):`, responseText)
    const body = parseResponseJson(responseText)
    if (body) {
      return {
        ok: false,
        error: getErrorMessageFromBody(body, `Analysis failed (${response.status}).`),
      }
    }
    return { ok: false, error: buildNonJsonErrorMessage(response.status, responseText) }
  }

  const data = parseResponseJson(responseText)
  if (!data) {
    console.error('[myJungle] analyze-plant returned non-JSON success body:', responseText)
    return { ok: false, error: 'Invalid response from plant analysis service.' }
  }

  if (typeof data !== 'object' || data === null || !('name' in data) || typeof (data as AnalyzePlantApiResponse).name !== 'string') {
    return { ok: false, error: 'Invalid analysis response.' }
  }

  return { ok: true, data: data as AnalyzePlantApiResponse }
}

export function mapWaterNeedToForm(value: string): 'Light' | 'Moderate' | 'Heavy' {
  const normalized = value.toLowerCase()
  if (normalized === 'light') return 'Light'
  if (normalized === 'heavy') return 'Heavy'
  return 'Moderate'
}

export function mapLightNeedToForm(value: string): 'Low' | 'Medium' | 'High' {
  const normalized = value.toLowerCase()
  if (normalized === 'low') return 'Low'
  if (normalized === 'high') return 'High'
  return 'Medium'
}
