export type WaterNeed = 'Light' | 'Moderate' | 'Heavy'
export type LightNeed = 'Low' | 'Medium' | 'High'
export type WateringFrequency = 'weekly' | 'biweekly' | 'monthly'
export type DayCode = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export interface HistoryEntry {
  id: string
  date: string
  note: string
  photo: string
  heightCm?: number
  estimatedAge?: string
  condition?: string
  analyzedByAI?: boolean
}

export interface PlantHealthLog {
  id: string
  timestamp: string
  photo: string
  healthScore: number
  diagnosis: string
  treatmentNotes: string
  recommendedActions: string[]
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
  humidityNeed?: 'low' | 'normal' | 'high'
  temperatureRangeC?: string
  category?: string
  photo: string
  lastWateredAt: string | null
  previousWateredAt: string | null
  history: HistoryEntry[]
  healthLogs: PlantHealthLog[]
  isWateredToday: boolean
  /** null = unknown / not set */
  isToxicToPets: boolean | null
  toxicityNotes?: string
  /** AI identification confidence, 0-100. Undefined for manually-entered plants. */
  confidence?: number
}

/** Freemium gating: a single one-time Pro unlock (no subscription, no per-plant slots). */
export interface UserState {
  isPro: boolean
}

export interface AppSettings {
  hasCompletedOnboarding: boolean
  pushNotifications: boolean
  reminderTime: string
  timezone: string
  isPro: boolean
  /** Day index (0 = Monday .. 6 = Sunday) new AI-batched plants are consolidated onto. */
  primaryWateringDay: number
}
