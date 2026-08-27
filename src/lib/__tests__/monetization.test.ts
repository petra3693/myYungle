import { describe, it, expect } from 'vitest'
import {
  isFoundingMember,
  canAccessProFeatures,
  canAddMorePlants,
  canShowLifetimeOffer,
  canShowHabitUpsellCard,
  canStartHealthScan,
  userStateFromSettings,
  computeAnnualDiscountLabel,
  trialLengthFromIntroPrice,
  trialUnitI18nKey,
  PRODUCT_LEGACY_ONETIME,
  FREE_PLANT_LIMIT,
  FREE_HEALTH_SCANS,
} from '@/lib/monetization'

describe('isFoundingMember — §0 non-negotiable: never lose Pro access', () => {
  it('grants founding-member status when RevenueCat reports the legacy one-time product', () => {
    expect(isFoundingMember({
      purchasedProductIdentifiers: [PRODUCT_LEGACY_ONETIME],
      previousIsPro: false,
      alreadyFlaggedFoundingMember: false,
    })).toBe(true)
  })

  it('grants founding-member status from the pre-migration local isPro flag, even with no RevenueCat data', () => {
    // Simulates a RevenueCat outage: no purchased product identifiers are known,
    // but the user already had isPro === true before this migration shipped.
    expect(isFoundingMember({
      purchasedProductIdentifiers: [],
      previousIsPro: true,
      alreadyFlaggedFoundingMember: false,
    })).toBe(true)
  })

  it('once flagged, stays a founding member forever regardless of what RevenueCat says later', () => {
    expect(isFoundingMember({
      purchasedProductIdentifiers: [],
      previousIsPro: false,
      alreadyFlaggedFoundingMember: true,
    })).toBe(true)
  })

  it('does not grant founding-member status to a brand-new free user', () => {
    expect(isFoundingMember({
      purchasedProductIdentifiers: [],
      previousIsPro: false,
      alreadyFlaggedFoundingMember: false,
    })).toBe(false)
  })

  it('does not grant it merely for owning a current subscription product', () => {
    expect(isFoundingMember({
      purchasedProductIdentifiers: ['myjungle_pro_annual'],
      previousIsPro: false,
      alreadyFlaggedFoundingMember: false,
    })).toBe(false)
  })
})

describe('userStateFromSettings — founding members are Pro even if isPro is somehow false', () => {
  const base = {
    isPro: false,
    isFoundingMember: true,
    subscriptionPlan: null,
    subscriptionExpiresAt: null,
    subscriptionWillRenew: false,
    subscriptionManagementUrl: null,
  } as const

  it('derives isPro true purely from isFoundingMember', () => {
    const user = userStateFromSettings(base)
    expect(user.isPro).toBe(true)
    expect(user.isFoundingMember).toBe(true)
  })

  it('a founding member always passes canAccessProFeatures and canAddMorePlants', () => {
    const user = userStateFromSettings(base)
    expect(canAccessProFeatures(user)).toBe(true)
    expect(canAddMorePlants(FREE_PLANT_LIMIT + 50, user)).toBe(true)
  })
})

describe('canShowLifetimeOffer', () => {
  const twoDaysAgo = (now: Date) => new Date(now.getTime() - 2 * 86400000).toISOString()

  it('never shows on the very first paywall dismissal, even with no prior win-back and no cooldown issue', () => {
    const now = new Date(2026, 0, 30)
    expect(canShowLifetimeOffer({
      lastShownIso: null,
      paywallDismissedCount: 1,
      lastPaywallShownAt: null,
      now,
    })).toBe(false)
  })

  it('blocks it with fewer than the minimum paywall dismissals, even if the paywall was viewed long ago', () => {
    const now = new Date(2026, 0, 30)
    expect(canShowLifetimeOffer({
      lastShownIso: null,
      paywallDismissedCount: 1,
      lastPaywallShownAt: twoDaysAgo(now),
      now,
    })).toBe(false)
  })

  it('blocks it when the previous paywall view was less than 24h ago, even with enough dismissals', () => {
    const now = new Date(2026, 0, 30, 12, 0, 0)
    const lastPaywallShownAt = new Date(2026, 0, 30, 0, 0, 0).toISOString() // 12h ago
    expect(canShowLifetimeOffer({
      lastShownIso: null,
      paywallDismissedCount: 2,
      lastPaywallShownAt,
      now,
    })).toBe(false)
  })

  it('allows it once dismissal count and the 24h gap are both satisfied, with no prior win-back shown', () => {
    const now = new Date(2026, 0, 30)
    expect(canShowLifetimeOffer({
      lastShownIso: null,
      paywallDismissedCount: 2,
      lastPaywallShownAt: twoDaysAgo(now),
      now,
    })).toBe(true)
  })

  it('still blocks it within the 30-day win-back cooldown, even with enough dismissals and enough elapsed time', () => {
    const now = new Date(2026, 0, 30)
    const shown10DaysAgo = new Date(2026, 0, 20).toISOString()
    expect(canShowLifetimeOffer({
      lastShownIso: shown10DaysAgo,
      paywallDismissedCount: 2,
      lastPaywallShownAt: twoDaysAgo(now),
      now,
    })).toBe(false)
  })

  it('allows it again once the 30-day win-back cooldown has elapsed too', () => {
    const now = new Date(2026, 1, 1)
    const shown31DaysAgo = new Date(2026, 0, 1).toISOString()
    expect(canShowLifetimeOffer({
      lastShownIso: shown31DaysAgo,
      paywallDismissedCount: 2,
      lastPaywallShownAt: twoDaysAgo(now),
      now,
    })).toBe(true)
  })
})

