export type WaterNeed = 'Light' | 'Moderate' | 'Heavy'
export type DayCode = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export type LeafStatus = 'lush' | 'brown_tips' | 'yellowing' | 'drooping'
export type SoilStatus = 'moist' | 'dry' | 'saturated'
export type PestStatus = 'clean' | 'pests_detected'

export interface CheckInLog {
  id: string
  timestamp: string
  leafStatus: LeafStatus
  soilStatus: SoilStatus
  pestStatus: PestStatus
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
  checkIns: CheckInLog[]
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
