import type { Plant, WateringFrequency } from '@/types/plant'

/**
 * Deliberately not translated — this is the internal (English) day-name
 * representation used only for parsing/serializing day names to/from an
 * index (see indexFromDayName / dayNamesFromIndices below), never rendered
 * to the user. Screens display days via fullDayName(t, i) instead.
 */
export const FULL_DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export function getTodayDayIndex(date = new Date()): number {
  return (date.getDay() + 6) % 7
}

export function indexFromDayName(name: string): number | null {
  const normalized = name.trim().toLowerCase()
  const idx = FULL_DAY_NAMES.findIndex((d) => d.toLowerCase() === normalized)
  return idx >= 0 ? idx : null
}

export function dayNamesFromIndices(indices: number[]): string[] {
  return indices
    .filter((i) => i >= 0 && i < FULL_DAY_NAMES.length)
    .sort((a, b) => a - b)
    .map((i) => FULL_DAY_NAMES[i])
}

export function normalizeWateringFrequency(value: unknown): WateringFrequency {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'biweekly') return 'biweekly'
  if (normalized === 'monthly') return 'monthly'
  return 'weekly'
}

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = getTodayDayIndex(d)
  d.setDate(d.getDate() - day)
  return d
}

export function weeksSinceAnchor(anchorIso: string, referenceDate: Date): number {
  const anchor = startOfWeekMonday(new Date(anchorIso))
  const ref = startOfWeekMonday(referenceDate)
  const diffMs = ref.getTime() - anchor.getTime()
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
}

export function getDateForDayIndex(dayIdx: number, referenceDate = new Date()): Date {
  const todayIdx = getTodayDayIndex(referenceDate)
  const d = new Date(referenceDate)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + (dayIdx - todayIdx))
  return d
}

export function isPlantDueOnDay(
  plant: Pick<Plant, 'wateringDays' | 'wateringFrequency' | 'wateringCycleAnchor'>,
  dayIdx: number,
  referenceDate = new Date(),
): boolean {
  if (!plant.wateringDays.includes(dayIdx)) return false

  const freq = plant.wateringFrequency ?? 'weekly'
  if (freq === 'weekly') return true

  // Evaluate the cycle against the *inspected* day's own date, not just "today" —
  // otherwise browsing forward in the week (dayIdx !== today) always came back
  // false for biweekly/monthly plants, silently hiding them from the Days screen.
  const inspectedDate = getDateForDayIndex(dayIdx, referenceDate)
  const anchor = plant.wateringCycleAnchor ?? inspectedDate.toISOString()
  const weeks = weeksSinceAnchor(anchor, inspectedDate)

  if (freq === 'biweekly') return weeks % 2 === 0
  return weeks % 4 === 0
}

export function isPlantDueToday(
  plant: Pick<Plant, 'wateringDays' | 'wateringFrequency' | 'wateringCycleAnchor'>,
  todayIdx: number,
  referenceDate = new Date(),
): boolean {
  return isPlantDueOnDay(plant, todayIdx, referenceDate)
}

export function cycleAnchorForFrequency(frequency: WateringFrequency, existing: string | null): string | null {
  if (frequency === 'weekly') return null
  return existing ?? new Date().toISOString()
}

export interface DueOnDayStatus {
  duePlants: Plant[]
  doneCount: number
  allDone: boolean
}

/**
 * Which plants are due on a given day, and how many of those have already
 * been watered on that specific date. Shared by DaysScreen (any selected
 * day) and HomeScreen (today only) so both agree on exactly what "due" and
 * "done" mean, instead of each re-deriving it.
 */
export function dueStatusForDay(
  plants: Plant[],
  dayIdx: number,
  referenceDate: Date,
  dateStr: string,
): DueOnDayStatus {
  const duePlants = plants.filter((p) => isPlantDueOnDay(p, dayIdx, referenceDate))
  const doneCount = duePlants.filter((p) => p.wateredDates.includes(dateStr)).length
  return { duePlants, doneCount, allDone: duePlants.length > 0 && doneCount === duePlants.length }
}

/**
 * Marks every not-yet-watered plant in `plantsToMark` as watered on
 * `dateStr`, via the caller's toggle function — skips plants already watered
 * that day so a repeat call can never accidentally un-mark them.
 */
export function markPlantsWatered(
  plantsToMark: Plant[],
  dateStr: string,
  toggle: (id: string, dateStr: string) => void,
): void {
  plantsToMark.forEach((p) => {
    if (!p.wateredDates.includes(dateStr)) toggle(p.id, dateStr)
  })
}
