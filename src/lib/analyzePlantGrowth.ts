import { parseImageDataUrl, toUserFriendlyAnalysisError } from '@/lib/geminiImage'
import { compressImageForGemini, isInlinePhoto } from '@/lib/imageCompress'
import { parseAiJson } from '@/lib/aiJson'
import { apiUrl, appApiHeaders, logUnauthorizedApiError } from '@/lib/apiAuth'
import i18n from '@/i18n/i18n'
import type { AppLanguage } from '@/i18n/languages'

export interface AnalyzePlantGrowthResult {
  heightCm: number
  estimatedAge: string
  condition: string
  summary: string
}

function friendlyFallback(language: AppLanguage): string {
  return i18n.t('common.couldNotAnalyzePhoto', { lng: language })
}

/** Network failure, non-2xx status, or a 2xx body that isn't valid Gemini JSON. */
function serviceUnreachableMessage(language: AppLanguage): string {
  return i18n.t('common.serviceUnreachable', { lng: language })
}

function getErrorMessageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const record = body as { error?: unknown }
    if (typeof record.error === 'string' && record.error.trim()) {
      return toUserFriendlyAnalysisError(record.error, fallback)
    }
  }
  return fallback
}

export async function analyzePlantGrowthImage(
  imageSource: string,
  language: AppLanguage = 'en',
): Promise<{ ok: true; data: AnalyzePlantGrowthResult } | { ok: false; error: string }> {
  try {
    const preparedSource = isInlinePhoto(imageSource)
      ? await compressImageForGemini(imageSource)
      : imageSource
    const { imageBase64 } = parseImageDataUrl(preparedSource)
    if (!imageBase64) {
      return { ok: false, error: 'No image provided. Please take or choose a photo first.' }
    }

    let response: Response
    try {
      const url = apiUrl('/api/analyze-plant-growth')
      response = await fetch(url, {
        method: 'POST',
        headers: appApiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg', language }),
      })
      console.log(`[myJungle] analyze-plant-growth: fetch to ${url} resolved with status ${response.status}`)
    } catch (error) {
      console.error('[myJungle] analyze-plant-growth network error:', error)
      return { ok: false, error: serviceUnreachableMessage(language) }
    }

    const responseText = await response.text()

    if (response.status === 401) {
      logUnauthorizedApiError('analyze-plant-growth')
      return { ok: false, error: serviceUnreachableMessage(language) }
    }

    const data = parseAiJson(responseText)

    if (!response.ok) {
      console.error(`[myJungle] analyze-plant-growth failed (${response.status}):`, responseText)
      return { ok: false, error: data ? getErrorMessageFromBody(data, friendlyFallback(language)) : serviceUnreachableMessage(language) }
    }

    if (!data || typeof data !== 'object') {
      console.error('[myJungle] analyze-plant-growth: 2xx response body was not valid JSON:', responseText.slice(0, 500))
      return { ok: false, error: serviceUnreachableMessage(language) }
    }

    const record = data as Record<string, unknown>
    const heightCm = Math.max(0, Math.round(Number(record.heightCm ?? 0)))
    const estimatedAge = typeof record.estimatedAge === 'string' && record.estimatedAge.trim() ? record.estimatedAge.trim() : 'Unknown'
    const condition = typeof record.condition === 'string' && record.condition.trim() ? record.condition.trim() : 'Needs review'
    const summary =
      typeof record.summary === 'string' && record.summary.trim()
        ? record.summary.trim()
        : 'Growth stage could not be confidently assessed from this photo.'

    return { ok: true, data: { heightCm, estimatedAge, condition, summary } }
  } catch (error) {
    console.error('[myJungle] analyze-plant-growth unexpected error:', error)
    return {
      ok: false,
      error:
        error instanceof Error
          ? toUserFriendlyAnalysisError(error.message, friendlyFallback(language))
          : friendlyFallback(language),
    }
  }
}
