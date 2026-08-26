import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n/i18n'
import { Capacitor } from '@capacitor/core'
import { Purchases, LOG_LEVEL, type CustomerInfo, type PurchasesOffering, type PurchasesError } from '@revenuecat/purchases-capacitor'
import Spline from '@splinetool/react-spline'
import PlantPhoto from '@/components/PlantPhoto'
import { analyzePlantImage, mapLightNeedToForm, mapWaterNeedToForm } from '@/lib/analyzePlant'
import { analyzePlantHealthImage, type AnalyzePlantHealthResult } from '@/lib/analyzePlantHealth'
import { analyzePlantGrowthImage, type AnalyzePlantGrowthResult } from '@/lib/analyzePlantGrowth'
import {
  cycleAnchorForFrequency,
  getDateForDayIndex,
  getTodayDayIndex,
  isPlantDueOnDay,
  isPlantDueToday,
} from '@/lib/wateringDue'
import { loadPlantsFromStorage, readAndCompressPhotoFile, savePlantsToStorage, type StorageResult } from '@/lib/plantStorage'
import { LAST_ACTIVE_DATE_KEY, localDateString, rolloverWateredState } from '@/lib/dailyRollover'
import { batchedWateringDays, frequencyForWaterNeed, frequencyLabel, secondaryWateringDay, wateringDaysForStrategy } from '@/lib/wateringBatch'
import { clearAllPhotos, deletePlantPhotos } from '@/lib/photoStore'
import {
  checkNotificationPermissionStatus,
  requestCameraPermission,
  requestNotificationPermission,
  type NotificationPermissionStatus,
} from '@/lib/permissions'
import {
  FREE_PLANT_LIMIT,
  FREE_HEALTH_SCANS,
  ENTITLEMENT_PRO,
  PRODUCT_ANNUAL,
  PRODUCT_MONTHLY,
  PRODUCT_LIFETIME,
  PRODUCT_LEGACY_ONETIME,
  PROMOTIONAL_STORE,
  canAccessProFeatures,
  canAddMorePlants,
  canStartHealthScan,
  isFoundingMember,
  canShowLifetimeOffer,
  canShowHabitUpsellCard,
  getTrialDays,
  paywallCopyForSource,
  computeAnnualDiscountLabel,
  type PaywallSource,
} from '@/lib/monetization'
import { requestProPreview } from '@/lib/revenueCatPreview'
import { logEvent } from '@/lib/analytics'
import { useUserState } from '@/hooks/useUserState'
import { LANGUAGE_OPTIONS, LANGUAGE_STORAGE_KEY, normalizeAppLanguage, type AppLanguage } from '@/i18n/languages'
import type { AppSettings, DayCode, HistoryEntry, LightNeed, Plant, PlantHealthLog, UserState, WaterNeed, WateringFrequency } from '@/types/plant'

// ─── Constants ────────────────────────────────────────────────────────────────

const GREEN = '#B7FF00'
const DAYS: DayCode[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const FULL_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const APP_VERSION = '1.0.0'

const DEFAULT_SETTINGS: AppSettings = {
  hasCompletedOnboarding: false,
  onboardingCompletedAt: null,
  pushNotifications: true,
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
}

type Screen =
  | 'splash'
  | 'onboardingWelcome'
  | 'onboardingCapture'
  | 'main'
  | 'plantDetail'
  | 'manualAdd'
  | 'proUnlock'
  | 'lifetimeOffer'
  | 'bulkAdd'
  | 'healthFlow'
  | 'legal'
  | 'editPlant'
  | 'growthFlow'
  | 'growthHistory'

type Tab = 'home' | 'days' | 'health' | 'profile'

// ─── Storage ──────────────────────────────────────────────────────────────────

function normalizePlant(raw: Plant & Record<string, unknown>): Plant {
  const wateringDays = Array.isArray(raw.wateringDays) ? [...raw.wateringDays].sort((a, b) => a - b) : []
  const waterNeed: WaterNeed = raw.waterNeed === 'Light' || raw.waterNeed === 'Heavy' ? raw.waterNeed : 'Moderate'
  const lightNeed: LightNeed = raw.lightNeed === 'Low' || raw.lightNeed === 'High' ? raw.lightNeed : 'Medium'
  return {
    id: String(raw.id ?? Date.now()),
    name: raw.name?.trim() || 'Unnamed plant',
    room: raw.room?.trim() || 'Unknown',
    careNote: raw.careNote ?? '',
    wateringDays,
    scheduleDays: (raw.scheduleDays as DayCode[]) ?? wateringDays.map((i) => DAYS[i]),
    isCustomSchedule: raw.isCustomSchedule ?? false,
    wateringFrequency: (raw.wateringFrequency as WateringFrequency) ?? 'weekly',
    wateringCycleAnchor: raw.wateringCycleAnchor ?? null,
    waterNeed,
    lightNeed,
    humidityNeed: raw.humidityNeed === 'low' || raw.humidityNeed === 'high' ? raw.humidityNeed : 'normal',
    temperatureRangeC: typeof raw.temperatureRangeC === 'string' ? raw.temperatureRangeC : '18-27°C',
    category: typeof raw.category === 'string' ? raw.category : undefined,
    photo: typeof raw.photo === 'string' ? raw.photo : '',
    lastWateredAt: raw.lastWateredAt ?? null,
    previousWateredAt: raw.previousWateredAt ?? null,
    history: Array.isArray(raw.history) ? raw.history : [],
    healthLogs: Array.isArray(raw.healthLogs) ? raw.healthLogs : [],
    isWateredToday: raw.isWateredToday ?? false,
    isToxicToPets: raw.isToxicToPets === true ? true : raw.isToxicToPets === false ? false : null,
    toxicityNotes: typeof raw.toxicityNotes === 'string' ? raw.toxicityNotes : '',
    confidence: typeof raw.confidence === 'number' ? raw.confidence : undefined,
  }
}

function loadPlants(): Plant[] {
  return loadPlantsFromStorage(normalizePlant)
}

function savePlants(p: Plant[]): Promise<StorageResult> {
  return savePlantsToStorage(p)
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem('mj_settings')
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(s: AppSettings) {
  try {
    localStorage.setItem('mj_settings', JSON.stringify(s))
  } catch (error) {
    console.error('[myJungle] Failed to save settings:', error)
  }
}

function loadLanguage(): AppLanguage {
  try {
    return normalizeAppLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY))
  } catch {
    return 'en'
  }
}

function saveLanguage(l: AppLanguage) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, l)
  } catch (error) {
    console.error('[myJungle] Failed to save language:', error)
  }
}

function plantHistory(plant: Plant): HistoryEntry[] {
  return Array.isArray(plant.history) ? plant.history : []
}

function confidenceLabel(value: 'low' | 'medium' | 'high'): number {
  if (value === 'high') return 95
  if (value === 'medium') return 80
  return 55
}

// ─── Icons (thin stroke, rounded) ──────────────────────────────────────────────

function Icon({ children, size = 20 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  )
}

function NavIcon({ children, size = 20, viewBox }: { children: React.ReactNode; size?: number; viewBox: string }) {
  return (
    <svg width={size} height={size} viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  )
}
const IconNavHome = (p: { size?: number }) => (
  <NavIcon {...p} viewBox="26 17 20 21">
    <path d="M38.75 36.2497V28.9163C38.75 28.6732 38.6534 28.4401 38.4815 28.2682C38.3096 28.0963 38.0764 27.9997 37.8333 27.9997H34.1667C33.9236 27.9997 33.6904 28.0963 33.5185 28.2682C33.3466 28.4401 33.25 28.6732 33.25 28.9163V36.2497M27.75 26.1668C27.7499 25.9001 27.8081 25.6366 27.9203 25.3947C28.0326 25.1528 28.1962 24.9383 28.3999 24.7661L34.8166 19.2661C35.1475 18.9864 35.5667 18.833 36 18.833C36.4333 18.833 36.8525 18.9864 37.1834 19.2661L43.6001 24.7661C43.8038 24.9383 43.9674 25.1528 44.0797 25.3947C44.1919 25.6366 44.2501 25.9001 44.25 26.1668V34.4168C44.25 34.903 44.0568 35.3693 43.713 35.7131C43.3692 36.057 42.9029 36.2501 42.4167 36.2501H29.5833C29.0971 36.2501 28.6308 36.057 28.287 35.7131C27.9432 35.3693 27.75 34.903 27.75 34.4168V26.1668Z" />
  </NavIcon>
)
const IconNavCalendar = (p: { size?: number }) => (
  <NavIcon {...p} viewBox="102 17 20 22">
    <path d="M108.333 18.833V22.5M115.667 18.833V22.5M103.75 26.1669H120.25M105.583 20.6665H118.417C119.429 20.6665 120.25 21.4874 120.25 22.5V35.3343C120.25 36.3469 119.429 37.1678 118.417 37.1678H105.583C104.571 37.1678 103.75 36.3469 103.75 35.3343V22.5C103.75 21.4874 104.571 20.6665 105.583 20.6665Z" />
  </NavIcon>
)
const IconNavAdd = (p: { size?: number }) => (
  <NavIcon {...p} viewBox="165 17 22 22">
    <path d="M172.333 28.0004H179.667M176 24.3334V31.6674M185.168 28.0004C185.168 33.0634 181.063 37.1678 176 37.1678C170.937 37.1678 166.833 33.0634 166.833 28.0004C166.833 22.9374 170.937 18.833 176 18.833C181.063 18.833 185.168 22.9374 185.168 28.0004Z" />
  </NavIcon>
)
const IconNavHealth = (p: { size?: number }) => (
  <NavIcon {...p} viewBox="0 0 20 19">
    <path
      d="M17.003 11.0015V14.0015H20.003V16.0015H17.003V19.0015H15.003V16.0015H12.003V14.0015H15.003V11.0015H17.003ZM18.246 1.75853C19.3292 2.84154 19.9571 4.29782 20.0012 5.82892C20.0453 7.36003 19.5021 8.85001 18.483 9.99353L17.063 8.57553C18.393 7.05153 18.323 4.66153 16.83 3.17153C16.1073 2.4501 15.1361 2.03235 14.1154 2.00391C13.0947 1.97546 12.1017 2.33846 11.34 3.01853L10.005 4.21653L8.66898 3.01953C7.91065 2.34142 6.92244 1.97772 5.90544 2.00245C4.88844 2.02717 3.91908 2.43846 3.1946 3.15262C2.47012 3.86678 2.04496 4.83015 2.00565 5.84668C1.96634 6.86322 2.31582 7.85655 2.98298 8.62453L11.415 17.0705L10.003 18.4865L1.52298 9.99453C0.502231 8.85049 -0.0418219 7.35909 0.00251128 5.82651C0.0468444 4.29394 0.6762 2.83648 1.76137 1.75336C2.84654 0.670234 4.30518 0.0436327 5.83784 0.00219405C7.37049 -0.0392446 8.86086 0.507624 10.003 1.53053C11.1458 0.508183 12.6366 -0.0378468 14.1693 0.00455415C15.7021 0.0469551 17.1615 0.674569 18.246 1.75853Z"
      fill="currentColor"
      stroke="none"
    />
  </NavIcon>
)
const IconNavSettings = (p: { size?: number }) => (
  <NavIcon {...p} viewBox="294 18 20 21">
    <path d="M301.79 21.4101C301.842 20.8875 302.097 20.4022 302.506 20.049C302.915 19.6957 303.448 19.5 304 19.5C304.553 19.5 305.086 19.6957 305.495 20.049C305.903 20.4022 306.159 20.8875 306.211 21.4101C306.243 21.7478 306.359 22.0732 306.551 22.3589C306.743 22.6447 307.005 22.8823 307.314 23.0517C307.623 23.2211 307.97 23.3172 308.326 23.332C308.683 23.3468 309.038 23.2799 309.361 23.1367C309.863 22.9201 310.432 22.8888 310.957 23.0488C311.483 23.2088 311.926 23.5487 312.202 24.0024C312.478 24.456 312.566 24.991 312.45 25.5031C312.334 26.0152 312.021 26.4679 311.572 26.773C311.28 26.9676 311.042 27.2261 310.878 27.5267C310.713 27.8273 310.627 28.1612 310.627 28.5C310.627 28.8388 310.713 29.1727 310.878 29.4733C311.042 29.7739 311.28 30.0324 311.572 30.227C312.021 30.5321 312.334 30.9848 312.45 31.4969C312.566 32.009 312.478 32.544 312.202 32.9976C311.926 33.4513 311.483 33.7912 310.957 33.9512C310.432 34.1112 309.863 34.0799 309.361 33.8633C309.038 33.7201 308.683 33.6532 308.326 33.668C307.97 33.6828 307.623 33.7789 307.314 33.9483C307.005 34.1177 306.743 34.3553 306.551 34.6411C306.359 34.9268 306.243 35.2522 306.211 35.5899C306.159 36.1125 305.903 36.5978 305.495 36.951C305.086 37.3043 304.553 37.5 304 37.5C303.448 37.5 302.915 37.3043 302.506 36.951C302.097 36.5978 301.842 36.1125 301.79 35.5899C301.758 35.2521 301.642 34.9265 301.45 34.6407C301.258 34.3549 300.996 34.1172 300.687 33.9478C300.378 33.7784 300.03 33.6822 299.674 33.6675C299.317 33.6528 298.962 33.72 298.639 33.8633C298.137 34.0799 297.568 34.1112 297.043 33.9512C296.517 33.7912 296.074 33.4513 295.798 32.9976C295.522 32.544 295.434 32.009 295.55 31.4969C295.666 30.9848 295.979 30.5321 296.428 30.227C296.72 30.0324 296.958 29.7739 297.122 29.4733C297.287 29.1727 297.373 28.8388 297.373 28.5C297.373 28.1612 297.287 27.8273 297.122 27.5267C296.958 27.2261 296.72 26.9676 296.428 26.773C295.98 26.4677 295.668 26.0152 295.551 25.5035C295.435 24.9917 295.524 24.4572 295.799 24.0038C296.075 23.5505 296.518 23.2106 297.043 23.0504C297.567 22.8901 298.136 22.9209 298.638 23.1367C298.961 23.2799 299.316 23.3468 299.673 23.332C300.029 23.3172 300.376 23.2211 300.685 23.0517C300.995 22.8823 301.256 22.6447 301.448 22.3589C301.64 22.0732 301.756 21.7478 301.788 21.4101M306.847 28.5003C306.847 29.9942 305.572 31.2052 304 31.2052C302.427 31.2052 301.153 29.9942 301.153 28.5003C301.153 27.0065 302.427 25.7955 304 25.7955C305.572 25.7955 306.847 27.0065 306.847 28.5003Z" />
  </NavIcon>
)
const IconLeaf = (p: { size?: number }) => <Icon {...p}><path d="M11 20A7 7 0 0 1 4 13c0-6 5-11 11-11 1 6-3 11-9 13" /><path d="M4 13c0 5 4 7 7 7" /></Icon>
const IconCalendar = (p: { size?: number }) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></Icon>
const IconChevronLeft = (p: { size?: number }) => <Icon {...p}><path d="M15 5l-7 7 7 7" /></Icon>
const IconChevronDown = (p: { size?: number }) => <Icon {...p}><path d="M5 9l7 7 7-7" /></Icon>
const IconX = (p: { size?: number }) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>
const IconCamera = (p: { size?: number }) => <Icon {...p}><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="14" r="3.5" /></Icon>
const IconPlus = (p: { size?: number }) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>
const IconMenu = (p: { size?: number }) => <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>
const IconBell = (p: { size?: number }) => <Icon {...p}><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z" /><path d="M10 19a2 2 0 0 0 4 0" /></Icon>
const IconBellOff = (p: { size?: number }) => <Icon {...p}><path d="M6 10a6 6 0 0 1 10.4-4.05M18 10c0 4 1.5 5.5 1.5 5.5H8" /><path d="M6 10v0c0 3-.8 4.4-1.3 5.1a.5.5 0 0 0 .4.9h4.4" /><path d="M10 19a2 2 0 0 0 4 0" /><path d="M3 3l18 18" /></Icon>
const IconCheck = (p: { size?: number }) => <Icon {...p}><path d="M4 12l6 6L20 6" /></Icon>
const IconAlert = (p: { size?: number }) => <Icon {...p}><path d="M10.3 3.9L2.6 18a1.5 1.5 0 0 0 1.3 2.2h16.2a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0z" /><path d="M12 9v4M12 17h.01" /></Icon>
const IconSparkles = (p: { size?: number }) => <Icon {...p}><path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" /></Icon>
const IconDroplet = (p: { size?: number }) => <Icon {...p}><path d="M12 2c3 4 7 9 7 13a7 7 0 1 1-14 0c0-4 4-9 7-13z" /></Icon>
const IconPaw = (p: { size?: number }) => <Icon {...p}><ellipse cx="12" cy="16" rx="5" ry="4.5" /><circle cx="6" cy="9" r="1.6" /><circle cx="11" cy="6" r="1.6" /><circle cx="17" cy="6" r="1.6" /><circle cx="21" cy="9.5" r="1.6" /></Icon>
const IconLock = (p: { size?: number }) => <Icon {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Icon>
const IconSun = (p: { size?: number }) => <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Icon>
const IconDownload = (p: { size?: number }) => <Icon {...p}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></Icon>
const IconTrash = (p: { size?: number }) => <Icon {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></Icon>
const IconThermometer = (p: { size?: number }) => <Icon {...p}><path d="M14 14.76V4a2 2 0 0 0-4 0v10.76a4 4 0 1 0 4 0z" /></Icon>
const IconDroplets = (p: { size?: number }) => <Icon {...p}><path d="M7 16a4 4 0 0 0 8 0c0-3-4-8-4-8s-4 5-4 8z" /><path d="M15.5 4.5c1.2 1.8 3 4.7 3 6.5" /></Icon>
const IconCalendarSmall = (p: { size?: number }) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></Icon>
const IconDotsHorizontal = (p: { size?: number }) => <Icon {...p}><circle cx="5" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="19" cy="12" r="1.5" fill="currentColor" /></Icon>
const IconChevronRight = (p: { size?: number }) => <Icon {...p}><path d="M9 5l7 7-7 7" /></Icon>
const IconGlobe = (p: { size?: number }) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 4 6 4 9s-1.5 6.3-4 9c-2.5-2.7-4-6-4-9s1.5-6.3 4-9z" /></Icon>
const IconRuler = (p: { size?: number }) => <Icon {...p}><rect x="3" y="8" width="18" height="8" rx="1.5" /><path d="M7 8v3M11 8v3M15 8v3" /></Icon>

// ─── Small building blocks ───────────────────────────────────────────────────

function IconCircleBtn({ onClick, children, label }: { onClick: () => void; children: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className="icon-circle text-white" aria-label={label}>
      {children}
    </button>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`toggle-switch ${on ? 'is-on' : ''}`}
    >
      <div className="toggle-switch__knob" />
    </div>
  )
}

function DayPill({ label, active, onClick, disabled }: { label: string; active: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`day-pill ${active ? 'is-active' : ''}`}
      style={{ width: 46, height: 46, fontSize: 16, opacity: disabled ? 0.35 : 1 }}
    >
      {label}
    </button>
  )
}

