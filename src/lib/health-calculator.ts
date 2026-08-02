import type {
  HealthCheckIn,
  HumidityReaction,
  LeafColor,
  LegacyCheckInLog,
  LightStress,
  NewGrowth,
  PestCheck,
  PlantHealthMetrics8P,
  SoilMoisture,
  SoilSurface,
  StemHealth,
} from '@/types/plant'

export type HealthStatusText = 'Thriving' | 'Needs Attention' | 'Out of Date'

export interface HealthScoreResult {
  score: number
  statusText: HealthStatusText
  checkInLabel: string
  summary: string
  isOutOfDate: boolean
}

export const PARAMETER_WEIGHTS = {
  leafColor: 0.2,
  newGrowth: 0.1,
  stemHealth: 0.15,
  soilMoisture: 0.15,
  soilSurface: 0.05,
  pestCheck: 0.15,
  lightStress: 0.1,
  humidityReaction: 0.1,
} as const satisfies Record<keyof Omit<PlantHealthMetrics8P, 'note' | 'timestamp'>, number>

const LEAF_COLOR_SCORES: Record<LeafColor, number> = {
  healthy: 100,
  brown_tips: 70,
  yellowing: 40,
  brown_spots: 10,
}

const NEW_GROWTH_SCORES: Record<NewGrowth, number> = {
  thriving: 100,
  stagnant: 50,
  dead_shoots: 0,
}

const STEM_HEALTH_SCORES: Record<StemHealth, number> = {
  firm: 100,
  drooping: 50,
  soft_rotting: 0,
}

const SOIL_MOISTURE_SCORES: Record<SoilMoisture, number> = {
  optimal: 100,
  dry: 40,
  waterlogged: 20,
}

const SOIL_SURFACE_SCORES: Record<SoilSurface, number> = {
  clean: 100,
  mold_salt: 50,
  foul_odor: 0,
}

const PEST_CHECK_SCORES: Record<PestCheck, number> = {
  clean: 100,
  pests_detected: 0,
}

const LIGHT_STRESS_SCORES: Record<LightStress, number> = {
  ideal: 100,
  etiolated: 50,
  sunburn: 10,
}

const HUMIDITY_REACTION_SCORES: Record<HumidityReaction, number> = {
  normal: 100,
  curling: 50,
  crispy_edges: 20,
}

export const LEAF_COLOR_LABELS: Record<LeafColor, string> = {
  healthy: 'Healthy & Vibrant',
  brown_tips: 'Brown Tips',
  yellowing: 'Yellowing',
  brown_spots: 'Brown Spots',
}

export const NEW_GROWTH_LABELS: Record<NewGrowth, string> = {
  thriving: 'Thriving',
  stagnant: 'Stagnant',
  dead_shoots: 'Dead Shoots',
}

export const STEM_HEALTH_LABELS: Record<StemHealth, string> = {
  firm: 'Firm & Upright',
  drooping: 'Drooping',
  soft_rotting: 'Soft / Rotting',
}

export const SOIL_MOISTURE_LABELS: Record<SoilMoisture, string> = {
  optimal: 'Optimal Moisture',
  dry: 'Dry',
  waterlogged: 'Waterlogged',
}

export const SOIL_SURFACE_LABELS: Record<SoilSurface, string> = {
  clean: 'Clean Surface',
  mold_salt: 'Mold / Salt Buildup',
  foul_odor: 'Foul Odor',
}

export const PEST_CHECK_LABELS: Record<PestCheck, string> = {
  clean: 'Clean & Clear',
  pests_detected: 'Pests Detected',
}

export const LIGHT_STRESS_LABELS: Record<LightStress, string> = {
  ideal: 'Ideal Light',
  etiolated: 'Etiolated / Leggy',
  sunburn: 'Sunburn',
}

export const HUMIDITY_REACTION_LABELS: Record<HumidityReaction, string> = {
  normal: 'Normal',
  curling: 'Leaf Curling',
  crispy_edges: 'Crispy Edges',
}

/** Smart defaults applied to hidden parameters during Quick Check */
export const HEALTH_SMART_DEFAULTS: Omit<PlantHealthMetrics8P, 'timestamp' | 'note'> = {
  leafColor: 'healthy',
  newGrowth: 'thriving',
  stemHealth: 'firm',
  soilMoisture: 'optimal',
  soilSurface: 'clean',
  pestCheck: 'clean',
  lightStress: 'ideal',
  humidityReaction: 'normal',
}

export function getParameterScore(
  key: keyof typeof PARAMETER_WEIGHTS,
  metrics: PlantHealthMetrics8P,
): number {
  switch (key) {
    case 'leafColor':
      return LEAF_COLOR_SCORES[metrics.leafColor]
    case 'newGrowth':
      return NEW_GROWTH_SCORES[metrics.newGrowth]
    case 'stemHealth':
      return STEM_HEALTH_SCORES[metrics.stemHealth]
    case 'soilMoisture':
      return SOIL_MOISTURE_SCORES[metrics.soilMoisture]
    case 'soilSurface':
      return SOIL_SURFACE_SCORES[metrics.soilSurface]
    case 'pestCheck':
      return PEST_CHECK_SCORES[metrics.pestCheck]
    case 'lightStress':
      return LIGHT_STRESS_SCORES[metrics.lightStress]
    case 'humidityReaction':
      return HUMIDITY_REACTION_SCORES[metrics.humidityReaction]
  }
}

