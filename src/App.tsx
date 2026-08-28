import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n/i18n'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { Purchases, LOG_LEVEL, type CustomerInfo, type PurchasesOffering } from '@revenuecat/purchases-capacitor'
import { mapLightNeedToForm } from '@/lib/analyzePlant'
import type { AnalyzePlantHealthResult } from '@/lib/analyzePlantHealth'
import type { AnalyzePlantGrowthResult } from '@/lib/analyzePlantGrowth'
import { dueStatusForDay, getTodayDayIndex, isPlantDueToday, markPlantsWatered } from '@/lib/wateringDue'
import { loadPlantsFromStorageAsync, savePlantsToStorage } from '@/lib/plantStorage'
import { isNativeStorage, migrateLocalStorageToNative, writeNativeSettings } from '@/lib/nativeStorage'
import { localDateString, migrateWateredDates, rolloverWateredState } from '@/lib/dailyRollover'
import { toggleWateredDate } from '@/lib/wateringLog'
import { frequencyForWaterNeed, secondaryWateringDay, wateringDaysForStrategy } from '@/lib/wateringBatch'
import { clearAllPhotos, deletePlantPhotos } from '@/lib/photoStore'
import { exportUserData, type ExportResult } from '@/lib/exportData'
import { requestCameraPermission, requestNotificationPermission, type NotificationPermissionStatus } from '@/lib/permissions'
import { FREE_PLANT_LIMIT, FREE_HEALTH_SCANS, ENTITLEMENT_PRO, PRODUCT_ANNUAL, PRODUCT_MONTHLY, PRODUCT_LIFETIME, PROMOTIONAL_STORE, canAddMorePlants, canStartHealthScan, isFoundingMember, canShowLifetimeOffer, canShowHabitUpsellCard, trialLengthFromIntroPrice, paywallCopyForSource, type PaywallSource } from '@/lib/monetization'
import { requestProPreview } from '@/lib/revenueCatPreview'
import { logEvent } from '@/lib/analytics'
import { LEGAL_TITLE_KEYS, type LegalDoc } from '@/legal/legalContent'
import { getDeviceTimezone, syncWateringNotifications } from '@/lib/notifications'
import { CameraSource } from '@/lib/cameraCapture'
import { useUserState } from '@/hooks/useUserState'
import { LANGUAGE_STORAGE_KEY, type AppLanguage } from '@/i18n/languages'
import type { AppSettings, DayCode, LightNeed, Plant, PlantHealthLog, WaterNeed } from '@/types/plant'
import type { Screen, Tab, DraftPlant, BatchReviewRow, CapturedPhoto, SelectablePlan } from '@/types/screens'
import { GREEN, DAYS, DEFAULT_SETTINGS } from '@/screens/shared/constants'
import { normalizePlant, loadPlants, savePlants, loadSettings, loadSettingsAsync, saveSettings, loadLanguage, saveLanguage, plantHistory } from '@/screens/shared/storage'
import { todayISO, withMinDelay, identifyPhoto } from '@/screens/shared/helpers'
import { AiThinkingScreen, TabBar } from '@/screens/shared/ui'
import { LanguagePickerSheet, NotificationSettingsSheet, WateringScheduleSettingsSheet, LimitReachedSheet, ResetDataSheet } from '@/screens/shared/sheets'
import SplashScreen from '@/screens/SplashScreen'
import OnboardingWelcome from '@/screens/OnboardingWelcome'
import BatchCaptureScreen from '@/screens/BatchCaptureScreen'
import BatchReviewScreen from '@/screens/BatchReviewScreen'
import HomeScreen from '@/screens/HomeScreen'
import DaysScreen from '@/screens/DaysScreen'
import PlantDetailScreen from '@/screens/PlantDetailScreen'
import EditPlantScreen from '@/screens/EditPlantScreen'
import ManualAddScreen from '@/screens/ManualAddScreen'
import HealthHubScreen from '@/screens/HealthHubScreen'
import HealthCheckFlowScreen from '@/screens/HealthCheckFlowScreen'
import GrowthCheckScreen from '@/screens/GrowthCheckScreen'
import GrowthHistoryScreen from '@/screens/GrowthHistoryScreen'
import ProfileScreen from '@/screens/ProfileScreen'
import LegalScreen from '@/screens/LegalScreen'
import ProUnlockScreen from '@/screens/ProUnlockScreen'
import LifetimeOfferScreen from '@/screens/LifetimeOfferScreen'

// ─── Root App ─────────────────────────────────────────────────────────────────

/**
 * Extracts the fields that actually explain a RevenueCat SDK failure —
 * `code`/`readableErrorCode` (which of PURCHASES_ERROR_CODE this is) and
 * `underlyingErrorMessage` (the raw StoreKit/Play Billing error underneath,
 * e.g. "Cannot connect to iTunes Store" or a product-ID-not-found error) —
 * so a console.error of just the bare Error object doesn't bury the one
 * detail that says *why* offerings/customer info failed to load.
 */
function describeRevenueCatError(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as {
      code?: unknown
      message?: unknown
      underlyingErrorMessage?: unknown
      userInfo?: { readableErrorCode?: unknown }
    }
    const parts: string[] = []
    if (e.userInfo?.readableErrorCode) parts.push(`code=${e.userInfo.readableErrorCode}`)
    else if (e.code !== undefined) parts.push(`code=${e.code}`)
    if (typeof e.message === 'string' && e.message.trim()) parts.push(`message="${e.message.trim()}"`)
    if (typeof e.underlyingErrorMessage === 'string' && e.underlyingErrorMessage.trim()) {
      parts.push(`underlying="${e.underlyingErrorMessage.trim()}"`)
    }
    if (parts.length > 0) return parts.join(', ')
  }
  return error instanceof Error ? error.message : String(error)
}

