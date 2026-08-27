import type { AppSettings, UserState } from '@/types/plant'

// ─── Products & entitlement ────────────────────────────────────────────────
// These identifiers must match the RevenueCat dashboard configuration
// (and the underlying App Store Connect / Play Console products) EXACTLY —
// a mismatch here silently breaks entitlement checks, not a build error.

/** Exact RevenueCat entitlement identifier — note the literal space, matching the dashboard config. */
export const ENTITLEMENT_PRO = 'myJungle Pro'

export const PRODUCT_ANNUAL = 'myjungle_pro_annual'
export const PRODUCT_MONTHLY = 'myjungle_pro_monthly'
export const PRODUCT_LIFETIME = 'myjungle_pro_lifetime'
/** Legacy non-consumable — no longer sold, read-only for grandfathering. */
export const PRODUCT_LEGACY_ONETIME = 'myjungle_pro_onetime'

/** Free-tier plant cap. Single tunable spot — see §1 of the monetization spec. */
export const FREE_PLANT_LIMIT = 5

/**
 * Fallback trial length shown only when the real StoreKit/Play intro offer
 * hasn't loaded yet (or on web preview, which never has real product data) —
 * see trialLengthFromIntroPrice below. Never used once the real offering
 * data is in.
 */
export const TRIAL_DAYS = 7

/** Show the lifetime win-back offer at most this often. */
export const LIFETIME_OFFER_COOLDOWN_DAYS = 30

/** Show the habit-upsell Home card starting this many days after onboarding. */
export const HABIT_UPSELL_MIN_DAYS = 7
/** ...and only once the user has actually built a watering habit. */
export const HABIT_UPSELL_MIN_WATERINGS = 3

/** The first AI health scan is free; every scan after that needs Pro. */
export const FREE_HEALTH_SCANS = 1

/** RevenueCat promotional-grant duration for the reverse-trial Pro Preview. */
export const PRO_PREVIEW_DURATION = 'weekly'
/** Matches the "weekly" RevenueCat duration above — used for local copy/labels only. */
export const PRO_PREVIEW_DAYS = 7

/** The store value RevenueCat reports for an entitlement granted via the promotional API. */
export const PROMOTIONAL_STORE = 'PROMOTIONAL'

export type PaywallSource =
  | 'onboarding_strip'
  | 'health_scan'
  | 'plant_limit'
  | 'habit_card'
  | 'settings'
  | 'growth_tab'
  | 'preview_expired'

/** The three purchasable plans shown on the paywall (legacy is read-only, never sold again). */
export type SubscriptionPlanId = 'annual' | 'monthly' | 'lifetime'

// ─── Legacy buyer / founding member protection (§0 — non-negotiable) ──────
//
// Anyone who bought the old one-time unlock keeps Pro forever, free, with no
// paywall ever shown to them again — even if RevenueCat is unreachable.

export interface LegacyCheckInput {
  /** Product identifiers RevenueCat reports as ever purchased for this user. */
  purchasedProductIdentifiers: string[]
  /** The isPro flag as it existed in local storage before this migration shipped. */
  previousIsPro: boolean
  /** Whether mj_founding_member was already persisted from an earlier check. */
  alreadyFlaggedFoundingMember: boolean
}

/**
 * True if this user should be permanently grandfathered as a founding member:
 * either RevenueCat confirms they own the old non-consumable, or they already
 * had Pro locally before the subscription migration (and a RevenueCat outage
 * must never be able to take that away), or we already flagged them before.
 */
export function isFoundingMember(input: LegacyCheckInput): boolean {
  if (input.alreadyFlaggedFoundingMember) return true
  if (input.purchasedProductIdentifiers.includes(PRODUCT_LEGACY_ONETIME)) return true
  if (input.previousIsPro) return true
  return false
}

// ─── Entitlement → UserState ───────────────────────────────────────────────

export function userStateFromSettings(settings: Pick<AppSettings, 'isPro' | 'isFoundingMember' | 'subscriptionPlan' | 'subscriptionExpiresAt' | 'subscriptionWillRenew' | 'subscriptionManagementUrl'>): UserState {
  return {
    isPro: settings.isPro === true || settings.isFoundingMember === true,
    isFoundingMember: settings.isFoundingMember === true,
    subscriptionPlan: settings.subscriptionPlan,
    subscriptionExpiresAt: settings.subscriptionExpiresAt,
    subscriptionWillRenew: settings.subscriptionWillRenew,
    subscriptionManagementUrl: settings.subscriptionManagementUrl,
  }
}

export function canAccessProFeatures(user: UserState): boolean {
  return user.isPro === true
}

export function canAddMorePlants(plantCount: number, user: UserState): boolean {
  return user.isPro || plantCount < FREE_PLANT_LIMIT
}

