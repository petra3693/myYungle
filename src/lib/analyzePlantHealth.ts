import { parseImageDataUrl, toUserFriendlyAnalysisError } from '@/lib/geminiImage'
import { compressImageForGemini, isInlinePhoto } from '@/lib/imageCompress'
import { getAppLanguage } from '@/i18n'
import type { AppLanguage } from '@/i18n/languages'
import { clampHealthScore } from '@/lib/health-log'

export interface AnalyzePlantHealthApiResponse {
  healthScore: number
  diagnosis: string
  treatmentNotes: string
}

const FRIENDLY_HEALTH_FALLBACK =
  'Could not analyze plant health from this photo. Please try again with a clearer image.'

/** Keep JSON payloads small for Vercel serverless (well under 4.5 MB body limit). */
const MAX_CLIENT_BASE64_CHARS = 3_500_000

function parseResponseJson(text: string): unknown | null {
  if (!text.trim()) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function getErrorMessageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const record = body as { error?: unknown; success?: unknown }
    if (record.success === false && typeof record.error === 'string' && record.error.trim()) {
      return toUserFriendlyAnalysisError(record.error, fallback)
    }
    if (typeof record.error === 'string' && record.error.trim()) {
      return toUserFriendlyAnalysisError(record.error, fallback)
    }
  }
  return fallback
}

function buildNonJsonErrorMessage(status: number, text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    return 'Plant health API is unavailable in this environment. Use vite dev with GEMINI_API_KEY set, or deploy to Vercel.'
  }
  return toUserFriendlyAnalysisError(trimmed, `Health analysis failed (${status}). Please try again.`)
}

export async function analyzePlantHealthImage(
  imageSource: string,
  language: AppLanguage = getAppLanguage(),
): Promise<{ ok: true; data: AnalyzePlantHealthApiResponse } | { ok: false; error: string }> {
  try {
    const preparedSource = isInlinePhoto(imageSource)
      ? await compressImageForGemini(imageSource)
      : imageSource
    const { imageBase64 } = parseImageDataUrl(preparedSource)
    if (!imageBase64) {
      return { ok: false, error: 'No image provided. Please take or choose a photo first.' }
    }
    if (imageBase64.length > MAX_CLIENT_BASE64_CHARS) {
      return {
        ok: false,
        error: 'Image is too large after compression. Please try a smaller photo or retake the picture.',
      }
    }

    let response: Response
    try {
      response = await fetch('/api/analyze-plant-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg', language }),
      })
    } catch (error) {
      console.error('[myJungle] analyze-plant-health network error:', error)
      return {
        ok: false,
        error: 'Could not reach the plant health analysis service. Check your connection and try again.',
      }
    }

    const responseText = await response.text()

    if (!response.ok) {
      console.error(`[myJungle] analyze-plant-health failed (${response.status}):`, responseText)
      const body = parseResponseJson(responseText)
      if (body) {
        return {
          ok: false,
          error: getErrorMessageFromBody(body, FRIENDLY_HEALTH_FALLBACK),
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
  } catch (error) {
    console.error('[myJungle] analyze-plant-health unexpected error:', error)
    return {
      ok: false,
      error:
        error instanceof Error
          ? toUserFriendlyAnalysisError(error.message, FRIENDLY_HEALTH_FALLBACK)
          : FRIENDLY_HEALTH_FALLBACK,
    }
  }
}
