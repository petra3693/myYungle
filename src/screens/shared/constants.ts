import { type AppSettings, type DayCode } from '@/types/plant'

const GREEN = '#B7FF00'
const DAYS: DayCode[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
// Deliberately not translated — used only as a fixed 7-element list to iterate
// over (.map((_, i) => ...)) for day-picker options; the string values
// themselves are never rendered. The displayed label always comes from
// fullDayName(t, i) instead.
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
  paywallDismissedCount: 0,
  lastPaywallShownAt: null,
  hasSeenReviewPrompt: false,
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
// Numeric App Store ID for myJungle's listing — fill in once the app is live;
// until then openStoreReviewPage() (src/lib/appReview.ts) logs a warning
// instead of opening a broken link on iOS. Android needs no such ID — the
// Play Store is addressed by package/bundle ID, which is already known.
const APP_STORE_ID = ''
const ANDROID_PACKAGE_ID = 'com.lumenappstudio.myjungle'

// Canonical external pages — single source of truth. The in-app Legal screens
// (LegalScreen, PrivacyDetailsSheet) show the full Privacy/Terms text
// themselves; these URLs only back the "View on our website" links alongside
// that text, plus whatever gets typed into App Store Connect / Play Console
// submission fields (Marketing URL, Privacy Policy URL).
const WEBSITE_URL = 'https://www.lumenapp.studio/myjungle'
const PRIVACY_POLICY_URL = 'https://www.lumenapp.studio/myjungle/privacy'
const TERMS_OF_SERVICE_URL = 'https://www.lumenapp.studio/myjungle/terms'

export {
  GREEN,
  DAYS,
  FULL_DAY_NAMES,
  APP_VERSION,
  DEFAULT_SETTINGS,
  PLANT_CATEGORIES,
  PRO_BENEFIT_KEYS,
  FALLBACK_PREVIEW_PRICES,
  APP_STORE_ID,
  ANDROID_PACKAGE_ID,
  WEBSITE_URL,
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
}
