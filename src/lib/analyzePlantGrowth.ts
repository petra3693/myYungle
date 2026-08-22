import { parseImageDataUrl, toUserFriendlyAnalysisError } from '@/lib/geminiImage'
import { compressImageForGemini, isInlinePhoto } from '@/lib/imageCompress'
import { parseAiJson } from '@/lib/aiJson'
import type { AppLanguage } from '@/i18n/languages'

export interface AnalyzePlantGrowthResult {
  heightCm: number
  estimatedAge: string
  condition: string
  summary: string
}

const FRIENDLY_FALLBACK = 'Could not analyze this plant photo. Please try again with a clearer image.'

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
      response = await fetch('/api/analyze-plant-growth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg', language }),
      })
    } catch (error) {
      console.error('[myJungle] analyze-plant-growth network error:', error)
      return { ok: false, error: 'Could not reach the plant growth service. Check your connection and try again.' }
    }

    const responseText = await response.text()
    const data = parseAiJson(responseText)

    if (!response.ok) {
      console.error(`[myJungle] analyze-plant-growth failed (${response.status}):`, responseText)
      return { ok: false, error: getErrorMessageFromBody(data, FRIENDLY_FALLBACK) }
    }

    if (!data || typeof data !== 'object') {
      return { ok: false, error: FRIENDLY_FALLBACK }
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
      error: error instanceof Error ? toUserFriendlyAnalysisError(error.message, FRIENDLY_FALLBACK) : FRIENDLY_FALLBACK,
    }
  }
}
