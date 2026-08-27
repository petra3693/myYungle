import { describe, it, expect } from 'vitest'
import { localDateString, migrateWateredDates, rolloverWateredState } from '@/lib/dailyRollover'
import type { Plant } from '@/types/plant'

function makePlant(overrides: Partial<Plant> = {}): Plant {
  return {
    id: 'p1',
    name: 'Test plant',
    room: 'Unknown',
    careNote: '',
    wateringDays: [0],
    isCustomSchedule: false,
    scheduleDays: ['MON'],
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

describe('localDateString', () => {
  it('formats as zero-padded YYYY-MM-DD in local time', () => {
    expect(localDateString(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(localDateString(new Date(2026, 10, 21))).toBe('2026-11-21')
  })
})

describe('rolloverWateredState', () => {
  it('does nothing when the plant was already watered today', () => {
    const plants = [makePlant({ wateredDates: ['2026-08-21'], isWateredToday: true })]
    const result = rolloverWateredState(plants, '2026-08-21')
    expect(result.rolled).toBe(false)
    expect(result.plants).toBe(plants)
    expect(result.plants[0].isWateredToday).toBe(true)
  })

  it('clears isWateredToday at midnight for plants not watered on the new day', () => {
    const plants = [
      makePlant({ id: 'a', wateredDates: ['2026-08-21'], isWateredToday: true }),
      makePlant({ id: 'b', wateredDates: [], isWateredToday: false }),
      makePlant({ id: 'c', wateredDates: ['2026-08-21'], isWateredToday: true }),
    ]
    // The clock ticks past midnight: "today" advances from 2026-08-21 to 2026-08-22.
    const result = rolloverWateredState(plants, '2026-08-22')
    expect(result.rolled).toBe(true)
    expect(result.plants.map((p) => p.isWateredToday)).toEqual([false, false, false])
    // wateredDates history is untouched by the rollover — only the derived flag changes.
    expect(result.plants[0].wateredDates).toEqual(['2026-08-21'])
  })

  it('keeps isWateredToday true across midnight if the new day is also in wateredDates', () => {
    const plants = [makePlant({ wateredDates: ['2026-08-21', '2026-08-22'], isWateredToday: false })]
    const result = rolloverWateredState(plants, '2026-08-22')
    expect(result.rolled).toBe(true)
    expect(result.plants[0].isWateredToday).toBe(true)
  })

  it('leaves lastWateredAt and previousWateredAt untouched across a rollover', () => {
    const plants = [
      makePlant({
        wateredDates: ['2026-08-21'],
        isWateredToday: true,
        lastWateredAt: '2026-08-21T09:00:00.000Z',
        previousWateredAt: '2026-08-14T09:00:00.000Z',
      }),
    ]
    const result = rolloverWateredState(plants, '2026-08-22')
    expect(result.plants[0].lastWateredAt).toBe('2026-08-21T09:00:00.000Z')
    expect(result.plants[0].previousWateredAt).toBe('2026-08-14T09:00:00.000Z')
  })
})

describe('migrateWateredDates', () => {
  it('seeds a single entry from lastWateredAt on legacy data with no wateredDates field', () => {
    const raw = { lastWateredAt: '2026-08-20T14:30:00.000Z' }
    expect(migrateWateredDates(raw)).toEqual(['2026-08-20'])
  })

  it('returns an empty array for legacy data that was never watered', () => {
    expect(migrateWateredDates({ lastWateredAt: null })).toEqual([])
    expect(migrateWateredDates({})).toEqual([])
  })

  it('ignores an unparseable lastWateredAt instead of producing an invalid date', () => {
    expect(migrateWateredDates({ lastWateredAt: 'not-a-date' })).toEqual([])
  })

  it('passes through an existing wateredDates array de-duplicated', () => {
    const raw = { wateredDates: ['2026-08-19', '2026-08-20', '2026-08-19'] }
    expect(migrateWateredDates(raw)).toEqual(['2026-08-19', '2026-08-20'])
  })

  it('prefers an existing wateredDates array over lastWateredAt', () => {
    const raw = { wateredDates: ['2026-08-19'], lastWateredAt: '2026-08-20T14:30:00.000Z' }
    expect(migrateWateredDates(raw)).toEqual(['2026-08-19'])
  })
})
