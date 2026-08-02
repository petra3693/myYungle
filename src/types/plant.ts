export type WaterNeed = 'Light' | 'Moderate' | 'Heavy'
export type DayCode = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

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
