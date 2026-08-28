import { parseImageDataUrl, toUserFriendlyAnalysisError } from '@/lib/geminiImage'
import { compressImageForGemini, isInlinePhoto } from '@/lib/imageCompress'
import { parseAiJson } from '@/lib/aiJson'
import { apiUrl, appApiHeaders } from '@/lib/apiAuth'
import type { AppLanguage } from '@/i18n/languages'

export type HealthSeverity = 'Low' | 'Moderate' | 'High'

export interface AnalyzePlantHealthResult {
  healthScore: number
  diagnosis: string
  treatmentNotes: string
  recommendedActions: string[]
  severity: HealthSeverity
  confidence: number
}

const DEFAULT_ACTIONS = ['Check soil moisture and drainage', 'Ensure adequate indirect light', 'Monitor for pests over the next few days']

function normalizeSeverity(value: unknown): HealthSeverity {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (normalized === 'moderate' || normalized === 'medium') return 'Moderate'
  if (normalized === 'high' || normalized === 'severe') return 'High'
  return 'Low'
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

export async function analyzePlantHealthImage(
  imageSource: string,
  language: AppLanguage = 'en',
): Promise<{ ok: true; data: AnalyzePlantHealthResult } | { ok: false; error: string }> {
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
      const url = apiUrl('/api/analyze-plant-health')
      response = await fetch(url, {
        method: 'POST',
        headers: appApiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg', language }),
      })
      console.log(`[myJungle] analyze-plant-health: fetch to ${url} resolved with status ${response.status}`)
    } catch (error) {
      console.error('[myJungle] analyze-plant-health network error:', error)
      return { ok: false, error: 'Could not reach the plant health service. Check your connection and try again.' }
    }

    const responseText = await response.text()
    const data = parseAiJson(responseText)

    if (!response.ok) {
      console.error(`[myJungle] analyze-plant-health failed (${response.status}):`, responseText)
      return { ok: false, error: getErrorMessageFromBody(data, FRIENDLY_FALLBACK) }
    }

    if (!data || typeof data !== 'object') {
      return { ok: false, error: FRIENDLY_FALLBACK }
    }

    const record = data as Record<string, unknown>
    const healthScore = Math.max(0, Math.min(100, Math.round(Number(record.healthScore ?? 50))))
    const diagnosis = typeof record.diagnosis === 'string' && record.diagnosis.trim() ? record.diagnosis.trim() : 'Needs review'
    const treatmentNotes =
      typeof record.treatmentNotes === 'string' && record.treatmentNotes.trim()
        ? record.treatmentNotes.trim()
        : 'Check soil moisture, light exposure, and leaf condition.'
    const recommendedActions = Array.isArray(record.recommendedActions)
      ? record.recommendedActions.filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
      : []
    const severity = normalizeSeverity(record.severity)
    const confidence = Math.max(0, Math.min(100, Math.round(Number(record.confidence ?? 70))))

    return {
      ok: true,
      data: {
        healthScore,
        diagnosis,
        treatmentNotes,
        recommendedActions: recommendedActions.length > 0 ? recommendedActions : DEFAULT_ACTIONS,
        severity,
        confidence,
      },
    }
  } catch (error) {
    console.error('[myJungle] analyze-plant-health unexpected error:', error)
    return {
      ok: false,
      error: error instanceof Error ? toUserFriendlyAnalysisError(error.message, FRIENDLY_FALLBACK) : FRIENDLY_FALLBACK,
    }
  }
}
