import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import i18n from '@/i18n/i18n'
import { LANGUAGE_STORAGE_KEY, normalizeAppLanguage } from '@/i18n/languages'
import type { AppSettings, Plant } from '@/types/plant'

/**
 * One reserved local-notification ID per weekday (0 = Monday .. 6 = Sunday).
 * syncWateringNotifications always cancels exactly these 7 IDs before
 * rescheduling, so it only ever touches notifications it created itself.
 */
const WATERING_NOTIFICATION_BASE_ID = 5100
const WATERING_CHANNEL_ID = 'watering'
const ALL_WEEKDAY_INDICES = [0, 1, 2, 3, 4, 5, 6] as const

function notificationIdForDay(dayIdx: number): number {
  return WATERING_NOTIFICATION_BASE_ID + dayIdx
}

/** App day index is 0=Monday..6=Sunday; Capacitor's Weekday enum is 1=Sunday..7=Saturday. */
function toCapacitorWeekday(dayIdx: number): number {
  return ((dayIdx + 1) % 7) + 1
}

/** Which weekdays (0=Monday..6=Sunday) have at least one plant nominally scheduled for them. */
export function daysNeedingReminder(plants: Pick<Plant, 'wateringDays'>[]): number[] {
  return ALL_WEEKDAY_INDICES.filter((dayIdx) => plants.some((p) => p.wateringDays.includes(dayIdx)))
}

/** Plants nominally scheduled to be watered on the given weekday. */
export function plantsDueOnWeekday<T extends Pick<Plant, 'wateringDays'>>(plants: T[], dayIdx: number): T[] {
  return plants.filter((p) => p.wateringDays.includes(dayIdx))
}

/**
 * Localized reminder body for one day's due plants — the plant's own name
 * when there's exactly one, otherwise a count. Relies on the same `_one`/
 * `_other` i18next pluralization every other count-driven string in this
 * app uses, so passing `name` alongside `count: 1` only surfaces in the
 * `_one` variant's interpolation.
 */
export function buildReminderBody(
  t: (key: string, opts?: Record<string, unknown>) => string,
  duePlants: Pick<Plant, 'name'>[],
): string {
  if (duePlants.length === 1) {
    return t('notifications.reminderBody', { count: 1, name: duePlants[0]!.name })
  }
  return t('notifications.reminderBody', { count: duePlants.length })
}

function loadStoredLanguage(): string {
  try {
    return normalizeAppLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY))
  } catch {
    return 'en'
  }
}

async function ensureAndroidChannel(t: (key: string) => string): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return
  try {
    await LocalNotifications.createChannel({
      id: WATERING_CHANNEL_ID,
      name: t('notifications.channelName'),
      importance: 3, // IMPORTANCE_DEFAULT
    })
  } catch (error) {
    console.error('[myJungle] failed to create the watering notification channel:', error)
  }
}

async function cancelAllWateringNotifications(): Promise<void> {
  try {
    await LocalNotifications.cancel({
      notifications: ALL_WEEKDAY_INDICES.map((dayIdx) => ({ id: notificationIdForDay(dayIdx) })),
    })
  } catch (error) {
    console.error('[myJungle] failed to cancel watering notifications:', error)
  }
}

/**
 * Clears every watering reminder this app has scheduled, then — if
 * notifications are enabled and the OS permission is granted — schedules one
 * weekly-repeating reminder per weekday that has at least one plant due,
 * at `settings.reminderTime`. Safe to call as often as needed (plant list
 * changes, settings changes, app foreground) — cancel-then-reschedule makes
 * every call idempotent for the current state.
 */
export async function syncWateringNotifications(
  plants: Plant[],
  settings: Pick<AppSettings, 'pushNotifications' | 'reminderTime'>,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  await cancelAllWateringNotifications()

  if (!settings.pushNotifications) return

  let permissionGranted: boolean
  try {
    const status = await LocalNotifications.checkPermissions()
    permissionGranted = status.display === 'granted'
  } catch (error) {
    console.error('[myJungle] failed to check notification permission:', error)
    return
  }
  if (!permissionGranted) return

  const [hourStr, minuteStr] = settings.reminderTime.split(':')
  const hour = Number(hourStr)
  const minute = Number(minuteStr)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    console.error('[myJungle] invalid reminderTime, skipping notification schedule:', settings.reminderTime)
    return
  }

  const days = daysNeedingReminder(plants)
  if (days.length === 0) return

  const t = i18n.getFixedT(loadStoredLanguage())
  await ensureAndroidChannel(t)

  const notifications = days.map((dayIdx) => ({
    id: notificationIdForDay(dayIdx),
    title: t('notifications.reminderTitle'),
    body: buildReminderBody(t, plantsDueOnWeekday(plants, dayIdx)),
    channelId: WATERING_CHANNEL_ID,
    schedule: {
      on: { weekday: toCapacitorWeekday(dayIdx), hour, minute },
      repeats: true,
      allowWhileIdle: true,
    },
  }))

  try {
    await LocalNotifications.schedule({ notifications })
  } catch (error) {
    console.error('[myJungle] failed to schedule watering notifications:', error)
  }
}

/** The device's real IANA timezone — replaces the hardcoded 'UTC' default once available. */
export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}
