import { describe, it, expect } from 'vitest'
import { localDateString, rolloverWateredState } from '@/lib/dailyRollover'
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
  it('does nothing when the stored date matches today', () => {
    const plants = [makePlant({ isWateredToday: true })]
    const result = rolloverWateredState(plants, '2026-08-21', '2026-08-21')
    expect(result.rolled).toBe(false)
    expect(result.plants).toBe(plants)
    expect(result.plants[0].isWateredToday).toBe(true)
  })

  it('clears isWateredToday on every plant when the date has advanced', () => {
    const plants = [
      makePlant({ id: 'a', isWateredToday: true }),
      makePlant({ id: 'b', isWateredToday: false }),
      makePlant({ id: 'c', isWateredToday: true }),
    ]
    const result = rolloverWateredState(plants, '2026-08-21', '2026-08-22')
    expect(result.rolled).toBe(true)
    expect(result.plants.map((p) => p.isWateredToday)).toEqual([false, false, false])
  })

  it('rolls over on first run too, when there is no stored date yet', () => {
    const plants = [makePlant({ isWateredToday: true })]
    const result = rolloverWateredState(plants, null, '2026-08-22')
    expect(result.rolled).toBe(true)
    expect(result.plants[0].isWateredToday).toBe(false)
  })

  it('leaves lastWateredAt and previousWateredAt untouched across a rollover', () => {
    const plants = [
      makePlant({
        isWateredToday: true,
        lastWateredAt: '2026-08-21T09:00:00.000Z',
        previousWateredAt: '2026-08-14T09:00:00.000Z',
      }),
    ]
    const result = rolloverWateredState(plants, '2026-08-21', '2026-08-22')
    expect(result.plants[0].lastWateredAt).toBe('2026-08-21T09:00:00.000Z')
    expect(result.plants[0].previousWateredAt).toBe('2026-08-14T09:00:00.000Z')
  })
})
