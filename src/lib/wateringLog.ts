import { localDateString } from '@/lib/dailyRollover'
import type { Plant } from '@/types/plant'

function isoAtNoon(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toISOString()
}

/**
 * Toggles whether a plant was watered on `dateStr` (a local `YYYY-MM-DD` date —
 * not necessarily today, since the Days screen lets you check off any day of
 * the current week). Refuses to toggle a date later than `today`: watering can
 * only be logged for today or earlier, never scheduled in advance.
 *
 * `lastWateredAt`/`previousWateredAt` are always recomputed from the two most
 * recent entries in `wateredDates`, so toggling an earlier day never
 * misrepresents it as "watered just now", and undoing the most recent date
 * correctly falls back to whichever date preceded it.
 */
export function toggleWateredDate(plant: Plant, dateStr: string, today: string = localDateString(new Date())): Plant {
  if (dateStr > today) return plant

  const alreadyWatered = plant.wateredDates.includes(dateStr)
  const wateredDates = alreadyWatered
    ? plant.wateredDates.filter((d) => d !== dateStr)
    : [...plant.wateredDates, dateStr].sort()
  const sorted = [...wateredDates].sort()
  const mostRecent = sorted[sorted.length - 1] ?? null
  const secondMostRecent = sorted[sorted.length - 2] ?? null

  let history = plant.history ?? []
  if (alreadyWatered) {
    let removed = false
    history = history.filter((h) => {
      if (!removed && h.note === 'Watered.' && localDateString(new Date(h.date)) === dateStr) {
        removed = true
        return false
      }
      return true
    })
  } else {
    history = [
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date: isoAtNoon(dateStr), note: 'Watered.', photo: plant.photo },
      ...history,
    ]
  }

  return {
    ...plant,
    wateredDates,
    isWateredToday: wateredDates.includes(today),
    lastWateredAt: mostRecent ? isoAtNoon(mostRecent) : null,
    previousWateredAt: secondMostRecent ? isoAtNoon(secondMostRecent) : null,
    history,
  }
}
