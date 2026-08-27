import { type AppSettings, type DayCode } from '@/types/plant'

const GREEN = '#B7FF00'
const DAYS: DayCode[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const FULL_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const APP_VERSION = '1.0.0'
const DEFAULT_SETTINGS: AppSettings = {
  hasCompletedOnboarding: false,
  onboardingCompletedAt: null,
  pushNotifications: false,
  reminderTime: '09:00',
  timezone: 'UTC',
  isPro: false,
  isFoundingMember: false,
  subscriptionPlan: null,
  subscriptionExpiresAt: null,
  subscriptionWillRenew: false,
  subscriptionManagementUrl: null,
  habitUpsellShown: false,
  lifetimeOfferLastShownAt: null,
  subscriptionPeriodType: null,
  primaryWateringDay: 0,
  groupWateringDays: true,
  healthScansUsed: 0,
  proPreviewUsedAt: null,
  proPreviewExpiredPaywallShown: false,
  proPreviewBannerDismissed: false,
  privacyIntroCardDismissed: false,
  paywallDismissedCount: 0,
  lastPaywallShownAt: null,
}
const PLANT_CATEGORIES = ['Houseplant', 'Succulent', 'Herb', 'Flowering', 'Tree', 'Other']
// Health scan is the headline paid value — keep it first (§2 of the monetization spec).
const PRO_BENEFIT_KEYS = [
  'paywall.proBenefit1',
  'paywall.proBenefit2',
  'paywall.proBenefit3',
  'paywall.proBenefit4',
  'paywall.proBenefit5',
]
// Shown only when the SDK has no real offering (web/dev preview) — never
// overrides a real RevenueCat price. Matches the configured store products.
const FALLBACK_PREVIEW_PRICES = { monthly: 1.99, annual: 19.99, lifetime: 49.99 }

export { GREEN, DAYS, FULL_DAY_NAMES, APP_VERSION, DEFAULT_SETTINGS, PLANT_CATEGORIES, PRO_BENEFIT_KEYS, FALLBACK_PREVIEW_PRICES }
