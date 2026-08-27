import type { Plant } from '@/types/plant'

/** Local (device-timezone) `YYYY-MM-DD`, not UTC — a date rollover should follow the user's clock. */
export function localDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Pure rollover step: `isWateredToday` is derived from `wateredDates`, not stored
 * independently, so this just recomputes it against `today` for every plant.
 * That makes it safe to call as often as needed (on load, on foreground, on a
 * midnight timer) — a plant whose derived value already matches keeps its exact
 * object reference, and the whole array reference is preserved when nothing
 * changed, so callers can skip re-rendering.
 */
export function rolloverWateredState(plants: Plant[], today: string): { plants: Plant[]; rolled: boolean } {
  let rolled = false
  const next = plants.map((p) => {
    const shouldBeWateredToday = p.wateredDates.includes(today)
    if (p.isWateredToday === shouldBeWateredToday) return p
    rolled = true
    return { ...p, isWateredToday: shouldBeWateredToday }
  })
  return { plants: rolled ? next : plants, rolled }
}

/**
 * Migrates a plant record saved before `wateredDates` existed: seeds a single
 * entry from `lastWateredAt`'s local date, since that was the only watering
 * event legacy data tracked. Records already carrying `wateredDates` pass
 * through de-duplicated, untouched otherwise.
 */
export function migrateWateredDates(raw: { wateredDates?: unknown; lastWateredAt?: unknown }): string[] {
  if (Array.isArray(raw.wateredDates)) {
    return Array.from(new Set(raw.wateredDates.filter((d): d is string => typeof d === 'string')))
  }
  if (typeof raw.lastWateredAt === 'string') {
    const parsed = new Date(raw.lastWateredAt)
    if (!Number.isNaN(parsed.getTime())) return [localDateString(parsed)]
  }
  return []
}
