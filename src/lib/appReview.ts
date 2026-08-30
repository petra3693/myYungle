import { ANDROID_PACKAGE_ID, APP_STORE_ID } from '@/screens/shared/constants'
import { Capacitor } from '@capacitor/core'

/**
 * Opens the platform store's review page — the App Store "write a review"
 * deep link on iOS, and the Play Store listing on Android and on web/dev
 * preview (Play has no separate write-review deep link, and web has no store
 * at all, but this keeps the flow exercisable end to end). There is no native
 * in-app review plugin wired up here, so this always leaves the app for the
 * store rather than showing an OS-native rating sheet.
 *
 * Returns whether it actually opened something — false only on iOS while
 * APP_STORE_ID is still the empty placeholder, so the caller can show the
 * user a real message instead of the button silently doing nothing.
 */
export function openStoreReviewPage(): boolean {
  if (Capacitor.getPlatform() === 'ios') {
    if (!APP_STORE_ID) {
      console.warn(
        '[myJungle] openStoreReviewPage: APP_STORE_ID is empty — set it in screens/shared/constants.ts once myJungle has an App Store listing.',
      )
      return false
    }
    window.open(`https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review`, '_blank')
    return true
  }
  window.open(`https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_ID}`, '_blank')
  return true
}
