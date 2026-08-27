import { type AppLanguage } from '@/i18n/languages'
import { analyzePlantImage, mapLightNeedToForm, mapWaterNeedToForm } from '@/lib/analyzePlant'
import { type HealthSeverity } from '@/lib/analyzePlantHealth'
import { batchedWateringDays, frequencyForWaterNeed } from '@/lib/wateringBatch'
import { cycleAnchorForFrequency, isPlantDueOnDay, isPlantDueToday } from '@/lib/wateringDue'
import { GREEN } from '@/screens/shared/constants'
import { confidenceLabel, isLowConfidence } from '@/screens/shared/storage'
import { type LightNeed, type Plant, type WaterNeed, type WateringFrequency } from '@/types/plant'
import { type BatchReviewRow, type DraftPlant } from '@/types/screens'

function todayISO() { return new Date().toISOString() }

/** Lightweight heuristic from watering recency — not a real diagnosis. */
function computeHealthStatus(plant: Plant, todayIdx: number, t: (key: string) => string): { score: number; label: string } {
  if (!plant.lastWateredAt) return { score: 75, label: t('healthStatus.good') }
  const daysSince = Math.floor((Date.now() - new Date(plant.lastWateredAt).getTime()) / 86400000)
  const overdue = isPlantDueToday(plant, todayIdx) && !plant.isWateredToday
  let score = 96 - Math.min(35, daysSince * 3) - (overdue ? 15 : 0)
  score = Math.max(35, Math.min(100, score))
  const label = score >= 90 ? t('healthStatus.excellent') : score >= 70 ? t('healthStatus.good') : score >= 50 ? t('healthStatus.fair') : t('healthStatus.needsAttention')
  return { score, label }
}
const FALLBACK_DRAFT_BASE = {
  name: 'Unknown plant', room: 'Unknown', category: 'Houseplant', waterNeed: 'Moderate' as WaterNeed, lightNeed: 'Medium' as LightNeed,
  humidityNeed: 'normal' as const, temperatureRangeC: '18-27°C', careNote: '',
  wateringFrequency: 'weekly' as WateringFrequency, wateringCycleAnchor: null as string | null,
  isToxicToPets: null, toxicityNotes: '', confidence: 40, identified: false as const,
}

function withMinDelay<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.all([promise, new Promise((r) => setTimeout(r, ms))]).then(([value]) => value)
}

async function identifyPhoto(dataUrl: string, language: AppLanguage = 'en', primaryDay = 0): Promise<DraftPlant> {
  try {
    const result = await analyzePlantImage(dataUrl, [], language)
    if (!result.ok) {
      return { photo: dataUrl, ...FALLBACK_DRAFT_BASE, wateringDays: [primaryDay], error: result.error }
    }
    const waterNeed = mapWaterNeedToForm(result.data.waterNeed)
    const wateringFrequency = frequencyForWaterNeed(waterNeed)
    return {
      photo: dataUrl,
      name: result.data.name,
      room: 'Unknown',
      category: 'Houseplant',
      waterNeed,
      lightNeed: mapLightNeedToForm(result.data.lightNeed),
      humidityNeed: result.data.humidityNeed,
      temperatureRangeC: result.data.temperatureRangeC,
      careNote: result.data.careNotes.slice(0, 300),
      wateringDays: batchedWateringDays(waterNeed, primaryDay),
      wateringFrequency,
      wateringCycleAnchor: cycleAnchorForFrequency(wateringFrequency, null),
      isToxicToPets: result.data.isToxicToPets,
      toxicityNotes: result.data.toxicityNotes ?? '',
      confidence: confidenceLabel(result.data.confidence),
      identified: true,
    }
  } catch (error) {
    console.error('[myJungle] identify failed:', error)
    return { photo: dataUrl, ...FALLBACK_DRAFT_BASE, wateringDays: [primaryDay], error: error instanceof Error ? error.message : String(error) }
  }
}
/** Failed identifications first, then low-confidence ones, then the rest — stable within each group. */
function sortBatchReviewRows(rows: BatchReviewRow[]): BatchReviewRow[] {
  const rank = (r: BatchReviewRow) => (r.draft.error ? 0 : isLowConfidence(r.draft.confidence) ? 1 : 2)
  return rows.map((r, i) => ({ r, i })).sort((a, b) => rank(a.r) - rank(b.r) || a.i - b.i).map(({ r }) => r)
}
const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function fullDayName(t: (key: string) => string, dayIdx: number): string {
  return t(`weekday.${WEEKDAY_KEYS[dayIdx]}`)
}

function shortDayName(t: (key: string) => string, dayIdx: number): string {
  return t(`weekdayShort.${WEEKDAY_KEYS[dayIdx]}`)
}

function nextWaterStatus(plant: Plant, todayIdx: number, t: (key: string, opts?: Record<string, unknown>) => string): { label: string; dotColor: string } {
  if (plant.isWateredToday) {
    const dow = plant.lastWateredAt ? (new Date(plant.lastWateredAt).getDay() + 6) % 7 : null
    return { label: dow !== null ? t('home.wateredOn', { day: fullDayName(t, dow) }) : t('home.wateredToday'), dotColor: 'var(--color-ink-dim)' }
  }
  if (isPlantDueToday(plant, todayIdx)) {
    return { label: t('home.waterToday'), dotColor: GREEN }
  }
  for (let step = 1; step <= 7; step++) {
    const dayIdx = (todayIdx + step) % 7
    const refDate = new Date()
    refDate.setDate(refDate.getDate() + step)
    if (isPlantDueOnDay(plant, dayIdx, refDate)) {
      return { label: step === 1 ? t('home.nextWaterTomorrow') : t('home.nextWaterOn', { day: fullDayName(t, dayIdx) }), dotColor: GREEN }
    }
  }
  return { label: t('home.noSchedule'), dotColor: 'var(--color-ink-dim)' }
}
// ─── Screen: Health check ───────────────────────────────────────────────────

function healthScoreColor(score: number): string {
  if (score >= 70) return GREEN
  if (score >= 40) return '#FFC24B'
  return '#FF3B30'
}

/** Same three-tier palette as healthScoreColor, thresholds tuned for a confidence percentage rather than a health score. */
function confidenceColor(confidence: number): string {
  if (confidence >= 75) return GREEN
  if (confidence >= 50) return 'var(--color-ink-dim)'
  return '#FF3B30'
}

function severityColor(severity: HealthSeverity): string {
  if (severity === 'Low') return GREEN
  if (severity === 'Moderate') return '#FFC24B'
  return '#FF3B30'
}

function healthStatusLabel(score: number, t: (key: string) => string): string {
  if (score >= 70) return t('health.healthy')
  if (score >= 40) return t('health.needsAttention')
  return t('health.critical')
}

function daysAgoLabel(iso: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return t('common.today')
  return t('common.daysAgo', { count: days })
}

export { todayISO, computeHealthStatus, withMinDelay, identifyPhoto, sortBatchReviewRows, fullDayName, shortDayName, nextWaterStatus, healthScoreColor, healthStatusLabel, confidenceColor, severityColor, daysAgoLabel }
