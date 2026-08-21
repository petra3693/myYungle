import type { AppSettings, UserState } from '@/types/plant'

export const MAX_FREE_PLANTS = 5

export function userStateFromSettings(settings: Pick<AppSettings, 'isPro'>): UserState {
  return { isPro: settings.isPro === true }
}

/** Pro is a single one-time unlock: no subscription, no per-plant slots. */
export function canAccessProFeatures(user: UserState): boolean {
  return user.isPro === true
}

export function canAddMorePlants(plantCount: number, user: UserState): boolean {
  return user.isPro || plantCount < MAX_FREE_PLANTS
}

export function isFreeTierLimitReached(plantCount: number, user: UserState): boolean {
  return !user.isPro && plantCount >= MAX_FREE_PLANTS
}