const AI_THINKING_SCENE_URL = 'https://prod.spline.design/uTHVwstWqr3EZSQv/scene.splinecode'

// The Spline scene's camera frames its subject at a fixed pixel scale, so a
// canvas smaller than this crops the edges. Render it at full native size and
// scale the whole thing down with CSS to fit whatever `size` is requested —
// that keeps the full, uncropped animation visible at any display size.
const AI_THINKING_NATIVE_SIZE = 640

function AiThinkingLoader({ size = 160 }: { size?: number }) {
  const scale = size / AI_THINKING_NATIVE_SIZE
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <div
        style={{
          width: AI_THINKING_NATIVE_SIZE,
          height: AI_THINKING_NATIVE_SIZE,
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <Spline scene={AI_THINKING_SCENE_URL} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  )
}

function AiThinkingScreen({ label }: { label: string }) {
  const { t } = useTranslation()
  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <div className="px-6 pt-[calc(3rem+env(safe-area-inset-top,0px))] pb-10 shrink-0">
        <h1 className="font-heading" style={{ fontSize: 32, lineHeight: 1.1, color: '#fff', textTransform: 'uppercase' }}>
          {t('splash.plantsAnalysisTitle')}<br />{t('splash.plantsAnalysisSubtitle')}
        </h1>
      </div>
      <div className="sheet-body flex-1 flex flex-col items-center justify-center gap-6">
        <AiThinkingLoader size={220} />
        <span className="font-body text-center px-10" style={{ fontSize: 16, color: '#666' }}>{label}</span>
      </div>
    </div>
  )
}

function todayISO() { return new Date().toISOString() }

/** Lightweight heuristic from watering recency — not a real diagnosis. */
function computeHealthStatus(plant: Plant, todayIdx: number, t: (key: string) => string): { score: number; label: string } {
  if (!plant.lastWateredAt) return { score: 75, label: t('healthStatus.good') }
  const daysSince = Math.floor((Date.now() - new Date(plant.lastWateredAt).getTime()) / 86400000)
  const overdue = isPlantDueToday(plant, todayIdx) && !plant.isWateredToday
  let score = 96 - Math.min(35, daysSince * 3) - (overdue ? 15 : 0)
  score = Math.max(35, Math.min(100, score))
  const label = score >= 90 ? t('healthStatus.excellent') : score >= 70 ? t('healthStatus.good') : score >= 50 ? t('healthStatus.fair') : t('healthStatus.needsAttention')
  return { score, label }
}

// ─── Screen: Splash ───────────────────────────────────────────────────────────

function SplashScreen({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation()
  useEffect(() => {
    const timer = setTimeout(onNext, 1800)
    return () => clearTimeout(timer)
  }, [onNext])
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-6" style={{ background: GREEN }}>
      <div className="drop-animate" style={{ color: '#000' }}>
        <svg width="120" height="140" viewBox="0 0 85 116" fill="currentColor">
          <path d="M42.5 2.9C45.9 16.9 53.7 29.9 63.9 38.2l1.1 0.9C77.4 48.9 83 59.4 83 71.9c0 11-4.4 21.6-12.1 29.4C63.2 109 52.6 113.4 42.5 113.4S21.8 109 14 101.3C6.3 93.5 1.9 82.9 1.9 71.9c0-11.6 5.7-22.7 17.2-32.2l1.1-0.9C29.5 29.9 39.1 16.9 42.5 2.9z" />
        </svg>
      </div>
      <div className="text-animate text-center">
        <div className="font-heading" style={{ fontSize: 26, color: '#000' }}>MYJUNGLE</div>
        <div className="font-body" style={{ fontSize: 13, color: '#000', opacity: 0.6, marginTop: 4 }}>{t('splash.version', { version: APP_VERSION })}</div>
      </div>
    </div>
  )
}

// ─── Screen: Onboarding — Welcome ─────────────────────────────────────────────

const ONBOARDING_STEPS = [
  { icon: IconCamera, key: 'onboarding.step1' },
  { icon: IconSparkles, key: 'onboarding.step2' },
  { icon: IconCalendar, key: 'onboarding.step3' },
  { icon: IconDroplet, key: 'onboarding.step4' },
  { icon: IconLeaf, key: 'onboarding.step5', pro: true },
]