export default function App() {
  const { t } = useTranslation()
  const [screen, setScreen] = useState<Screen>('splash')
  const [tab, setTab] = useState<Tab>('home')
  const [plants, setPlants] = useState<Plant[]>(loadPlants)
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  // Web already has real data synchronously (above) — only native waits on the
  // async Filesystem read. The splash screen holds until this is true so it
  // never flashes onboarding/main before the real settings have loaded.
  const [nativeStorageLoaded, setNativeStorageLoaded] = useState(!isNativeStorage())
  const [splashTimerDone, setSplashTimerDone] = useState(false)
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [showLimitSheet, setShowLimitSheet] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [aiThinkingLabel, setAiThinkingLabel] = useState<string | null>(null)
  const [healthFlowConfig, setHealthFlowConfig] = useState<{ mode: 'new' | 'existing'; presetPlant: Plant | null } | null>(null)
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null)
  const [growthFlowPlant, setGrowthFlowPlant] = useState<Plant | null>(null)
  const [batchReview, setBatchReview] = useState<{ rows: BatchReviewRow[]; source: 'onboarding' | 'bulk' } | null>(null)
  const [language, setLanguage] = useState<AppLanguage>(loadLanguage)
  const [showLanguagePicker, setShowLanguagePicker] = useState(false)
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)
  const [showScheduleSettings, setShowScheduleSettings] = useState(false)
  const [paywallSource, setPaywallSource] = useState<PaywallSource | null>(null)
  const [offering, setOffering] = useState<PurchasesOffering | null>(null)
  const [offeringsStatus, setOfferingsStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const user = useUserState(settings)
  const todayIdx = getTodayDayIndex()
  const wateringCount = useMemo(() => plants.reduce((n, p) => n + plantHistory(p).filter((h) => h.note === 'Watered.').length, 0), [plants])
  // Only one Home promo surface at a time — Pro Preview takes priority over the habit card.
  const showProPreviewBanner = !user.isPro && !settings.proPreviewUsedAt && !settings.proPreviewBannerDismissed
  const showHabitCard = !showProPreviewBanner && !user.isPro && canShowHabitUpsellCard({
    alreadyShown: settings.habitUpsellShown,
    onboardingCompletedAt: settings.onboardingCompletedAt,
    wateringCount,
  })

  function openPaywall(sourceId: PaywallSource) {
    setPaywallSource(sourceId)
    setScreen('proUnlock')
  }

  function handleClosePaywall() {
    logEvent('paywall_dismissed', { source: paywallSource ?? undefined })
    const now = new Date()
    const dismissedCount = settings.paywallDismissedCount + 1
    const shouldShowLifetimeOffer = canShowLifetimeOffer({
      lastShownIso: settings.lifetimeOfferLastShownAt,
      paywallDismissedCount: dismissedCount,
      lastPaywallShownAt: settings.lastPaywallShownAt,
      now,
    })
    setSettings((s) => ({
      ...s,
      paywallDismissedCount: dismissedCount,
      lastPaywallShownAt: now.toISOString(),
      ...(shouldShowLifetimeOffer ? { lifetimeOfferLastShownAt: now.toISOString() } : {}),
    }))
    if (shouldShowLifetimeOffer) {
      setScreen('lifetimeOffer')
    } else {
      setScreen('main')
    }
  }

  /**
   * Reconciles local settings against RevenueCat's CustomerInfo. Founding-member
   * status (§0) is sticky once set — a later RevenueCat response can never remove
   * it — so a temporary outage can never lock a legacy buyer out of Pro.
   */
  function reconcileCustomerInfo(customerInfo: CustomerInfo) {
    setSettings((s) => {
      const founding = isFoundingMember({
        purchasedProductIdentifiers: customerInfo.allPurchasedProductIdentifiers,
        previousIsPro: s.isPro,
        alreadyFlaggedFoundingMember: s.isFoundingMember,
      })
      const entitlement = customerInfo.entitlements.active[ENTITLEMENT_PRO]
      const plan = founding
        ? 'legacy' as const
        : entitlement?.store === PROMOTIONAL_STORE
          ? 'preview' as const
          : entitlement?.productIdentifier === PRODUCT_LIFETIME
            ? 'lifetime' as const
            : entitlement?.productIdentifier === PRODUCT_ANNUAL
              ? 'annual' as const
              : entitlement?.productIdentifier === PRODUCT_MONTHLY
                ? 'monthly' as const
                : null
      const periodType = entitlement?.periodType ?? null
      // Trial conversion/cancellation only has a visible "moment" as a periodType
      // transition across boots — there's no client-side event for it otherwise.
      if (s.subscriptionPeriodType === 'TRIAL' && entitlement?.isActive && periodType === 'NORMAL') {
        logEvent('trial_converted', { plan_selected: plan ?? undefined })
      } else if (s.subscriptionPeriodType === 'TRIAL' && entitlement?.isActive !== true) {
        logEvent('trial_cancelled', {})
      }
      return {
        ...s,
        isFoundingMember: founding,
        isPro: founding || entitlement?.isActive === true,
        subscriptionPlan: plan,
        subscriptionExpiresAt: entitlement?.expirationDate ?? null,
        subscriptionWillRenew: entitlement?.willRenew ?? false,
        subscriptionManagementUrl: customerInfo.managementURL ?? null,
        subscriptionPeriodType: periodType,
      }
    })
  }

  /** Fetches offerings; exposed (not just used at boot) so the paywall can offer a "Retry" after a network failure. */
  async function fetchOfferings() {
    setOfferingsStatus('loading')
    try {
      const offerings = await Purchases.getOfferings()
      if (!offerings.current) {
        console.error(
          '[myJungle] getOfferings() succeeded but returned no current offering — check that a "current" offering is configured and has packages attached in the RevenueCat dashboard.',
        )
      } else {
        // getOfferings() succeeding is not the same as the packages this app
        // actually needs being present — .monthly/.annual/.lifetime only
        // populate for RC's *predefined* package identifiers, so a package
        // added under a custom identifier in the dashboard is real and
        // purchasable (see resolvePackage() in lib/monetization.ts) but
        // invisible here. Logging exactly what RevenueCat did return — every
        // package's own identifier and underlying product ID — is the
        // fastest way to tell "nothing configured" apart from "configured,
        // just not the way this app expects" on a TestFlight build where
        // there's no debugger attached, only the device console.
        const missing = [
          !offerings.current.monthly && PRODUCT_MONTHLY,
          !offerings.current.annual && PRODUCT_ANNUAL,
          !offerings.current.lifetime && PRODUCT_LIFETIME,
        ].filter((v): v is string => Boolean(v))
        if (missing.length > 0) {
          const found = offerings.current.availablePackages
            .map((pkg) => `${pkg.identifier} -> ${pkg.product.identifier} (${pkg.product.priceString})`)
            .join(', ')
          console.error(
            `[myJungle] Offering "${offerings.current.identifier}" has no typed package for: ${missing.join(', ')}. ` +
              `Its availablePackages: [${found || 'none'}]. If a product ID above matches one of the missing ones, ` +
              `the RevenueCat dashboard package isn't using RC's predefined identifier ($rc_monthly/$rc_annual/$rc_lifetime) ` +
              `— the app falls back to matching by product ID (resolvePackage()) so this isn't fatal, but if the product ID ` +
              `is missing entirely, check that the underlying App Store Connect product is "Ready to Submit" and the Paid ` +
              `Applications Agreement is active — a TestFlight build calls the real store, unlike a StoreKit Configuration file.`,
          )
        }
      }
      setOffering(offerings.current)
      setOfferingsStatus('ready')
    } catch (error) {
      console.error(`[myJungle] getOfferings() failed: ${describeRevenueCatError(error)}`, error)
      setOfferingsStatus('unavailable')
    }
  }

  useEffect(() => {
    let listenerId: string | null = null
    let cancelled = false

    async function configurePurchases() {
      const platform = Capacitor.getPlatform()
      if (platform !== 'ios' && platform !== 'android') {
        // Native-only SDK — every method (including setLogLevel) rejects on
        // web, so nothing in this SDK is called at all in that case. Web/dev
        // preview never has real offerings to show.
        setOfferingsStatus('unavailable')
        return
      }
      const apiKey = platform === 'ios' ? import.meta.env.VITE_RC_KEY_IOS : import.meta.env.VITE_RC_KEY_ANDROID
      const envVarName = platform === 'ios' ? 'VITE_RC_KEY_IOS' : 'VITE_RC_KEY_ANDROID'
      if (!apiKey || apiKey.startsWith('test_')) {
        // Never configure the SDK with a missing or placeholder test key in a
        // real build — surface it as the paywall's existing "pricing load
        // error" state (with its Retry button) instead of a white screen.
        console.error(
          `[myJungle] RevenueCat API key for "${platform}" is missing or is a placeholder test key. Set ${envVarName} in your environment before shipping.`,
        )
        setOfferingsStatus('unavailable')
        return
      }
      // RevenueCat's public API keys are prefixed by store: "appl_" for iOS,
      // "goog_" for Android. A key with the wrong prefix for this platform —
      // easy to hit by pasting the Android key into VITE_RC_KEY_IOS, or a
      // secret/server key into either — still passes Purchases.configure()
      // without error, but every getOfferings() call afterward will fail or
      // return empty; that failure mode gives no hint the key was the cause.
      // Non-fatal on purpose: RC's own prefix scheme could change, so this is
      // a diagnostic, not a hard gate.
      const expectedPrefix = platform === 'ios' ? 'appl_' : 'goog_'
      if (!apiKey.startsWith(expectedPrefix)) {
        console.error(
          `[myJungle] ${envVarName} doesn't start with "${expectedPrefix}", the expected prefix for a RevenueCat ${platform} public API key — double-check this isn't the other platform's key or a secret key. Proceeding anyway in case RevenueCat's prefix convention differs for this account.`,
        )
      }
      try {
        await Purchases.setLogLevel({ level: import.meta.env.DEV ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR })
        await Purchases.configure({ apiKey })
      } catch (error) {
        // Without this catch, a throw here (e.g. a malformed key, or the native
        // plugin failing to link) becomes an unhandled rejection and offeringsStatus
        // stays stuck at 'loading' forever — the paywall would spin indefinitely
        // instead of ever reaching the "pricing load error" Retry state.
        console.error(`[myJungle] Purchases.configure() failed: ${describeRevenueCatError(error)}`, error)
        setOfferingsStatus('unavailable')
        return
      }
      if (cancelled) return

      // Keeps Pro status and the UI in sync in real time for anything that
      // changes entitlements outside a direct purchase/restore call in this
      // screen — renewals, cancellations, refunds, billing-issue resolution,
      // and family-shared purchases all arrive here.
      listenerId = await Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        reconcileCustomerInfo(customerInfo)
      })

      try {
        const { customerInfo } = await Purchases.getCustomerInfo()
        reconcileCustomerInfo(customerInfo)
        // The Pro Preview (reverse trial) is a promotional entitlement grant.
        // Once it's no longer active, force the full paywall exactly once, at
        // this "next open" — not on every subsequent boot.
        const everGranted = customerInfo.entitlements.all[ENTITLEMENT_PRO]
        const stillActive = customerInfo.entitlements.active[ENTITLEMENT_PRO]
        if (everGranted?.store === PROMOTIONAL_STORE && !stillActive && !settings.proPreviewExpiredPaywallShown) {
          setSettings((s) => ({ ...s, proPreviewExpiredPaywallShown: true }))
          openPaywall('preview_expired')
        }
      } catch (error) {
        console.error(`[myJungle] getCustomerInfo() failed on boot: ${describeRevenueCatError(error)}`, error)
      }
      await fetchOfferings()
    }
    void configurePurchases()
    return () => {
      cancelled = true
      if (listenerId) void Purchases.removeCustomerInfoUpdateListener({ listenerToRemove: listenerId })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    void savePlants(plants).then((result) => {
      if (cancelled) return
      if (!result.ok) setStorageError(result.error)
      else setStorageError(null)
    })
    return () => { cancelled = true }
  }, [plants])
  useEffect(() => { void saveSettings(settings) }, [settings])

  // Native-only: one-time migration off localStorage, then the real async
  // load from @capacitor/filesystem. Web already has real data synchronously
  // via the useState initializers above, so nativeStorageLoaded starts true
  // there and this effect never has anything to do.
  useEffect(() => {
    if (nativeStorageLoaded) return
    let cancelled = false
    async function loadFromNativeStorage() {
      await migrateLocalStorageToNative()
      const [loadedPlants, loadedSettings] = await Promise.all([
        loadPlantsFromStorageAsync(normalizePlant),
        loadSettingsAsync(),
      ])
      if (cancelled) return
      setPlants(loadedPlants)
      setSettings(loadedSettings)
      setNativeStorageLoaded(true)
    }
    void loadFromNativeStorage()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Leaves the splash screen once its own minimum display time is up AND real
  // storage has loaded (native only waits meaningfully here) — never earlier,
  // so it can't flash onboarding/main before settings.hasCompletedOnboarding
  // reflects the real, persisted value.
  useEffect(() => {
    if (screen === 'splash' && splashTimerDone && nativeStorageLoaded) {
      setScreen(settings.hasCompletedOnboarding ? 'main' : 'onboardingWelcome')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, splashTimerDone, nativeStorageLoaded])

  // rolloverWateredState derives isWateredToday from wateredDates and returns the
  // same array reference when nothing changed, so calling this liberally (on
  // mount, on foreground, on a midnight timer) is a cheap no-op most of the time.
  function runDailyRollover() {
    setPlants((prev) => rolloverWateredState(prev, localDateString(new Date())).plants)
  }

  useEffect(() => {
    runDailyRollover()
    function onVisible() {
      if (document.visibilityState === 'visible') runDailyRollover()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Belt-and-suspenders for an app left open across midnight: visibilitychange only
  // fires on a foreground/background transition, so a device that never sleeps
  // (or a desktop browser tab left in the foreground) would otherwise miss the
  // rollover entirely. Re-arms every 24h after the first local midnight.
  useEffect(() => {
    function msUntilNextLocalMidnight() {
      const now = new Date()
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5)
      return next.getTime() - now.getTime()
    }
    let interval: ReturnType<typeof setInterval> | null = null
    const timeout = setTimeout(() => {
      runDailyRollover()
      interval = setInterval(runDailyRollover, 24 * 60 * 60 * 1000)
    }, msUntilNextLocalMidnight())
    return () => {
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // One-time correction of the hardcoded 'UTC' default to the device's real timezone.
  useEffect(() => {
    const real = getDeviceTimezone()
    if (real && real !== settings.timezone) {
      setSettings((s) => ({ ...s, timezone: real }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-syncs scheduled watering-reminder notifications whenever the inputs that
  // affect them change. syncWateringNotifications cancels-then-reschedules every
  // call, so re-running it on unrelated settings changes is harmless.
  useEffect(() => {
    void syncWateringNotifications(plants, settings)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plants, settings.reminderTime, settings.pushNotifications, settings.primaryWateringDay, settings.groupWateringDays])

  // Also re-sync on every app foreground — the reminder text bakes in "today's"
  // due-plant count/name at schedule time, so a day boundary crossed while
  // backgrounded needs a fresh sync once the app is visible again.
  const plantsRef = useRef(plants)
  useEffect(() => { plantsRef.current = plants }, [plants])
  const settingsRef = useRef(settings)
  useEffect(() => { settingsRef.current = settings }, [settings])
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let listenerHandle: { remove: () => void } | null = null
    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        runDailyRollover()
        void syncWateringNotifications(plantsRef.current, settingsRef.current)
      }
    }).then((handle) => { listenerHandle = handle })
    return () => { listenerHandle?.remove() }
  }, [])

  useEffect(() => {
    const bg = screen === 'splash' ? GREEN : '#0D0D0D'
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', bg)
    document.documentElement.style.backgroundColor = bg
    document.body.style.backgroundColor = bg
  }, [screen])

  /**
   * Toggles whether a plant was watered on `dateStr` (a local YYYY-MM-DD date,
   * not necessarily today — the Days screen lets you check off any day of the
   * current week). See toggleWateredDate for the future-date guard and the
   * lastWateredAt/previousWateredAt recomputation.
   */
  function handleWaterToggleForDate(id: string, dateStr: string) {
    setPlants((prev) => prev.map((p) => (p.id === id ? toggleWateredDate(p, dateStr) : p)))
  }

  function handleWaterToggle(id: string) {
    handleWaterToggleForDate(id, localDateString(new Date()))
  }

  /** Home's "mark all watered today" quick action — reuses the exact same due/done logic and per-plant toggle as the Days screen. */
  function handleMarkAllWateredToday() {
    const today = localDateString(new Date())
    const { duePlants } = dueStatusForDay(plants, todayIdx, new Date(), today)
    markPlantsWatered(duePlants, today, handleWaterToggleForDate)
  }

  /**
   * Turns watering reminders on/off from any notification-related entry point
   * (bell icon, Settings toggle). Requesting permission on every call is safe —
   * requestNotificationPermission() only prompts the OS once; after that it's
   * an instant no-op that just reports the already-decided status.
   */
  async function handleToggleNotifications() {
    const next = !settings.pushNotifications
    if (!next) {
      setSettings((s) => ({ ...s, pushNotifications: false }))
      return
    }
    const granted = await requestNotificationPermission()
    setSettings((s) => ({ ...s, pushNotifications: granted }))
  }

  /** Remaps every plant still on the auto schedule (never touches isCustomSchedule ones) to the current primary day + grouping strategy. */
  function remapAutoScheduledPlants(primaryDay: number, groupIntoFewerDays: boolean) {
    setPlants((prev) => prev.map((p, i) => {
      if (p.isCustomSchedule) return p
      const days = wateringDaysForStrategy(i, p.waterNeed, primaryDay, groupIntoFewerDays)
      return { ...p, wateringDays: days, scheduleDays: days.map((d) => DAYS[d]) }
    }))
  }

  function handleChangePrimaryWateringDay(day: number) {
    setSettings((s) => ({ ...s, primaryWateringDay: day }))
    remapAutoScheduledPlants(day, settings.groupWateringDays)
  }

  function handleChangeGroupingStrategy(groupIntoFewerDays: boolean) {
    setSettings((s) => ({ ...s, groupWateringDays: groupIntoFewerDays }))
    remapAutoScheduledPlants(settings.primaryWateringDay, groupIntoFewerDays)
  }

  /** Force-reflows every plant, including ones with a hand-edited (isCustomSchedule) day — an explicit reset back to the global schedule. */
  function handleRecalculateAllSchedules() {
    setPlants((prev) => prev.map((p, i) => {
      const days = wateringDaysForStrategy(i, p.waterNeed, settings.primaryWateringDay, settings.groupWateringDays)
      return { ...p, wateringDays: days, scheduleDays: days.map((d) => DAYS[d]), isCustomSchedule: false }
    }))
  }

  function handleSaveHealthLog(plantId: string, log: PlantHealthLog) {
    setPlants((prev) => prev.map((p) => (p.id === plantId ? { ...p, healthLogs: [log, ...p.healthLogs] } : p)))
    setSettings((s) => ({ ...s, healthScansUsed: s.healthScansUsed + 1 }))
  }

  /**
   * Reverse-trial Pro Preview: 7 days of Pro, no card, once per user lifetime.
   * The server enforces the one-time rule against RevenueCat's own record —
   * this only reflects the result locally and refreshes the entitlement.
   */
  async function handleTryProPreview(): Promise<{ ok: boolean; error?: string }> {
    const platform = Capacitor.getPlatform()
    if (platform !== 'ios' && platform !== 'android') {
      return { ok: false, error: t('analysisResult.proPreviewMobileOnly') }
    }
    try {
      const { appUserID } = await Purchases.getAppUserID()
      const result = await requestProPreview(appUserID)
      if (!result.ok) return { ok: false, error: result.error }
      setSettings((s) => ({ ...s, proPreviewUsedAt: new Date().toISOString() }))
      try {
        // The entitlement was just granted server-side (RevenueCat's promotional
        // API), not through a local StoreKit/Play transaction the SDK observed
        // itself — so its cached CustomerInfo can be stale. Invalidate it first
        // so getCustomerInfo() does a real network fetch instead of returning
        // pre-grant data. (Per RevenueCat: exactly the recommended pattern for
        // "customer information updated outside the app", e.g. a dashboard-
        // granted promotional subscription — same situation as our REST grant.)
        await Purchases.invalidateCustomerInfoCache()
        const { customerInfo } = await Purchases.getCustomerInfo()
        reconcileCustomerInfo(customerInfo)
      } catch (error) {
        console.error('[myJungle] failed to refresh entitlements after preview grant:', error)
      }
      logEvent('trial_started', { source: 'onboarding_strip' })
      return { ok: true }
    } catch (error) {
      console.error('[myJungle] pro preview request failed:', error)
      return { ok: false, error: t('analysisResult.proPreviewError') }
    }
  }

  /**
   * Web/dev-only test affordance: the RevenueCat SDK never runs on web (it's
   * native-only), so there's no real purchase to make when previewing the app
   * locally. This grants Pro locally, entirely client-side — it never calls
   * RevenueCat or any backend. Gated on import.meta.env.DEV (not just
   * !Capacitor.isNativePlatform()) so `vite build` statically replaces the
   * check with `false` and the minifier drops the entire real implementation
   * — this never ships to the deployed web build or a real iOS/Android app,
   * not just "hidden behind a runtime check" that could be tampered with.
   */
  const simulateWebPurchase: (plan: SelectablePlan) => void = import.meta.env.DEV
    ? (plan) => {
        if (Capacitor.isNativePlatform()) return
        console.info('[myJungle] Simulated web purchase (test mode only):', plan)
        const expiresAt =
          plan === 'lifetime' ? null : new Date(Date.now() + (plan === 'annual' ? 365 : 30) * 86400000).toISOString()
        setSettings((s) => ({
          ...s,
          isPro: true,
          subscriptionPlan: plan,
          subscriptionExpiresAt: expiresAt,
          subscriptionWillRenew: plan !== 'lifetime',
          subscriptionManagementUrl: null,
          subscriptionPeriodType: 'NORMAL',
        }))
      }
    : () => {}

  function draftToPlant(d: DraftPlant): Plant {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: d.name,
      category: d.category,
      room: d.room,
      careNote: d.careNote,
      wateringDays: d.wateringDays,
      scheduleDays: d.wateringDays.map((i) => DAYS[i]),
      isCustomSchedule: false,
      wateringFrequency: d.wateringFrequency,
      wateringCycleAnchor: d.wateringCycleAnchor,
      waterNeed: d.waterNeed,
      lightNeed: d.lightNeed,
      humidityNeed: d.humidityNeed,
      temperatureRangeC: d.temperatureRangeC,
      photo: d.photo,
      lastWateredAt: null,
      previousWateredAt: null,
      history: [],
      healthLogs: [],
      wateredDates: [],
      isWateredToday: false,
      isToxicToPets: d.isToxicToPets,
      toxicityNotes: d.toxicityNotes,
      confidence: d.confidence,
    }
  }

  /** Identifies a batch of captured photos, then opens the review screen instead
   * of writing straight to the plant list — so a failed or low-confidence
   * identification never lands silently as an "Unknown plant" the user has to
   * go find later. */
  function runBatchIdentification(photos: CapturedPhoto[], source: 'onboarding' | 'bulk') {
    console.log(`[myJungle] ${source}: identifying ${photos.length} photo(s)...`)
    setAiThinkingLabel(t('onboarding.identifying', { count: photos.length }))
    void withMinDelay(
      Promise.all(photos.map(async (p) => ({ id: p.id, draft: await identifyPhoto(p.dataUrl, language, settings.primaryWateringDay) }))),
      900,
    ).then((rows) => {
      setAiThinkingLabel(null)
      setBatchReview({ rows, source })
      setScreen('batchReview')
    })
  }

  function handleRetakeBatchRow(rowId: string, dataUrl: string) {
    setAiThinkingLabel(t('onboarding.identifying', { count: 1 }))
    void withMinDelay(identifyPhoto(dataUrl, language, settings.primaryWateringDay), 900).then((draft) => {
      setAiThinkingLabel(null)
      setBatchReview((prev) => (prev ? { ...prev, rows: prev.rows.map((r) => (r.id === rowId ? { id: rowId, draft } : r)) } : prev))
    })
  }

  function handleSaveBatchReview(rows: BatchReviewRow[]) {
    const drafts = rows.map((r) => r.draft)
    setPlants((prev) => [...prev, ...drafts.map(draftToPlant)])
    if (drafts.length > 0) logEvent('plant_added', { count: plants.length + drafts.length })
    if (batchReview?.source === 'onboarding') {
      setSettings((s) => ({ ...s, hasCompletedOnboarding: true, onboardingCompletedAt: s.onboardingCompletedAt ?? todayISO() }))
      if (settings.pushNotifications) void requestNotificationPermission()
    }
    setBatchReview(null)
    setScreen('main')
    setTab('home')
  }

  function handleDeletePlant(id: string) {
    const removed = plants.find((p) => p.id === id)
    if (removed) void deletePlantPhotos(removed.id, plantHistory(removed), removed.healthLogs ?? [])
    setPlants((prev) => prev.filter((p) => p.id !== id))
    setScreen('main')
    setSelectedPlant(null)
  }

  function handleExport(): Promise<ExportResult> {
    return exportUserData(plants, settings)
  }

  /** Called only after the user confirms in ResetDataSheet — never directly from the Settings row. */
  function handleReset() {
    void clearAllPhotos()
    // mj_language must survive the wipe — losing it silently reverts the app to
    // the device default language on the next launch, even though nothing here
    // asked to change it.
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    localStorage.clear()
    if (savedLanguage) localStorage.setItem(LANGUAGE_STORAGE_KEY, savedLanguage)
    setPlants([])
    setSettings({ ...DEFAULT_SETTINGS })
    setScreen('onboardingWelcome')
  }

  function openAddFlow() {
    if (!canAddMorePlants(plants.length, user)) {
      setShowLimitSheet(true)
      return
    }
    setScreen('manualAdd')
  }

  let content: React.ReactNode

  if (screen === 'splash') {
    content = <SplashScreen onNext={() => setSplashTimerDone(true)} />
  } else if (screen === 'onboardingWelcome') {
    content = (
      <OnboardingWelcome
        onNext={() => setScreen('onboardingCapture')}
        language={language}
        onPickLanguage={() => setShowLanguagePicker(true)}
      />
    )
  } else if (screen === 'onboardingCapture') {
    content = (
      <BatchCaptureScreen
        title={t('onboarding.captureTitle')}
        subtitle={t('onboarding.captureSubtitle', { count: FREE_PLANT_LIMIT })}
        freeSlots={FREE_PLANT_LIMIT}
        doneLabel={t('onboarding.captureDone')}
        onDone={(photos) => runBatchIdentification(photos, 'onboarding')}
        onSkip={() => {
          setSettings((s) => ({ ...s, hasCompletedOnboarding: true, onboardingCompletedAt: s.onboardingCompletedAt ?? todayISO() }))
          setScreen('main')
          setTab('home')
        }}
      />
    )
  } else if (screen === 'plantDetail' && selectedPlant) {
    const live = plants.find((p) => p.id === selectedPlant.id) || selectedPlant
    content = (
      <div className="app-shell fixed inset-0">
        <PlantDetailScreen
          plant={live}
          user={user}
          todayIdx={todayIdx}
          canScan={canStartHealthScan(settings.healthScansUsed, user)}
          onBack={() => { setScreen('main'); setSelectedPlant(null) }}
          onDelete={() => handleDeletePlant(live.id)}
          onWater={() => handleWaterToggle(live.id)}
          onShowPaywall={openPaywall}
          onRunHealthCheck={() => { setHealthFlowConfig({ mode: 'existing', presetPlant: live }); setScreen('healthFlow') }}
          onEdit={() => setScreen('editPlant')}
          onLogGrowth={() => { setGrowthFlowPlant(live); setScreen('growthFlow') }}
          onViewTimeline={() => { setGrowthFlowPlant(live); setScreen('growthHistory') }}
        />
        <TabBar
          active={tab}
          onChange={(t) => { setSelectedPlant(null); setScreen('main'); setTab(t) }}
          onAdd={openAddFlow}
        />
      </div>
    )
  } else if (screen === 'manualAdd') {
    content = (
      <div className="app-shell fixed inset-0">
        <ManualAddScreen
          isPro={user.isPro}
          language={language}
          primaryDay={settings.primaryWateringDay}
          remainingFreeSlots={Math.max(0, FREE_PLANT_LIMIT - plants.length)}
          onBack={() => { setScreen('main'); setTab('home') }}
          onAdd={(draft) => {
            setPlants((prev) => [...prev, draftToPlant(draft)])
            logEvent('plant_added', { count: plants.length + 1 })
            setScreen('main')
            setTab('home')
          }}
        />
        <TabBar
          active={null}
          addActive
          onChange={(t) => { setScreen('main'); setTab(t) }}
          onAdd={openAddFlow}
        />
      </div>
    )
  } else if (screen === 'proUnlock') {
    content = (
      <ProUnlockScreen
        source={paywallSource}
        offering={offering}
        offeringsStatus={offeringsStatus}
        onClose={handleClosePaywall}
        onOpenLegal={(doc) => { setLegalDoc(doc); setScreen('legal') }}
        onRetryOfferings={() => void fetchOfferings()}
        onPurchased={(customerInfo) => {
          reconcileCustomerInfo(customerInfo)
          setScreen(paywallSource === 'plant_limit' ? 'bulkAdd' : 'main')
        }}
        onSimulateWebPurchase={(plan) => {
          simulateWebPurchase(plan)
          setScreen(paywallSource === 'plant_limit' ? 'bulkAdd' : 'main')
        }}
        showProPreview={!user.isPro && !settings.proPreviewUsedAt}
        onTryProPreview={handleTryProPreview}
        onProPreviewGranted={() => { setScreen('main'); setTab('home') }}
      />
    )
  } else if (screen === 'lifetimeOffer') {
    content = (
      <LifetimeOfferScreen
        offering={offering}
        offeringsStatus={offeringsStatus}
        onDismiss={() => setScreen('main')}
        onOpenLegal={(doc) => { setLegalDoc(doc); setScreen('legal') }}
        onPurchased={(customerInfo) => { reconcileCustomerInfo(customerInfo); setScreen('main') }}
        onSimulateWebPurchase={() => { simulateWebPurchase('lifetime'); setScreen('main') }}
      />
    )
  } else if (screen === 'bulkAdd') {
    content = (
      <BatchCaptureScreen
        title={t('onboarding.bulkAddTitle')}
        subtitle={t('onboarding.bulkAddSubtitle')}
        freeSlots={null}
        doneLabel={t('onboarding.bulkAddDone')}
        onBack={() => { setScreen('main'); setTab('home') }}
        onDone={(photos) => runBatchIdentification(photos, 'bulk')}
      />
    )
  } else if (screen === 'batchReview' && batchReview) {
    content = (
      <BatchReviewScreen
        rows={batchReview.rows}
        onBack={batchReview.source === 'bulk' ? () => { setBatchReview(null); setScreen('main'); setTab('home') } : undefined}
        onRetakePhoto={handleRetakeBatchRow}
        onSave={handleSaveBatchReview}
      />
    )
  } else if (screen === 'healthFlow' && healthFlowConfig) {
    content = (
      <HealthCheckFlowScreen
        plants={plants}
        mode={healthFlowConfig.mode}
        presetPlant={healthFlowConfig.presetPlant}
        language={language}
        onBack={() => { setHealthFlowConfig(null); setScreen('main'); setTab('health') }}
        onSaveLog={handleSaveHealthLog}
        onDone={() => { setHealthFlowConfig(null); setScreen('main'); setTab('health') }}
      />
    )
  } else if (screen === 'legal' && legalDoc) {
    content = <LegalScreen doc={legalDoc} onBack={() => { setLegalDoc(null); setScreen('main'); setTab('profile') }} />
  } else if (screen === 'editPlant' && selectedPlant) {
    const live = plants.find((p) => p.id === selectedPlant.id) || selectedPlant
    content = (
      <EditPlantScreen
        plant={live}
        primaryDay={settings.primaryWateringDay}
        onBack={() => setScreen('plantDetail')}
        onSave={(updates) => {
          setPlants((prev) => prev.map((p) => (p.id === live.id ? { ...p, ...updates } : p)))
          setScreen('plantDetail')
        }}
      />
    )
  } else if (screen === 'growthFlow' && growthFlowPlant) {
    const live = plants.find((p) => p.id === growthFlowPlant.id) || growthFlowPlant
    content = (
      <GrowthCheckScreen
        plant={live}
        language={language}
        onBack={() => { setGrowthFlowPlant(null); setScreen('plantDetail') }}
        onSave={(entry) => {
          setPlants((prev) => prev.map((p) => (p.id === live.id ? { ...p, history: [entry, ...plantHistory(p)] } : p)))
        }}
      />
    )
  } else if (screen === 'growthHistory' && growthFlowPlant) {
    const live = plants.find((p) => p.id === growthFlowPlant.id) || growthFlowPlant
    content = (
      <GrowthHistoryScreen
        plant={live}
        onBack={() => { setGrowthFlowPlant(null); setScreen('plantDetail') }}
        onNewScan={() => setScreen('growthFlow')}
      />
    )
  } else {
    let tabContent: React.ReactNode
    if (tab === 'home') {
      tabContent = (
        <HomeScreen
          plants={plants}
          todayIdx={todayIdx}
          onOpenPlant={(p) => { setSelectedPlant(p); setScreen('plantDetail') }}
          onEditPlant={(p) => { setSelectedPlant(p); setScreen('editPlant') }}
          onMarkAllWateredToday={handleMarkAllWateredToday}
          onGoToDays={() => setTab('days')}
          showHabitCard={showHabitCard}
          onDismissHabitCard={() => setSettings((s) => ({ ...s, habitUpsellShown: true }))}
          onShowHabitPro={() => { setSettings((s) => ({ ...s, habitUpsellShown: true })); openPaywall('habit_card') }}
          showProPreviewBanner={showProPreviewBanner}
          onDismissProPreviewBanner={() => setSettings((s) => ({ ...s, proPreviewBannerDismissed: true }))}
          onTryProPreview={handleTryProPreview}
          notificationsEnabled={settings.pushNotifications}
          onOpenNotificationSettings={() => setShowNotificationSettings(true)}
        />
      )
    } else if (tab === 'days') {
      tabContent = (
        <DaysScreen
          plants={plants}
          todayIdx={todayIdx}
          onToggleWatered={handleWaterToggleForDate}
          onBack={() => setTab('home')}
          onOpenScheduleSettings={() => setShowScheduleSettings(true)}
        />
      )
    } else if (tab === 'health') {
      tabContent = (
        <HealthHubScreen
          plants={plants}
          isPro={user.isPro}
          canScan={canStartHealthScan(settings.healthScansUsed, user)}
          onScanNew={() => { logEvent('health_scan_attempted', { is_pro: user.isPro }); setHealthFlowConfig({ mode: 'new', presetPlant: null }); setScreen('healthFlow') }}
          onCheckExisting={() => { logEvent('health_scan_attempted', { is_pro: user.isPro }); setHealthFlowConfig({ mode: 'existing', presetPlant: null }); setScreen('healthFlow') }}
          onOpenPlant={(p) => { setSelectedPlant(p); setScreen('plantDetail') }}
          onShowPro={() => openPaywall('health_scan')}
        />
      )
    } else {
      tabContent = (
        <ProfileScreen
          settings={settings}
          user={user}
          onSave={setSettings}
          onExport={handleExport}
          onReset={() => setShowResetConfirm(true)}
          onShowPro={() => openPaywall('settings')}
          onOpenLegal={(doc) => { setLegalDoc(doc); setScreen('legal') }}
          language={language}
          onPickLanguage={() => setShowLanguagePicker(true)}
          onChangePrimaryWateringDay={handleChangePrimaryWateringDay}
          onToggleNotifications={handleToggleNotifications}
        />
      )
    }
    content = (
      <div className="app-shell fixed inset-0">
        {tabContent}
        <TabBar
          active={tab}
          onChange={(t) => setTab(t)}
          onAdd={openAddFlow}
        />
      </div>
    )
  }

  return (
    <div className="app-shell relative min-h-dvh max-h-dvh h-dvh w-full overflow-hidden">
      {storageError && (
        <div className="fixed top-0 left-0 right-0 z-[100] px-4 py-2 text-center" style={{ background: '#FF3B30', color: '#fff', fontSize: 13 }} role="alert">
          {storageError}
        </div>
      )}
      {aiThinkingLabel ? <AiThinkingScreen label={aiThinkingLabel} /> : content}
      {showLimitSheet && (
        <LimitReachedSheet
          onCancel={() => setShowLimitSheet(false)}
          onUnlock={() => { setShowLimitSheet(false); openPaywall('plant_limit') }}
        />
      )}
      {showResetConfirm && (
        <ResetDataSheet
          onCancel={() => setShowResetConfirm(false)}
          onConfirm={() => { setShowResetConfirm(false); handleReset() }}
        />
      )}
      {showLanguagePicker && (
        <LanguagePickerSheet
          current={language}
          onClose={() => setShowLanguagePicker(false)}
          onSelect={(l) => { setLanguage(l); saveLanguage(l); void i18n.changeLanguage(l); setShowLanguagePicker(false) }}
        />
      )}
      {showNotificationSettings && (
        <NotificationSettingsSheet
          pushNotifications={settings.pushNotifications}
          reminderTime={settings.reminderTime}
          onToggle={handleToggleNotifications}
          onChangeReminderTime={(time) => setSettings((s) => ({ ...s, reminderTime: time }))}
          onClose={() => setShowNotificationSettings(false)}
        />
      )}
      {showScheduleSettings && (
        <WateringScheduleSettingsSheet
          primaryWateringDay={settings.primaryWateringDay}
          groupWateringDays={settings.groupWateringDays}
          customScheduleCount={plants.filter((p) => p.isCustomSchedule).length}
          onChangePrimaryDay={handleChangePrimaryWateringDay}
          onChangeGroupingStrategy={handleChangeGroupingStrategy}
          onRecalculateAll={handleRecalculateAllSchedules}
          onClose={() => setShowScheduleSettings(false)}
        />
      )}
    </div>
  )
}
