import type { AppSettings, UserState } from '@/types/plant'

// ─── Products & entitlement ────────────────────────────────────────────────
// Configure these exact identifiers in the RevenueCat dashboard (and the
// underlying App Store Connect / Play Console products) before shipping.

export const ENTITLEMENT_PRO = 'pro'

export const PRODUCT_ANNUAL = 'myjungle_pro_annual'
export const PRODUCT_MONTHLY = 'myjungle_pro_monthly'
export const PRODUCT_LIFETIME = 'myjungle_pro_lifetime'
/** Legacy non-consumable — no longer sold, read-only for grandfathering. */
export const PRODUCT_LEGACY_ONETIME = 'myjungle_pro_onetime'

/** Free-tier plant cap. Single tunable spot — see §1 of the monetization spec. */
export const FREE_PLANT_LIMIT = 5

/** 7 days by default; flip to 14 for the A/B variant via remote config once wired. */
export const TRIAL_DAYS = 7

/** Show the lifetime win-back offer at most this often. */
export const LIFETIME_OFFER_COOLDOWN_DAYS = 30

/** Show the habit-upsell Home card starting this many days after onboarding. */
export const HABIT_UPSELL_MIN_DAYS = 7
/** ...and only once the user has actually built a watering habit. */
export const HABIT_UPSELL_MIN_WATERINGS = 3

export type PaywallSource = 'onboarding_strip' | 'health_scan' | 'plant_limit' | 'habit_card' | 'settings'

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
// Ships at 7 days. A 14-day A/B variant can be flipped on without a release by
// writing an override to localStorage — no experiment framework needed yet.

const TRIAL_DAYS_OVERRIDE_KEY = 'mj_trial_days_override'

export function getTrialDays(): number {
  try {
    const raw = localStorage.getItem(TRIAL_DAYS_OVERRIDE_KEY)
    const parsed = raw ? parseInt(raw, 10) : NaN
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 30) return parsed
  } catch {
    // Fall through to the default below.
  }
  return TRIAL_DAYS
}

// ─── Paywall copy per trigger (§6) ──────────────────────────────────────────
// The headline replaces the static mockup headline; only health_scan and
// plant_limit have doc-specified copy, everything else falls back to the
// mockup's own "unlimited growth" framing.

export interface PaywallCopy {
  headline: string
  subtitle: string
}

export function paywallCopyForSource(source: PaywallSource | null): PaywallCopy {
  switch (source) {
    case 'health_scan':
      return { headline: "FIND OUT WHAT'S WRONG WITH YOUR PLANT", subtitle: 'AI health scans and disease diagnosis, unlocked.' }
    case 'plant_limit':
      return { headline: 'ROOM FOR EVERY PLANT', subtitle: 'Add unlimited plants to your jungle.' }
    default:
      return { headline: 'UNLIMITED GROWTH', subtitle: 'Unlock the full care experience, no limits.' }
  }
}

// ─── Computed annual discount label (§6) ───────────────────────────────────
// "2 months free" etc., derived from real monthly/annual prices — never
// hardcoded. Returns null when a label can't be sensibly computed.

export function computeAnnualDiscountLabel(monthlyPrice: number, annualPrice: number): string | null {
  if (!(monthlyPrice > 0) || !(annualPrice > 0)) return null
  const equivalentMonths = annualPrice / monthlyPrice
  const monthsFree = Math.round(12 - equivalentMonths)
  if (monthsFree < 1) return null
  return `${monthsFree} month${monthsFree > 1 ? 's' : ''} free`
}
