import type {
  ComprehensiveCheckInPayload,
  HealthCheckIn,
  HumidityReactionLevel,
  LeafDiscoloration,
  LegacyCheckInLog,
  LightStressLevel,
  PestType,
  SoilSurfaceCondition,
} from '@/types/plant'

export type HealthStatusText = 'Thriving' | 'Needs Attention' | 'Out of Date'

export interface HealthScoreResult {
  score: number
  statusText: HealthStatusText
  checkInLabel: string
  summary: string
  isOutOfDate: boolean
}

export const DIAGNOSTIC_WEIGHTS = {
  leafVitality: 0.1,
  leafDiscoloration: 0.1,
  newGrowth: 0.08,
  soilMoistureLevel: 0.1,
  soilSurfaceCondition: 0.07,
  potDrainageWorking: 0.05,
  pestsPresent: 0.1,
  fungalRotSigns: 0.1,
  stemFirmness: 0.08,
  lightStress: 0.08,
  humidityReaction: 0.07,
  rootStability: 0.07,
} as const

export const DEFAULT_DIAGNOSTIC_ANSWERS: Omit<ComprehensiveCheckInPayload, 'timestamp' | 'note'> = {
  leafVitality: 4,
  leafDiscoloration: 'none',
  hasNewGrowth: true,
  newGrowthVigor: 2,
  soilMoistureLevel: 3,
  soilSurfaceCondition: 'clean',
  potDrainageWorking: true,
  pestsPresent: false,
  fungalRotSigns: false,
  stemFirmness: 4,
  lightStress: 'ideal',
  humidityReaction: 'normal',
  rootStability: 3,
}

const LEAF_VITALITY_LABELS: Record<number, string> = {
  1: 'Wilted / Dying',
  2: 'Weak',
  3: 'Fair',
  4: 'Healthy',
  5: 'Lush & Vibrant',
}

const SOIL_MOISTURE_LABELS: Record<number, string> = {
  1: 'Bone Dry',
  2: 'Dry',
  3: 'Optimal Moist',
  4: 'Wet',
  5: 'Waterlogged',
}

const STEM_FIRMNESS_LABELS: Record<number, string> = {
  1: 'Mushy / Soft',
  2: 'Soft',
  3: 'Moderate',
  4: 'Firm / Sturdy',
}

const ROOT_STABILITY_LABELS: Record<number, string> = {
  1: 'Loose in Pot',
  2: 'Moderate',
  3: 'Firmly Rooted',
}

const LEAF_DISCOLORATION_LABELS: Record<LeafDiscoloration, string> = {
  none: 'None',
  yellowing: 'Yellowing',
  brown_tips: 'Brown Tips',
  dark_spots: 'Dark Spots',
}

const SOIL_SURFACE_LABELS: Record<SoilSurfaceCondition, string> = {
  clean: 'Clean',
  white_salt_mold: 'White Salt / Mold',
  foul_odor: 'Foul Odor',
  compacted: 'Compacted',
}

const LIGHT_STRESS_LABELS: Record<LightStressLevel, string> = {
  ideal: 'Ideal Light',
  etiolated: 'Etiolated (Stretched)',
  sunburnt: 'Sunburnt Spots',
}

const HUMIDITY_LABELS: Record<HumidityReactionLevel, string> = {
  normal: 'Normal',
  curled_edges: 'Curled Edges',
  crispy_tips: 'Crispy Tips',
}

const PEST_TYPE_LABELS: Record<PestType, string> = {
  spider_mites: 'Spider Mites',
  mealybugs: 'Mealybugs',
  scale: 'Scale',
  fungus_gnats: 'Fungus Gnats',
}

function normalizeLeafVitality(value: number): number {
  return (value - 1) / 4
}

function normalizeLeafDiscoloration(value: LeafDiscoloration): number {
  const map: Record<LeafDiscoloration, number> = {
    none: 1,
    yellowing: 0.55,
    brown_tips: 0.45,
    dark_spots: 0.15,
  }
  return map[value]
}

