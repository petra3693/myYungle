import { isPlantDueToday } from '@/lib/wateringDue'
import type { Plant } from '@/types/plant'

export type PlantHomeSortOptions = {
  todayIdx: number
  referenceDate?: Date
}

function compareAlphabetical(a: Plant, b: Plant): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
}

function earliestWateringDay(plant: Plant): number {
  if (plant.wateringDays.length === 0) return 7
  return Math.min(...plant.wateringDays)
}

/** Secondary order within unwatered or watered groups. */
function compareWithinWateringGroup(
  a: Plant,
  b: Plant,
  todayIdx: number,
  referenceDate: Date,
): number {
  const aDueToday = isPlantDueToday(a, todayIdx, referenceDate) ? 0 : 1
  const bDueToday = isPlantDueToday(b, todayIdx, referenceDate) ? 0 : 1
  if (aDueToday !== bDueToday) return aDueToday - bDueToday

  const aDay = earliestWateringDay(a)
  const bDay = earliestWateringDay(b)
  if (aDay !== bDay) return aDay - bDay

  return compareAlphabetical(a, b)
}

/**
 * Home list order: unwatered first, watered last.
 * Within each group: due today → earliest schedule day → name (A–Z).
 * Returns a new array — never mutates the input.
 */
export function sortPlantsForHomeList(
  plants: readonly Plant[],
  options: PlantHomeSortOptions,
): Plant[] {
  const { todayIdx, referenceDate = new Date() } = options
  return [...plants].sort((a, b) => {
    const aWatered = a.isWateredToday ? 1 : 0
    const bWatered = b.isWateredToday ? 1 : 0
    if (aWatered !== bWatered) return aWatered - bWatered
    return compareWithinWateringGroup(a, b, todayIdx, referenceDate)
  })
}