function OnboardingWelcome({ onNext, language, onPickLanguage }: { onNext: () => void; language: AppLanguage; onPickLanguage: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="app-shell-light fixed inset-0 flex flex-col px-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
      <div style={{ height: 40 }} />
      <h1
        className="font-heading"
        style={{ fontSize: 34, lineHeight: 1.08, color: '#000', textTransform: 'uppercase' }}
        dangerouslySetInnerHTML={{ __html: t('onboarding.welcomeTitle') }}
      />
      <div className="flex flex-col gap-4 mt-8 flex-1">
        {ONBOARDING_STEPS.map((step, i) => (
          <div key={i} className="flex items-center gap-3 rounded-full px-5" style={{ background: '#000', height: 64 }}>
            <div style={{ color: GREEN }}>
              <step.icon size={20} />
            </div>
            <span className="font-body flex-1" style={{ fontSize: 16, color: '#fff', fontWeight: 500 }}>
              {t(step.key)}
            </span>
            {step.pro && (
              <span className="badge-pro-solid shrink-0" style={{ fontSize: 10, padding: '3px 10px' }}>PRO</span>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onPickLanguage}
        className="flex items-center gap-3 rounded-full px-5 mb-4"
        style={{ background: '#E6E6E6', height: 56 }}
      >
        <IconGlobe size={18} />
        <span className="font-body flex-1 text-left" style={{ fontSize: 15, color: '#111' }}>{t(`language.${language}`)}</span>
        <IconChevronDown size={18} />
      </button>
      <button type="button" onClick={onNext} className="btn-fill btn-forward w-full" style={{ height: 56, fontSize: 16 }}>
        {t('onboarding.getStarted')}
        <span className="btn-forward__arrow"><IconChevronRight size={20} /></span>
      </button>
    </div>
  )
}

// ─── Screen: Onboarding — Batch capture (shared with Bulk Add) ────────────────

interface CapturedPhoto { id: string; dataUrl: string }

function BatchCaptureScreen({
  title, subtitle, freeSlots, onBack, onDone, doneLabel, onSkip,
}: {
  title: string
  subtitle: string
  freeSlots: number | null
  onBack?: () => void
  onDone: (photos: CapturedPhoto[]) => void
  doneLabel: string
  /** Only passed for onboarding's own capture step — bulk-add has no "skip", there's nothing to skip past. */
  onSkip?: () => void
}) {
  const { t } = useTranslation()
  const [photos, setPhotos] = useState<CapturedPhoto[]>([])
  const [busy, setBusy] = useState(false)
  // Set while the picker is open to replace one existing photo rather than append new ones.
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const limit = freeSlots ?? Infinity
  const atLimit = photos.length >= limit

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    console.log(`[myJungle] BatchCapture: reading ${fileList.length} file(s)...`)
    setBusy(true)
    try {
      if (replaceTargetId) {
        const file = fileList[0]
        if (file) {
          try {
            const dataUrl = await readAndCompressPhotoFile(file)
            setPhotos((prev) => prev.map((p) => (p.id === replaceTargetId ? { ...p, dataUrl } : p)))
          } catch (error) {
            console.error('[myJungle] BatchCapture: replace photo failed:', error)
            showToast(error instanceof Error ? error.message : t('common.couldNotAnalyzePhoto'))
          }
        }
      } else {
        const remaining = limit - photos.length
        const files = Array.from(fileList).slice(0, Math.max(0, remaining))
        const results = await Promise.allSettled(files.map((f) => readAndCompressPhotoFile(f)))
        const succeeded = results.filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        if (succeeded.length > 0) {
          setPhotos((prev) => [...prev, ...succeeded.map((r) => ({ id: `${Date.now()}-${Math.random()}`, dataUrl: r.value }))])
        }
        if (failed.length > 0) {
          console.error(`[myJungle] BatchCapture: ${failed.length}/${files.length} photo(s) failed to process:`, failed.map((r) => r.reason))
          const firstError = failed[0]?.reason
          showToast(firstError instanceof Error ? firstError.message : t('common.couldNotAnalyzePhoto'))
        }
      }
    } catch (error) {
      console.error('[myJungle] batch capture failed:', error)
      showToast(error instanceof Error ? error.message : t('common.couldNotAnalyzePhoto'))
    } finally {
      setBusy(false)
      setReplaceTargetId(null)
    }
  }

  /** Opens the picker to append new photos, or (with an id) to replace one existing photo in place. */
  async function openPicker(replaceId?: string) {
    const granted = await requestCameraPermission()
    if (!granted) return
    setReplaceTargetId(replaceId ?? null)
    const input = fileInputRef.current
    if (!input) return
    // Set `multiple` directly — React's re-render (and thus the JSX-driven
    // attribute) hasn't happened yet by the time click() fires below.
    input.multiple = !replaceId
    input.click()
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="app-shell-light fixed inset-0 flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={!replaceTargetId}
        className="hidden"
        onChange={(e) => { void handleFiles(e.target.files); e.target.value = '' }}
      />
      <div className="flex items-center px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4 shrink-0">
        {onBack ? <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft /></IconCircleBtn> : <div style={{ width: 44 }} />}
      </div>
      <div className="px-5 shrink-0">
        <p className="font-body" style={{ fontSize: 14, color: '#666' }}>{subtitle}</p>
        {freeSlots !== null && (
          <p className="font-body" style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
            {t('onboarding.freeSlotsHint', { count: freeSlots })}
          </p>
        )}
      </div>
      <div className="scroll-y flex-1 px-5 pt-4 pb-4 flex flex-col">
        {photos.length === 0 ? (
          <button
            type="button"
            onClick={() => openPicker()}
            disabled={busy}
            className="w-full flex flex-col items-center justify-center gap-3"
            style={{ flex: 1, minHeight: 260, borderRadius: '1.5rem', background: '#E6E6E6', border: '2px dashed #ccc' }}
          >
            <div className="flex items-center justify-center rounded-full" style={{ width: 64, height: 64, background: '#fff', border: '1.5px solid #ccc' }}>
              <IconPlus size={28} />
            </div>
            <span className="font-body" style={{ fontSize: 14, color: '#8E8E93' }}>{t('onboarding.tapToCapture')}</span>
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="font-heading" style={{ fontSize: 13, color: '#111', textTransform: 'uppercase' }}>
                {freeSlots !== null ? t('onboarding.capturedCount', { count: photos.length, total: freeSlots }) : photos.length}
              </span>
              {!atLimit && (
                <button
                  type="button"
                  onClick={() => openPicker()}
                  disabled={busy}
                  className="font-body flex items-center gap-1"
                  style={{ fontSize: 13, color: '#111' }}
                >
                  <IconPlus size={14} /> {t('onboarding.addMore')}
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {photos.map((p, i) => (
                <div key={p.id} className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '1/1' }}>
                  <button type="button" onClick={() => openPicker(p.id)} disabled={busy} className="w-full h-full block">
                    <img src={p.dataUrl} alt="" className="w-full h-full object-cover" />
                  </button>
                  <span
                    className="absolute bottom-1.5 left-1.5 font-heading"
                    style={{ fontSize: 10, background: 'rgba(0,0,0,0.65)', color: '#fff', borderRadius: 6, padding: '2px 6px', pointerEvents: 'none' }}
                  >
                    {freeSlots !== null ? `${i + 1}/${freeSlots}` : i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePhoto(p.id)}
                    className="absolute top-1.5 right-1.5 icon-circle"
                    style={{ width: 26, height: 26, background: 'rgba(0,0,0,0.75)' }}
                    aria-label={t('common.removePhoto')}
                  >
                    <IconX size={12} />
                  </button>
                </div>
              ))}
              {!atLimit && (
                <button
                  type="button"
                  onClick={() => openPicker()}
                  disabled={busy}
                  className="rounded-2xl flex items-center justify-center"
                  style={{ aspectRatio: '1/1', background: '#E6E6E6', border: '1.5px dashed #ccc' }}
                >
                  <IconPlus size={22} />
                </button>
              )}
              {freeSlots !== null && atLimit && (
                <div className="rounded-2xl flex items-center justify-center" style={{ aspectRatio: '1/1', background: '#E6E6E6' }}>
                  <div style={{ color: '#999' }}><IconLock size={22} /></div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shrink-0">
        <div className="flex items-center justify-center gap-2" style={{ marginBottom: 12 }}>
          <div style={{ color: GREEN }}><IconCheck size={14} /></div>
          <span className="font-body" style={{ fontSize: 12, color: '#666' }}>{t('onboarding.healthGrowthHint')}</span>
        </div>
        <button
          type="button"
          disabled={photos.length === 0}
          onClick={() => onDone(photos)}
          className="btn-fill btn-forward w-full"
          style={{ height: 56, fontSize: 15 }}
        >
          {doneLabel}
          <span className="btn-forward__arrow"><IconChevronRight size={20} /></span>
        </button>
        {onSkip && (
          <button type="button" onClick={onSkip} className="font-body w-full text-center mt-3" style={{ fontSize: 13, color: '#8E8E93', textDecoration: 'underline' }}>
            {t('onboarding.skipForNow')}
          </button>
        )}
      </div>
      {toast && (
        <div className="fixed left-5 right-5 z-[80]" style={{ bottom: 'calc(24px + env(safe-area-inset-bottom,0px))' }}>
          <div className="rounded-2xl px-4 py-3 text-center" style={{ background: '#000' }}>
            <span className="font-body" style={{ fontSize: 13, color: '#fff' }}>{toast}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Screen: Onboarding / Bulk — Analysis result ──────────────────────────────

interface DraftPlant {
  photo: string
  name: string
  room: string
  category: string
  waterNeed: WaterNeed
  lightNeed: LightNeed
  humidityNeed: 'low' | 'normal' | 'high'
  temperatureRangeC: string
  careNote: string
  wateringDays: number[]
  wateringFrequency: WateringFrequency
  wateringCycleAnchor: string | null
  isToxicToPets: boolean | null
  toxicityNotes: string
  confidence: number
  /** false when the AI call failed or errored and this is just a placeholder the user must confirm/rename. */
  identified: boolean
  error?: string
}

const PLANT_CATEGORIES = ['Houseplant', 'Succulent', 'Herb', 'Flowering', 'Tree', 'Other']

const FALLBACK_DRAFT_BASE = {
  name: 'Unknown plant', room: 'Unknown', category: 'Houseplant', waterNeed: 'Moderate' as WaterNeed, lightNeed: 'Medium' as LightNeed,
  humidityNeed: 'normal' as const, temperatureRangeC: '18-27°C', careNote: '',
  wateringFrequency: 'weekly' as WateringFrequency, wateringCycleAnchor: null as string | null,
  isToxicToPets: null, toxicityNotes: '', confidence: 40, identified: false as const,
}

function withMinDelay<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.all([promise, new Promise((r) => setTimeout(r, ms))]).then(([value]) => value)
}

async function identifyPhoto(dataUrl: string, language: AppLanguage = 'en', primaryDay = 0): Promise<DraftPlant> {
  try {
    const result = await analyzePlantImage(dataUrl, [], language)
    if (!result.ok) {
      return { photo: dataUrl, ...FALLBACK_DRAFT_BASE, wateringDays: [primaryDay], error: result.error }
    }
    const waterNeed = mapWaterNeedToForm(result.data.waterNeed)
    const wateringFrequency = frequencyForWaterNeed(waterNeed)
    return {
      photo: dataUrl,
      name: result.data.name,
      room: 'Unknown',
      category: 'Houseplant',
      waterNeed,
      lightNeed: mapLightNeedToForm(result.data.lightNeed),
      humidityNeed: result.data.humidityNeed,
      temperatureRangeC: result.data.temperatureRangeC,
      careNote: result.data.careNotes.slice(0, 300),
      wateringDays: batchedWateringDays(waterNeed, primaryDay),
      wateringFrequency,
      wateringCycleAnchor: cycleAnchorForFrequency(wateringFrequency, null),
      isToxicToPets: result.data.isToxicToPets,
      toxicityNotes: result.data.toxicityNotes ?? '',
      confidence: confidenceLabel(result.data.confidence),
      identified: true,
    }
  } catch (error) {
    console.error('[myJungle] identify failed:', error)
    return { photo: dataUrl, ...FALLBACK_DRAFT_BASE, wateringDays: [primaryDay], error: error instanceof Error ? error.message : String(error) }
  }
}

function DayPickerSheet({ selected, onSelect, onClose }: { selected: number; onSelect: (day: number) => void; onClose: () => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close(action?: () => void) { setOpen(false); setTimeout(() => action?.(), 180) }
  return (
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onClose)} />
      <div className="fixed left-0 right-0 bottom-0 z-[70]">
        <div className={`sheet-panel ${open ? 'is-open' : ''} p-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-1`}>
          <span className="caption-eyebrow block px-4 pt-2 pb-1">{t('dayPicker.title')}</span>
          {FULL_DAY_NAMES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => close(() => onSelect(i))}
              className="font-heading text-left px-4 py-3 flex items-center justify-between"
              style={{ fontSize: 16 }}
            >
              {fullDayName(t, i)}
              {i === selected && <IconCheck size={18} />}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange, onAdd, addActive }: { active: Tab | null; onChange: (t: Tab) => void; onAdd: () => void; addActive?: boolean }) {
  const { t } = useTranslation()
  const items: { id: Tab; labelKey: string; icon: (p: { size?: number }) => React.ReactNode }[] = [
    { id: 'home', labelKey: 'tabBar.home', icon: IconNavHome },
    { id: 'days', labelKey: 'tabBar.days', icon: IconNavCalendar },
  ]
  const items2: { id: Tab; labelKey: string; icon: (p: { size?: number }) => React.ReactNode }[] = [
    { id: 'health', labelKey: 'tabBar.health', icon: IconNavHealth },
    { id: 'profile', labelKey: 'tabBar.settings', icon: IconNavSettings },
  ]
  return (
    <div className="fixed left-4 right-4 z-40" style={{ bottom: 'calc(14px + env(safe-area-inset-bottom,0px))' }}>
      <div className="tab-bar">
        {items.map((item) => (
          <button key={item.id} type="button" onClick={() => onChange(item.id)} className={`tab-bar__item ${active === item.id ? 'is-active' : ''}`}>
            <div className="tab-bar__icon-badge"><item.icon size={20} /></div>
            <span className="tab-bar__label">{t(item.labelKey)}</span>
          </button>
        ))}
        <button type="button" onClick={onAdd} className={`tab-bar__item ${addActive ? 'is-active' : ''}`} aria-label={t('common.addPlant')}>
          <div className="tab-bar__icon-badge"><IconNavAdd size={20} /></div>
          <span className="tab-bar__label">{t('tabBar.add')}</span>
        </button>
        {items2.map((item) => (
          <button key={item.id} type="button" onClick={() => onChange(item.id)} className={`tab-bar__item ${active === item.id ? 'is-active' : ''}`}>
            <div className="tab-bar__icon-badge"><item.icon size={20} /></div>
            <span className="tab-bar__label">{t(item.labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Screen: Home ─────────────────────────────────────────────────────────────

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function fullDayName(t: (key: string) => string, dayIdx: number): string {
  return t(`weekday.${WEEKDAY_KEYS[dayIdx]}`)
}

function shortDayName(t: (key: string) => string, dayIdx: number): string {
  return t(`weekdayShort.${WEEKDAY_KEYS[dayIdx]}`)
}

function nextWaterStatus(plant: Plant, todayIdx: number, t: (key: string, opts?: Record<string, unknown>) => string): { label: string; dotColor: string } {
  if (plant.isWateredToday) {
    const dow = plant.lastWateredAt ? (new Date(plant.lastWateredAt).getDay() + 6) % 7 : null
    return { label: dow !== null ? t('home.wateredOn', { day: fullDayName(t, dow) }) : t('home.wateredToday'), dotColor: '#8E8E93' }
  }
  if (isPlantDueToday(plant, todayIdx)) {
    return { label: t('home.waterToday'), dotColor: GREEN }
  }
  for (let step = 1; step <= 7; step++) {
    const dayIdx = (todayIdx + step) % 7
    const refDate = new Date()
    refDate.setDate(refDate.getDate() + step)
    if (isPlantDueOnDay(plant, dayIdx, refDate)) {
      return { label: step === 1 ? t('home.nextWaterTomorrow') : t('home.nextWaterOn', { day: fullDayName(t, dayIdx) }), dotColor: GREEN }
    }
  }
  return { label: t('home.noSchedule'), dotColor: '#8E8E93' }
}

function HomeScreen({
  plants, todayIdx, onOpenPlant, showHabitCard, onDismissHabitCard, onShowHabitPro,
  showProPreviewBanner, onDismissProPreviewBanner, onTryProPreview,
  notificationsEnabled, onOpenNotificationSettings,
}: {
  plants: Plant[]; todayIdx: number; onOpenPlant: (p: Plant) => void
  showHabitCard: boolean; onDismissHabitCard: () => void; onShowHabitPro: () => void
  showProPreviewBanner: boolean; onDismissProPreviewBanner: () => void
  onTryProPreview: () => Promise<{ ok: boolean; error?: string }>
  notificationsEnabled: boolean; onOpenNotificationSettings: () => void
}) {
  const { t } = useTranslation()
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [previewError, setPreviewError] = useState<string | null>(null)
  const thirsty = plants.filter((p) => isPlantDueToday(p, todayIdx) && !p.isWateredToday).length
  const healthScores = plants.map((p) => computeHealthStatus(p, todayIdx, t).score)
  const avgHealth = healthScores.length > 0 ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length) : 0

  async function handleTryPreview() {
    setPreviewState('loading')
    setPreviewError(null)
    const result = await onTryProPreview()
    if (result.ok) {
      setPreviewState('success')
    } else {
      setPreviewState('error')
      setPreviewError(result.error ?? t('analysisResult.proPreviewError'))
    }
  }

  return (
    <div className="app-shell-light scroll-y h-full px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-28">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-heading" style={{ fontSize: 22, color: '#000' }}>{t('home.title')}</h1>
        <button
          type="button"
          onClick={onOpenNotificationSettings}
          className="icon-circle"
          style={{ background: notificationsEnabled ? '#000' : '#e5e5e0' }}
          aria-label={t('notificationSettings.title')}
        >
          <div style={{ color: notificationsEnabled ? '#fff' : '#8E8E93' }}>
            {notificationsEnabled ? <IconBell size={18} /> : <IconBellOff size={18} />}
          </div>
        </button>
      </div>
      <div className="stat-hero mb-3">
        <span className="stat-hero__value">{plants.length}</span>
        <span className="stat-hero__label">{t('home.totalPlants')}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="stat-pill" style={{ background: '#E6E6E6' }}>
          <span className="stat-pill__value" style={{ color: '#000' }}>{thirsty}</span>
          <span className="stat-pill__label">{t('home.thirstyPlants')}</span>
        </div>
        <div className="stat-pill" style={{ background: '#000' }}>
          <span className="stat-pill__value" style={{ color: GREEN }}>{plants.length === 0 ? '—' : `${avgHealth}%`}</span>
          <span className="stat-pill__label">{t('home.wateringRhythm')}</span>
        </div>
      </div>
      {showProPreviewBanner && previewState !== 'success' && (
        <div className="rounded-2xl p-4 mb-6 relative" style={{ background: '#000' }}>
          <div
            role="button"
            tabIndex={0}
            aria-label={t('common.dismiss')}
            onClick={onDismissProPreviewBanner}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onDismissProPreviewBanner() }}
            className="absolute flex items-center justify-center rounded-full"
            style={{ top: 12, right: 12, width: 24, height: 24, color: 'rgba(255,255,255,0.5)' }}
          >
            <IconX size={14} />
          </div>
          <div className="flex items-center gap-2 mb-1 pr-6">
            <div style={{ color: GREEN }}><IconSparkles size={16} /></div>
            <span className="font-heading" style={{ fontSize: 14, color: '#fff', textTransform: 'uppercase' }}>{t('analysisResult.proPreviewTitle')}</span>
          </div>
          <p className="font-body" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>
            {t('analysisResult.proPreviewBody')}
          </p>
          <button
            type="button"
            onClick={() => void handleTryPreview()}
            disabled={previewState === 'loading'}
            className="btn-fill w-full"
            style={{ height: 44, fontSize: 13 }}
          >
            {previewState === 'loading' ? t('analysisResult.proPreviewActivating') : t('analysisResult.proPreviewTryFree')}
          </button>
          {previewState === 'error' && previewError && (
            <p className="font-body text-center mt-2" style={{ fontSize: 11, color: '#ff8a8a' }}>{previewError}</p>
          )}
        </div>
      )}
      {previewState === 'success' && (
        <div className="rounded-2xl p-4 mb-6 flex items-center gap-2 justify-center" style={{ background: '#000' }}>
          <div style={{ color: GREEN }}><IconSparkles size={16} /></div>
          <span className="font-heading" style={{ fontSize: 13, color: GREEN, textTransform: 'uppercase' }}>{t('analysisResult.proPreviewActivated')}</span>
        </div>
      )}
      {showHabitCard && (
        <button
          type="button"
          onClick={onShowHabitPro}
          className="card-white p-4 flex items-center gap-3 w-full text-left mb-6 relative"
        >
          <div className="flex items-center justify-center rounded-full shrink-0" style={{ width: 44, height: 44, background: '#111', color: GREEN }}>
            <IconLeaf size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-heading" style={{ fontSize: 15 }}>{t('home.habitCardTitle')}</div>
            <div className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>{t('home.habitCardBody')}</div>
          </div>
          <div
            role="button"
            tabIndex={0}
            aria-label={t('common.dismiss')}
            onClick={(e) => { e.stopPropagation(); onDismissHabitCard() }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onDismissHabitCard() } }}
            className="flex items-center justify-center rounded-full shrink-0"
            style={{ width: 24, height: 24, color: '#8E8E93' }}
          >
            <IconX size={14} />
          </div>
        </button>
      )}
      {plants.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div style={{ color: '#c7c7cc' }}><IconLeaf size={40} /></div>
          <p className="font-body" style={{ fontSize: 14, color: '#666' }}>{t('home.emptyState')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {plants.map((p) => {
            const status = nextWaterStatus(p, todayIdx, t)
            return (
              <button key={p.id} type="button" onClick={() => onOpenPlant(p)} className="plant-tile text-left">
                <div className="plant-tile__photo">
                  <PlantPhoto photo={p.photo} alt={p.name} className="w-full h-full object-cover block" />
                </div>
                <div className="plant-tile__label">
                  <div className="font-heading truncate" style={{ fontSize: 15, color: '#111' }}>{p.name}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span style={{ width: 6, height: 6, borderRadius: 9999, background: status.dotColor, flexShrink: 0 }} />
                    <span className="font-body truncate" style={{ fontSize: 11, color: '#8E8E93' }}>{status.label}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Screen: Days ─────────────────────────────────────────────────────────────

function DaysScreen({ plants, todayIdx, onToggleWatered, onBack, onOpenScheduleSettings }: {
  plants: Plant[]; todayIdx: number; onToggleWatered: (id: string) => void; onBack: () => void
  onOpenScheduleSettings: () => void
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(todayIdx)
  const groupedDays = useMemo(() => {
    const set = new Set<number>()
    plants.forEach((p) => p.wateringDays.forEach((d) => set.add(d)))
    return set
  }, [plants])
  const todayName = fullDayName(t, selected)
  const duePlants = plants.filter((p) => isPlantDueOnDay(p, selected, getDateForDayIndex(selected)))
  const doneCount = duePlants.filter((p) => p.isWateredToday).length
  const allDone = duePlants.length > 0 && doneCount === duePlants.length

  function handleMarkAll() {
    duePlants.forEach((p) => {
      if (allDone ? p.isWateredToday : !p.isWateredToday) onToggleWatered(p.id)
    })
  }

  return (
    <div className="app-shell-light scroll-y h-full px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-28">
      <div className="flex items-center justify-between mb-5">
        <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft size={20} /></IconCircleBtn>
        <IconCircleBtn onClick={onOpenScheduleSettings} label={t('scheduleSettings.title')}><IconMenu size={20} /></IconCircleBtn>
      </div>
      <p className="font-body" style={{ fontSize: 15, color: '#666', marginBottom: 20 }}>
        {t('days.groupedSummary', { count: plants.length, days: groupedDays.size, daysPlural: groupedDays.size === 1 ? '' : 's' })}
      </p>
      <div className="flex justify-between mb-6">
        {DAYS.map((d, i) => (
          <div key={d} className="flex flex-col items-center gap-1.5">
            <DayPill label={shortDayName(t, i)[0]} active={i === selected} onClick={() => setSelected(i)} />
            <span style={{ width: 5, height: 5, borderRadius: 9999, background: groupedDays.has(i) ? '#000' : 'transparent' }} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className="font-heading" style={{ fontSize: 18, color: '#000' }}>
          {selected === todayIdx ? t('days.today', { day: todayName }) : todayName}
        </span>
        <span className="font-heading" style={{ fontSize: 18, color: '#000' }}>
          {t('days.duePlants', { count: duePlants.length })}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {duePlants.length === 0 && (
          <p className="font-body" style={{ fontSize: 14, color: '#8E8E93' }}>{t('days.noPlantsScheduled')}</p>
        )}
        {duePlants.map((p) => (
          <button key={p.id} type="button" onClick={() => onToggleWatered(p.id)} className="check-row text-left">
            <PlantPhoto photo={p.photo} alt="" className="rounded-full object-cover shrink-0 w-12 h-12" />
            <span className="font-heading flex-1 min-w-0 truncate" style={{ fontSize: 18, color: '#111' }}>{p.name}</span>
            <div className={`check-circle ${p.isWateredToday ? 'is-checked' : ''}`}>
              {p.isWateredToday && <IconCheck size={14} />}
            </div>
          </button>
        ))}
      </div>
      {duePlants.length > 0 && (
        <button type="button" onClick={handleMarkAll} className="btn-fill w-full mt-4" style={{ height: 56, fontSize: 15 }}>
          {allDone ? t('days.undo') : t('days.markAllWatered', { done: doneCount, total: duePlants.length })}
        </button>
      )}
    </div>
  )
}

// ─── Screen: Plant detail ─────────────────────────────────────────────────────

function PlantDetailScreen({
  plant, user, todayIdx, canScan, onBack, onDelete, onWater, onShowPaywall, onRunHealthCheck, onEdit, onLogGrowth, onViewTimeline,
}: {
  plant: Plant; user: UserState; todayIdx: number; canScan: boolean; onBack: () => void; onDelete: () => void; onWater: () => void
  onShowPaywall: (source: PaywallSource) => void; onRunHealthCheck: () => void; onEdit: () => void; onLogGrowth: () => void
  onViewTimeline: () => void
}) {
  const { t } = useTranslation()
  const [showActions, setShowActions] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const hasAccess = canAccessProFeatures(user)
  const wateringFrequencyLabel = frequencyLabel(plant.wateringFrequency, plant.wateringDays.length)
  const health = computeHealthStatus(plant, todayIdx, t)

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
        <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft /></IconCircleBtn>
        <span className="font-heading truncate px-2" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>{t('plantDetail.title')}</span>
        <IconCircleBtn onClick={() => setShowActions(true)} label={t('common.moreOptions')}><IconDotsHorizontal /></IconCircleBtn>
      </div>
      <div className="scroll-y flex-1 pb-28">
        <div className="px-5" style={{ height: 220 }}>
          <div className="rounded-[1.5rem] overflow-hidden w-full h-full">
            <PlantPhoto photo={plant.photo} alt={plant.name} className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="sheet-body p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-heading" style={{ fontSize: 30 }}>{plant.name}</div>
              {plant.category && (
                <span className="font-body" style={{ fontSize: 13, color: '#8E8E93' }}>{plant.category}</span>
              )}
            </div>
            {hasAccess && (
              <span className="badge-pro-dark shrink-0" style={{ fontSize: 10, padding: '3px 10px' }}>PRO</span>
            )}
          </div>
          {plant.isToxicToPets === true && (
            <div className="flex items-center gap-2 rounded-full px-4 py-3" style={{ background: '#f3ecec' }}>
              <IconAlert size={18} />
              <span className="font-body font-medium" style={{ fontSize: 13 }}>{t('plantDetail.toxicToPets')}</span>
            </div>
          )}
          {plant.isToxicToPets === false && (
            <div className="flex items-center gap-2 rounded-full px-4 py-3" style={{ background: '#e8f9ee' }}>
              <IconPaw size={18} />
              <span className="font-body font-medium" style={{ fontSize: 13 }}>{t('plantDetail.petSafe')}</span>
            </div>
          )}

          <div>
            {plant.healthLogs[0] ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="caption-eyebrow">{t('plantDetail.healthScoreAi')}</span>
                  <span className="font-body font-semibold" style={{ fontSize: 13, color: healthScoreColor(plant.healthLogs[0].healthScore) }}>
                    {plant.healthLogs[0].healthScore}% {plant.healthLogs[0].diagnosis}
                  </span>
                </div>
                <div style={{ height: 10, borderRadius: 9999, background: '#E6E6E6', overflow: 'hidden' }}>
                  <div style={{ width: `${plant.healthLogs[0].healthScore}%`, height: '100%', background: healthScoreColor(plant.healthLogs[0].healthScore), borderRadius: 9999 }} />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="font-body" style={{ fontSize: 11, color: '#8E8E93' }}>{t('plantDetail.wateringRhythm')}</span>
                  <span className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>{health.score}% {health.label}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="caption-eyebrow">{t('plantDetail.wateringRhythm')}</span>
                  <span className="font-body font-bold" style={{ fontSize: 13, color: '#000' }}>{health.score}% {health.label}</span>
                </div>
                <div style={{ height: 10, borderRadius: 9999, background: '#E6E6E6', overflow: 'hidden' }}>
                  <div style={{ width: `${health.score}%`, height: '100%', background: GREEN, borderRadius: 9999 }} />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-full p-4 flex items-center gap-3" style={{ background: '#E6E6E6' }}>
              <div style={{ color: '#000' }}><IconDroplet size={18} /></div>
              <div className="flex flex-col min-w-0">
                <span className="font-heading" style={{ fontSize: 13, color: '#000', lineHeight: 1.2 }}>{t('plantDetail.waterFrequency', { frequency: wateringFrequencyLabel })}</span>
                <span className="font-body truncate" style={{ fontSize: 11, color: '#8E8E93' }}>{t('plantDetail.soilHydration')}</span>
              </div>
            </div>
            <div className="rounded-full p-4 flex items-center gap-3" style={{ background: '#E6E6E6' }}>
              <div style={{ color: '#000' }}><IconSun size={18} /></div>
              <div className="flex flex-col min-w-0">
                <span className="font-heading" style={{ fontSize: 13, color: '#000', lineHeight: 1.2 }}>{plant.lightNeed === 'High' ? t('plantDetail.lightDirect') : plant.lightNeed === 'Low' ? t('plantDetail.lightShade') : t('plantDetail.lightIndirect')}</span>
                <span className="font-body truncate" style={{ fontSize: 11, color: '#8E8E93' }}>{t('plantDetail.brightFiltered')}</span>
              </div>
            </div>
            <div className="rounded-full p-4 flex items-center gap-3" style={{ background: '#E6E6E6' }}>
              <div style={{ color: '#000' }}><IconThermometer size={18} /></div>
              <div className="flex flex-col min-w-0">
                <span className="font-heading" style={{ fontSize: 13, color: '#000', lineHeight: 1.2 }}>{t('plantDetail.temp', { range: plant.temperatureRangeC ?? '18-27°C' })}</span>
                <span className="font-body truncate" style={{ fontSize: 11, color: '#8E8E93' }}>{t('plantDetail.keepStable')}</span>
              </div>
            </div>
            <div className="rounded-full p-4 flex items-center gap-3" style={{ background: '#E6E6E6' }}>
              <div style={{ color: '#000' }}><IconDroplets size={18} /></div>
              <div className="flex flex-col min-w-0">
                <span className="font-heading" style={{ fontSize: 13, color: '#000', lineHeight: 1.2 }}>{plant.humidityNeed === 'high' ? t('plantDetail.humidityHigh') : plant.humidityNeed === 'low' ? t('plantDetail.humidityLow') : t('plantDetail.humidityNormal')}</span>
                <span className="font-body truncate" style={{ fontSize: 11, color: '#8E8E93' }}>{t('plantDetail.mistRegularly')}</span>
              </div>
            </div>
          </div>

          <div>
            <span className="caption-eyebrow">{t('plantDetail.wateringTimeline')}</span>
            <div className="flex items-center gap-2 mt-2">
              <span className="font-heading" style={{ fontSize: 11, background: '#000', color: GREEN, borderRadius: 8, padding: '4px 8px', textTransform: 'uppercase' }}>
                {plant.lastWateredAt ? new Date(plant.lastWateredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
              </span>
              <div style={{ flex: 1, height: 1, background: '#eee' }} />
              <span className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>
                {plant.lastWateredAt ? t('plantDetail.lastWatered', { when: daysAgoLabel(plant.lastWateredAt, t) }) : nextWaterStatus(plant, todayIdx, t).label}
              </span>
            </div>
          </div>

          <div>
            <span className="caption-eyebrow">{t('plantDetail.healthLog')}</span>
            {plant.healthLogs.length === 0 ? (
              <p className="font-body mt-2" style={{ fontSize: 13, color: '#8E8E93' }}>{t('plantDetail.noHealthChecks')}</p>
            ) : (
              <div className="flex flex-col gap-2 mt-2">
                {plant.healthLogs.map((log) => {
                  const healthy = log.healthScore >= 70
                  const isOpen = expandedLog === log.id
                  return (
                    <div key={log.id} className="rounded-2xl overflow-hidden" style={{ background: '#E6E6E6' }}>
                      <button
                        type="button"
                        onClick={() => setExpandedLog(isOpen ? null : log.id)}
                        className="flex items-center gap-3 w-full p-3 text-left"
                      >
                        <span className="font-heading shrink-0" style={{ fontSize: 11, background: GREEN, color: '#000', borderRadius: 8, padding: '4px 8px' }}>
                          {new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
                        </span>
                        <span style={{ width: 6, height: 6, borderRadius: 9999, background: healthScoreColor(log.healthScore), flexShrink: 0 }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-heading truncate" style={{ fontSize: 14 }}>{log.diagnosis}</div>
                          <div className="font-body truncate" style={{ fontSize: 11, color: healthy ? '#0a8f3f' : '#8E8E93' }}>
                            {healthy ? t('plantDetail.healthy') : log.treatmentNotes}
                          </div>
                        </div>
                        <div style={{ color: '#8E8E93', transform: isOpen ? 'rotate(180deg)' : 'none' }}><IconChevronDown size={16} /></div>
                      </button>
                      {isOpen && (
                        <div className="px-3 pb-3 flex flex-col gap-1.5">
                          {log.recommendedActions.map((a, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <div style={{ color: '#111', marginTop: 2 }}><IconCheck size={14} /></div>
                              <span className="font-body" style={{ fontSize: 13 }}>{a}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <button
              type="button"
              onClick={canScan ? onRunHealthCheck : () => onShowPaywall('health_scan')}
              className="font-heading w-full mt-3 flex items-center justify-center gap-2"
              style={{ height: 48, borderRadius: 9999, background: 'transparent', border: `1.5px solid ${GREEN}`, color: '#0a8f3f', textTransform: 'uppercase', fontSize: 13 }}
            >
              {!canScan && <IconLock size={14} />}
              {t('plantDetail.runNewHealthCheck')}
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="caption-eyebrow">{t('plantDetail.growHistory')}</span>
              {!hasAccess && (
                <span className="badge-pro-dark" style={{ fontSize: 10, padding: '3px 10px' }}>PRO</span>
              )}
            </div>
            <div style={{ position: 'relative', minHeight: hasAccess ? undefined : 96 }}>
              <div style={hasAccess ? undefined : { filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' }}>
                {plant.history.length === 0 ? (
                  <p className="font-body mt-2" style={{ fontSize: 13, color: '#8E8E93' }}>{t('plantDetail.noGrowthCheckins')}</p>
                ) : (
                  <div className="flex flex-col gap-2 mt-2">
                    {plant.history.slice(0, 2).map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: '#E6E6E6' }}>
                        <PlantPhoto photo={entry.photo} alt="" className="rounded-xl object-cover shrink-0 w-12 h-12" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-heading shrink-0" style={{ fontSize: 11, background: GREEN, color: '#000', borderRadius: 8, padding: '3px 7px' }}>
                              {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
                            </span>
                            {entry.heightCm !== undefined && entry.heightCm > 0 && (
                              <span className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>{entry.heightCm} cm</span>
                            )}
                            {entry.estimatedAge && (
                              <span className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>· {entry.estimatedAge}</span>
                            )}
                          </div>
                          <div className="font-body truncate mt-0.5" style={{ fontSize: 12, color: '#555' }}>{entry.note}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {hasAccess && plant.history.length > 0 && (
                  <button
                    type="button"
                    onClick={onViewTimeline}
                    className="font-heading flex items-center gap-1 mt-3"
                    style={{ fontSize: 13, color: '#111', textTransform: 'uppercase' }}
                  >
                    {t('plantDetail.viewFullTimeline')}
                    <IconChevronRight size={14} />
                  </button>
                )}
                {hasAccess && (
                  <button
                    type="button"
                    onClick={onLogGrowth}
                    className="font-heading w-full mt-3"
                    style={{ height: 48, borderRadius: 9999, background: 'transparent', border: '1.5px solid #111', color: '#111', textTransform: 'uppercase', fontSize: 13 }}
                  >
                    {t('plantDetail.newGrowthScan')}
                  </button>
                )}
              </div>
              {!hasAccess && (
                <button
                  type="button"
                  onClick={() => onShowPaywall('growth_tab')}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                >
                  <div className="flex items-center justify-center rounded-full" style={{ width: 36, height: 36, background: '#111' }}>
                    <div style={{ color: GREEN }}><IconLock size={16} /></div>
                  </div>
                  <span className="font-heading" style={{ fontSize: 12, color: '#111', textTransform: 'uppercase' }}>{t('plantDetail.unlockWithPro')}</span>
                </button>
              )}
            </div>
          </div>

          <button type="button" onClick={onWater} className="btn-fill w-full" style={{ height: 52, fontSize: 15 }}>
            {plant.isWateredToday ? t('plantDetail.watered') : t('plantDetail.waterNow')}
          </button>
        </div>
      </div>
      {showActions && createPortal(
        <>
          <div className="sheet-backdrop is-open" onClick={() => setShowActions(false)} />
          <div className="fixed left-0 right-0 bottom-0 z-[70]">
            <div className="sheet-panel is-open p-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-1">
              <button
                type="button"
                onClick={() => { setShowActions(false); onEdit() }}
                className="font-heading text-left px-4 py-4"
                style={{ fontSize: 16 }}
              >
                {t('plantDetail.editPlant')}
              </button>
              <button
                type="button"
                onClick={() => { setShowActions(false); setShowDelete(true) }}
                className="font-heading text-left px-4 py-4"
                style={{ fontSize: 16, color: '#FF3B30' }}
              >
                {t('plantDetail.deletePlant')}
              </button>
            </div>
          </div>
        </>,
        document.body,
      )}
      {showDelete && (
        <ConfirmSheet
          title={t('plantDetail.deleteTitle')}
          body={t('plantDetail.deleteBody', { name: plant.name })}
          confirmLabel={t('common.delete')}
          danger
          onCancel={() => setShowDelete(false)}
          onConfirm={() => { setShowDelete(false); onDelete() }}
        />
      )}
    </div>
  )
}

function ConfirmSheet({ title, body, confirmLabel, danger, onCancel, onConfirm }: {
  title: string; body: string; confirmLabel: string; danger?: boolean; onCancel: () => void; onConfirm: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close(action: () => void) { setOpen(false); setTimeout(action, 180) }
  return createPortal(
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onCancel)} />
      <div className="fixed left-4 right-4 z-[70]" style={{ top: '50%', transform: 'translateY(-50%)' }}>
        <div className={`modal-card ${open ? 'is-open' : ''} p-5 flex flex-col gap-4`}>
          <span className="font-heading" style={{ fontSize: 18 }}>{title}</span>
          <p className="font-body" style={{ fontSize: 14, color: '#444', lineHeight: 1.5 }}>{body}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => close(onCancel)} className="btn-ghost-dark flex-1" style={{ height: 46, background: '#E6E6E6', color: '#111' }}>{t('common.cancel')}</button>
            <button
              type="button"
              onClick={() => close(onConfirm)}
              className="flex-1 font-heading"
              style={{ height: 46, borderRadius: 9999, background: danger ? '#FF3B30' : GREEN, color: danger ? '#fff' : '#05170c' }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}

function LanguagePickerSheet({ current, onSelect, onClose }: { current: AppLanguage; onSelect: (l: AppLanguage) => void; onClose: () => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close(action?: () => void) { setOpen(false); setTimeout(() => action?.(), 180) }
  return (
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onClose)} />
      <div className="fixed left-0 right-0 bottom-0 z-[70]">
        <div className={`sheet-panel ${open ? 'is-open' : ''} p-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-1`} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <span className="caption-eyebrow block px-3 pt-2 pb-1">{t('languagePicker.title')}</span>
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => close(() => onSelect(opt.code))}
              className="font-heading text-left px-4 py-3 flex items-center justify-between"
              style={{ fontSize: 16 }}
            >
              {t(opt.labelKey)}
              {opt.code === current && <IconCheck size={18} />}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function NotificationSettingsSheet({ pushNotifications, reminderTime, onToggle, onChangeReminderTime, onClose }: {
  pushNotifications: boolean
  reminderTime: string
  /** Flips the preference and, when turning on, requests OS permission — resolves once settled. */
  onToggle: () => Promise<void>
  onChangeReminderTime: (time: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  // Seeded synchronously (not null) so the status row never pops in after mount —
  // it's refined a moment later by the real async check, without a layout jump.
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>(
    () => (Capacitor.isNativePlatform() ? 'prompt' : 'unavailable'),
  )
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const f = requestAnimationFrame(() => setOpen(true))
    void checkNotificationPermissionStatus().then(setPermissionStatus)
    return () => cancelAnimationFrame(f)
  }, [])

  function close(action?: () => void) { setOpen(false); setTimeout(() => action?.(), 180) }

  async function handleToggle() {
    setBusy(true)
    try {
      await onToggle()
      setPermissionStatus(await checkNotificationPermissionStatus())
    } finally {
      setBusy(false)
    }
  }

  const statusLabel = permissionStatus === 'granted' ? t('notificationSettings.permissionGranted')
    : permissionStatus === 'denied' ? t('notificationSettings.permissionDenied')
    : permissionStatus === 'prompt' ? t('notificationSettings.permissionPrompt')
    : t('notificationSettings.permissionUnavailable')
  const statusColor = permissionStatus === 'granted' ? '#0a8f3f' : permissionStatus === 'denied' ? '#FF3B30' : '#8E8E93'
  const hasValidTime = /^\d{2}:\d{2}$/.test(reminderTime)
  // The button stays mounted at all times (never removed) — only its enabled/label state changes,
  // so the sheet never resizes as permissions or the toggle change.
  const alreadyEnabled = pushNotifications && permissionStatus !== 'denied'
  const buttonDisabled = busy || alreadyEnabled || !hasValidTime

  return (
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onClose)} />
      <div className="fixed left-0 right-0 bottom-0 z-[70]">
        <div className={`sheet-panel ${open ? 'is-open' : ''} p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-4`}>
          <div className="flex items-center justify-between">
            <span className="font-heading" style={{ fontSize: 18 }}>{t('notificationSettings.title')}</span>
            <IconCircleBtn onClick={() => close(onClose)} label={t('common.close')}><IconX size={16} /></IconCircleBtn>
          </div>
          <p className="font-body" style={{ fontSize: 13, color: '#8E8E93' }}>{t('notificationSettings.description')}</p>

          {permissionStatus !== 'unavailable' && (
            <div className="flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: '#E6E6E6' }}>
              <span style={{ width: 8, height: 8, borderRadius: 9999, background: statusColor, flexShrink: 0 }} />
              <span className="font-body" style={{ fontSize: 13, color: '#444' }}>{statusLabel}</span>
            </div>
          )}
          {/* Fixed-height slot reserved regardless of content, so the denied hint appearing/disappearing never shifts the layout. */}
          <div style={{ minHeight: 32 }}>
            {permissionStatus === 'denied' && (
              <p className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>
                {t('notificationSettings.deniedHint')}
              </p>
            )}
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: '#E6E6E6' }}>
            <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid #eee' }}>
              <span className="font-heading" style={{ fontSize: 15, color: '#111' }}>{t('settings.wateringReminders')}</span>
              <Toggle on={pushNotifications} onChange={() => void handleToggle()} />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="font-body" style={{ fontSize: 14, color: '#111' }}>{t('settings.reminderTime')}</span>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => onChangeReminderTime(e.target.value)}
                className="font-body"
                style={{ fontSize: 14, border: 'none', borderRadius: 8, padding: '4px 8px', background: '#fff', color: '#111' }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleToggle()}
            disabled={buttonDisabled}
            className="btn-fill w-full"
            style={{ height: 52, fontSize: 15, opacity: buttonDisabled ? 0.5 : 1 }}
          >
            {alreadyEnabled ? t('notificationSettings.enabledLabel') : t('notificationSettings.enableButton')}
          </button>
        </div>
      </div>
    </>
  )
}

function WateringScheduleSettingsSheet({
  primaryWateringDay, groupWateringDays, customScheduleCount, onChangePrimaryDay, onChangeGroupingStrategy, onRecalculateAll, onClose,
}: {
  primaryWateringDay: number
  groupWateringDays: boolean
  /** Plants currently on a hand-edited schedule — drives whether "recalculate" has anything left to do. */
  customScheduleCount: number
  onChangePrimaryDay: (day: number) => void
  onChangeGroupingStrategy: (groupIntoFewerDays: boolean) => void
  onRecalculateAll: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [showDayPicker, setShowDayPicker] = useState(false)

  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close(action?: () => void) { setOpen(false); setTimeout(() => action?.(), 180) }

  // Nothing left to reconcile once no plant has a hand-edited schedule diverging
  // from the current global settings — stays mounted either way, just disabled.
  const recalculateDisabled = customScheduleCount === 0

  return (
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onClose)} />
      <div className="fixed left-0 right-0 bottom-0 z-[70]">
        <div className={`sheet-panel ${open ? 'is-open' : ''} p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-4`}>
          <div className="flex items-center justify-between">
            <span className="font-heading" style={{ fontSize: 18 }}>{t('scheduleSettings.title')}</span>
            <IconCircleBtn onClick={() => close(onClose)} label={t('common.close')}><IconX size={16} /></IconCircleBtn>
          </div>
          <p className="font-body" style={{ fontSize: 13, color: '#8E8E93' }}>{t('scheduleSettings.description')}</p>

          <div className="rounded-2xl overflow-hidden" style={{ background: '#E6E6E6' }}>
            <button
              type="button"
              onClick={() => setShowDayPicker(true)}
              className="flex items-center justify-between w-full px-4 py-3.5"
              style={{ borderBottom: '1px solid #d8d8d8' }}
            >
              <span className="font-heading" style={{ fontSize: 15, color: '#111' }}>{t('scheduleSettings.primaryDay')}</span>
              <span className="flex items-center gap-1.5">
                <span className="font-body" style={{ fontSize: 14, color: '#666' }}>{fullDayName(t, primaryWateringDay)}</span>
                <IconChevronRight size={16} />
              </span>
            </button>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="min-w-0 pr-3">
                <div className="font-heading" style={{ fontSize: 15, color: '#111' }}>{t('scheduleSettings.groupToggle')}</div>
                <div className="font-body" style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{t('scheduleSettings.groupToggleHint')}</div>
              </div>
              <Toggle on={groupWateringDays} onChange={onChangeGroupingStrategy} />
            </div>
          </div>

          {/* Fixed-height slot reserved regardless of content, so this note appearing/disappearing never shifts the layout. */}
          <div style={{ minHeight: 20 }}>
            {customScheduleCount > 0 && (
              <p className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>
                {t('scheduleSettings.customScheduleNote', { count: customScheduleCount })}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onRecalculateAll}
            disabled={recalculateDisabled}
            className="btn-fill w-full"
            style={{ height: 52, fontSize: 15, opacity: recalculateDisabled ? 0.5 : 1 }}
          >
            {recalculateDisabled ? t('scheduleSettings.upToDateLabel') : t('scheduleSettings.recalculateButton')}
          </button>
        </div>
      </div>
      {showDayPicker && (
        <DayPickerSheet
          selected={primaryWateringDay}
          onClose={() => setShowDayPicker(false)}
          onSelect={onChangePrimaryDay}
        />
      )}
    </>
  )
}

// ─── Screen: Edit plant ─────────────────────────────────────────────────────

function EditPlantScreen({ plant, primaryDay, onBack, onSave }: {
  plant: Plant; primaryDay: number; onBack: () => void
  onSave: (updates: Pick<Plant, 'name' | 'category' | 'wateringDays' | 'scheduleDays' | 'isCustomSchedule'>) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(plant.name)
  const [category, setCategory] = useState(plant.category ?? 'Houseplant')
  const [day1, setDay1] = useState(plant.wateringDays[0] ?? primaryDay)
  const [needsSecondDay, setNeedsSecondDay] = useState(plant.wateringDays.length >= 2)
  const [day2, setDay2] = useState(plant.wateringDays[1] ?? secondaryWateringDay(primaryDay))

  function handleSave() {
    const days = needsSecondDay ? [day1, day2].filter((d, i, arr) => arr.indexOf(d) === i).sort((a, b) => a - b) : [day1]
    onSave({
      name: name.trim() || plant.name,
      category,
      wateringDays: days,
      scheduleDays: days.map((i) => DAYS[i]),
      isCustomSchedule: true,
    })
  }

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
        <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft /></IconCircleBtn>
        <span className="font-heading" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>{t('editPlantScreen.title')}</span>
        <div style={{ width: 44 }} />
      </div>
      <div className="scroll-y flex-1 px-5 pt-2 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase' }}>{t('editPlantScreen.plantName')}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="font-heading px-4"
            style={{ height: 52, fontSize: 16, color: '#fff', background: 'var(--color-surface)', borderRadius: 14, border: 'none' }}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase' }}>{t('editPlantScreen.category')}</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="font-body px-4"
            style={{ height: 52, fontSize: 15, color: '#fff', background: 'var(--color-surface)', borderRadius: 14, border: 'none' }}
          >
            {PLANT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase' }}>{needsSecondDay ? t('editPlantScreen.wateringDay1') : t('editPlantScreen.wateringDay')}</span>
          <select
            value={day1}
            onChange={(e) => setDay1(Number(e.target.value))}
            className="font-body px-4"
            style={{ height: 52, fontSize: 15, color: '#fff', background: 'var(--color-surface)', borderRadius: 14, border: 'none' }}
          >
            {FULL_DAY_NAMES.map((_, i) => <option key={i} value={i}>{fullDayName(t, i)}</option>)}
          </select>
        </label>

        {needsSecondDay && (
          <label className="flex flex-col gap-1.5">
            <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase' }}>{t('editPlantScreen.wateringDay2')}</span>
            <select
              value={day2}
              onChange={(e) => setDay2(Number(e.target.value))}
              className="font-body px-4"
              style={{ height: 52, fontSize: 15, color: '#fff', background: 'var(--color-surface)', borderRadius: 14, border: 'none' }}
            >
              {FULL_DAY_NAMES.map((_, i) => <option key={i} value={i}>{fullDayName(t, i)}</option>)}
            </select>
          </label>
        )}

        <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: 'var(--color-surface)' }}>
          <span className="font-body" style={{ fontSize: 14, color: '#fff' }}>{t('editPlantScreen.waterTwiceWeek')}</span>
          <Toggle on={needsSecondDay} onChange={setNeedsSecondDay} />
        </div>
      </div>
      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-3 shrink-0">
        <button type="button" onClick={handleSave} className="btn-fill w-full" style={{ height: 52, fontSize: 15 }}>{t('editPlantScreen.saveChanges')}</button>
      </div>
    </div>
  )
}

// ─── Screen: Manual add (single, AI-assisted) ──────────────────────────────────

function ManualAddScreen({ onBack, onAdd, remainingFreeSlots, isPro, language, primaryDay }: {
  onBack: () => void; onAdd: (draft: DraftPlant) => void; remainingFreeSlots: number; isPro: boolean; language: AppLanguage; primaryDay: number
}) {
  const { t } = useTranslation()
  const [photo, setPhoto] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftPlant | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [remindersOn, setRemindersOn] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleFile(file: File) {
    console.log(`[myJungle] ManualAdd: handling picked file "${file.name}"...`)
    try {
      const compressed = await readAndCompressPhotoFile(file)
      setPhoto(compressed)
      setDraft(null)
      setAnalyzing(true)
      console.log('[myJungle] ManualAdd: sending photo for identification...')
      const result = await withMinDelay(identifyPhoto(compressed, language, primaryDay), 700)
      setDraft(result)
      if (result.error) {
        console.warn('[myJungle] ManualAdd: identification failed, showing fallback draft:', result.error)
        showToast(result.error)
      }
    } catch (error) {
      console.error('[myJungle] manual add analyze failed:', error)
      showToast(error instanceof Error ? error.message : t('common.couldNotAnalyzePhoto'))
    } finally {
      setAnalyzing(false)
    }
  }

  async function openCamera() {
    const granted = await requestCameraPermission()
    if (granted) cameraInputRef.current?.click()
  }

  const wateringFrequencyLabel = draft ? frequencyLabel(draft.wateringFrequency, draft.wateringDays.length) : ''
  const usedSlots = Math.max(0, FREE_PLANT_LIMIT - remainingFreeSlots)

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = '' }} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = '' }} />
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
        <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft /></IconCircleBtn>
        <span className="font-body" style={{ fontSize: 13, color: '#8E8E93' }}>
          {isPro ? t('manualAdd.unlimitedPlants') : t('manualAdd.slotsLeft', { remaining: remainingFreeSlots, total: FREE_PLANT_LIMIT })}
        </span>
      </div>
      <div className="px-5 pb-4 shrink-0" style={{ height: 220 }}>
        {!photo ? (
          <div className="dash-picker w-full h-full flex flex-col items-center justify-center gap-2">
            <IconCamera size={28} />
            <span className="font-body" style={{ fontSize: 14, color: '#fff' }}>{t('manualAdd.uploadPhoto')}</span>
          </div>
        ) : (
          <img src={photo} alt="" className="w-full h-full rounded-[1.5rem] object-cover" />
        )}
      </div>
      <div className="flex-1 min-h-0 flex flex-col" style={{ background: '#fff', borderRadius: '1.75rem 1.75rem 0 0' }}>
        <div className="scroll-y flex-1 px-5 pt-5">
          <button type="button" onClick={() => void openCamera()} className="btn-fill w-full" style={{ height: 52, fontSize: 15 }}>{t('manualAdd.takePhoto')}</button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="btn-outline-ink w-full mt-3"
            style={{ height: 52, fontSize: 15 }}
          >
            {t('manualAdd.fromGallery')}
          </button>

          {analyzing && (
            <div className="flex flex-col items-center gap-2 mt-4">
              <AiThinkingLoader size={120} />
              <p className="font-body text-center" style={{ fontSize: 14, color: '#8E8E93' }}>{t('manualAdd.identifying')}</p>
            </div>
          )}

          {draft && (
            <>
              <div style={{ height: 1, background: '#eee', margin: '20px 0' }} />
              <span className="caption-eyebrow">{t('manualAdd.enterManually')}</span>

              <label className="flex flex-col gap-1.5 mt-4">
                <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase' }}>{t('manualAdd.plantName')}</span>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="font-heading px-4"
                  style={{ height: 48, fontSize: 16, color: '#111', background: '#E6E6E6', borderRadius: 14 }}
                />
              </label>

              <label className="flex flex-col gap-1.5 mt-4">
                <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase' }}>{t('manualAdd.category')}</span>
                <div className="relative">
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                    className="font-body px-4 w-full appearance-none"
                    style={{ height: 48, fontSize: 15, color: '#111', background: '#E6E6E6', borderRadius: 14 }}
                  >
                    {PLANT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="absolute pointer-events-none" style={{ right: 16, top: '50%', transform: 'translateY(-50%)', color: '#666' }}>
                    <IconChevronDown size={18} />
                  </div>
                </div>
              </label>

              <div className="mt-4 rounded-2xl p-4 flex items-center justify-between" style={{ background: '#E6E6E6' }}>
                <span className="font-body" style={{ fontSize: 14, color: '#8E8E93' }}>{t('manualAdd.lightRequirement')}</span>
                <span className="font-heading" style={{ fontSize: 14, color: '#111' }}>{draft.lightNeed.toLowerCase()}</span>
              </div>
              <div className="mt-3 rounded-2xl p-4 flex items-center justify-between" style={{ background: '#E6E6E6' }}>
                <span className="font-body" style={{ fontSize: 14, color: '#8E8E93' }}>{t('manualAdd.humidity')}</span>
                <span className="font-heading" style={{ fontSize: 14, color: '#111' }}>{draft.humidityNeed}</span>
              </div>

              <div className="mt-3 rounded-2xl px-4 py-3 flex items-center gap-2" style={{ border: `1.5px solid ${GREEN}`, background: '#e6fbee' }}>
                <div style={{ color: '#0a8f3f' }}><IconCalendarSmall size={16} /></div>
                <span className="font-body" style={{ fontSize: 13, color: '#0a8f3f' }}>
                  {t('manualAdd.wateringDaysHint', { frequency: wateringFrequencyLabel })}
                </span>
              </div>

              <div className="mt-3 rounded-2xl p-4 flex items-center justify-between" style={{ background: '#E6E6E6' }}>
                <div>
                  <div className="font-heading" style={{ fontSize: 14, color: '#111' }}>{t('manualAdd.setReminders')}</div>
                  <div className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>{t('manualAdd.receiveNotifications')}</div>
                </div>
                <Toggle on={remindersOn} onChange={setRemindersOn} />
              </div>

              {!isPro && (
                <p className="font-body text-center mt-4" style={{ fontSize: 12, color: '#8E8E93' }}>
                  {t('manualAdd.slotsUsed', { used: usedSlots, total: FREE_PLANT_LIMIT })}
                </p>
              )}
            </>
          )}
        </div>
        <div className="px-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-3 shrink-0">
          <button type="button" disabled={!draft} onClick={() => draft && onAdd(draft)} className="btn-fill w-full" style={{ height: 52 }}>{t('manualAdd.addToJungle')}</button>
        </div>
      </div>
      {toast && (
        <div className="fixed left-5 right-5 z-[80]" style={{ bottom: 'calc(24px + env(safe-area-inset-bottom,0px))' }}>
          <div className="rounded-2xl px-4 py-3 text-center" style={{ background: '#000' }}>
            <span className="font-body" style={{ fontSize: 13, color: '#fff' }}>{toast}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Screen: Health check ───────────────────────────────────────────────────

function healthScoreColor(score: number): string {
  if (score >= 70) return GREEN
  if (score >= 40) return '#FFC24B'
  return '#FF3B30'
}

function healthStatusLabel(score: number, t: (key: string) => string): string {
  if (score >= 70) return t('health.healthy')
  if (score >= 40) return t('health.needsAttention')
  return t('health.critical')
}

function daysAgoLabel(iso: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return t('common.today')
  return t('common.daysAgo', { count: days })
}

function HealthReportCard({ photo, plantName, scannedAt, result }: {
  photo: string; plantName: string; scannedAt: string; result: AnalyzePlantHealthResult
}) {
  const { t } = useTranslation()
  const statusColor = healthScoreColor(result.healthScore)
  return (
    <>
      <img src={photo} alt="" className="w-full rounded-[1.5rem] object-cover mb-4" style={{ height: 220 }} />
      <div className="mb-4">
        <div className="font-heading" style={{ fontSize: 22, color: '#fff' }}>{plantName}</div>
        <div className="font-body" style={{ fontSize: 13, color: '#8E8E93' }}>
          {t('health.scannedOn', { date: new Date(scannedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) })}
        </div>
      </div>
      <span className="caption-eyebrow block mb-2">{t('health.aiAnalysis')}</span>
      <div className="card-white p-5 flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl p-3 flex flex-col gap-1" style={{ background: '#E6E6E6' }}>
            <div style={{ color: statusColor }}><IconLeaf size={16} /></div>
            <span className="font-heading" style={{ fontSize: 13, lineHeight: 1.2 }}>{healthStatusLabel(result.healthScore, t)}</span>
            <span className="font-body" style={{ fontSize: 10, color: '#8E8E93' }}>{t('health.status')}</span>
          </div>
          <div className="rounded-2xl p-3 flex flex-col gap-1" style={{ background: '#E6E6E6' }}>
            <div style={{ color: '#0a8f3f' }}><IconRuler size={16} /></div>
            <span className="font-heading" style={{ fontSize: 13, lineHeight: 1.2 }}>{t(`health.severity${result.severity}`)}</span>
            <span className="font-body" style={{ fontSize: 10, color: '#8E8E93' }}>{t('health.severity')}</span>
          </div>
          <div className="rounded-2xl p-3 flex flex-col gap-1" style={{ background: '#E6E6E6' }}>
            <div style={{ color: '#0a8f3f' }}><IconCheck size={16} /></div>
            <span className="font-heading" style={{ fontSize: 13, lineHeight: 1.2 }}>{result.confidence}%</span>
            <span className="font-body" style={{ fontSize: 10, color: '#8E8E93' }}>{t('health.confidence')}</span>
          </div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: '#E6E6E6' }}>
          <span className="caption-eyebrow">{t('health.diagnosis')}</span>
          <div className="font-heading mt-1" style={{ fontSize: 18 }}>{result.diagnosis}</div>
          <p className="font-body mt-1" style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{result.treatmentNotes}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: '#E6E6E6' }}>
          <span className="caption-eyebrow">{t('health.recommendedActions')}</span>
          <div className="flex flex-col gap-2 mt-2">
            {result.recommendedActions.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <div style={{ color: '#0a8f3f', marginTop: 2 }}><IconCheck size={16} /></div>
                <span className="font-body" style={{ fontSize: 14 }}>{a}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function HealthHubScreen({ plants, isPro, canScan, onScanNew, onCheckExisting, onOpenPlant, onShowPro }: {
  plants: Plant[]; isPro: boolean; canScan: boolean
  onScanNew: () => void; onCheckExisting: () => void; onOpenPlant: (p: Plant) => void; onShowPro: () => void
}) {
  const { t } = useTranslation()
  const recentChecks = plants
    .flatMap((p) => p.healthLogs.map((log) => ({ plant: p, log })))
    .sort((a, b) => new Date(b.log.timestamp).getTime() - new Date(a.log.timestamp).getTime())
    .slice(0, 6)

  return (
    <div className="scroll-y h-full px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-28">
      {isPro && <span className="btn-outline-pro inline-block" style={{ fontSize: 10, padding: '3px 10px', marginBottom: 12 }}>PRO</span>}
      <h1 className="font-heading" style={{ fontSize: 26, color: '#fff' }}>{t('health.hubTitle')}</h1>
      <p className="font-body" style={{ fontSize: 14, color: '#8E8E93', marginTop: 4, marginBottom: 20 }}>
        {t('health.hubSubtitle')}
      </p>

      <button type="button" onClick={canScan ? onScanNew : onShowPro} className="card-white p-4 flex items-center gap-3 w-full text-left mb-3">
        <div className="flex items-center justify-center rounded-full shrink-0" style={{ width: 44, height: 44, background: '#111', color: GREEN }}>
          <IconCamera size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading" style={{ fontSize: 16 }}>{t('health.scanNewPlant')}</div>
          <div className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>{t('health.scanNewPlantDesc')}</div>
        </div>
        <div style={{ color: '#8E8E93' }}>{canScan ? <IconChevronRight size={18} /> : <IconLock size={18} />}</div>
      </button>

      <button
        type="button"
        onClick={canScan ? onCheckExisting : onShowPro}
        disabled={canScan && plants.length === 0}
        className="card-white p-4 flex items-center gap-3 w-full text-left"
        style={{ opacity: canScan && plants.length === 0 ? 0.5 : 1 }}
      >
        <div className="flex items-center justify-center rounded-full shrink-0" style={{ width: 44, height: 44, background: '#111', color: GREEN }}>
          <IconLeaf size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading" style={{ fontSize: 16 }}>{t('health.checkExisting')}</div>
          <div className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>{t('health.checkExistingDesc')}</div>
        </div>
        <div style={{ color: '#8E8E93' }}>{canScan ? <IconChevronRight size={18} /> : <IconLock size={18} />}</div>
      </button>

      {recentChecks.length > 0 && (
        <>
          <h2 className="font-heading mt-6 mb-3" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>{t('health.recentChecks')}</h2>
          <div className="flex flex-col gap-3">
            {recentChecks.map(({ plant, log }) => {
              const healthy = log.healthScore >= 70
              return (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => onOpenPlant(plant)}
                  className="flex items-center gap-3 w-full p-3 rounded-2xl text-left"
                  style={{ background: 'var(--color-surface)' }}
                >
                  <PlantPhoto photo={plant.photo} alt={plant.name} className="rounded-2xl object-cover shrink-0 w-12 h-12" />
                  <div className="flex-1 min-w-0">
                    <div className="font-heading truncate" style={{ fontSize: 15, color: '#fff' }}>{plant.name}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>{daysAgoLabel(log.timestamp, t)}</span>
                      <span style={{ width: 4, height: 4, borderRadius: 9999, background: '#8E8E93' }} />
                      <span className="font-body font-semibold" style={{ fontSize: 12, color: healthScoreColor(log.healthScore) }}>{healthy ? t('health.healthy') : t('health.needsAttention')}</span>
                    </div>
                  </div>
                  <div style={{ color: '#8E8E93' }}><IconChevronRight size={18} /></div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function HealthCheckFlowScreen({ plants, mode, presetPlant, onBack, onSaveLog, onDone, language }: {
  plants: Plant[]; mode: 'new' | 'existing'; presetPlant: Plant | null
  onBack: () => void; onSaveLog: (plantId: string, log: PlantHealthLog) => void; onDone: () => void; language: AppLanguage
}) {
  const { t } = useTranslation()
  const [step, setStep] = useState<'picker' | 'capture'>(mode === 'existing' && !presetPlant ? 'picker' : 'capture')
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(presetPlant)
  const [photo, setPhoto] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalyzePlantHealthResult | null>(null)
  const [scannedAt, setScannedAt] = useState<string | null>(null)
  const [showAttachPicker, setShowAttachPicker] = useState(false)
  const [saved, setSaved] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    try {
      const compressed = await readAndCompressPhotoFile(file)
      setPhoto(compressed)
      setResult(null)
      setError(null)
      setSaved(false)
      setAnalyzing(true)
      const outcome = await withMinDelay(analyzePlantHealthImage(compressed, language), 700)
      if (outcome.ok) {
        setResult(outcome.data)
        setScannedAt(new Date().toISOString())
      } else {
        setError(outcome.error)
      }
    } catch (err) {
      console.error('[myJungle] health check failed:', err)
      setError(t('common.couldNotAnalyzePhoto'))
    } finally {
      setAnalyzing(false)
    }
  }

  function handleLogToProfile(targetPlant: Plant) {
    if (!photo || !result || !scannedAt) return
    const log: PlantHealthLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: scannedAt,
      photo,
      healthScore: result.healthScore,
      diagnosis: result.diagnosis,
      treatmentNotes: result.treatmentNotes,
      recommendedActions: result.recommendedActions,
      analyzedByAI: true,
      severity: result.severity,
      confidence: result.confidence,
    }
    onSaveLog(targetPlant.id, log)
    setShowAttachPicker(false)
    setSaved(true)
  }

  function reset() {
    setPhoto(null)
    setResult(null)
    setError(null)
    setSaved(false)
  }

  async function openCamera() {
    const granted = await requestCameraPermission()
    if (granted) cameraInputRef.current?.click()
  }

  if (step === 'picker') {
    return (
      <div className="app-shell fixed inset-0 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
          <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft /></IconCircleBtn>
          <span className="font-heading" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>{t('health.selectPlant')}</span>
          <div style={{ width: 44 }} />
        </div>
        <div className="scroll-y flex-1 px-5 flex flex-col gap-3">
          {plants.map((p) => (
            <button key={p.id} type="button" onClick={() => { setSelectedPlant(p); setStep('capture') }} className="check-row text-left">
              <PlantPhoto photo={p.photo} alt={p.name} className="rounded-2xl object-cover shrink-0 w-12 h-12" />
              <span className="font-heading flex-1 min-w-0 truncate" style={{ fontSize: 16, color: '#111' }}>{p.name}</span>
              <div style={{ color: '#8E8E93' }}><IconChevronRight size={18} /></div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = '' }} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = '' }} />
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
        <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft /></IconCircleBtn>
        <span className="font-heading" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>{t('health.reportTitle')}</span>
        <div style={{ width: 44 }} />
      </div>
      <div className="scroll-y flex-1 px-5 pb-6">
        {!photo && (
          <div className="dash-picker w-full flex flex-col items-center justify-center gap-4" style={{ height: 260 }}>
            <div style={{ color: GREEN }}><IconNavHealth size={30} /></div>
            <div className="flex gap-3 w-full px-6">
              <button type="button" onClick={() => void openCamera()} className="btn-fill flex-1" style={{ height: 48, fontSize: 13 }}>{t('common.takePhoto')}</button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="font-heading flex-1"
                style={{ height: 48, fontSize: 13, textTransform: 'uppercase', borderRadius: 9999, background: 'transparent', border: '1.5px solid #fff', color: '#fff' }}
              >
                {t('common.fromGallery')}
              </button>
            </div>
          </div>
        )}

        {photo && !result && (
          <img src={photo} alt="" className="w-full rounded-[1.5rem] object-cover" style={{ height: 260 }} />
        )}

        {analyzing && (
          <div className="flex flex-col items-center gap-2 mt-4">
            <AiThinkingLoader size={140} />
            <p className="font-body text-center" style={{ fontSize: 14, color: '#8E8E93' }}>{t('health.diagnosing')}</p>
          </div>
        )}

        {error && !analyzing && (
          <>
            <p className="font-body text-center mt-4" style={{ fontSize: 13, color: '#FF3B30' }}>{error}</p>
            <button type="button" onClick={reset} className="font-heading w-full mt-4" style={{ height: 52, borderRadius: 9999, background: '#1c1c1e', color: '#fff' }}>{t('common.tryAgain')}</button>
          </>
        )}

        {photo && result && !analyzing && (
          <HealthReportCard photo={photo} plantName={selectedPlant?.name ?? t('health.newPlant')} scannedAt={scannedAt ?? new Date().toISOString()} result={result} />
        )}
      </div>
      {photo && result && !analyzing && (
        <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-3 flex flex-col gap-3 shrink-0">
          {saved ? (
            <button type="button" onClick={onDone} className="btn-fill w-full" style={{ height: 52 }}>{t('common.done')}</button>
          ) : (
            <button
              type="button"
              onClick={() => (selectedPlant ? handleLogToProfile(selectedPlant) : setShowAttachPicker(true))}
              className="btn-fill w-full"
              style={{ height: 52 }}
            >
              {t('health.logToProfile')}
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="font-heading w-full"
            style={{ height: 52, borderRadius: 9999, background: 'transparent', border: `1.5px solid ${GREEN}`, color: GREEN, textTransform: 'uppercase' }}
          >
            {t('health.scanAgain')}
          </button>
        </div>
      )}
      {showAttachPicker && (
        <>
          <div className="sheet-backdrop is-open" onClick={() => setShowAttachPicker(false)} />
          <div className="fixed left-0 right-0 bottom-0 z-[70]">
            <div className="sheet-panel is-open p-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-3">
              <span className="font-heading" style={{ fontSize: 18 }}>{t('health.attachToWhich')}</span>
              {plants.length === 0 ? (
                <p className="font-body" style={{ fontSize: 14, color: '#666' }}>{t('health.addPlantFirst')}</p>
              ) : (
                <div className="scroll-y flex flex-col gap-2" style={{ maxHeight: 320 }}>
                  {plants.map((p) => (
                    <button key={p.id} type="button" onClick={() => handleLogToProfile(p)} className="flex items-center gap-3 rounded-2xl px-3 py-2" style={{ background: '#E6E6E6' }}>
                      <PlantPhoto photo={p.photo} alt={p.name} className="rounded-xl object-cover shrink-0 w-10 h-10" />
                      <span className="font-heading" style={{ fontSize: 15 }}>{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => setShowAttachPicker(false)} className="font-body text-center mt-1" style={{ fontSize: 14, color: '#888' }}>{t('common.cancel')}</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function GrowthCheckScreen({ plant, onBack, onSave, language }: {
  plant: Plant; onBack: () => void; onSave: (entry: HistoryEntry) => void; language: AppLanguage
}) {
  const { t } = useTranslation()
  const [photo, setPhoto] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalyzePlantGrowthResult | null>(null)
  const [saved, setSaved] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    try {
      const compressed = await readAndCompressPhotoFile(file)
      setPhoto(compressed)
      setResult(null)
      setError(null)
      setSaved(false)
      setAnalyzing(true)
      const outcome = await withMinDelay(analyzePlantGrowthImage(compressed, language), 700)
      if (outcome.ok) {
        setResult(outcome.data)
      } else {
        setError(outcome.error)
      }
    } catch (err) {
      console.error('[myJungle] growth check failed:', err)
      setError(t('common.couldNotAnalyzePhoto'))
    } finally {
      setAnalyzing(false)
    }
  }

  function handleSave() {
    if (!photo || !result) return
    onSave({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: new Date().toISOString(),
      note: result.summary,
      photo,
      heightCm: result.heightCm,
      estimatedAge: result.estimatedAge,
      condition: result.condition,
      analyzedByAI: true,
    })
    setSaved(true)
  }

  function reset() {
    setPhoto(null)
    setResult(null)
    setError(null)
    setSaved(false)
  }

  async function openCamera() {
    const granted = await requestCameraPermission()
    if (granted) cameraInputRef.current?.click()
  }

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = '' }} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = '' }} />
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
        <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft /></IconCircleBtn>
        <span className="font-heading" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>{t('growthScan.title')}</span>
        <div style={{ width: 44 }} />
      </div>
      <div className="scroll-y flex-1 px-5 pb-6">
        {!photo && (
          <div className="dash-picker w-full flex flex-col items-center justify-center gap-4 p-6" style={{ minHeight: 260 }}>
            <IconCamera size={30} />
            <p className="font-body text-center" style={{ fontSize: 13, color: '#8E8E93', lineHeight: 1.4 }}>
              {t('growthScan.helper')}
            </p>
            <div className="flex gap-3 w-full px-6">
              <button type="button" onClick={() => void openCamera()} className="btn-fill flex-1" style={{ height: 48, fontSize: 13 }}>{t('common.takePhoto')}</button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="font-heading flex-1"
                style={{ height: 48, fontSize: 13, textTransform: 'uppercase', borderRadius: 9999, background: 'transparent', border: '1.5px solid #fff', color: '#fff' }}
              >
                {t('common.fromGallery')}
              </button>
            </div>
          </div>
        )}

        {photo && !result && (
          <img src={photo} alt="" className="w-full rounded-[1.5rem] object-cover" style={{ height: 260 }} />
        )}

        {analyzing && (
          <div className="flex flex-col items-center gap-2 mt-4">
            <AiThinkingLoader size={140} />
            <p className="font-body text-center" style={{ fontSize: 14, color: '#8E8E93' }}>{t('growthScan.assessing')}</p>
          </div>
        )}

        {error && !analyzing && (
          <>
            <p className="font-body text-center mt-4" style={{ fontSize: 13, color: '#FF3B30' }}>{error}</p>
            <button type="button" onClick={reset} className="font-heading w-full mt-4" style={{ height: 52, borderRadius: 9999, background: '#1c1c1e', color: '#fff' }}>{t('common.tryAgain')}</button>
          </>
        )}

        {photo && result && !analyzing && (
          <>
            <img src={photo} alt="" className="w-full rounded-[1.5rem] object-cover mb-4" style={{ height: 220 }} />
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <div className="font-heading" style={{ fontSize: 22, color: '#fff' }}>{plant.name}</div>
                <div className="font-body" style={{ fontSize: 13, color: '#8E8E93' }}>{t('growthScan.matchVerified')}</div>
              </div>
              <span className="badge-pro-dark shrink-0" style={{ fontSize: 10, padding: '3px 10px' }}>PRO</span>
            </div>
            <span className="caption-eyebrow block mb-2">{t('growthScan.aiAnalysis')}</span>
            <div className="card-white p-5 flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl p-3 flex flex-col gap-1" style={{ background: '#E6E6E6' }}>
                  <div style={{ color: '#0a8f3f' }}><IconLeaf size={16} /></div>
                  <span className="font-heading" style={{ fontSize: 13, lineHeight: 1.2 }}>{result.estimatedAge}</span>
                  <span className="font-body" style={{ fontSize: 10, color: '#8E8E93' }}>{t('growthScan.maturity')}</span>
                </div>
                <div className="rounded-2xl p-3 flex flex-col gap-1" style={{ background: '#E6E6E6' }}>
                  <div style={{ color: '#0a8f3f' }}><IconRuler size={16} /></div>
                  <span className="font-heading" style={{ fontSize: 13, lineHeight: 1.2 }}>{result.heightCm} cm</span>
                  <span className="font-body" style={{ fontSize: 10, color: '#8E8E93' }}>{t('growthScan.estSize')}</span>
                </div>
                <div className="rounded-2xl p-3 flex flex-col gap-1" style={{ background: '#E6E6E6' }}>
                  <div style={{ color: '#0a8f3f' }}><IconCheck size={16} /></div>
                  <span className="font-heading" style={{ fontSize: 13, lineHeight: 1.2 }}>{result.condition}</span>
                  <span className="font-body" style={{ fontSize: 10, color: '#8E8E93' }}>{t('growthScan.health')}</span>
                </div>
              </div>
              <div className="rounded-2xl p-4" style={{ background: '#E6E6E6' }}>
                <span className="caption-eyebrow">{t('growthScan.aiObservations')}</span>
                <p className="font-body mt-1" style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{result.summary}</p>
              </div>
            </div>
          </>
        )}
      </div>
      {photo && result && !analyzing && (
        <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-3 flex flex-col gap-3 shrink-0">
          {saved ? (
            <button type="button" onClick={onBack} className="btn-fill w-full" style={{ height: 52 }}>{t('common.done')}</button>
          ) : (
            <button type="button" onClick={handleSave} className="btn-fill w-full" style={{ height: 52 }}>{t('growthScan.saveToLog')}</button>
          )}
          <button
            type="button"
            onClick={reset}
            className="font-heading w-full"
            style={{ height: 52, borderRadius: 9999, background: 'transparent', border: '1.5px solid #fff', color: '#fff', textTransform: 'uppercase' }}
          >
            {t('growthScan.retakePhoto')}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Screen: Growth history ─────────────────────────────────────────────────

function GrowthHistoryScreen({ plant, onBack, onNewScan }: {
  plant: Plant; onBack: () => void; onNewScan: () => void
}) {
  const { t } = useTranslation()
  const entries = plant.history
  const hasEntries = entries.length > 0
  const oldest = hasEntries ? entries[entries.length - 1] : null
  const newest = hasEntries ? entries[0] : null
  const monthsTracked = oldest ? Math.max(1, Math.round((Date.now() - new Date(oldest.date).getTime()) / (30.44 * 86400000))) : 0
  const growthCm =
    oldest && newest && oldest.heightCm !== undefined && newest.heightCm !== undefined
      ? Math.max(0, newest.heightCm - oldest.heightCm)
      : null
  const currentYear = new Date().getFullYear()

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
        <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft /></IconCircleBtn>
        <span className="font-heading truncate px-2" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>{t('growthHistory.title')}</span>
        <div style={{ width: 44 }} />
      </div>
      <div className="scroll-y flex-1 px-5 pb-28">
        <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: 'var(--color-surface)' }}>
          <PlantPhoto photo={plant.photo} alt={plant.name} className="rounded-2xl object-cover shrink-0 w-14 h-14" />
          <div className="min-w-0">
            <div className="font-heading truncate" style={{ fontSize: 17, color: '#fff' }}>{plant.name}</div>
            <div className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>
              {oldest ? t('growthHistory.firstLogged', { date: new Date(oldest.date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) }) : t('growthHistory.noEntriesYet')}
            </div>
          </div>
        </div>

        {hasEntries && (
          <div className="rounded-2xl px-4 py-3 mt-3 flex items-center justify-center" style={{ background: '#000' }}>
            <span className="font-heading text-center" style={{ fontSize: 12, color: GREEN, textTransform: 'uppercase' }}>
              {t('growthHistory.stats', { count: entries.length, months: monthsTracked, monthsPlural: monthsTracked === 1 ? '' : 's' })}
              {growthCm !== null && growthCm > 0 ? t('growthHistory.statsGrowth', { cm: growthCm }) : ''}
            </span>
          </div>
        )}

        {hasEntries ? (
          <>
            <span className="caption-eyebrow block mt-6 mb-3">{t('growthHistory.timelineJourney')}</span>
            <div className="flex flex-col">
              {entries.map((entry, i) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center shrink-0" style={{ width: 12 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 9999, background: GREEN, flexShrink: 0, marginTop: 4 }} />
                    {i < entries.length - 1 && <span style={{ width: 1.5, flex: 1, background: '#333', marginTop: 2 }} />}
                  </div>
                  <div className="flex-1 min-w-0 pb-5">
                    <span className="font-heading inline-block shrink-0 mb-2" style={{ fontSize: 10, background: GREEN, color: '#000', borderRadius: 6, padding: '3px 7px' }}>
                      {new Date(entry.date)
                        .toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: new Date(entry.date).getFullYear() !== currentYear ? 'numeric' : undefined,
                        })
                        .toUpperCase()}
                    </span>
                    <div className="flex items-center gap-3">
                      <PlantPhoto photo={entry.photo} alt="" className="rounded-xl object-cover shrink-0 w-12 h-12" />
                      <div className="min-w-0">
                        <div className="font-heading truncate" style={{ fontSize: 15, color: '#fff' }}>
                          {entry.estimatedAge}{entry.heightCm !== undefined && entry.heightCm > 0 ? ` · ${entry.heightCm}cm` : ''}
                        </div>
                        <div className="font-body truncate" style={{ fontSize: 12, color: '#8E8E93' }}>{entry.note}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="font-body text-center mt-10" style={{ fontSize: 14, color: '#8E8E93' }}>{t('growthHistory.noCheckins')}</p>
        )}
      </div>
      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-3 shrink-0">
        <button type="button" onClick={onNewScan} className="btn-fill w-full" style={{ height: 56, fontSize: 15 }}>{t('growthHistory.newScan')}</button>
      </div>
    </div>
  )
}

// ─── Screen: Profile ────────────────────────────────────────────────────────

function ProfileScreen({ settings, user, onSave, onExport, onReset, onShowPro, onOpenLegal, language, onPickLanguage, onChangePrimaryWateringDay, onToggleNotifications }: {
  settings: AppSettings; user: UserState; onSave: (s: AppSettings) => void
  onExport: () => void; onReset: () => void; onShowPro: () => void; onOpenLegal: (doc: LegalDoc) => void
  language: AppLanguage; onPickLanguage: () => void; onChangePrimaryWateringDay: (day: number) => void
  onToggleNotifications: () => void
}) {
  const { t } = useTranslation()
  const [showNotifSettings, setShowNotifSettings] = useState(false)
  const [showDayPicker, setShowDayPicker] = useState(false)

  function handleExpandNotifSettings() {
    setShowNotifSettings((v) => !v)
    // Interacting with any notification-related setting should prime the OS
    // permission prompt the first time — safe to call every time, it's a
    // no-op once the user has already granted or denied it.
    void requestNotificationPermission()
  }

  return (
    <div className="scroll-y h-full px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-28">
      <h1 className="font-heading text-center" style={{ fontSize: 22, color: '#fff', textTransform: 'uppercase' }}>{t('settings.title')}</h1>
      {user.isFoundingMember ? (
        <div className="flex items-center justify-center gap-2 mt-5" style={{ height: 52, borderRadius: 9999, background: 'var(--color-surface)' }}>
          <div style={{ color: GREEN }}><IconSparkles size={16} /></div>
          <span className="font-heading" style={{ fontSize: 14, color: '#fff', textTransform: 'uppercase' }}>{t('settings.foundingMember')}</span>
        </div>
      ) : user.subscriptionPlan === 'lifetime' ? (
        <div className="flex items-center justify-center gap-2 mt-5" style={{ height: 52, borderRadius: 9999, background: 'var(--color-surface)' }}>
          <div style={{ color: GREEN }}><IconSparkles size={16} /></div>
          <span className="font-heading" style={{ fontSize: 14, color: '#fff', textTransform: 'uppercase' }}>{t('settings.proLifetime')}</span>
        </div>
      ) : user.isPro ? (
        <button
          type="button"
          onClick={() => { if (user.subscriptionManagementUrl) window.open(user.subscriptionManagementUrl, '_blank') }}
          className="btn-outline-pro w-full flex items-center justify-between gap-2 mt-5 px-5"
          style={{ height: 52 }}
        >
          <span className="flex items-center gap-2">
            <IconSparkles size={16} />
            <span>{t('settings.manageSubscription')}</span>
          </span>
          {user.subscriptionExpiresAt && (
            <span className="font-body" style={{ fontSize: 12, opacity: 0.8 }}>
              {user.subscriptionWillRenew ? t('settings.renews') : t('settings.ends')} {new Date(user.subscriptionExpiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
        </button>
      ) : (
        <button type="button" onClick={onShowPro} className="btn-outline-pro w-full flex items-center justify-center gap-2 mt-5" style={{ height: 52 }}>
          <IconSparkles size={16} />
          <span>{t('settings.unlockPro')}</span>
        </button>
      )}
      <span className="caption-eyebrow block" style={{ marginBottom: 8, marginTop: 20 }}>{t('settings.sectionConfig')}</span>
      <div className="card-white overflow-hidden">
        <button type="button" onClick={handleExpandNotifSettings} className="flex items-center justify-between w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>{t('settings.notificationPreferences')}</span>
          <span style={{ color: '#111', transform: showNotifSettings ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}><IconChevronRight size={16} /></span>
        </button>
        {showNotifSettings && (
          <div className="px-5 py-4 flex flex-col gap-4" style={{ borderBottom: '1px solid #eee' }}>
            <div className="flex items-center justify-between">
              <span className="font-body" style={{ fontSize: 14, color: '#111' }}>{t('settings.reminderTime')}</span>
              <input
                type="time"
                value={settings.reminderTime}
                onChange={(e) => onSave({ ...settings, reminderTime: e.target.value })}
                className="font-body"
                style={{ fontSize: 14, border: 'none', borderRadius: 8, padding: '4px 8px', background: '#E6E6E6', color: '#111' }}
              />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>{t('settings.wateringReminders')}</span>
          <Toggle on={settings.pushNotifications} onChange={onToggleNotifications} />
        </div>
        <button type="button" onClick={() => setShowDayPicker(true)} className="flex items-center justify-between w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>{t('settings.wateringDay')}</span>
          <span className="flex items-center gap-1.5">
            <span className="font-body" style={{ fontSize: 14, color: '#8E8E93' }}>{fullDayName(t, settings.primaryWateringDay)}</span>
            <div style={{ color: '#111' }}><IconChevronRight size={16} /></div>
          </span>
        </button>
        <button type="button" onClick={onPickLanguage} className="flex items-center justify-between w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>{t('settings.language')}</span>
          <span className="flex items-center gap-1.5">
            <span className="font-body" style={{ fontSize: 14, color: '#8E8E93' }}>{t(`language.${language}`)}</span>
            <div style={{ color: '#111' }}><IconChevronRight size={16} /></div>
          </span>
        </button>
        <button type="button" onClick={onExport} className="flex items-center gap-3 w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <div style={{ color: '#111' }}><IconDownload size={18} /></div>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>{t('settings.exportData')}</span>
        </button>
        <button type="button" onClick={onReset} className="flex items-center gap-3 w-full px-5 py-4" style={{ color: '#FF3B30', borderBottom: '1px solid #eee' }}>
          <IconTrash size={18} />
          <span className="font-heading" style={{ fontSize: 16, color: '#FF3B30' }}>{t('settings.resetData')}</span>
        </button>

        <span className="caption-eyebrow block px-5" style={{ paddingBottom: 8, paddingTop: 20 }}>{t('settings.sectionLegal')}</span>
        <button type="button" onClick={() => onOpenLegal('terms')} className="flex items-center justify-between w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>{t('settings.termsOfUse')}</span>
          <div style={{ color: '#111' }}><IconChevronRight size={16} /></div>
        </button>
        <button type="button" onClick={() => onOpenLegal('privacy')} className="flex items-center justify-between w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>{t('settings.privacyPolicy')}</span>
          <div style={{ color: '#111' }}><IconChevronRight size={16} /></div>
        </button>
        <button type="button" onClick={() => onOpenLegal('impressum')} className="flex items-center justify-between w-full px-5 py-4">
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>{t('settings.impressum')}</span>
          <div style={{ color: '#111' }}><IconChevronRight size={16} /></div>
        </button>
      </div>

      <p className="font-body text-center mt-6" style={{ fontSize: 12, color: '#5a5a5c' }}>
        {t('settings.footer', { year: new Date().getFullYear(), version: APP_VERSION })}
      </p>
      {showDayPicker && (
        <DayPickerSheet
          selected={settings.primaryWateringDay}
          onClose={() => setShowDayPicker(false)}
          onSelect={onChangePrimaryWateringDay}
        />
      )}
    </div>
  )
}

type LegalDoc = 'terms' | 'privacy' | 'impressum'

const LEGAL_TITLE_KEYS: Record<LegalDoc, string> = {
  terms: 'settings.termsOfUse',
  privacy: 'settings.privacyPolicy',
  impressum: 'settings.impressum',
}

// Body text is a placeholder pending real legal copy, so it stays English-only
// (translating throwaway text ahead of replacement isn't worth the effort).
const LEGAL_CONTENT: Record<LegalDoc, { title: string; body: string }> = {
  terms: {
    title: 'Terms of Use',
    body:
      '[Placeholder — replace before publishing]\n\n' +
      'By using myJungle, you agree to use the app for its intended purpose of tracking and caring for your houseplants. ' +
      'AI-generated plant identification, health, and care guidance is provided for informational purposes only and may not always be accurate — always use your own judgment for plant and pet safety.\n\n' +
      'Subscriptions. myJungle Pro Monthly and myJungle Pro Annual are auto-renewing subscriptions. ' +
      'Payment is charged to your Apple ID account at confirmation of purchase. ' +
      'Subscriptions automatically renew for the same price and duration unless auto-renew is turned off at least 24 hours before the end of the current period. ' +
      'Your account will be charged for renewal within 24 hours prior to the end of the current period. ' +
      'You can manage your subscription and turn off auto-renewal at any time in your device’s Account Settings after purchase. ' +
      'Any unused portion of a free trial period will be forfeited when you purchase a subscription, where applicable. ' +
      'myJungle Pro Lifetime is a one-time, non-renewing purchase that grants permanent Pro access on the account that bought it. ' +
      'Users who bought the legacy one-time Pro unlock keep permanent Pro access at no extra cost.\n\n' +
      'We may update these terms from time to time; continued use of the app after changes constitutes acceptance.',
  },
  privacy: {
    title: 'Privacy Policy',
    body:
      '[Placeholder — replace before publishing]\n\n' +
      'myJungle stores your plants, photos, and settings locally on your device. ' +
      'Photos you capture are sent to our AI provider (Google Gemini) solely to identify plants and diagnose health issues, and are not stored by us beyond what your device retains. ' +
      'Purchases and subscription status are processed by RevenueCat and the App Store on our behalf; we receive purchase and entitlement status, not your payment details. ' +
      'We do not sell your personal data. ' +
      'Contact us at [your-support-email@example.com] with any privacy questions or data deletion requests.',
  },
  impressum: {
    title: 'Impressum',
    body:
      '[Placeholder — replace before publishing with your real legal details]\n\n' +
      'Company name: [Your Company / Sole Trader Name]\n' +
      'Address: [Street, City, Postal Code, Country]\n' +
      'Contact: [email@example.com]\n' +
      'Registration number (if applicable): [—]\n' +
      'VAT ID (if applicable): [—]\n\n' +
      'Responsible for content: [Your Name]',
  },
}

function LegalScreen({ doc, onBack }: { doc: LegalDoc; onBack: () => void }) {
  const { t } = useTranslation()
  const content = LEGAL_CONTENT[doc]
  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
        <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft /></IconCircleBtn>
        <span className="font-heading" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>{t(LEGAL_TITLE_KEYS[doc])}</span>
        <div style={{ width: 44 }} />
      </div>
      <div className="scroll-y flex-1 px-5 pb-6">
        <p className="font-body" style={{ fontSize: 14, color: '#ccc', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{content.body}</p>
      </div>
    </div>
  )
}

// ─── Monetization: Limit reached / Pro unlock ─────────────────────────────────

function LimitReachedSheet({ onUnlock, onCancel }: { onUnlock: () => void; onCancel: () => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close(action: () => void) { setOpen(false); setTimeout(action, 180) }
  return (
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onCancel)} />
      <div className="fixed left-4 right-4 z-[70]" style={{ top: '50%', transform: 'translateY(-50%)' }}>
        <div className={`modal-card ${open ? 'is-open' : ''} p-6 flex flex-col items-center gap-4 text-center`}>
          <div className="flex items-center justify-center rounded-full" style={{ width: 64, height: 64, background: '#f3ecec' }}>
            <IconAlert size={28} />
          </div>
          <h2 className="font-heading" style={{ fontSize: 24, lineHeight: 1.2 }}>{t('limitReached.title', { limit: FREE_PLANT_LIMIT })}</h2>
          <p className="font-body" style={{ fontSize: 14, color: '#666', lineHeight: 1.5 }}>
            {t('limitReached.body')}
          </p>
          <button type="button" onClick={() => close(onUnlock)} className="btn-fill w-full" style={{ height: 52 }}>{t('limitReached.unlockPro')}</button>
          <button type="button" onClick={() => close(onCancel)} className="font-heading w-full" style={{ height: 52, borderRadius: 9999, background: '#E6E6E6', color: '#888' }}>{t('limitReached.cancel')}</button>
        </div>
      </div>
    </>
  )
}

// Health scan is the headline paid value — keep it first (§2 of the monetization spec).
const PRO_BENEFIT_KEYS = [
  'paywall.proBenefit1',
  'paywall.proBenefit2',
  'paywall.proBenefit3',
  'paywall.proBenefit4',
  'paywall.proBenefit5',
]

type OfferingsStatus = 'loading' | 'ready' | 'unavailable'
type SelectablePlan = 'monthly' | 'annual' | 'lifetime'

// Shown only when the SDK has no real offering (web/dev preview) — never
// overrides a real RevenueCat price. Matches the configured store products.
const FALLBACK_PREVIEW_PRICES = { monthly: 1.99, annual: 19.99, lifetime: 49.99 }

function ProUnlockScreen({
  source, offering, offeringsStatus, onClose, onPurchased, onOpenLegal, onRetryOfferings, onSimulateWebPurchase,
  showProPreview, onTryProPreview, onProPreviewGranted,
}: {
  source: PaywallSource | null
  offering: PurchasesOffering | null
  offeringsStatus: OfferingsStatus
  onClose: () => void
  onPurchased: (customerInfo: CustomerInfo, plan: SelectablePlan) => void
  onOpenLegal: (doc: LegalDoc) => void
  onRetryOfferings: () => void
  onSimulateWebPurchase: (plan: SelectablePlan) => void
  showProPreview: boolean
  onTryProPreview: () => Promise<{ ok: boolean; error?: string }>
  /** Called after the Pro Preview trial is granted — separate from onClose so it never triggers the lifetime win-back offer. */
  onProPreviewGranted: () => void
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<SelectablePlan>('annual')
  const [purchasing, setPurchasing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'error'>('idle')
  const copy = paywallCopyForSource(source, t)
  // RevenueCat's SDK is native-only — anything outside iOS/Android is web/dev preview.
  const isWebPreview = !Capacitor.isNativePlatform()
  // A real load failure on a real device (not the expected "no SDK on web" case) — offer a retry, not just dashes.
  const offeringsFailed = offeringsStatus === 'unavailable' && !isWebPreview
  const monthlyPkg = offering?.monthly ?? null
  const annualPkg = offering?.annual ?? null
  const lifetimePkg = offering?.lifetime ?? null
  const selectedPkg = selected === 'annual' ? annualPkg : selected === 'monthly' ? monthlyPkg : lifetimePkg
  const ready = offeringsStatus === 'ready' && selectedPkg !== null
  // Annual always carries the trial per §1 — when the real product data isn't
  // available (web/dev preview), still show trial messaging using the
  // fallback price so the UI can be reviewed end to end.
  const hasTrial = selected === 'annual' && (annualPkg ? !!annualPkg.product.introPrice : isWebPreview)
  const discountLabel = annualPkg && monthlyPkg
    ? computeAnnualDiscountLabel(monthlyPkg.product.price, annualPkg.product.price, t)
    : isWebPreview
      ? computeAnnualDiscountLabel(FALLBACK_PREVIEW_PRICES.monthly, FALLBACK_PREVIEW_PRICES.annual, t)
      : null
  const monthlyPriceLabel = monthlyPkg ? `${monthlyPkg.product.priceString}/mo` : isWebPreview ? `$${FALLBACK_PREVIEW_PRICES.monthly.toFixed(2)}/mo` : '—'
  const annualPriceLabel = annualPkg ? `${annualPkg.product.priceString}/yr` : isWebPreview ? `$${FALLBACK_PREVIEW_PRICES.annual.toFixed(2)}/yr` : '—'
  const lifetimePriceLabel = lifetimePkg ? lifetimePkg.product.priceString : isWebPreview ? `$${FALLBACK_PREVIEW_PRICES.lifetime.toFixed(2)}` : '—'
  const annualTrialLabel = hasTrial ? t('paywall.trialThenPrice', { days: getTrialDays(), price: annualPriceLabel }) : null
  const annualBasePriceLabel = annualPkg ? annualPkg.product.priceString : isWebPreview ? `$${FALLBACK_PREVIEW_PRICES.annual.toFixed(2)}` : t('paywall.thePlanPrice')

  useEffect(() => {
    logEvent('paywall_shown', { source: source ?? undefined, plan_shown: ['monthly', 'annual', 'lifetime'] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  function selectPlan(plan: SelectablePlan) {
    setSelected(plan)
    logEvent('plan_selected', { source: source ?? undefined, plan_selected: plan })
  }

  async function handlePurchase() {
    if (!selectedPkg) return
    setPurchasing(true)
    logEvent('purchase_started', { source: source ?? undefined, plan_selected: selected, is_trial: hasTrial })
    try {
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: selectedPkg })
      logEvent('purchase_completed', { source: source ?? undefined, plan_selected: selected, is_trial: hasTrial })
      if (hasTrial) logEvent('trial_started', { source: source ?? undefined, plan_selected: selected })
      onPurchased(customerInfo, selected)
    } catch (error) {
      const cancelled = (error as PurchasesError)?.userCancelled === true
      if (!cancelled) {
        logEvent('purchase_failed', { source: source ?? undefined, plan_selected: selected, is_trial: hasTrial })
        console.error('[myJungle] purchase failed:', error)
        showToast(t('paywall.toastPurchaseFailed'))
      }
    } finally {
      setPurchasing(false)
    }
  }

  async function handleTryPreview() {
    setPreviewState('loading')
    const result = await onTryProPreview()
    if (result.ok) {
      onProPreviewGranted()
    } else {
      setPreviewState('error')
      showToast(result.error ?? t('analysisResult.proPreviewError'))
    }
  }

  async function handleRestore() {
    setRestoring(true)
    logEvent('restore_attempted', { source: source ?? undefined })
    try {
      const { customerInfo } = await Purchases.restorePurchases()
      const restored = Object.keys(customerInfo.entitlements.active).length > 0
      if (restored) {
        logEvent('restore_succeeded', { source: source ?? undefined })
        showToast(t('paywall.toastPurchaseRestored'))
        onPurchased(customerInfo, selected)
      } else {
        showToast(t('paywall.toastNothingToRestore'))
      }
    } catch (error) {
      console.error('[myJungle] restore purchases failed:', error)
      showToast(t('paywall.toastRestoreFailed'))
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <div className="px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-6 shrink-0">
        <IconCircleBtn onClick={onClose} label={t('common.back')}><IconChevronLeft /></IconCircleBtn>
        <span className="badge-pro-solid inline-block mt-4" style={{ fontSize: 12, padding: '4px 14px', textTransform: 'uppercase' }}>{t('paywall.pro')}</span>
        <h1 className="font-heading mt-3" style={{ fontSize: 40, color: '#fff', textTransform: 'uppercase', lineHeight: 0.98 }}>{copy.headline}</h1>
        <p className="font-body mt-3" style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.35 }}>{copy.subtitle}</p>
      </div>
      <div className="sheet-body scroll-y flex-1 px-5 pt-6" style={{ borderRadius: '1.75rem 1.75rem 0 0' }}>
        <span className="caption-eyebrow">{t('paywall.choosePlan')}</span>

        <div className="flex flex-col gap-3 mt-3">
          <div className="rounded-2xl px-5 flex items-center justify-between" style={{ height: 76, background: '#fff', border: '1.5px solid #e5e5e0' }}>
            <div>
              <div className="font-heading" style={{ fontSize: 17, color: '#111' }}>{t('paywall.free')}</div>
              <div className="font-body" style={{ fontSize: 13, color: '#8E8E93' }}>{t('paywall.upToPlants', { limit: FREE_PLANT_LIMIT })}</div>
            </div>
            <span className="font-heading" style={{ fontSize: 17, color: '#111' }}>{t('paywall.included')}</span>
          </div>

          <button
            type="button"
            onClick={() => selectPlan('monthly')}
            className="rounded-2xl px-5 flex items-center justify-between text-left"
            style={{
              height: 76,
              background: selected === 'monthly' ? '#000' : '#fff',
              border: selected === 'monthly' ? `2px solid ${GREEN}` : '1.5px solid #e5e5e0',
            }}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading" style={{ fontSize: 17, color: selected === 'monthly' ? '#fff' : '#111' }}>{t('paywall.monthly')}</span>
              </div>
              <div className="font-body" style={{ fontSize: 13, color: selected === 'monthly' ? 'rgba(255,255,255,0.6)' : '#8E8E93' }}>{t('paywall.monthlyDesc')}</div>
            </div>
            <span className="font-heading" style={{ fontSize: 18, color: selected === 'monthly' ? GREEN : '#111' }}>
              {monthlyPriceLabel}
            </span>
          </button>

          <button
            type="button"
            onClick={() => selectPlan('annual')}
            className="rounded-2xl px-5 flex items-center justify-between text-left"
            style={{
              height: 76,
              background: selected === 'annual' ? '#000' : '#fff',
              border: selected === 'annual' ? `2px solid ${GREEN}` : '1.5px solid #e5e5e0',
            }}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading" style={{ fontSize: 17, color: selected === 'annual' ? '#fff' : '#111' }}>{t('paywall.annual')}</span>
                <span className="badge-pro-solid" style={{ fontSize: 10, padding: '3px 9px', textTransform: 'uppercase' }}>{t('paywall.popular')}</span>
              </div>
              <div className="font-body" style={{ fontSize: 13, color: selected === 'annual' ? 'rgba(255,255,255,0.6)' : '#8E8E93' }}>
                {annualTrialLabel ?? discountLabel ?? t('paywall.bestValue')}
              </div>
            </div>
            <span className="font-heading" style={{ fontSize: 18, color: selected === 'annual' ? GREEN : '#111' }}>
              {annualPriceLabel}
            </span>
          </button>

          <button
            type="button"
            onClick={() => selectPlan('lifetime')}
            className="rounded-2xl px-5 flex items-center justify-between text-left"
            style={{
              height: 76,
              background: selected === 'lifetime' ? '#000' : '#fff',
              border: selected === 'lifetime' ? `2px solid ${GREEN}` : '1.5px solid #e5e5e0',
            }}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading" style={{ fontSize: 17, color: selected === 'lifetime' ? '#fff' : '#111' }}>{t('paywall.lifetime')}</span>
              </div>
              <div className="font-body" style={{ fontSize: 13, color: selected === 'lifetime' ? 'rgba(255,255,255,0.6)' : '#8E8E93' }}>{t('paywall.lifetimeDesc')}</div>
            </div>
            <span className="font-heading" style={{ fontSize: 18, color: selected === 'lifetime' ? GREEN : '#111' }}>
              {lifetimePriceLabel}
            </span>
          </button>
        </div>

        <div style={{ width: '100%', height: 1, background: '#eee', margin: '24px 0 20px' }} />

        <span className="caption-eyebrow">{t('paywall.featuresUnlocked')}</span>
        <div className="flex flex-col gap-3 mt-3 items-start w-full">
          {PRO_BENEFIT_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-3">
              <div className="flex items-center justify-center rounded-full shrink-0" style={{ width: 20, height: 20, border: '1.5px solid #000' }}>
                <IconCheck size={12} />
              </div>
              <span className="font-body" style={{ fontSize: 15, color: '#111' }}>{t(key)}</span>
            </div>
          ))}
        </div>

        {showProPreview && !isWebPreview && (
          <div className="rounded-2xl p-4 mt-5" style={{ background: '#000' }}>
            <div className="flex items-center gap-2 mb-1">
              <div style={{ color: GREEN }}><IconSparkles size={16} /></div>
              <span className="font-heading" style={{ fontSize: 14, color: '#fff', textTransform: 'uppercase' }}>{t('analysisResult.proPreviewTitle')}</span>
            </div>
            <p className="font-body" style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>
              {t('analysisResult.proPreviewBody')}
            </p>
            <button
              type="button"
              onClick={() => void handleTryPreview()}
              disabled={previewState === 'loading'}
              className="font-heading w-full"
              style={{ height: 44, borderRadius: 9999, background: 'transparent', border: `1.5px solid ${GREEN}`, color: GREEN, textTransform: 'uppercase', fontSize: 13 }}
            >
              {previewState === 'loading' ? t('analysisResult.proPreviewActivating') : t('analysisResult.proPreviewTryFree')}
            </button>
          </div>
        )}

        {offeringsFailed && (
          <div className="rounded-2xl px-4 py-3 mt-4 flex items-center justify-between gap-2" style={{ background: '#fdecec' }}>
            <span className="font-body" style={{ fontSize: 12, color: '#a33', lineHeight: 1.4 }}>{t('paywall.pricingLoadError')}</span>
            <button type="button" onClick={onRetryOfferings} className="font-heading shrink-0" style={{ fontSize: 12, color: '#a33', textTransform: 'uppercase' }}>{t('paywall.retry')}</button>
          </div>
        )}

        <button
          type="button"
          onClick={() => void handlePurchase()}
          disabled={!ready || purchasing || restoring}
          className="btn-fill w-full mt-6"
          style={{ height: 64, fontSize: 17 }}
        >
          {purchasing
            ? t('common.processing')
            : offeringsStatus === 'loading'
              ? t('paywall.loadingPrices')
              : !ready
                ? t('paywall.pricingUnavailable')
                : hasTrial
                  ? t('paywall.startTrial', { days: getTrialDays() })
                  : selected === 'lifetime'
                    ? t('paywall.getLifetimeAccess')
                    : t('paywall.subscribe')}
        </button>
        <p className="font-body text-center mt-3" style={{ fontSize: 11, color: '#8E8E93', lineHeight: 1.4 }}>
          {hasTrial
            ? t('paywall.trialLegal', { days: getTrialDays(), price: annualBasePriceLabel })
            : selected === 'lifetime'
              ? t('paywall.lifetimeLegal')
              : selected === 'annual'
                ? t('paywall.annualLegal', { price: annualPkg?.product.priceString ?? t('paywall.thePlanPrice') })
                : t('paywall.monthlyLegal', { price: monthlyPkg?.product.priceString ?? t('paywall.thePlanPrice') })}
        </p>

        {isWebPreview && (
          <button
            type="button"
            onClick={() => onSimulateWebPurchase(selected)}
            className="font-heading w-full mt-3"
            style={{ height: 44, borderRadius: 9999, background: 'transparent', border: '1.5px dashed #b8860b', color: '#b8860b', textTransform: 'uppercase', fontSize: 12 }}
          >
            {t('paywall.simulatePurchase')}
          </button>
        )}

        <div className="flex items-center justify-center gap-3 mt-4 mb-6">
          <button type="button" onClick={() => void handleRestore()} disabled={restoring || purchasing} className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>
            {restoring ? t('common.restoring') : t('paywall.restorePurchase')}
          </button>
          <span style={{ color: '#ccc' }}>·</span>
          <button type="button" onClick={() => onOpenLegal('terms')} className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>{t('paywall.terms')}</button>
          <span style={{ color: '#ccc' }}>·</span>
          <button type="button" onClick={() => onOpenLegal('privacy')} className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>{t('paywall.privacy')}</button>
        </div>
      </div>
      {toast && (
        <div className="fixed left-5 right-5 z-[80]" style={{ bottom: 'calc(24px + env(safe-area-inset-bottom,0px))' }}>
          <div className="rounded-2xl px-4 py-3 text-center" style={{ background: '#000' }}>
            <span className="font-body" style={{ fontSize: 13, color: '#fff' }}>{toast}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function LifetimeOfferScreen({ offering, offeringsStatus, onDismiss, onPurchased, onOpenLegal, onSimulateWebPurchase }: {
  offering: PurchasesOffering | null
  offeringsStatus: OfferingsStatus
  onDismiss: () => void
  onPurchased: (customerInfo: CustomerInfo) => void
  onOpenLegal: (doc: LegalDoc) => void
  onSimulateWebPurchase: () => void
}) {
  const { t } = useTranslation()
  const [purchasing, setPurchasing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const lifetimePkg = offering?.lifetime ?? null
  const isWebPreview = !Capacitor.isNativePlatform()
  const priceLabel = lifetimePkg ? lifetimePkg.product.priceString : isWebPreview ? `$${FALLBACK_PREVIEW_PRICES.lifetime.toFixed(2)}` : '—'
  const ready = offeringsStatus === 'ready' && lifetimePkg !== null

  useEffect(() => {
    logEvent('lifetime_offer_shown', {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  async function handlePurchase() {
    if (!lifetimePkg) return
    setPurchasing(true)
    try {
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: lifetimePkg })
      logEvent('lifetime_purchased', {})
      onPurchased(customerInfo)
    } catch (error) {
      const cancelled = (error as PurchasesError)?.userCancelled === true
      if (!cancelled) {
        console.error('[myJungle] lifetime purchase failed:', error)
        showToast(t('paywall.toastPurchaseFailed'))
      }
    } finally {
      setPurchasing(false)
    }
  }

  async function handleRestore() {
    setRestoring(true)
    logEvent('restore_attempted', { source: 'lifetime_offer' })
    try {
      const { customerInfo } = await Purchases.restorePurchases()
      const restored = Object.keys(customerInfo.entitlements.active).length > 0
      if (restored) {
        logEvent('restore_succeeded', { source: 'lifetime_offer' })
        showToast(t('paywall.toastPurchaseRestored'))
        onPurchased(customerInfo)
      } else {
        showToast(t('paywall.toastNothingToRestore'))
      }
    } catch (error) {
      console.error('[myJungle] restore purchases failed:', error)
      showToast(t('paywall.toastRestoreFailed'))
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <div className="px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-6 shrink-0">
        <span className="badge-pro-solid inline-block" style={{ fontSize: 12, padding: '4px 14px', textTransform: 'uppercase' }}>{t('paywall.oneTimeOffer')}</span>
        <h1 className="font-heading mt-3" style={{ fontSize: 34, color: '#fff', textTransform: 'uppercase', lineHeight: 1 }}>{t('paywall.notIntoSubscriptions')}</h1>
        <p className="font-body mt-3" style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.35 }}>{t('paywall.ownForever')}</p>
      </div>
      <div className="sheet-body scroll-y flex-1 px-5 pt-6 flex flex-col items-center">
        <span className="font-heading" style={{ fontSize: 40, color: '#000' }}>{priceLabel}</span>
        <span className="caption-eyebrow">{t('paywall.oneTimePurchaseForever')}</span>

        <span className="caption-eyebrow block w-full mt-6">{t('paywall.featuresUnlocked')}</span>
        <div className="flex flex-col gap-3 mt-3 items-start w-full">
          {PRO_BENEFIT_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-3">
              <div className="flex items-center justify-center rounded-full shrink-0" style={{ width: 20, height: 20, border: '1.5px solid #000' }}>
                <IconCheck size={12} />
              </div>
              <span className="font-body" style={{ fontSize: 15, color: '#111' }}>{t(key)}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void handlePurchase()}
          disabled={!ready || purchasing || restoring}
          className="btn-fill w-full mt-6"
          style={{ height: 64, fontSize: 17 }}
        >
          {purchasing ? t('common.processing') : offeringsStatus === 'loading' ? t('paywall.loadingPrices') : !ready ? t('paywall.pricingUnavailable') : t('paywall.getLifetimeAccess')}
        </button>
        <p className="font-body text-center mt-3" style={{ fontSize: 11, color: '#8E8E93', lineHeight: 1.4 }}>
          {t('paywall.lifetimeLegal')}
        </p>
        {isWebPreview && (
          <button
            type="button"
            onClick={onSimulateWebPurchase}
            className="font-heading w-full mt-3"
            style={{ height: 44, borderRadius: 9999, background: 'transparent', border: '1.5px dashed #b8860b', color: '#b8860b', textTransform: 'uppercase', fontSize: 12 }}
          >
            {t('paywall.simulatePurchase')}
          </button>
        )}
        <button type="button" onClick={onDismiss} className="font-body mt-4" style={{ fontSize: 13, color: '#8E8E93' }}>
          {t('paywall.noThanks')}
        </button>

        <div className="flex items-center justify-center gap-3 mt-5 mb-6">
          <button type="button" onClick={() => void handleRestore()} disabled={restoring || purchasing} className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>
            {restoring ? t('common.restoring') : t('paywall.restorePurchase')}
          </button>
          <span style={{ color: '#ccc' }}>·</span>
          <button type="button" onClick={() => onOpenLegal('terms')} className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>{t('paywall.terms')}</button>
          <span style={{ color: '#ccc' }}>·</span>
          <button type="button" onClick={() => onOpenLegal('privacy')} className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>{t('paywall.privacy')}</button>
        </div>
      </div>
      {toast && (
        <div className="fixed left-5 right-5 z-[80]" style={{ bottom: 'calc(24px + env(safe-area-inset-bottom,0px))' }}>
          <div className="rounded-2xl px-4 py-3 text-center" style={{ background: '#000' }}>
            <span className="font-body" style={{ fontSize: 13, color: '#fff' }}>{toast}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const { t } = useTranslation()
  const [screen, setScreen] = useState<Screen>('splash')
  const [tab, setTab] = useState<Tab>('home')
  const [plants, setPlants] = useState<Plant[]>(loadPlants)
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [showLimitSheet, setShowLimitSheet] = useState(false)
  const [aiThinkingLabel, setAiThinkingLabel] = useState<string | null>(null)
  const [appToast, setAppToast] = useState<string | null>(null)
  const [healthFlowConfig, setHealthFlowConfig] = useState<{ mode: 'new' | 'existing'; presetPlant: Plant | null } | null>(null)
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null)
  const [growthFlowPlant, setGrowthFlowPlant] = useState<Plant | null>(null)
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
  const showHabitCard = !user.isPro && canShowHabitUpsellCard({
    alreadyShown: settings.habitUpsellShown,
    onboardingCompletedAt: settings.onboardingCompletedAt,
    wateringCount,
  })

  function openPaywall(sourceId: PaywallSource) {
    setPaywallSource(sourceId)
    setScreen('proUnlock')
  }

  function showAppToast(message: string) {
    setAppToast(message)
    setTimeout(() => setAppToast(null), 3500)
  }

  function handleClosePaywall() {
    logEvent('paywall_dismissed', { source: paywallSource ?? undefined })
    if (canShowLifetimeOffer(settings.lifetimeOfferLastShownAt)) {
      setSettings((s) => ({ ...s, lifetimeOfferLastShownAt: new Date().toISOString() }))
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
      setOffering(offerings.current)
      setOfferingsStatus('ready')
    } catch (error) {
      console.error('[myJungle] failed to fetch offerings:', error)
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
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG })
      await Purchases.configure({ apiKey: 'test_XsjuRyhMrzEQuaHZEwejrcVDtfL' })
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
        console.error('[myJungle] failed to sync entitlements on boot:', error)
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
  useEffect(() => { saveSettings(settings) }, [settings])

  useEffect(() => {
    function checkDailyRollover() {
      const today = localDateString(new Date())
      const storedDate = localStorage.getItem(LAST_ACTIVE_DATE_KEY)
      // rolloverWateredState returns the same array reference when nothing changed,
      // so this is a no-op re-render whenever the date hasn't advanced.
      setPlants((prev) => rolloverWateredState(prev, storedDate, today).plants)
      localStorage.setItem(LAST_ACTIVE_DATE_KEY, today)
    }
    checkDailyRollover()
    function onVisible() {
      if (document.visibilityState === 'visible') checkDailyRollover()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    const bg = screen === 'splash' ? GREEN : '#0D0D0D'
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', bg)
    document.documentElement.style.backgroundColor = bg
    document.body.style.backgroundColor = bg
  }, [screen])

  function handleWaterToggle(id: string) {
    setPlants((prev) => prev.map((p) => {
      if (p.id !== id) return p
      if (p.isWateredToday) {
        return { ...p, isWateredToday: false, lastWateredAt: p.previousWateredAt, previousWateredAt: null }
      }
      const now = todayISO()
      return {
        ...p,
        isWateredToday: true,
        previousWateredAt: p.lastWateredAt,
        lastWateredAt: now,
        history: [{ id: `${Date.now()}`, date: now, note: 'Watered.', photo: p.photo }, ...plantHistory(p)],
      }
    }))
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
   * at my-jungle-app.vercel.app. This grants Pro locally, entirely client-side
   * — it never calls RevenueCat or any backend. Hard-gated on
   * !Capacitor.isNativePlatform() here too (not just at the call sites) so it
   * can never fire inside a real iOS/Android build even if a caller forgets
   * the check.
   */
  function simulateWebPurchase(plan: SelectablePlan) {
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
      isWateredToday: false,
      isToxicToPets: d.isToxicToPets,
      toxicityNotes: d.toxicityNotes,
      confidence: d.confidence,
    }
  }

  function handleDeletePlant(id: string) {
    const removed = plants.find((p) => p.id === id)
    if (removed) void deletePlantPhotos(removed.id, plantHistory(removed), removed.healthLogs ?? [])
    setPlants((prev) => prev.filter((p) => p.id !== id))
    setScreen('main')
    setSelectedPlant(null)
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify({ plants, settings }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'myjungle-data.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleReset() {
    if (window.confirm(t('settings.resetConfirm'))) {
      void clearAllPhotos()
      localStorage.clear()
      setPlants([])
      setSettings({ ...DEFAULT_SETTINGS })
      setScreen('onboardingWelcome')
    }
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
    content = <SplashScreen onNext={() => setScreen(settings.hasCompletedOnboarding ? 'main' : 'onboardingWelcome')} />
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
        onDone={(photos) => {
          console.log(`[myJungle] onboardingCapture: identifying ${photos.length} photo(s)...`)
          setAiThinkingLabel(t('onboarding.identifying', { count: photos.length }))
          void withMinDelay(Promise.all(photos.map((p) => identifyPhoto(p.dataUrl, language, settings.primaryWateringDay))), 900).then((drafts) => {
            setPlants((prev) => [...prev, ...drafts.map(draftToPlant)])
            logEvent('plant_added', { count: plants.length + drafts.length })
            setAiThinkingLabel(null)
            const failedCount = drafts.filter((d) => d.error).length
            if (failedCount > 0) {
              console.warn(`[myJungle] onboardingCapture: ${failedCount}/${drafts.length} photo(s) could not be identified`)
              showAppToast(t('onboarding.identifyPartialError', { count: failedCount }))
            }
            setSettings((s) => ({ ...s, hasCompletedOnboarding: true, onboardingCompletedAt: s.onboardingCompletedAt ?? todayISO() }))
            if (settings.pushNotifications) void requestNotificationPermission()
            setScreen('main')
            setTab('home')
          })
        }}
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
        onDone={(photos) => {
          console.log(`[myJungle] bulkAdd: identifying ${photos.length} photo(s)...`)
          setAiThinkingLabel(t('onboarding.identifying', { count: photos.length }))
          void withMinDelay(Promise.all(photos.map((p) => identifyPhoto(p.dataUrl, language, settings.primaryWateringDay))), 900).then((drafts) => {
            setPlants((prev) => [...prev, ...drafts.map(draftToPlant)])
            logEvent('plant_added', { count: plants.length + drafts.length })
            setAiThinkingLabel(null)
            const failedCount = drafts.filter((d) => d.error).length
            if (failedCount > 0) {
              console.warn(`[myJungle] bulkAdd: ${failedCount}/${drafts.length} photo(s) could not be identified`)
              showAppToast(t('onboarding.identifyPartialError', { count: failedCount }))
            }
            setScreen('main')
            setTab('home')
          })
        }}
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
          showHabitCard={showHabitCard}
          onDismissHabitCard={() => setSettings((s) => ({ ...s, habitUpsellShown: true }))}
          onShowHabitPro={() => { setSettings((s) => ({ ...s, habitUpsellShown: true })); openPaywall('habit_card') }}
          showProPreviewBanner={!user.isPro && !settings.proPreviewUsedAt && !settings.proPreviewBannerDismissed}
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
          onToggleWatered={handleWaterToggle}
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
          onReset={handleReset}
          onShowPro={() => openPaywall('settings')}
          onOpenLegal={(doc) => { setLegalDoc(doc); setScreen('legal') }}
          language={language}
          onPickLanguage={() => setShowLanguagePicker(true)}
          onChangePrimaryWateringDay={handleChangePrimaryWateringDay}
          onToggleNotifications={() => void handleToggleNotifications()}
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
        <div className="fixed top-0 left-0 right-0 z-[100] px-4 py-2 text-center" style={{ background: '#FF3B30', color: '#fff', fontSize: 12 }} role="alert">
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
      {appToast && (
        <div className="fixed left-5 right-5 z-[80]" style={{ bottom: 'calc(24px + env(safe-area-inset-bottom,0px))' }}>
          <div className="rounded-2xl px-4 py-3 text-center" style={{ background: '#000' }}>
            <span className="font-body" style={{ fontSize: 13, color: '#fff' }}>{appToast}</span>
          </div>
        </div>
      )}
    </div>
  )
}
