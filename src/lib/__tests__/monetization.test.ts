import { describe, it, expect } from 'vitest'
import {
  isFoundingMember,
  canAccessProFeatures,
  canAddMorePlants,
  canShowLifetimeOffer,
  canShowHabitUpsellCard,
  userStateFromSettings,
  computeAnnualDiscountLabel,
  PRODUCT_LEGACY_ONETIME,
  FREE_PLANT_LIMIT,
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
  it('allows showing it when never shown before', () => {
    expect(canShowLifetimeOffer(null)).toBe(true)
  })

  it('blocks it within the cooldown window', () => {
    const now = new Date(2026, 0, 30)
    const shown10DaysAgo = new Date(2026, 0, 20).toISOString()
    expect(canShowLifetimeOffer(shown10DaysAgo, now)).toBe(false)
  })

  it('allows it again once the cooldown has elapsed', () => {
    const now = new Date(2026, 1, 1)
    const shown31DaysAgo = new Date(2026, 0, 1).toISOString()
    expect(canShowLifetimeOffer(shown31DaysAgo, now)).toBe(true)
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
  it('computes "2 months free" when annual costs 10x monthly', () => {
    expect(computeAnnualDiscountLabel(5.99, 59.90)).toBe('2 months free')
  })

  it('computes "1 month free" when annual costs 11x monthly', () => {
    expect(computeAnnualDiscountLabel(5.99, 65.89)).toBe('1 month free')
  })

  it('returns null when annual is not actually a discount over 12 months of monthly', () => {
    expect(computeAnnualDiscountLabel(5.99, 71.88)).toBe(null)
  })

  it('returns null with missing or zero prices', () => {
    expect(computeAnnualDiscountLabel(0, 59.90)).toBe(null)
    expect(computeAnnualDiscountLabel(5.99, 0)).toBe(null)
  })
})