export function isFreeTierLimitReached(plantCount: number, user: UserState): boolean {
  return !user.isPro && plantCount >= FREE_PLANT_LIMIT
}

/** Free users get exactly one AI health scan; Pro is unlimited. */
export function canStartHealthScan(healthScansUsed: number, user: UserState): boolean {
  return user.isPro || healthScansUsed < FREE_HEALTH_SCANS
}

// ─── Lifetime win-back eligibility (§4) ────────────────────────────────────

export function canShowLifetimeOffer(lastShownIso: string | null, now: Date = new Date()): boolean {
  if (!lastShownIso) return true
  const last = new Date(lastShownIso).getTime()
  const days = (now.getTime() - last) / 86400000
  return days >= LIFETIME_OFFER_COOLDOWN_DAYS
}

// ─── Habit-upsell Home card eligibility (§3) ───────────────────────────────

export function canShowHabitUpsellCard(input: { alreadyShown: boolean; onboardingCompletedAt: string | null; wateringCount: number; now?: Date }): boolean {
  if (input.alreadyShown) return false
  if (!input.onboardingCompletedAt) return false
  if (input.wateringCount < HABIT_UPSELL_MIN_WATERINGS) return false
  const now = input.now ?? new Date()
  const days = (now.getTime() - new Date(input.onboardingCompletedAt).getTime()) / 86400000
  return days >= HABIT_UPSELL_MIN_DAYS
}

// ─── Trial length (§8) ──────────────────────────────────────────────────────
// The trial length shown on the paywall comes from the annual package's real
// StoreKit/Play Billing intro offer — never a local constant a user could
// override. If a product has no intro offer, no trial messaging is shown at
// all (see trialLengthFromIntroPrice's null case).

export type TrialPeriodUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'

export interface TrialLength {
  count: number
  unit: TrialPeriodUnit
}

/** Maps an intro-price period unit to its i18n plural-key base (…_one/…_other). */
export function trialUnitI18nKey(unit: TrialPeriodUnit): string {
  switch (unit) {
    case 'WEEK':
      return 'paywall.trialUnitWeek'
    case 'MONTH':
      return 'paywall.trialUnitMonth'
    case 'YEAR':
      return 'paywall.trialUnitYear'
    default:
      return 'paywall.trialUnitDay'
  }
}

/**
 * Derives the trial length from a product's real intro offer
 * (RevenueCat's `PurchasesIntroPrice.periodNumberOfUnits`/`periodUnit`).
 * Returns null when there is no intro offer — callers must not show any
 * trial messaging in that case, not even a fabricated default.
 */
export function trialLengthFromIntroPrice(
  introPrice: { periodNumberOfUnits: number; periodUnit: string } | null | undefined,
): TrialLength | null {
  if (!introPrice) return null
  const unit: TrialPeriodUnit =
    introPrice.periodUnit === 'WEEK' || introPrice.periodUnit === 'MONTH' || introPrice.periodUnit === 'YEAR'
      ? introPrice.periodUnit
      : 'DAY'
  return { count: introPrice.periodNumberOfUnits, unit }
}

// ─── Paywall copy per trigger (§6) ──────────────────────────────────────────
// The headline replaces the static mockup headline; only health_scan and
// plant_limit have doc-specified copy, everything else falls back to the
// mockup's own "unlimited growth" framing.

export interface PaywallCopy {
  headline: string
  subtitle: string
}

export function paywallCopyForSource(source: PaywallSource | null, t: (key: string) => string): PaywallCopy {
  switch (source) {
    case 'health_scan':
      return { headline: t('paywall.headlineHealthScan'), subtitle: t('paywall.subtitleHealthScan') }
    case 'plant_limit':
      return { headline: t('paywall.headlinePlantLimit'), subtitle: t('paywall.subtitlePlantLimit') }
    case 'growth_tab':
      return { headline: t('paywall.headlineGrowthTab'), subtitle: t('paywall.subtitleGrowthTab') }
    case 'preview_expired':
      return { headline: t('paywall.headlinePreviewExpired'), subtitle: t('paywall.subtitlePreviewExpired') }
    default:
      return { headline: t('paywall.headlineDefault'), subtitle: t('paywall.subtitleDefault') }
  }
}

// ─── Computed annual discount label (§6) ───────────────────────────────────
// "2 months free" etc., derived from real monthly/annual prices — never
// hardcoded. Returns null when a label can't be sensibly computed.

export function computeAnnualDiscountLabel(monthlyPrice: number, annualPrice: number, t: (key: string, opts?: Record<string, unknown>) => string): string | null {
  if (!(monthlyPrice > 0) || !(annualPrice > 0)) return null
  const equivalentMonths = annualPrice / monthlyPrice
  const monthsFree = Math.round(12 - equivalentMonths)
  if (monthsFree < 1) return null
  return t('paywall.monthsFree', { count: monthsFree })
}
