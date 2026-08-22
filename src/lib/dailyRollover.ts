import type { Plant } from '@/types/plant'

export const LAST_ACTIVE_DATE_KEY = 'mj_last_active_date'

/** Local (device-timezone) `YYYY-MM-DD`, not UTC — a date rollover should follow the user's clock. */
export function localDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Pure rollover step: when the stored "last active" date differs from today,
 * every plant's `isWateredToday` resets so a new day starts unwatered again.
 * `lastWateredAt`/`previousWateredAt` are left untouched — they're history, not daily state.
 */
export function rolloverWateredState(
  plants: Plant[],
  storedDate: string | null,
  today: string,
): { plants: Plant[]; rolled: boolean } {
  if (storedDate === today) return { plants, rolled: false }
  return {
    plants: plants.map((p) => (p.isWateredToday ? { ...p, isWateredToday: false } : p)),
    rolled: true,
  }
}
