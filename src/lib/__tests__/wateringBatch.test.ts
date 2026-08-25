import { describe, it, expect } from 'vitest'
import {
  batchedWateringDays,
  frequencyForWaterNeed,
  frequencyLabel,
  secondaryWateringDay,
  spreadWateringDays,
  wateringDaysForStrategy,
} from '@/lib/wateringBatch'

describe('secondaryWateringDay', () => {
  it('is 3 days after the primary day', () => {
    expect(secondaryWateringDay(0)).toBe(3) // Monday -> Thursday
  })

  it('wraps around the end of the week', () => {
    expect(secondaryWateringDay(5)).toBe(1) // Saturday -> Tuesday
    expect(secondaryWateringDay(6)).toBe(2) // Sunday -> Wednesday
  })
})

describe('batchedWateringDays', () => {
  it('returns a single day for Light and Moderate water need', () => {
    expect(batchedWateringDays('Light', 2)).toEqual([2])
    expect(batchedWateringDays('Moderate', 2)).toEqual([2])
  })

  it('returns primary + secondary day for Heavy water need', () => {
    expect(batchedWateringDays('Heavy', 2)).toEqual([2, 5])
  })

  it('follows a custom anchor day, not a hardcoded Monday', () => {
    expect(batchedWateringDays('Moderate', 4)).toEqual([4])
    expect(batchedWateringDays('Heavy', 4)).toEqual([4, 0])
  })
})

describe('spreadWateringDays', () => {
  it('offsets a single day by the plant\'s index for Light and Moderate water need', () => {
    expect(spreadWateringDays(0, 'Moderate', 2)).toEqual([2])
    expect(spreadWateringDays(1, 'Moderate', 2)).toEqual([3])
    expect(spreadWateringDays(3, 'Light', 2)).toEqual([5])
  })

  it('wraps the offset around the end of the week', () => {
    expect(spreadWateringDays(5, 'Moderate', 4)).toEqual([2]) // (4+5) % 7
    expect(spreadWateringDays(10, 'Moderate', 0)).toEqual([3]) // (0+10) % 7
  })

  it('still gives Heavy water need a second day, 3 days after its offset first day', () => {
    expect(spreadWateringDays(0, 'Heavy', 0)).toEqual([0, 3])
    expect(spreadWateringDays(2, 'Heavy', 0)).toEqual([2, 5])
  })

  it('returns days sorted ascending even when the second day wraps before the first', () => {
    expect(spreadWateringDays(5, 'Heavy', 0)).toEqual([1, 5]) // day1=5, day2=(5+3)%7=1
  })
})

describe('wateringDaysForStrategy', () => {
  it('delegates to batchedWateringDays when grouping into fewer days', () => {
    expect(wateringDaysForStrategy(3, 'Heavy', 2, true)).toEqual(batchedWateringDays('Heavy', 2))
    expect(wateringDaysForStrategy(3, 'Light', 2, true)).toEqual(batchedWateringDays('Light', 2))
  })

  it('delegates to spreadWateringDays when not grouping', () => {
    expect(wateringDaysForStrategy(3, 'Heavy', 2, false)).toEqual(spreadWateringDays(3, 'Heavy', 2))
    expect(wateringDaysForStrategy(3, 'Light', 2, false)).toEqual(spreadWateringDays(3, 'Light', 2))
  })
})

describe('frequencyForWaterNeed', () => {
  it('maps Light to biweekly and everything else to weekly', () => {
    expect(frequencyForWaterNeed('Light')).toBe('biweekly')
    expect(frequencyForWaterNeed('Moderate')).toBe('weekly')
    expect(frequencyForWaterNeed('Heavy')).toBe('weekly')
  })
})

describe('frequencyLabel', () => {
  it('renders weekly frequencies as an Nx/week count', () => {
    expect(frequencyLabel('weekly', 1)).toBe('1x/week')
    expect(frequencyLabel('weekly', 2)).toBe('2x/week')
  })

  it('renders biweekly and monthly as fixed labels, not arithmetic', () => {
    expect(frequencyLabel('biweekly', 1)).toBe('Every 2 weeks')
    expect(frequencyLabel('monthly', 1)).toBe('Monthly')
  })
})
