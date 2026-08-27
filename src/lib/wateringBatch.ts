import type { WateringFrequency, WaterNeed } from '@/types/plant'

/**
 * Batching: instead of scattering each plant's watering day across the week,
 * every plant shares one user-chosen primary day, and heavy drinkers get a
 * fixed second day 3 days later. Keeps watering consolidated onto as few
 * days as possible while still respecting the user's chosen anchor day.
 */
export function secondaryWateringDay(primaryDay: number): number {
  return (primaryDay + 3) % 7
}

export function batchedWateringDays(waterNeed: WaterNeed, primaryDay: number): number[] {
  return waterNeed === 'Heavy' ? [primaryDay, secondaryWateringDay(primaryDay)] : [primaryDay]
}

/**
 * Alternate strategy to batchedWateringDays: instead of stacking every plant
 * onto the same primary (+secondary) day, offsets each plant's day by its
 * position in the list so plants land round-robin across the week. Heavy
 * drinkers still get a second day, 3 days after their first. Used when the
 * user turns off "group into fewer days" in the watering schedule settings.
 */
export function spreadWateringDays(index: number, waterNeed: WaterNeed, primaryDay: number): number[] {
  const day1 = (primaryDay + index) % 7
  if (waterNeed !== 'Heavy') return [day1]
  const day2 = (day1 + 3) % 7
  return [day1, day2].sort((a, b) => a - b)
}

/** Picks batchedWateringDays or spreadWateringDays per the user's grouping preference. */
export function wateringDaysForStrategy(
  index: number,
  waterNeed: WaterNeed,
  primaryDay: number,
  groupIntoFewerDays: boolean,
): number[] {
  return groupIntoFewerDays ? batchedWateringDays(waterNeed, primaryDay) : spreadWateringDays(index, waterNeed, primaryDay)
}

/** AI water-need band → how often, independent of which day(s) it lands on. */
export function frequencyForWaterNeed(waterNeed: WaterNeed): WateringFrequency {
  return waterNeed === 'Light' ? 'biweekly' : 'weekly'
}

/** Human label for a frequency, e.g. "2x/week", "1x/week", "Every 2 weeks", "Monthly". */
export function frequencyLabel(frequency: WateringFrequency, dayCount: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (frequency === 'monthly') return t('common.frequencyMonthly')
  if (frequency === 'biweekly') return t('common.frequencyBiweekly')
  return t('common.frequencyWeekly', { count: dayCount })
}
