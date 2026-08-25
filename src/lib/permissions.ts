import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Camera } from '@capacitor/camera'

export type NotificationPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unavailable'

/**
 * Reports the current OS notification-permission state without prompting.
 * `'unavailable'` on web — this app has no web-push feature, so there's no
 * meaningful permission to reflect there.
 */
export async function checkNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (!Capacitor.isNativePlatform()) return 'unavailable'
  try {
    const status = await LocalNotifications.checkPermissions()
    if (status.display === 'granted') return 'granted'
    if (status.display === 'denied') return 'denied'
    return 'prompt'
  } catch (error) {
    console.error('[myJungle] checking notification permission failed:', error)
    return 'prompt'
  }
}

/**
 * Asks the OS for local-notification permission. Safe to call on every
 * notification-related interaction (bell icon, reminder toggle, notification
 * preferences) — `checkPermissions()` makes it a no-op once the user has
 * already granted or denied it, so only the very first interaction actually
 * shows the native prompt.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true
  try {
    const status = await LocalNotifications.checkPermissions()
    if (status.display === 'granted') return true
    if (status.display === 'denied') return false
    const result = await LocalNotifications.requestPermissions()
    return result.display === 'granted'
  } catch (error) {
    console.error('[myJungle] notification permission request failed:', error)
    return false
  }
}

/**
 * Asks the OS for camera permission before a camera-capture UI opens. Web has
 * no persistent camera permission for a plain file input — the browser/OS
 * handles that inline when the input is triggered — so this is a no-op there.
 */
export async function requestCameraPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true
  try {
    const status = await Camera.checkPermissions()
    if (status.camera === 'granted' || status.camera === 'limited') return true
    if (status.camera === 'denied') return false
    const result = await Camera.requestPermissions({ permissions: ['camera'] })
    return result.camera === 'granted' || result.camera === 'limited'
  } catch (error) {
    console.error('[myJungle] camera permission request failed:', error)
    // An unexpected permissions-API error shouldn't block the picker from opening.
    return true
  }
}
