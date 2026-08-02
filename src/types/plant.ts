export type WaterNeed = 'Light' | 'Moderate' | 'Heavy'
export type DayCode = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

/** 8-parameter health diagnostic model — S_i percentage values in health-calculator */
export type LeafColor = 'healthy' | 'brown_tips' | 'yellowing' | 'brown_spots'
export type NewGrowth = 'thriving' | 'stagnant' | 'dead_shoots'
export type StemHealth = 'firm' | 'drooping' | 'soft_rotting'
export type SoilMoisture = 'optimal' | 'dry' | 'waterlogged'
export type SoilSurface = 'clean' | 'mold_salt' | 'foul_odor'
export type PestCheck = 'clean' | 'pests_detected'
export type LightStress = 'ideal' | 'etiolated' | 'sunburn'
export type HumidityReaction = 'normal' | 'curling' | 'crispy_edges'

export interface PlantHealthMetrics8P {
  leafColor: LeafColor
  newGrowth: NewGrowth
  stemHealth: StemHealth
  soilMoisture: SoilMoisture
  soilSurface: SoilSurface
  pestCheck: PestCheck
  lightStress: LightStress
  humidityReaction: HumidityReaction
  note?: string
  timestamp: string
}

export type HealthCheckMode = 'quick' | 'deep'

export interface HealthCheckIn extends PlantHealthMetrics8P {
  id: string
  mode: HealthCheckMode
}

/** @deprecated Legacy 3-parameter check-in — migrated on load */
export interface LegacyCheckInLog {
  id: string
  timestamp: string
  leafStatus?: 'lush' | 'brown_tips' | 'yellowing' | 'drooping'
  soilStatus?: 'moist' | 'dry' | 'saturated'
  pestStatus?: PestCheck
  note?: string
}

export interface HistoryEntry {
  id: string
  date: string
  note: string
  photo: string
  heightCm?: number
}

export interface Plant {
  id: string
  name: string
  room: string
  careNote: string
  wateringDays: number[]
  isCustomSchedule: boolean
  scheduleDays: DayCode[]
  waterNeed: WaterNeed
  photo: string
  lastWateredAt: string | null
  previousWateredAt: string | null
  history: HistoryEntry[]
  checkIns: HealthCheckIn[]
  isWateredToday: boolean
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
