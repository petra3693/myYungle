import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Plant } from '@/types/plant'

const mockLocalNotifications = {
  checkPermissions: vi.fn(),
  createChannel: vi.fn(),
  cancel: vi.fn(),
  schedule: vi.fn(),
}

const mockCapacitor = {
  isNativePlatform: vi.fn(() => true),
  getPlatform: vi.fn(() => 'ios'),
}

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: mockLocalNotifications,
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: mockCapacitor,
}))

const { daysNeedingReminder, plantsDueOnWeekday, buildReminderBody, syncWateringNotifications } = await import(
  '@/lib/notifications'
)
const { default: i18n } = await import('@/i18n/i18n')

function fakePlant(overrides: Partial<Plant> & Pick<Plant, 'name' | 'wateringDays'>): Plant {
  return {
    id: overrides.name,
    room: 'Living room',
    careNote: '',
    isCustomSchedule: false,
    scheduleDays: [],
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

describe('daysNeedingReminder', () => {
  it('returns every weekday that has at least one plant scheduled on it', () => {
    const plants = [fakePlant({ name: 'A', wateringDays: [0, 3] }), fakePlant({ name: 'B', wateringDays: [3, 6] })]
    expect(daysNeedingReminder(plants)).toEqual([0, 3, 6])
  })

  it('returns an empty array when no plants are scheduled', () => {
    expect(daysNeedingReminder([])).toEqual([])
  })

  it('deduplicates and sorts regardless of input order', () => {
    const plants = [fakePlant({ name: 'A', wateringDays: [5] }), fakePlant({ name: 'B', wateringDays: [1] }), fakePlant({ name: 'C', wateringDays: [5] })]
    expect(daysNeedingReminder(plants)).toEqual([1, 5])
  })
})

describe('plantsDueOnWeekday', () => {
  it('filters to only plants scheduled on the given day', () => {
    const monstera = fakePlant({ name: 'Monstera', wateringDays: [0, 3] })
    const cactus = fakePlant({ name: 'Cactus', wateringDays: [3] })
    expect(plantsDueOnWeekday([monstera, cactus], 0)).toEqual([monstera])
    expect(plantsDueOnWeekday([monstera, cactus], 3)).toEqual([monstera, cactus])
  })

  it('returns an empty array when nothing is due that day', () => {
    const plants = [fakePlant({ name: 'Monstera', wateringDays: [0] })]
    expect(plantsDueOnWeekday(plants, 4)).toEqual([])
  })
})

describe('buildReminderBody', () => {
  const t = i18n.getFixedT('en')

  it('names the plant when exactly one is due', () => {
    expect(buildReminderBody(t, [{ name: 'Monstera' }])).toBe("Today is Monstera's watering day")
  })

  it('uses a count when multiple plants are due', () => {
    expect(buildReminderBody(t, [{ name: 'Monstera' }, { name: 'Cactus' }, { name: 'Fern' }])).toBe(
      'Today is a watering day for 3 plants',
    )
  })
})

describe('syncWateringNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCapacitor.isNativePlatform.mockReturnValue(true)
    mockCapacitor.getPlatform.mockReturnValue('ios')
    mockLocalNotifications.checkPermissions.mockResolvedValue({ display: 'granted' })
    mockLocalNotifications.cancel.mockResolvedValue(undefined)
    mockLocalNotifications.schedule.mockResolvedValue({ notifications: [] })
    mockLocalNotifications.createChannel.mockResolvedValue(undefined)
  })

  it('does nothing on a non-native platform', async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(false)
    await syncWateringNotifications([], { pushNotifications: true, reminderTime: '09:00' })
    expect(mockLocalNotifications.cancel).not.toHaveBeenCalled()
    expect(mockLocalNotifications.schedule).not.toHaveBeenCalled()
  })

  it('always cancels its 7 reserved notification IDs first', async () => {
    await syncWateringNotifications([], { pushNotifications: false, reminderTime: '09:00' })
    expect(mockLocalNotifications.cancel).toHaveBeenCalledTimes(1)
    const [{ notifications }] = mockLocalNotifications.cancel.mock.calls[0]
    expect(notifications.map((n: { id: number }) => n.id)).toEqual([5100, 5101, 5102, 5103, 5104, 5105, 5106])
  })

  it('schedules nothing and stops after cancel when push notifications are off', async () => {
    await syncWateringNotifications([fakePlant({ name: 'Monstera', wateringDays: [0] })], {
      pushNotifications: false,
      reminderTime: '09:00',
    })
    expect(mockLocalNotifications.schedule).not.toHaveBeenCalled()
  })

  it('schedules nothing when the OS permission is not granted', async () => {
    mockLocalNotifications.checkPermissions.mockResolvedValue({ display: 'denied' })
    await syncWateringNotifications([fakePlant({ name: 'Monstera', wateringDays: [0] })], {
      pushNotifications: true,
      reminderTime: '09:00',
    })
    expect(mockLocalNotifications.cancel).toHaveBeenCalled()
    expect(mockLocalNotifications.schedule).not.toHaveBeenCalled()
  })

  it('schedules one weekly-repeating notification per day that has a due plant', async () => {
    const monstera = fakePlant({ name: 'Monstera', wateringDays: [0] })
    const cactus = fakePlant({ name: 'Cactus', wateringDays: [2] })
    const fern = fakePlant({ name: 'Fern', wateringDays: [2] })
    await syncWateringNotifications([monstera, cactus, fern], { pushNotifications: true, reminderTime: '08:30' })

    expect(mockLocalNotifications.schedule).toHaveBeenCalledTimes(1)
    const [{ notifications }] = mockLocalNotifications.schedule.mock.calls[0]
    expect(notifications).toHaveLength(2)

    const monday = notifications.find((n: { id: number }) => n.id === 5100)
    expect(monday.body).toBe("Today is Monstera's watering day")
    expect(monday.schedule).toEqual({ on: { weekday: 2, hour: 8, minute: 30 }, repeats: true, allowWhileIdle: true })

    const wednesday = notifications.find((n: { id: number }) => n.id === 5102)
    expect(wednesday.body).toBe('Today is a watering day for 2 plants')
    expect(wednesday.schedule.on.weekday).toBe(4)
  })

  it('creates the Android channel before scheduling on Android, but not on iOS', async () => {
    const plants = [fakePlant({ name: 'Monstera', wateringDays: [0] })]

    await syncWateringNotifications(plants, { pushNotifications: true, reminderTime: '09:00' })
    expect(mockLocalNotifications.createChannel).not.toHaveBeenCalled()

    mockCapacitor.getPlatform.mockReturnValue('android')
    await syncWateringNotifications(plants, { pushNotifications: true, reminderTime: '09:00' })
    expect(mockLocalNotifications.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'watering', importance: 3 }),
    )
  })

  it('schedules nothing when no plant is due on any day', async () => {
    await syncWateringNotifications([], { pushNotifications: true, reminderTime: '09:00' })
    expect(mockLocalNotifications.schedule).not.toHaveBeenCalled()
  })
})
