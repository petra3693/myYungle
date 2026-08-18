import type { AppSettings, Plant, UserState } from '@/types/plant'

export const MAX_PRO_SLOTS = 2

export function clampProSlotsUsed(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : 0
  return Math.min(MAX_PRO_SLOTS, Math.max(0, n))
}

export function userStateFromSettings(settings: Pick<AppSettings, 'isPro' | 'isProUser' | 'proSlotsUsed'>): UserState {
  const isProUser = settings.isProUser === true || settings.isPro === true
  return {
    isProUser,
    proSlotsUsed: clampProSlotsUsed(settings.proSlotsUsed),
  }
}

export function canAccessProFeatures(plant: Plant, user: UserState): boolean {
  return user.isProUser === true || plant.isProSlotActivated === true
}

export function hasFreeProSlotsRemaining(user: UserState): boolean {
  return !user.isProUser && user.proSlotsUsed < MAX_PRO_SLOTS
}

export function canUseAiInstantScan(user: UserState): boolean {
  return user.isProUser === true || user.proSlotsUsed < MAX_PRO_SLOTS
}