export function getParameterLabel(
  key: keyof typeof PARAMETER_WEIGHTS,
  metrics: PlantHealthMetrics8P,
): string {
  switch (key) {
    case 'leafColor':
      return LEAF_COLOR_LABELS[metrics.leafColor]
    case 'newGrowth':
      return NEW_GROWTH_LABELS[metrics.newGrowth]
    case 'stemHealth':
      return STEM_HEALTH_LABELS[metrics.stemHealth]
    case 'soilMoisture':
      return SOIL_MOISTURE_LABELS[metrics.soilMoisture]
    case 'soilSurface':
      return SOIL_SURFACE_LABELS[metrics.soilSurface]
    case 'pestCheck':
      return PEST_CHECK_LABELS[metrics.pestCheck]
    case 'lightStress':
      return LIGHT_STRESS_LABELS[metrics.lightStress]
    case 'humidityReaction':
      return HUMIDITY_REACTION_LABELS[metrics.humidityReaction]
  }
}

export function calculateBaseScore(metrics: PlantHealthMetrics8P): number {
  return (Object.keys(PARAMETER_WEIGHTS) as (keyof typeof PARAMETER_WEIGHTS)[]).reduce(
    (sum, key) => sum + getParameterScore(key, metrics) * PARAMETER_WEIGHTS[key],
    0,
  )
}

export function daysSinceTimestamp(timestamp: string): number {
  const diff = Date.now() - new Date(timestamp).getTime()
  return Math.max(0, Math.floor(diff / 86400000))
}

export function calculateHealthScore(lastCheckIn: HealthCheckIn | null): HealthScoreResult {
  if (!lastCheckIn) {
    return {
      score: 0,
      statusText: 'Needs Attention',
      checkInLabel: '⚠️ Checkup Due',
      summary: 'Log your first health check to track vitality.',
      isOutOfDate: true,
    }
  }

  const days = daysSinceTimestamp(lastCheckIn.timestamp)
  const baseScore = calculateBaseScore(lastCheckIn)

  let score = baseScore
  let isOutOfDate = false

  if (days >= 14) {
    isOutOfDate = true
    score = Math.min(baseScore, 20)
  } else if (days >= 8) {
    const decay = (days - 7) * 3
    score = Math.max(0, baseScore - decay)
  }

  score = Math.round(Math.min(100, Math.max(0, score)))

  let statusText: HealthStatusText
  if (isOutOfDate) {
    statusText = 'Out of Date'
  } else if (score >= 75 && days <= 7) {
    statusText = 'Thriving'
  } else {
    statusText = 'Needs Attention'
  }

  return {
    score,
    statusText,
    checkInLabel: formatCheckInBadge(lastCheckIn),
    summary: getHealthSummary(statusText),
    isOutOfDate,
  }
}

export function formatCheckInBadge(lastCheckIn: HealthCheckIn | null): string {
  if (!lastCheckIn) return '⚠️ Checkup Due'
  const days = daysSinceTimestamp(lastCheckIn.timestamp)
  if (days >= 14) return '⚠️ Checkup Due'
  if (days <= 0) return 'Checked Today'
  return `Checked ${days}d ago`
}

export function formatRelativeCheckInTime(timestamp: string): string {
  const days = daysSinceTimestamp(timestamp)
  if (days <= 0) return 'Today'
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

function getHealthSummary(statusText: HealthStatusText): string {
  switch (statusText) {
    case 'Thriving':
      return 'Thriving in current conditions'
    case 'Out of Date':
      return 'Health check overdue — log a check-in'
    default:
      return 'Some areas need your attention'
  }
}

export function getLatestCheckIn(checkIns: HealthCheckIn[]): HealthCheckIn | null {
  if (!checkIns.length) return null
  return [...checkIns].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )[0]
}

export interface HealthMetricRow {
  id: keyof typeof PARAMETER_WEIGHTS
  emoji: string
  label: string
  value: string
  timeAgo: string
  isWarning: boolean
  score: number
}

const METRIC_META: Record<keyof typeof PARAMETER_WEIGHTS, { emoji: string; label: string }> = {
  leafColor: { emoji: '🍃', label: 'Leaf Color' },
  newGrowth: { emoji: '🌱', label: 'New Growth' },
  stemHealth: { emoji: '🪴', label: 'Stem Health' },
  soilMoisture: { emoji: '💧', label: 'Soil Moisture' },
  soilSurface: { emoji: '🪨', label: 'Soil Surface' },
  pestCheck: { emoji: '🐛', label: 'Pest Check' },
  lightStress: { emoji: '☀️', label: 'Light Stress' },
  humidityReaction: { emoji: '💨', label: 'Humidity' },
}

