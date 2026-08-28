import {
  parseImageDataUrl,
  toUserFriendlyAnalysisError,
} from '@/lib/geminiImage'
import { compressImageForGemini, isInlinePhoto } from '@/lib/imageCompress'
import { parseAiJson } from '@/lib/aiJson'
import { apiUrl, appApiHeaders, logUnauthorizedApiError } from '@/lib/apiAuth'
import {
  coerceAnalyzePlantResult,
  isAnalyzePlantErrorPayload,
  type AnalyzePlantResult,
} from '@/lib/analyzePlantResult'
import i18n from '@/i18n/i18n'
import type { AppLanguage } from '@/i18n/languages'

export type { GeminiSupportedMime } from '@/lib/geminiImage'
export { parseImageDataUrl } from '@/lib/geminiImage'

export interface AnalyzePlantApiResponse extends AnalyzePlantResult {}

function friendlyAnalysisFallback(language: AppLanguage): string {
  return i18n.t('common.couldNotAnalyzePhoto', { lng: language })
}

/** Network failure, non-2xx status, or a 2xx body that isn't valid Gemini JSON — never a genuine "AI looked and wasn't sure" result. */
function serviceUnreachableMessage(language: AppLanguage): string {
  return i18n.t('common.serviceUnreachable', { lng: language })
}

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

export async function analyzePlantImage(
  imageSource: string,
  preferredDays: string[] = [],
  language: AppLanguage = 'en',
): Promise<{ ok: true; data: AnalyzePlantApiResponse } | { ok: false; error: string }> {
  try {
    console.log('[myJungle] analyzePlantImage: compressing image for Gemini...')
    // Re-encode to JPEG ≤1024px so Gemini always gets clean, supported bytes.
    const preparedSource = isInlinePhoto(imageSource)
      ? await compressImageForGemini(imageSource)
      : imageSource
    const { imageBase64 } = parseImageDataUrl(preparedSource)
    if (!imageBase64) {
      console.error('[myJungle] analyzePlantImage: no base64 image data after compression')
      return { ok: false, error: 'No image provided. Please take or choose a photo first.' }
    }
    console.log(`[myJungle] analyzePlantImage: image ready (${imageBase64.length} base64 chars)`)
    if (imageBase64.length > MAX_CLIENT_BASE64_CHARS) {
      console.error(`[myJungle] analyzePlantImage: image too large after compression (${imageBase64.length} chars)`)
      return {
        ok: false,
        error: 'Image is too large after compression. Please try a smaller photo or retake the picture.',
      }
    }

    let response: Response
    try {
      const url = apiUrl('/api/analyze-plant')
      console.log(`[myJungle] analyzePlantImage: dispatching fetch to ${url}...`)
      response = await fetch(url, {
        method: 'POST',
        headers: appApiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          imageBase64,
          mimeType: 'image/jpeg',
          preferredDays: preferredDays.length > 0 ? preferredDays : undefined,
          language,
        }),
      })
      console.log(`[myJungle] analyzePlantImage: fetch resolved with status ${response.status}`)
    } catch (error) {
      console.error('[myJungle] analyze-plant network error:', error)
      return { ok: false, error: serviceUnreachableMessage(language) }
    }

    const responseText = await response.text()

    // A 401 here only ever means the client's X-App-Token didn't match the server's
    // APP_API_TOKEN — never treat it as "the AI wasn't sure", and never say why in the UI.
    if (response.status === 401) {
      logUnauthorizedApiError('analyze-plant')
      return { ok: false, error: serviceUnreachableMessage(language) }
    }

    if (!response.ok) {
      console.error(`[myJungle] analyze-plant failed (${response.status}):`, responseText)
      const body = parseAiJson(responseText)
      return {
        ok: false,
        error: body ? getErrorMessageFromBody(body, friendlyAnalysisFallback(language)) : serviceUnreachableMessage(language),
      }
    }

    const data = parseAiJson(responseText)
    if (!data) {
      // A 2xx with an unparseable body means this response never actually came from Gemini
      // (most likely a proxy/SPA fallback page) — a real failure, not a genuine low-confidence
      // identification, so it must not be presented to the user as one.
      console.error('[myJungle] analyze-plant: 2xx response body was not valid JSON:', responseText.slice(0, 500))
      return { ok: false, error: serviceUnreachableMessage(language) }
    }

    if (isAnalyzePlantErrorPayload(data)) {
      return {
        ok: false,
        error: getErrorMessageFromBody(data, friendlyAnalysisFallback(language)),
      }
    }

    // Only a genuine 2xx Gemini JSON response reaches this point — any low confidence /
    // "Unknown Plant" name from here on is Gemini's own honest answer, not a masked failure.
    const normalized = coerceAnalyzePlantResult(data, preferredDays, language)

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
          ? toUserFriendlyAnalysisError(error.message, friendlyAnalysisFallback(language))
          : friendlyAnalysisFallback(language),
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
