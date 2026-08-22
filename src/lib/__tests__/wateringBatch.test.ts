import { describe, it, expect } from 'vitest'
import { batchedWateringDays, frequencyForWaterNeed, frequencyLabel, secondaryWateringDay } from '@/lib/wateringBatch'

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
