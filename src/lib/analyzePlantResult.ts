import { asJsonObject, parseAiJson } from './aiJson'
import { normalizeAppLanguage, type AppLanguage } from '@/i18n/languages'
import { defaultCareNotes } from './aiDefaultCareNotes'

export type AnalyzePlantConfidence = 'low' | 'medium' | 'high'

export interface AnalyzePlantResult {
  name: string
  waterNeed: 'light' | 'moderate' | 'heavy'
  lightNeed: 'low' | 'medium' | 'high'
  humidityNeed: 'low' | 'normal' | 'high'
  temperatureRangeC: string
  careNotes: string
  recommendedDays: string[]
  frequency: 'weekly' | 'biweekly' | 'monthly'
  confidence: AnalyzePlantConfidence
  isToxicToPets: boolean | null
  toxicityNotes: string
}

export type { AppLanguage } from '@/i18n/languages'
export { normalizeAppLanguage } from '@/i18n/languages'

const FULL_DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

export function normalizeFrequency(value: unknown): AnalyzePlantResult['frequency'] {
  const normalized = String(value ?? '').toLowerCase().trim()
  if (normalized === 'biweekly' || normalized === 'bi-weekly' || normalized === 'every 2 weeks') return 'biweekly'
  if (normalized === 'monthly' || normalized === 'every 4 weeks') return 'monthly'
  return 'weekly'
}

export function normalizeLightNeed(value: unknown): AnalyzePlantResult['lightNeed'] {
  const normalized = String(value ?? '').toLowerCase().trim()
  if (normalized === 'low') return 'low'
  if (normalized === 'high') return 'high'
  return 'medium'
}

export function normalizeWaterNeed(value: unknown): AnalyzePlantResult['waterNeed'] {
  const normalized = String(value ?? '').toLowerCase().trim()
  if (normalized === 'light') return 'light'
  if (normalized === 'heavy') return 'heavy'
  return 'moderate'
}

export function normalizeHumidityNeed(value: unknown): AnalyzePlantResult['humidityNeed'] {
  const normalized = String(value ?? '').toLowerCase().trim()
  if (normalized === 'low') return 'low'
  if (normalized === 'high') return 'high'
  return 'normal'
}

export function normalizeTemperatureRangeC(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 30) : '18-27°C'
}

export function normalizeConfidence(value: unknown): AnalyzePlantConfidence {
  const normalized = String(value ?? '').toLowerCase().trim()
  if (normalized === 'high') return 'high'
  if (normalized === 'medium') return 'medium'
  return 'low'
}

export function normalizeIsToxicToPets(value: unknown): boolean | null {
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  return null
}

export function normalizeToxicityNotes(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 200) : ''
}

export function normalizePreferredDays(preferredDays: string[] | undefined): string[] {
  if (!preferredDays?.length) return [...FULL_DAY_NAMES]
  const valid = preferredDays
    .map((d) => {
      const match = FULL_DAY_NAMES.find((name) => name.toLowerCase() === d.trim().toLowerCase())
      return match ?? d.trim()
    })
    .filter(Boolean)
  return valid.length > 0 ? valid : [...FULL_DAY_NAMES]
}

function normalizeRecommendedDays(
  value: unknown,
  preferredDays: string[],
  waterNeed: AnalyzePlantResult['waterNeed'],
): string[] {
  const preferredLower = new Map(preferredDays.map((d) => [d.toLowerCase(), d]))
  const fromAi = Array.isArray(value)
    ? value
        .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
        .map((d) => preferredLower.get(d.trim().toLowerCase()) ?? null)
        .filter((d): d is string => Boolean(d))
    : []

  const unique = [...new Set(fromAi)]
  if (unique.length > 0) {
    const maxDays = waterNeed === 'heavy' ? 2 : 1
    return unique.slice(0, maxDays)
  }

  return preferredDays.slice(0, waterNeed === 'heavy' ? 2 : 1)
}

/** Coerce a partially-valid AI object into a complete AnalyzePlantResult. */
export function coerceAnalyzePlantResult(
  raw: unknown,
  preferredDays: string[],
  language: AppLanguage = 'en',
): AnalyzePlantResult {
  const obj = asJsonObject(raw) ?? {}
  const waterNeed = normalizeWaterNeed(obj.waterNeed)
  const confidence = normalizeConfidence(obj.confidence ?? (obj.name ? 'medium' : 'low'))
  const name =
    typeof obj.name === 'string' && obj.name.trim()
      ? obj.name.trim()
      : 'Unknown Plant'
  const lightNeed = normalizeLightNeed(obj.lightNeed)
  const humidityNeed = normalizeHumidityNeed(obj.humidityNeed)
  const temperatureRangeC = normalizeTemperatureRangeC(obj.temperatureRangeC)
  const frequency = normalizeFrequency(obj.frequency)
  const recommendedDays = normalizeRecommendedDays(obj.recommendedDays, preferredDays, waterNeed)
  const careNotes =
    typeof obj.careNotes === 'string' && obj.careNotes.trim()
      ? obj.careNotes.trim()
      : defaultCareNotes(language, confidence)
  const isToxicToPets = normalizeIsToxicToPets(obj.isToxicToPets)
  const toxicityNotes = normalizeToxicityNotes(obj.toxicityNotes)

  return {
    name,
    waterNeed,
    lightNeed,
    humidityNeed,
    temperatureRangeC,
    careNotes,
    recommendedDays,
    frequency,
    confidence,
    isToxicToPets,
    toxicityNotes,
  }
}

/** Safe defaults when Gemini returns prose, markdown, or incomplete JSON. */
export function createLowConfidencePlantResult(
  preferredDays: string[] | undefined,
  language: AppLanguage = 'en',
): AnalyzePlantResult {
  const days = normalizePreferredDays(preferredDays)
  return coerceAnalyzePlantResult(
    {
      name: 'Unknown Plant',
      waterNeed: 'moderate',
      lightNeed: 'medium',
      humidityNeed: 'normal',
      temperatureRangeC: '18-27°C',
      careNotes: defaultCareNotes(language, 'low'),
      recommendedDays: days.slice(0, 1),
      frequency: 'weekly',
      confidence: 'low',
      isToxicToPets: null,
      toxicityNotes: '',
    },
    days,
    language,
  )
}

export function isAnalyzePlantErrorPayload(body: unknown): body is { error: string } {
  const obj = asJsonObject(body)
  if (!obj) return false
  return typeof obj.error === 'string' && obj.error.trim().length > 0 && typeof obj.name !== 'string'
}

/** Coerce an API JSON body into a complete plant result — never throws. */
export function coerceAnalyzePlantResponseFromBody(
  body: unknown,
  preferredDays: string[] | undefined,
  language: AppLanguage = 'en',
): AnalyzePlantResult {
  const days = normalizePreferredDays(preferredDays)
  if (isAnalyzePlantErrorPayload(body)) {
    return createLowConfidencePlantResult(days, language)
  }
  return coerceAnalyzePlantResult(body ?? {}, days, language)
}

/** Parse raw Gemini text (possibly fenced in markdown) into a complete plant result. */
export function parseGeminiPlantAnalysisText(
  text: string,
  preferredDays: string[] | undefined,
  language: AppLanguage = 'en',
): AnalyzePlantResult {
  const days = normalizePreferredDays(preferredDays)
  const parsed = parseAiJson(text)
  if (!parsed) {
    console.warn('[myJungle] Using low-confidence fallback for unparseable Gemini plant response')
    return createLowConfidencePlantResult(days, language)
  }
  return coerceAnalyzePlantResult(parsed, days, language)
}
