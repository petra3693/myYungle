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

/** AI water-need band → how often, independent of which day(s) it lands on. */
export function frequencyForWaterNeed(waterNeed: WaterNeed): WateringFrequency {
  return waterNeed === 'Light' ? 'biweekly' : 'weekly'
}

/** Human label for a frequency, e.g. "2x/week", "1x/week", "Every 2 weeks", "Monthly". */
export function frequencyLabel(frequency: WateringFrequency, dayCount: number): string {
  if (frequency === 'monthly') return 'Monthly'
  if (frequency === 'biweekly') return 'Every 2 weeks'
  return `${dayCount}x/week`
}
