import { useMemo } from 'react'
import { userStateFromSettings } from '@/lib/proAccess'
import type { AppSettings, UserState } from '@/types/plant'

export function useUserState(settings: AppSettings): UserState {
  return useMemo(() => userStateFromSettings(settings), [settings.isPro])
}
