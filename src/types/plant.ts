export type WaterNeed = 'Light' | 'Moderate' | 'Heavy'
export type LightNeed = 'Low' | 'Medium' | 'High'
export type WateringFrequency = 'weekly' | 'biweekly' | 'monthly'
export type DayCode = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

// ─── Comprehensive 12-question diagnostic model ───────────────────────────────

export type InputType = 'slider' | 'boolean' | 'chips' | 'conditional'

export type DiagnosticDomain = 'foliage' | 'soil' | 'pest' | 'environment'

export type LeafVitalityLevel = 1 | 2 | 3 | 4 | 5
export type LeafDiscoloration = 'none' | 'yellowing' | 'brown_tips' | 'dark_spots'
export type NewGrowthVigor = 1 | 2 | 3
export type SoilMoistureLevel = 1 | 2 | 3 | 4 | 5
export type SoilSurfaceCondition = 'clean' | 'white_salt_mold' | 'foul_odor' | 'compacted'
export type PestType = 'spider_mites' | 'mealybugs' | 'scale' | 'fungus_gnats'
export type PestSeverity = 1 | 2 | 3
export type StemFirmnessLevel = 1 | 2 | 3 | 4
export type LightStressLevel = 'ideal' | 'etiolated' | 'sunburnt'
export type HumidityReactionLevel = 'normal' | 'curled_edges' | 'crispy_tips'
export type RootStabilityLevel = 1 | 2 | 3

export interface ComprehensiveCheckInPayload {
  leafVitality: LeafVitalityLevel
  leafDiscoloration: LeafDiscoloration
  hasNewGrowth: boolean
  newGrowthVigor?: NewGrowthVigor
  soilMoistureLevel: SoilMoistureLevel
  soilSurfaceCondition: SoilSurfaceCondition
  potDrainageWorking: boolean
  pestsPresent: boolean
  pestType?: PestType
  pestSeverity?: PestSeverity
  fungalRotSigns: boolean
  stemFirmness: StemFirmnessLevel
  lightStress: LightStressLevel
  humidityReaction: HumidityReactionLevel
  rootStability: RootStabilityLevel
  note?: string
  timestamp: string
}

export interface HealthCheckIn extends ComprehensiveCheckInPayload {
  id: string
}

export interface DiagnosticQuestion {
  id: keyof Omit<ComprehensiveCheckInPayload, 'note' | 'timestamp' | 'newGrowthVigor' | 'pestType' | 'pestSeverity'>
  domain: DiagnosticDomain
  label: string
  description?: string
  inputType: InputType
  weight: number
}

/** @deprecated Legacy 3-parameter check-in */
export interface LegacyCheckInLog {
  id: string
  timestamp: string
  leafStatus?: 'lush' | 'brown_tips' | 'yellowing' | 'drooping'
  soilStatus?: 'moist' | 'dry' | 'saturated'
  pestStatus?: 'clean' | 'pests_detected'
  note?: string
}

export interface HistoryEntry {
  id: string
  date: string
  note: string
  photo: string
  heightCm?: number
}

export interface PlantHealthLog {
  id: string
  timestamp: string
  photo: string
  healthScore: number
  diagnosis: string
  treatmentNotes: string
  analyzedByAI: boolean
}

export interface Plant {
  id: string
  name: string
  room: string
  careNote: string
  wateringDays: number[]
  isCustomSchedule: boolean
  scheduleDays: DayCode[]
  wateringFrequency: WateringFrequency
  wateringCycleAnchor: string | null
  waterNeed: WaterNeed
  lightNeed: LightNeed
  photo: string
  lastWateredAt: string | null
  previousWateredAt: string | null
  history: HistoryEntry[]
  checkIns: HealthCheckIn[]
  healthLogs: PlantHealthLog[]
  isWateredToday: boolean
  /** null = unknown / not set */
  isToxicToPets: boolean | null
  toxicityNotes?: string
}

export interface AppSettings {
  globalWaterSchedule: string[]
  hasCompletedOnboarding: boolean
  pushNotifications: boolean
  reminderTime: string
  soundAlerts: boolean
  hapticFeedback: boolean
  timezoneAutoSync: boolean
  timezone: string
  isPro: boolean
}