export function getHealthMetricRows(lastCheckIn: HealthCheckIn | null, limit = 3): HealthMetricRow[] {
  if (!lastCheckIn) {
    return [
      { id: 'leafColor', emoji: '🍃', label: 'Leaf Color', value: 'Not checked yet', timeAgo: '—', isWarning: true, score: 0 },
      { id: 'soilMoisture', emoji: '💧', label: 'Soil Moisture', value: 'Not checked yet', timeAgo: '—', isWarning: true, score: 0 },
      { id: 'pestCheck', emoji: '🐛', label: 'Pest Check', value: 'Not checked yet', timeAgo: '—', isWarning: true, score: 0 },
    ]
  }

  const timeAgo = formatRelativeCheckInTime(lastCheckIn.timestamp)
  const rows = (Object.keys(PARAMETER_WEIGHTS) as (keyof typeof PARAMETER_WEIGHTS)[]).map((key) => {
    const score = getParameterScore(key, lastCheckIn)
    const meta = METRIC_META[key]
    return {
      id: key,
      emoji: meta.emoji,
      label: meta.label,
      value: getParameterLabel(key, lastCheckIn),
      timeAgo,
      isWarning: score < 70,
      score,
    }
  })

  return rows.sort((a, b) => a.score - b.score).slice(0, limit)
}

export interface HealthActionCta {
  id: string
  label: string
  variant: 'primary' | 'warning'
}

export function getHealthActionCtas(metrics: PlantHealthMetrics8P): HealthActionCta[] {
  const ctas: HealthActionCta[] = []

  if (metrics.soilMoisture === 'dry') {
    ctas.push({ id: 'water', label: '💧 Record Watering', variant: 'primary' })
  }
  if (metrics.soilMoisture === 'waterlogged') {
    ctas.push({ id: 'drainage', label: '💧 Check Drainage', variant: 'warning' })
  }
  if (metrics.pestCheck === 'pests_detected') {
    ctas.push({ id: 'quarantine', label: '⚠️ Quarantine & Treat', variant: 'warning' })
  }
  if (metrics.stemHealth === 'soft_rotting') {
    ctas.push({ id: 'roots', label: '⚠️ Inspect Roots', variant: 'warning' })
  }

  return ctas
}

export function isFullyHealthy(metrics: PlantHealthMetrics8P): boolean {
  return getHealthActionCtas(metrics).length === 0
    && metrics.leafColor === 'healthy'
    && metrics.newGrowth === 'thriving'
    && metrics.stemHealth === 'firm'
    && metrics.soilMoisture === 'optimal'
    && metrics.soilSurface === 'clean'
    && metrics.pestCheck === 'clean'
    && metrics.lightStress === 'ideal'
    && metrics.humidityReaction === 'normal'
}

export function buildCheckInMetrics(
  partial: Partial<Omit<PlantHealthMetrics8P, 'timestamp'>>,
  lastCheckIn: HealthCheckIn | null,
): Omit<PlantHealthMetrics8P, 'timestamp'> {
  const base = lastCheckIn ?? HEALTH_SMART_DEFAULTS
  return {
    leafColor: partial.leafColor ?? base.leafColor,
    newGrowth: partial.newGrowth ?? base.newGrowth,
    stemHealth: partial.stemHealth ?? base.stemHealth,
    soilMoisture: partial.soilMoisture ?? base.soilMoisture,
    soilSurface: partial.soilSurface ?? base.soilSurface,
    pestCheck: partial.pestCheck ?? base.pestCheck,
    lightStress: partial.lightStress ?? base.lightStress,
    humidityReaction: partial.humidityReaction ?? base.humidityReaction,
    note: partial.note ?? lastCheckIn?.note,
  }
}

/** Migrate legacy 3-parameter check-ins to the 8-parameter model */
export function migrateLegacyCheckIn(raw: unknown): HealthCheckIn | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  if (
    'leafColor' in r
    && typeof r.id === 'string'
    && typeof r.timestamp === 'string'
    && typeof r.leafColor === 'string'
  ) {
    return r as unknown as HealthCheckIn
  }

  if (typeof r.id !== 'string' || typeof r.timestamp !== 'string') return null

  const legacy = raw as LegacyCheckInLog
  const leafMap: Record<string, LeafColor> = {
    lush: 'healthy',
    brown_tips: 'brown_tips',
    yellowing: 'yellowing',
    drooping: 'yellowing',
  }
  const soilMap: Record<string, SoilMoisture> = {
    moist: 'optimal',
    dry: 'dry',
    saturated: 'waterlogged',
  }

  return {
    id: legacy.id,
    timestamp: legacy.timestamp,
    mode: 'quick',
    leafColor: leafMap[legacy.leafStatus ?? ''] ?? 'healthy',
    newGrowth: 'thriving',
    stemHealth: legacy.leafStatus === 'drooping' ? 'drooping' : 'firm',
    soilMoisture: soilMap[legacy.soilStatus ?? ''] ?? 'optimal',
    soilSurface: 'clean',
    pestCheck: legacy.pestStatus ?? 'clean',
    lightStress: 'ideal',
    humidityReaction: 'normal',
    note: legacy.note,
  }
}