describe('canShowHabitUpsellCard', () => {
  const now = new Date(2026, 0, 15)

  it('requires at least 3 waterings and 7 days since onboarding', () => {
    expect(canShowHabitUpsellCard({
      alreadyShown: false,
      onboardingCompletedAt: new Date(2026, 0, 1).toISOString(),
      wateringCount: 3,
      now,
    })).toBe(true)
  })

  it('is false before 7 days have passed', () => {
    expect(canShowHabitUpsellCard({
      alreadyShown: false,
      onboardingCompletedAt: new Date(2026, 0, 10).toISOString(),
      wateringCount: 5,
      now,
    })).toBe(false)
  })

  it('is false with fewer than 3 waterings', () => {
    expect(canShowHabitUpsellCard({
      alreadyShown: false,
      onboardingCompletedAt: new Date(2026, 0, 1).toISOString(),
      wateringCount: 2,
      now,
    })).toBe(false)
  })

  it('never shows again once already shown', () => {
    expect(canShowHabitUpsellCard({
      alreadyShown: true,
      onboardingCompletedAt: new Date(2026, 0, 1).toISOString(),
      wateringCount: 10,
      now,
    })).toBe(false)
  })
})

describe('computeAnnualDiscountLabel — §6 discount sub-label is computed, never hardcoded', () => {
  const t = (key: string, opts?: Record<string, unknown>) =>
    key === 'paywall.monthsFree' ? `${opts?.count} month${(opts?.count as number) > 1 ? 's' : ''} free` : key

  it('computes "2 months free" when annual costs 10x monthly', () => {
    expect(computeAnnualDiscountLabel(5.99, 59.90, t)).toBe('2 months free')
  })

  it('computes "1 month free" when annual costs 11x monthly', () => {
    expect(computeAnnualDiscountLabel(5.99, 65.89, t)).toBe('1 month free')
  })

  it('returns null when annual is not actually a discount over 12 months of monthly', () => {
    expect(computeAnnualDiscountLabel(5.99, 71.88, t)).toBe(null)
  })

  it('returns null with missing or zero prices', () => {
    expect(computeAnnualDiscountLabel(0, 59.90, t)).toBe(null)
    expect(computeAnnualDiscountLabel(5.99, 0, t)).toBe(null)
  })
})

describe('canStartHealthScan — first scan is free, then Pro-gated', () => {
  const freeUser = {
    isPro: false,
    isFoundingMember: false,
    subscriptionPlan: null,
    subscriptionExpiresAt: null,
    subscriptionWillRenew: false,
    subscriptionManagementUrl: null,
  } as const
  const proUser = { ...freeUser, isPro: true }

  it('allows a free user their first scan', () => {
    expect(canStartHealthScan(0, freeUser)).toBe(true)
  })

  it('blocks a free user on their second scan', () => {
    expect(canStartHealthScan(FREE_HEALTH_SCANS, freeUser)).toBe(false)
  })

  it('never blocks a Pro user regardless of scan count', () => {
    expect(canStartHealthScan(50, proUser)).toBe(true)
  })
})

describe('trialLengthFromIntroPrice — real StoreKit/Play intro offer, never a fabricated default', () => {
  it('returns null when the product has no intro offer', () => {
    expect(trialLengthFromIntroPrice(null)).toBe(null)
    expect(trialLengthFromIntroPrice(undefined)).toBe(null)
  })

  it('reads the count and unit straight from the intro price', () => {
    expect(trialLengthFromIntroPrice({ periodNumberOfUnits: 7, periodUnit: 'DAY' })).toEqual({ count: 7, unit: 'DAY' })
    expect(trialLengthFromIntroPrice({ periodNumberOfUnits: 1, periodUnit: 'WEEK' })).toEqual({ count: 1, unit: 'WEEK' })
    expect(trialLengthFromIntroPrice({ periodNumberOfUnits: 1, periodUnit: 'MONTH' })).toEqual({ count: 1, unit: 'MONTH' })
    expect(trialLengthFromIntroPrice({ periodNumberOfUnits: 1, periodUnit: 'YEAR' })).toEqual({ count: 1, unit: 'YEAR' })
  })

  it('falls back to DAY for an unrecognized period unit rather than throwing', () => {
    expect(trialLengthFromIntroPrice({ periodNumberOfUnits: 3, periodUnit: 'FORTNIGHT' })).toEqual({ count: 3, unit: 'DAY' })
  })
})

describe('trialUnitI18nKey — maps a period unit to its i18n plural-key base', () => {
  it('maps every known unit to a distinct key', () => {
    expect(trialUnitI18nKey('DAY')).toBe('paywall.trialUnitDay')
    expect(trialUnitI18nKey('WEEK')).toBe('paywall.trialUnitWeek')
    expect(trialUnitI18nKey('MONTH')).toBe('paywall.trialUnitMonth')
    expect(trialUnitI18nKey('YEAR')).toBe('paywall.trialUnitYear')
  })
})
