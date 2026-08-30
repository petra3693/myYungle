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
  /** How serious any detected issue is. Undefined for logs saved before this field existed. */
  severity?: 'Low' | 'Moderate' | 'High'
  /** Model confidence in the diagnosis, 0-100. Undefined for logs saved before this field existed. */
  confidence?: number
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
  /** Local (device-timezone) `YYYY-MM-DD` dates this plant was watered on — the source of truth for `isWateredToday`. */
  wateredDates: string[]
  /** Derived from `wateredDates` vs. today's local date — never set directly other than to keep it in sync. */
  isWateredToday: boolean
  /** null = unknown / not set */
  isToxicToPets: boolean | null
  toxicityNotes?: string
  /** AI identification confidence, 0-100. Undefined for manually-entered plants. */
  confidence?: number
}

export type SubscriptionPlan = 'annual' | 'monthly' | 'lifetime' | 'legacy' | 'preview' | null

/** Freemium gating: annual/monthly subscription, a lifetime win-back, or a grandfathered legacy unlock. */
export interface UserState {
  isPro: boolean
  /** Bought the old one-time unlock, or was Pro before the subscription migration — Pro forever, no paywall. */
  isFoundingMember: boolean
  subscriptionPlan: SubscriptionPlan
  subscriptionExpiresAt: string | null
  subscriptionWillRenew: boolean
  /** Deep link to the platform's native subscription-management page, from RevenueCat's CustomerInfo. */
  subscriptionManagementUrl: string | null
}

export interface AppSettings {
  hasCompletedOnboarding: boolean
  /** When onboarding finished — drives the day-7 habit-upsell card timing. */
  onboardingCompletedAt: string | null
  pushNotifications: boolean
  reminderTime: string
  timezone: string
  isPro: boolean
  isFoundingMember: boolean
  subscriptionPlan: SubscriptionPlan
  subscriptionExpiresAt: string | null
  subscriptionWillRenew: boolean
  subscriptionManagementUrl: string | null
  /** The Home habit-upsell card is shown at most once, ever. */
  habitUpsellShown: boolean
  /** ISO timestamp of the last lifetime win-back offer, so it shows at most once per 30 days. */
  lifetimeOfferLastShownAt: string | null
  /** Last-seen RevenueCat entitlement period type ("NORMAL"/"INTRO"/"TRIAL"/"PREPAID") — bookkeeping only, to detect trial conversion/cancellation across boots. */
  subscriptionPeriodType: string | null
  /** Day index (0 = Monday .. 6 = Sunday) new AI-batched plants are consolidated onto. */
  primaryWateringDay: number
  /** true = stack plants onto the fewest days possible (default); false = spread them across the week instead. */
  groupWateringDays: boolean
  /** Completed AI health scans — the first is free, the rest require Pro. */
  healthScansUsed: number
  /** ISO timestamp of when the 7-day Pro Preview (reverse trial) was redeemed — client-side bookkeeping only, the server enforces the once-per-lifetime rule. */
  proPreviewUsedAt: string | null
  /** Whether the forced full-screen paywall has already been shown for this Pro Preview expiry. */
  proPreviewExpiredPaywallShown: boolean
  /** Whether the user dismissed the Home-screen Pro Preview banner — it then only reappears on the paywall. */
  proPreviewBannerDismissed: boolean
  /** How many times the paywall has been closed without purchasing — gates the lifetime win-back offer. */
  paywallDismissedCount: number
  /** ISO timestamp the paywall was shown for the dismissal immediately before the current one — null before the first-ever dismissal. */
  lastPaywallShownAt: string | null
  /** The satisfaction/review prompt is shown at most once, ever — right after the first successful Health Check. */
  hasSeenReviewPrompt: boolean
}
