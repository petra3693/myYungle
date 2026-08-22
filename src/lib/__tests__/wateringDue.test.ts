import { describe, it, expect } from 'vitest'
import { getDateForDayIndex, isPlantDueOnDay, isPlantDueToday } from '@/lib/wateringDue'
import type { Plant } from '@/types/plant'

type SchedulePlant = Pick<Plant, 'wateringDays' | 'wateringFrequency' | 'wateringCycleAnchor'>

// Anchor: Monday 2026-01-05. Each Monday below is exactly N weeks after it.
const ANCHOR_MONDAY = new Date(2026, 0, 5)
const WEEK1_WED = new Date(2026, 0, 14) // weeks-since-anchor for its own Monday: 1 (odd)
const WEEK2_WED = new Date(2026, 0, 21) // weeks-since-anchor for its own Monday: 2 (even)
const WEEK3_WED = new Date(2026, 0, 28) // weeks-since-anchor for its own Monday: 3 (odd)
const WEEK4_WED = new Date(2026, 1, 4) // weeks-since-anchor for its own Monday: 4 (divisible by 4)

function plant(overrides: Partial<SchedulePlant>): SchedulePlant {
  return {
    wateringDays: [0], // Monday
    wateringFrequency: 'weekly',
    wateringCycleAnchor: null,
    ...overrides,
  }
}

describe('isPlantDueOnDay — weekly', () => {
  it('is due on every occurrence of its scheduled day, any reference date', () => {
    const p = plant({ wateringFrequency: 'weekly' })
    expect(isPlantDueOnDay(p, 0, WEEK1_WED)).toBe(true)
    expect(isPlantDueOnDay(p, 0, WEEK2_WED)).toBe(true)
    expect(isPlantDueOnDay(p, 0, WEEK4_WED)).toBe(true)
  })

  it('is never due on an unscheduled day', () => {
    const p = plant({ wateringFrequency: 'weekly', wateringDays: [0] })
    expect(isPlantDueOnDay(p, 2, WEEK1_WED)).toBe(false)
  })
})

describe('isPlantDueOnDay — biweekly, browsing a day other than "today"', () => {
  const p = plant({ wateringFrequency: 'biweekly', wateringCycleAnchor: ANCHOR_MONDAY.toISOString() })

  it('regression: correctly evaluates an even (due) week even when the inspected day is not today', () => {
    // referenceDate is Wednesday of week 2; the inspected day (Monday, dayIdx 0) is
    // two days in the past within that same week. Before the fix, isPlantDueOnDay bailed
    // out here because getTodayDayIndex(referenceDate) !== dayIdx, always returning false
    // regardless of the real schedule.
    expect(isPlantDueOnDay(p, 0, WEEK2_WED)).toBe(true)
  })

  it('regression: correctly evaluates an odd (not due) week the same way', () => {
    expect(isPlantDueOnDay(p, 0, WEEK1_WED)).toBe(false)
    expect(isPlantDueOnDay(p, 0, WEEK3_WED)).toBe(false)
  })

  it('holds across a 4-week window', () => {
    const results = [ANCHOR_MONDAY, WEEK1_WED, WEEK2_WED, WEEK3_WED, WEEK4_WED].map((d) => isPlantDueOnDay(p, 0, d))
    expect(results).toEqual([true, false, true, false, true])
  })
})

describe('isPlantDueOnDay — monthly, browsing a day other than "today"', () => {
  const p = plant({ wateringFrequency: 'monthly', wateringCycleAnchor: ANCHOR_MONDAY.toISOString() })

  it('is only due every 4th week, evaluated against the inspected day', () => {
    const results = [ANCHOR_MONDAY, WEEK1_WED, WEEK2_WED, WEEK3_WED, WEEK4_WED].map((d) => isPlantDueOnDay(p, 0, d))
    expect(results).toEqual([true, false, false, false, true])
  })
})

describe('isPlantDueToday', () => {
  it('matches isPlantDueOnDay for the reference date\'s own day index', () => {
    const p = plant({ wateringFrequency: 'biweekly', wateringCycleAnchor: ANCHOR_MONDAY.toISOString() })
    const mondayOfWeek2 = getDateForDayIndex(0, WEEK2_WED)
    const todayIdxForThatMonday = 0
    expect(isPlantDueToday(p, todayIdxForThatMonday, mondayOfWeek2)).toBe(true)
  })
})