function normalizeNewGrowth(hasNewGrowth: boolean, vigor?: number): number {
  if (!hasNewGrowth) return 0.55
  const v = vigor ?? 2
  return (v - 1) / 2
}

function normalizeSoilMoisture(level: number): number {
  const map: Record<number, number> = { 1: 0.15, 2: 0.65, 3: 1, 4: 0.65, 5: 0.15 }
  return map[level] ?? 0.5
}

function normalizeSoilSurface(value: SoilSurfaceCondition): number {
  const map: Record<SoilSurfaceCondition, number> = {
    clean: 1,
    white_salt_mold: 0.45,
    foul_odor: 0,
    compacted: 0.35,
  }
  return map[value]
}

function normalizeBooleanPositive(isGood: boolean): number {
  return isGood ? 1 : 0
}

function normalizePests(present: boolean, severity?: number): number {
  if (!present) return 1
  const sev = severity ?? 2
  return Math.max(0, 1 - sev * 0.25)
}

function normalizeStemFirmness(value: number): number {
  return (value - 1) / 3
}

function normalizeLightStress(value: LightStressLevel): number {
  const map: Record<LightStressLevel, number> = { ideal: 1, etiolated: 0.5, sunburnt: 0.2 }
  return map[value]
}

function normalizeHumidity(value: HumidityReactionLevel): number {
  const map: Record<HumidityReactionLevel, number> = { normal: 1, curled_edges: 0.5, crispy_tips: 0.3 }
  return map[value]
}

function normalizeRootStability(value: number): number {
  return (value - 1) / 2
}

export function calculateAdvancedHealthScore(
  answers: ComprehensiveCheckInPayload,
  lastCheckInDate?: Date,
): HealthScoreResult {
  const baseNormalized =
    normalizeLeafVitality(answers.leafVitality) * DIAGNOSTIC_WEIGHTS.leafVitality
    + normalizeLeafDiscoloration(answers.leafDiscoloration) * DIAGNOSTIC_WEIGHTS.leafDiscoloration
    + normalizeNewGrowth(answers.hasNewGrowth, answers.newGrowthVigor) * DIAGNOSTIC_WEIGHTS.newGrowth
    + normalizeSoilMoisture(answers.soilMoistureLevel) * DIAGNOSTIC_WEIGHTS.soilMoistureLevel
    + normalizeSoilSurface(answers.soilSurfaceCondition) * DIAGNOSTIC_WEIGHTS.soilSurfaceCondition
    + normalizeBooleanPositive(answers.potDrainageWorking) * DIAGNOSTIC_WEIGHTS.potDrainageWorking
    + normalizePests(answers.pestsPresent, answers.pestSeverity) * DIAGNOSTIC_WEIGHTS.pestsPresent
    + normalizeBooleanPositive(!answers.fungalRotSigns) * DIAGNOSTIC_WEIGHTS.fungalRotSigns
    + normalizeStemFirmness(answers.stemFirmness) * DIAGNOSTIC_WEIGHTS.stemFirmness
    + normalizeLightStress(answers.lightStress) * DIAGNOSTIC_WEIGHTS.lightStress
    + normalizeHumidity(answers.humidityReaction) * DIAGNOSTIC_WEIGHTS.humidityReaction
    + normalizeRootStability(answers.rootStability) * DIAGNOSTIC_WEIGHTS.rootStability

  let score = Math.round(baseNormalized * 100)

  const checkDate = lastCheckInDate ?? new Date(answers.timestamp)
  const days = daysSinceDate(checkDate)
  let isOutOfDate = false

  if (days > 7) {
    const penalty = (days - 7) * 2
    score = Math.max(15, score - penalty)
    if (days >= 14) isOutOfDate = true
  }

  score = Math.min(100, Math.max(15, score))

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
    checkInLabel: formatCheckInBadgeFromDate(checkDate, days),
    summary: getHealthSummary(statusText),
    isOutOfDate,
  }
}

