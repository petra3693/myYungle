import {
  parseImageDataUrl,
  toUserFriendlyAnalysisError,
} from '@/lib/geminiImage'
import { compressImageForGemini, isInlinePhoto } from '@/lib/imageCompress'
import { parseAiJson } from '@/lib/aiJson'
import {
  coerceAnalyzePlantResponseFromBody,
  createLowConfidencePlantResult,
  isAnalyzePlantErrorPayload,
  type AnalyzePlantResult,
} from '@/lib/analyzePlantResult'
import { getAppLanguage } from '@/i18n'
import type { AppLanguage } from '@/i18n/languages'

export type { GeminiSupportedMime } from '@/lib/geminiImage'
export { parseImageDataUrl } from '@/lib/geminiImage'

export interface AnalyzePlantApiResponse extends AnalyzePlantResult {}

const FRIENDLY_ANALYSIS_FALLBACK =
  'Could not analyze this plant photo. Please try again with a clearer image.'

/** Keep JSON payloads small for Vercel serverless (well under 4.5 MB body limit). */
const MAX_CLIENT_BASE64_CHARS = 3_500_000

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
    return 'Plant analysis API is unavailable in this environment. Use vite dev with GEMINI_API_KEY set, or deploy to Vercel.'
  }
  return toUserFriendlyAnalysisError(trimmed, `Analysis failed (${status}). Please try again.`)
}

function normalizeClientPlantResponse(
  body: unknown,
  preferredDays: string[],
  language: AppLanguage,
): AnalyzePlantApiResponse {
  if (isAnalyzePlantErrorPayload(body)) {
    return createLowConfidencePlantResult(preferredDays, language)
  }
  return coerceAnalyzePlantResponseFromBody(body, preferredDays, language)
}

export async function analyzePlantImage(
  imageSource: string,
  preferredDays: string[] = [],
  language: AppLanguage = getAppLanguage(),
): Promise<{ ok: true; data: AnalyzePlantApiResponse } | { ok: false; error: string }> {
  try {
    // Re-encode to JPEG ≤1024px so Gemini always gets clean, supported bytes.
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
      response = await fetch('/api/analyze-plant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType: 'image/jpeg',
          preferredDays: preferredDays.length > 0 ? preferredDays : undefined,
          language,
        }),
      })
    } catch (error) {
      console.error('[myJungle] analyze-plant network error:', error)
      return {
        ok: false,
        error: 'Could not reach the plant analysis service. Check your connection and try again.',
      }
    }

    const responseText = await response.text()

    if (!response.ok) {
      console.error(`[myJungle] analyze-plant failed (${response.status}):`, responseText)
      const body = parseAiJson(responseText)
      if (body) {
        return {
          ok: false,
          error: getErrorMessageFromBody(body, FRIENDLY_ANALYSIS_FALLBACK),
        }
      }
      return { ok: false, error: buildNonJsonErrorMessage(response.status, responseText) }
    }

    const data = parseAiJson(responseText)
    if (!data) {
      console.warn('[myJungle] analyze-plant success body was not JSON; using low-confidence fallback')
      const fallback = createLowConfidencePlantResult(preferredDays, language)
      return { ok: true, data: fallback }
    }

    if (isAnalyzePlantErrorPayload(data)) {
      return {
        ok: false,
        error: getErrorMessageFromBody(data, FRIENDLY_ANALYSIS_FALLBACK),
      }
    }

    const normalized = normalizeClientPlantResponse(data, preferredDays, language)

    // Prefer server-normalized days; if empty, keep client preferred day as a soft fallback.
    if (normalized.recommendedDays.length === 0 && preferredDays.length > 0) {
      normalized.recommendedDays = preferredDays.slice(0, 1)
    }

    return { ok: true, data: normalized }
  } catch (error) {
    console.error('[myJungle] analyze-plant unexpected error:', error)
    return {
      ok: false,
      error:
        error instanceof Error
          ? toUserFriendlyAnalysisError(error.message, FRIENDLY_ANALYSIS_FALLBACK)
          : FRIENDLY_ANALYSIS_FALLBACK,
    }
  }
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
