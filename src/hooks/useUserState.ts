import { useMemo } from 'react'
import { userStateFromSettings } from '@/lib/monetization'
import type { AppSettings, UserState } from '@/types/plant'

export function useUserState(settings: AppSettings): UserState {
  return useMemo(
    () => userStateFromSettings(settings),
    [settings.isPro, settings.isFoundingMember, settings.subscriptionPlan, settings.subscriptionExpiresAt, settings.subscriptionWillRenew, settings.subscriptionManagementUrl],
  )
}
