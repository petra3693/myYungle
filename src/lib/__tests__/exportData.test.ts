import { describe, it, expect } from 'vitest'
import { buildExportPayload, exportFileName, EXPORT_PHOTOS_NOTE } from '@/lib/exportData'
import type { AppSettings, Plant } from '@/types/plant'

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
    photo: 'data:image/png;base64,AAAA',
    lastWateredAt: null,
    previousWateredAt: null,
    history: [{ id: 'h1', date: '2026-08-20T00:00:00.000Z', note: 'Watered.', photo: 'data:image/png;base64,BBBB' }],
    healthLogs: [
      {
        id: 'log1',
        timestamp: '2026-08-21T00:00:00.000Z',
        photo: 'data:image/png;base64,CCCC',
        healthScore: 80,
        diagnosis: 'Fine',
        treatmentNotes: '',
        recommendedActions: [],
        analyzedByAI: true,
      },
    ],
    wateredDates: ['2026-08-20'],
    isWateredToday: false,
    isToxicToPets: null,
    ...overrides,
  }
}

function makeSettings(): AppSettings {
  return {
    hasCompletedOnboarding: true,
    onboardingCompletedAt: '2026-08-01T00:00:00.000Z',
    pushNotifications: false,
    reminderTime: '09:00',
    timezone: 'UTC',
    isPro: false,
    isFoundingMember: false,
    subscriptionPlan: null,
    subscriptionExpiresAt: null,
    subscriptionWillRenew: false,
    subscriptionManagementUrl: null,
    habitUpsellShown: false,
    lifetimeOfferLastShownAt: null,
    subscriptionPeriodType: null,
    primaryWateringDay: 0,
    groupWateringDays: true,
    healthScansUsed: 0,
    proPreviewUsedAt: null,
    proPreviewExpiredPaywallShown: false,
    proPreviewBannerDismissed: false,
    paywallDismissedCount: 0,
    lastPaywallShownAt: null,
    hasSeenReviewPrompt: false,
  }
}

describe('buildExportPayload', () => {
  it('strips photo data from the plant, its history, and its health logs', () => {
    const payload = buildExportPayload([makePlant()], makeSettings())
    const plant = payload.plants[0]
    expect(plant).not.toHaveProperty('photo')
    expect(plant.history[0]).not.toHaveProperty('photo')
    expect(plant.healthLogs[0]).not.toHaveProperty('photo')
  })

  it('keeps every non-photo field intact', () => {
    const payload = buildExportPayload([makePlant()], makeSettings())
    const plant = payload.plants[0]
    expect(plant.name).toBe('Test plant')
    expect(plant.wateredDates).toEqual(['2026-08-20'])
    expect(plant.history[0].note).toBe('Watered.')
    expect(plant.healthLogs[0].healthScore).toBe(80)
  })

  it('states clearly in the file that photos are excluded', () => {
    const payload = buildExportPayload([makePlant()], makeSettings())
    expect(payload.notePhotos).toBe(EXPORT_PHOTOS_NOTE)
    expect(payload.notePhotos.toLowerCase()).toContain('photo')
  })

  it('includes the settings object as-is', () => {
    const settings = makeSettings()
    const payload = buildExportPayload([], settings)
    expect(payload.settings).toEqual(settings)
  })
})

describe('exportFileName', () => {
  it('produces a filesystem-safe .json filename with no colons', () => {
    const name = exportFileName(new Date('2026-08-27T10:15:30.000Z'))
    expect(name).toMatch(/^myjungle-data-.*\.json$/)
    expect(name).not.toContain(':')
  })
})
