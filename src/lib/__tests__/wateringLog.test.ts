import { describe, it, expect } from 'vitest'
import { toggleWateredDate } from '@/lib/wateringLog'
import type { Plant } from '@/types/plant'

function makePlant(overrides: Partial<Plant> = {}): Plant {
  return {
    id: 'p1',
    name: 'Test plant',
    room: 'Unknown',
    careNote: '',
    wateringDays: [0, 1, 2, 3, 4],
    isCustomSchedule: false,
    scheduleDays: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    wateringFrequency: 'weekly',
    wateringCycleAnchor: null,
    waterNeed: 'Moderate',
    lightNeed: 'Medium',
    photo: '',
    lastWateredAt: null,
    previousWateredAt: null,
    history: [],
    healthLogs: [],
    wateredDates: [],
    isWateredToday: false,
    isToxicToPets: null,
    ...overrides,
  }
}

describe('toggleWateredDate — checking off a past day', () => {
  it('records the watering under the selected day, not today', () => {
    // Today is Wednesday 2026-08-26; the user checks off Monday 2026-08-24 on the Days screen.
    const plant = makePlant()
    const result = toggleWateredDate(plant, '2026-08-24', '2026-08-26')

    expect(result.wateredDates).toEqual(['2026-08-24'])
    // Watering Monday must not make "today" (Wednesday) look watered.
    expect(result.isWateredToday).toBe(false)
    expect(result.lastWateredAt).toBe(new Date('2026-08-24T12:00:00').toISOString())
  })

  it('adds a "Watered." history entry dated on the selected day', () => {
    const plant = makePlant()
    const result = toggleWateredDate(plant, '2026-08-24', '2026-08-26')

    expect(result.history).toHaveLength(1)
    expect(result.history[0].note).toBe('Watered.')
    expect(result.history[0].date).toBe(new Date('2026-08-24T12:00:00').toISOString())
  })

  it('un-checking a past day removes it and its history entry', () => {
    const watered = toggleWateredDate(makePlant(), '2026-08-24', '2026-08-26')
    const undone = toggleWateredDate(watered, '2026-08-24', '2026-08-26')

    expect(undone.wateredDates).toEqual([])
    expect(undone.history).toEqual([])
    expect(undone.lastWateredAt).toBeNull()
  })

  it('falls back to the next most recent date when undoing the latest one', () => {
    const plant = makePlant({ wateredDates: ['2026-08-17', '2026-08-24'] })
    const result = toggleWateredDate(plant, '2026-08-24', '2026-08-26')

    expect(result.wateredDates).toEqual(['2026-08-17'])
    expect(result.lastWateredAt).toBe(new Date('2026-08-17T12:00:00').toISOString())
    expect(result.previousWateredAt).toBeNull()
  })

  it('checking off today still marks isWateredToday true', () => {
    const plant = makePlant()
    const result = toggleWateredDate(plant, '2026-08-26', '2026-08-26')
    expect(result.isWateredToday).toBe(true)
  })
})

describe('toggleWateredDate — future days are rejected', () => {
  it('is a no-op when the date is after today', () => {
    const plant = makePlant()
    const result = toggleWateredDate(plant, '2026-08-28', '2026-08-26')

    expect(result).toBe(plant)
    expect(result.wateredDates).toEqual([])
    expect(result.isWateredToday).toBe(false)
  })

  it('does not add a history entry for a rejected future date', () => {
    const plant = makePlant()
    const result = toggleWateredDate(plant, '2026-08-28', '2026-08-26')
    expect(result.history).toEqual([])
  })
})