export function calculateHealthScore(lastCheckIn: HealthCheckIn | null): HealthScoreResult {
  if (!lastCheckIn) {
    return {
      score: 0,
      statusText: 'Needs Attention',
      checkInLabel: '⚠️ Checkup Due',
      summary: 'Log your first comprehensive diagnosis.',
      isOutOfDate: true,
    }
  }
  return calculateAdvancedHealthScore(lastCheckIn, new Date(lastCheckIn.timestamp))
}

export function daysSinceTimestamp(timestamp: string): number {
  return daysSinceDate(new Date(timestamp))
}

function daysSinceDate(date: Date): number {
  const diff = Date.now() - date.getTime()
  return Math.max(0, Math.floor(diff / 86400000))
}

export function formatCheckInBadge(lastCheckIn: HealthCheckIn | null): string {
  if (!lastCheckIn) return '⚠️ Checkup Due'
  const days = daysSinceTimestamp(lastCheckIn.timestamp)
  return formatCheckInBadgeFromDate(new Date(lastCheckIn.timestamp), days)
}

function formatCheckInBadgeFromDate(_date: Date, days: number): string {
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
      return 'Diagnosis overdue — run a new check-in'
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

export interface DiagnosisSummaryCell {
  id: string
  label: string
  value: string
  emoji: string
  isWarning: boolean
}

export function getDiagnosisSummaryGrid(checkIn: HealthCheckIn | null): DiagnosisSummaryCell[] {
  if (!checkIn) {
    return [
      { id: 'foliage', label: 'Foliage Vigor', value: 'Not diagnosed', emoji: '🍃', isWarning: true },
      { id: 'soil', label: 'Soil Status', value: 'Not diagnosed', emoji: '💧', isWarning: true },
      { id: 'pest', label: 'Pest Alert', value: 'Not diagnosed', emoji: '🐛', isWarning: true },
      { id: 'env', label: 'Environment', value: 'Not diagnosed', emoji: '☀️', isWarning: true },
    ]
  }

  const foliageScore = (
    normalizeLeafVitality(checkIn.leafVitality)
    + normalizeLeafDiscoloration(checkIn.leafDiscoloration)
    + normalizeNewGrowth(checkIn.hasNewGrowth, checkIn.newGrowthVigor)
  ) / 3

  const soilScore = (
    normalizeSoilMoisture(checkIn.soilMoistureLevel)
    + normalizeSoilSurface(checkIn.soilSurfaceCondition)
    + normalizeBooleanPositive(checkIn.potDrainageWorking)
  ) / 3

  const pestScore = (
    normalizePests(checkIn.pestsPresent, checkIn.pestSeverity)
    + normalizeBooleanPositive(!checkIn.fungalRotSigns)
  ) / 2

  const envScore = (
    normalizeStemFirmness(checkIn.stemFirmness)
    + normalizeLightStress(checkIn.lightStress)
    + normalizeHumidity(checkIn.humidityReaction)
    + normalizeRootStability(checkIn.rootStability)
  ) / 4

  return [
    {
      id: 'foliage',
      label: 'Foliage Vigor',
      value: LEAF_VITALITY_LABELS[checkIn.leafVitality] ?? 'Unknown',
      emoji: '🍃',
      isWarning: foliageScore < 0.7,
    },
    {
      id: 'soil',
      label: 'Soil Status',
      value: SOIL_MOISTURE_LABELS[checkIn.soilMoistureLevel] ?? 'Unknown',
      emoji: '💧',
      isWarning: soilScore < 0.7,
    },
    {
      id: 'pest',
      label: 'Pest Alert',
      value: checkIn.pestsPresent
        ? PEST_TYPE_LABELS[checkIn.pestType ?? 'spider_mites']
        : checkIn.fungalRotSigns ? 'Rot / Fungus' : 'Clear',
      emoji: '🐛',
      isWarning: pestScore < 0.7,
    },
    {
      id: 'env',
      label: 'Environment',
      value: LIGHT_STRESS_LABELS[checkIn.lightStress],
      emoji: '☀️',
      isWarning: envScore < 0.7,
    },
  ]
}

export interface HealthActionCta {
  id: string
  label: string
  variant: 'primary' | 'warning'
}

export function getHealthActionCtas(checkIn: ComprehensiveCheckInPayload): HealthActionCta[] {
  const ctas: HealthActionCta[] = []

  if (checkIn.soilMoistureLevel === 1) {
    ctas.push({ id: 'water', label: '💧 Record Watering', variant: 'primary' })
  }
  if (checkIn.soilMoistureLevel >= 5) {
    ctas.push({ id: 'drainage', label: '💧 Check Drainage', variant: 'warning' })
  }
  if (checkIn.pestsPresent) {
    const pestLabel = PEST_TYPE_LABELS[checkIn.pestType ?? 'spider_mites']
    ctas.push({ id: 'treat', label: `⚠️ Treatment Plan: ${pestLabel}`, variant: 'warning' })
  }
  if (checkIn.lightStress === 'etiolated') {
    ctas.push({ id: 'light', label: '☀️ Adjust Light Location', variant: 'warning' })
  }
  if (checkIn.fungalRotSigns) {
    ctas.push({ id: 'rot', label: '⚠️ Inspect Rot / Fungus', variant: 'warning' })
  }

  return ctas
}

export function getFullDiagnosisReport(checkIn: HealthCheckIn): { label: string; value: string }[] {
  return [
    { label: 'Leaf Vitality', value: `${checkIn.leafVitality}/5 — ${LEAF_VITALITY_LABELS[checkIn.leafVitality]}` },
    { label: 'Leaf Discoloration', value: LEAF_DISCOLORATION_LABELS[checkIn.leafDiscoloration] },
    {
      label: 'New Growth',
      value: checkIn.hasNewGrowth
        ? `Yes · Vigor ${checkIn.newGrowthVigor ?? 2}/3`
        : 'No',
    },
    { label: 'Soil Moisture', value: `${checkIn.soilMoistureLevel}/5 — ${SOIL_MOISTURE_LABELS[checkIn.soilMoistureLevel]}` },
    { label: 'Soil Surface', value: SOIL_SURFACE_LABELS[checkIn.soilSurfaceCondition] },
    { label: 'Pot Drainage', value: checkIn.potDrainageWorking ? 'Functioning' : 'Blocked' },
    {
      label: 'Pests',
      value: checkIn.pestsPresent
        ? `${PEST_TYPE_LABELS[checkIn.pestType ?? 'spider_mites']} · Severity ${checkIn.pestSeverity ?? 2}/3`
        : 'None detected',
    },
    { label: 'Fungal / Rot', value: checkIn.fungalRotSigns ? 'Signs present' : 'None' },
    { label: 'Stem Firmness', value: `${checkIn.stemFirmness}/4 — ${STEM_FIRMNESS_LABELS[checkIn.stemFirmness]}` },
    { label: 'Light Stress', value: LIGHT_STRESS_LABELS[checkIn.lightStress] },
    { label: 'Humidity Reaction', value: HUMIDITY_LABELS[checkIn.humidityReaction] },
    { label: 'Root Stability', value: `${checkIn.rootStability}/3 — ${ROOT_STABILITY_LABELS[checkIn.rootStability]}` },
  ]
}

export function isFullyHealthy(checkIn: ComprehensiveCheckInPayload): boolean {
  return getHealthActionCtas(checkIn).length === 0
    && checkIn.leafVitality >= 4
    && checkIn.leafDiscoloration === 'none'
    && checkIn.soilMoistureLevel === 3
    && !checkIn.pestsPresent
    && !checkIn.fungalRotSigns
    && checkIn.lightStress === 'ideal'
}

/** Migrate any legacy check-in format to comprehensive model */
export function migrateLegacyCheckIn(raw: unknown): HealthCheckIn | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  if (typeof r.id === 'string' && typeof r.timestamp === 'string' && 'leafVitality' in r) {
    return r as unknown as HealthCheckIn
  }

  if (typeof r.id !== 'string' || typeof r.timestamp !== 'string') return null

  // 8-parameter legacy
  if ('leafColor' in r) {
    const leafMap: Record<string, LeafDiscoloration> = {
      healthy: 'none',
      brown_tips: 'brown_tips',
      yellowing: 'yellowing',
      brown_spots: 'dark_spots',
    }
    const soilMap: Record<string, number> = { optimal: 3, dry: 1, waterlogged: 5 }
    const surfaceMap: Record<string, SoilSurfaceCondition> = {
      clean: 'clean',
      mold_salt: 'white_salt_mold',
      foul_odor: 'foul_odor',
    }
    return {
      id: r.id,
      timestamp: r.timestamp,
      leafVitality: r.leafColor === 'healthy' ? 5 : r.leafColor === 'brown_tips' ? 3 : 2,
      leafDiscoloration: leafMap[String(r.leafColor)] ?? 'none',
      hasNewGrowth: r.newGrowth !== 'dead_shoots',
      newGrowthVigor: r.newGrowth === 'thriving' ? 3 : r.newGrowth === 'stagnant' ? 2 : 1,
      soilMoistureLevel: (soilMap[String(r.soilMoisture)] ?? 3) as ComprehensiveCheckInPayload['soilMoistureLevel'],
      soilSurfaceCondition: surfaceMap[String(r.soilSurface)] ?? 'clean',
      potDrainageWorking: r.soilMoisture !== 'waterlogged',
      pestsPresent: r.pestCheck === 'pests_detected',
      pestType: 'spider_mites',
      pestSeverity: 2,
      fungalRotSigns: r.stemHealth === 'soft_rotting',
      stemFirmness: r.stemHealth === 'firm' ? 4 : r.stemHealth === 'drooping' ? 2 : 1,
      lightStress: r.lightStress === 'ideal' ? 'ideal' : r.lightStress === 'etiolated' ? 'etiolated' : 'sunburnt',
      humidityReaction: r.humidityReaction === 'normal' ? 'normal' : r.humidityReaction === 'curling' ? 'curled_edges' : 'crispy_tips',
      rootStability: 2,
      note: typeof r.note === 'string' ? r.note : undefined,
    }
  }

  // 3-parameter legacy
  const legacy = raw as LegacyCheckInLog
  const discolorMap: Record<string, LeafDiscoloration> = {
    lush: 'none',
    brown_tips: 'brown_tips',
    yellowing: 'yellowing',
    drooping: 'yellowing',
  }
  const moistureMap: Record<string, ComprehensiveCheckInPayload['soilMoistureLevel']> = {
    moist: 3,
    dry: 1,
    saturated: 5,
  }

  return {
    id: legacy.id,
    timestamp: legacy.timestamp,
    ...DEFAULT_DIAGNOSTIC_ANSWERS,
    leafVitality: legacy.leafStatus === 'lush' ? 5 : 3,
    leafDiscoloration: discolorMap[legacy.leafStatus ?? ''] ?? 'none',
    soilMoistureLevel: moistureMap[legacy.soilStatus ?? ''] ?? 3,
    pestsPresent: legacy.pestStatus === 'pests_detected',
    note: legacy.note,
  }
}

export {
  LEAF_VITALITY_LABELS,
  SOIL_MOISTURE_LABELS,
  STEM_FIRMNESS_LABELS,
  ROOT_STABILITY_LABELS,
  LEAF_DISCOLORATION_LABELS,
  SOIL_SURFACE_LABELS,
  LIGHT_STRESS_LABELS,
  HUMIDITY_LABELS,
  PEST_TYPE_LABELS,
}
