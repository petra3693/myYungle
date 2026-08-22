import { useEffect, useMemo, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor'
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
import { batchedWateringDays, frequencyForWaterNeed, frequencyLabel, secondaryWateringDay } from '@/lib/wateringBatch'
import { clearAllPhotos, deletePlantPhotos } from '@/lib/photoStore'
import { MAX_FREE_PLANTS, canAccessProFeatures, canAddMorePlants } from '@/lib/proAccess'
import { useUserState } from '@/hooks/useUserState'
import { LANGUAGE_OPTIONS, LANGUAGE_STORAGE_KEY, normalizeAppLanguage, type AppLanguage } from '@/i18n/languages'
import type { AppSettings, DayCode, HistoryEntry, LightNeed, Plant, PlantHealthLog, UserState, WaterNeed, WateringFrequency } from '@/types/plant'

// ─── Constants ────────────────────────────────────────────────────────────────

const GREEN = '#B7FF00'
const DAYS: DayCode[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const FULL_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const APP_VERSION = '1.0.0'

const DEFAULT_SETTINGS: AppSettings = {
  globalWaterSchedule: [],
  hasCompletedOnboarding: false,
  pushNotifications: true,
  reminderTime: '09:00',
  soundAlerts: true,
  hapticFeedback: true,
  timezoneAutoSync: true,
  timezone: 'UTC',
  isPro: false,
  primaryWateringDay: 0,
}

type Screen =
  | 'splash'
  | 'onboardingWelcome'
  | 'onboardingCapture'
  | 'onboardingResult'
  | 'main'
  | 'plantDetail'
  | 'manualAdd'
  | 'proUnlock'
  | 'bulkAdd'
  | 'bulkResult'
  | 'healthFlow'
  | 'legal'
  | 'editPlant'
  | 'growthFlow'

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
    checkIns: Array.isArray(raw.checkIns) ? raw.checkIns : [],
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

const LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: 'English', de: 'German', hu: 'Hungarian', es: 'Spanish', fr: 'French',
  it: 'Italian', pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', ja: 'Japanese', zh: 'Chinese',
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
const IconBell = (p: { size?: number }) => <Icon {...p}><path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z" /><path d="M10 19a2 2 0 0 0 4 0" /></Icon>
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
      style={{ width: 44, height: 44, fontSize: 15, opacity: disabled ? 0.35 : 1 }}
    >
      {label}
    </button>
  )
}

const AI_THINKING_SCENE_URL = 'https://prod.spline.design/YnWkqNtTsc5YXUDA/scene.splinecode'

function AiThinkingLoader({ size = 160 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }}>
      <Spline scene={AI_THINKING_SCENE_URL} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}

function AiThinkingScreen({ label }: { label: string }) {
  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <div className="px-6 pt-[calc(3rem+env(safe-area-inset-top,0px))] pb-10 shrink-0">
        <h1 className="font-heading" style={{ fontSize: 32, lineHeight: 1.1, color: '#fff', textTransform: 'uppercase' }}>
          Plants<br />analysis
        </h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-6" style={{ background: 'var(--color-bg-light)', borderRadius: '1.75rem 1.75rem 0 0' }}>
        <AiThinkingLoader size={220} />
        <span className="font-body text-center px-10" style={{ fontSize: 16, color: '#666' }}>{label}</span>
      </div>
    </div>
  )
}

function todayISO() { return new Date().toISOString() }

/** Lightweight heuristic from watering recency — not a real diagnosis. */
function computeHealthStatus(plant: Plant, todayIdx: number): { score: number; label: string } {
  if (!plant.lastWateredAt) return { score: 75, label: 'Good' }
  const daysSince = Math.floor((Date.now() - new Date(plant.lastWateredAt).getTime()) / 86400000)
  const overdue = isPlantDueToday(plant, todayIdx) && !plant.isWateredToday
  let score = 96 - Math.min(35, daysSince * 3) - (overdue ? 15 : 0)
  score = Math.max(35, Math.min(100, score))
  const label = score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Needs attention'
  return { score, label }
}

// ─── Screen: Splash ───────────────────────────────────────────────────────────

function SplashScreen({ onNext }: { onNext: () => void }) {
  useEffect(() => {
    const t = setTimeout(onNext, 1800)
    return () => clearTimeout(t)
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
        <div className="font-body" style={{ fontSize: 13, color: '#000', opacity: 0.6, marginTop: 4 }}>Version {APP_VERSION}</div>
      </div>
    </div>
  )
}

// ─── Screen: Onboarding — Welcome ─────────────────────────────────────────────

const ONBOARDING_STEPS = [
  { icon: IconCamera, text: 'Snap photos of your plants' },
  { icon: IconSparkles, text: 'AI fills in the care profile' },
  { icon: IconCalendar, text: 'We compute your watering days' },
  { icon: IconDroplet, text: 'Water just 1–2 times a week' },
  { icon: IconLeaf, text: 'AI spots it when a plant gets sick', pro: true },
]

function OnboardingWelcome({ onNext, language, onPickLanguage }: { onNext: () => void; language: AppLanguage; onPickLanguage: () => void }) {
  return (
    <div className="app-shell-light fixed inset-0 flex flex-col px-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
      <div style={{ height: 40 }} />
      <h1 className="font-heading" style={{ fontSize: 34, lineHeight: 1.08, color: '#000', textTransform: 'uppercase' }}>
        Watering,<br />made simple.
      </h1>
      <div className="flex flex-col gap-4 mt-8 flex-1">
        {ONBOARDING_STEPS.map((step, i) => (
          <div key={i} className="flex items-center gap-3 rounded-full px-5" style={{ background: '#000', height: 64 }}>
            <div style={{ color: GREEN }}>
              <step.icon size={20} />
            </div>
            <span className="font-body flex-1" style={{ fontSize: 16, color: '#fff', fontWeight: 500 }}>
              {step.text}
            </span>
            {step.pro && (
              <span className="btn-outline-pro shrink-0" style={{ fontSize: 10, padding: '3px 10px' }}>PRO</span>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onPickLanguage}
        className="flex items-center gap-3 rounded-full px-5 mb-4"
        style={{ background: '#f0f0ec', height: 56 }}
      >
        <IconGlobe size={18} />
        <span className="font-body flex-1 text-left" style={{ fontSize: 15, color: '#111' }}>{LANGUAGE_NAMES[language]}</span>
        <IconChevronDown size={18} />
      </button>
      <button type="button" onClick={onNext} className="btn-fill btn-forward w-full" style={{ height: 56, fontSize: 16 }}>
        Get started
        <span className="btn-forward__arrow"><IconChevronRight size={20} /></span>
      </button>
    </div>
  )
}

// ─── Screen: Onboarding — Batch capture (shared with Bulk Add) ────────────────

interface CapturedPhoto { id: string; dataUrl: string }

function BatchCaptureScreen({
  title, subtitle, freeSlots, onBack, onDone, doneLabel,
}: {
  title: string
  subtitle: string
  freeSlots: number | null
  onBack?: () => void
  onDone: (photos: CapturedPhoto[]) => void
  doneLabel: string
}) {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([])
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const limit = freeSlots ?? Infinity
  const atLimit = photos.length >= limit

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setBusy(true)
    try {
      const remaining = limit - photos.length
      const files = Array.from(fileList).slice(0, Math.max(0, remaining))
      const compressed = await Promise.all(files.map((f) => readAndCompressPhotoFile(f)))
      setPhotos((prev) => [...prev, ...compressed.map((dataUrl) => ({ id: `${Date.now()}-${Math.random()}`, dataUrl }))])
    } catch (error) {
      console.error('[myJungle] batch capture failed:', error)
    } finally {
      setBusy(false)
    }
  }

  const slotsCells = Math.max(6, photos.length + (atLimit ? 0 : 1))

  const lockedCells = freeSlots !== null && !atLimit ? 1 : 0

  return (
    <div className="app-shell-light fixed inset-0 flex flex-col">
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void handleFiles(e.target.files); e.target.value = '' }} />
      <div className="flex items-center px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4 shrink-0">
        {onBack ? <IconCircleBtn onClick={onBack} label="Back"><IconChevronLeft /></IconCircleBtn> : <div style={{ width: 44 }} />}
      </div>
      <div className="px-5 shrink-0">
        <p className="font-body" style={{ fontSize: 14, color: '#666' }}>{subtitle}</p>
      </div>
      <div className="scroll-y flex-1 px-5 pt-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="relative rounded-[1.5rem] overflow-hidden" style={{ aspectRatio: '1/1' }}>
              <img src={p.dataUrl} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))}
                className="absolute top-2 right-2 icon-circle"
                style={{ width: 30, height: 30, background: 'rgba(0,0,0,0.75)' }}
                aria-label="Remove photo"
              >
                <IconX size={14} />
              </button>
            </div>
          ))}
          {!atLimit && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-[1.5rem] flex flex-col items-center justify-center gap-2"
              style={{ aspectRatio: '1/1', background: '#f0f0ec' }}
              disabled={busy}
            >
              <div className="flex items-center justify-center rounded-full" style={{ width: 40, height: 40, border: '1.5px solid #bbb' }}>
                <IconCamera size={18} />
              </div>
              <span className="font-body" style={{ fontSize: 13, color: '#000' }}>{busy ? 'Adding…' : 'Add photo'}</span>
            </button>
          )}
          {Array.from({ length: Math.max(0, slotsCells - photos.length - (atLimit ? 0 : 1) - lockedCells) }).map((_, i) => (
            <div key={`empty-${i}`} className="rounded-[1.5rem]" style={{ aspectRatio: '1/1', background: '#f0f0ec' }} />
          ))}
          {lockedCells > 0 && (
            <div className="rounded-[1.5rem] flex items-center justify-center" style={{ aspectRatio: '1/1', background: '#f0f0ec' }}>
              <div style={{ color: '#999' }}><IconLock size={22} /></div>
            </div>
          )}
        </div>
      </div>
      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shrink-0">
        {freeSlots !== null && (
          <p className="font-body text-center" style={{ fontSize: 13, color: '#8E8E93', marginBottom: 6 }}>
            {photos.length}/{freeSlots} captured (free)
          </p>
        )}
        <div className="flex items-center justify-center gap-2" style={{ marginBottom: 12 }}>
          <div style={{ color: GREEN }}><IconCheck size={14} /></div>
          <span className="font-body" style={{ fontSize: 12, color: '#666' }}>Health &amp; growth based on scan — Pro unlocks it</span>
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
      </div>
    </div>
  )
}

// ─── Screen: Onboarding / Bulk — Analysis result ──────────────────────────────

interface DraftPlant {
  photo: string
  name: string
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
  name: 'Unknown plant', category: 'Houseplant', waterNeed: 'Moderate' as WaterNeed, lightNeed: 'Medium' as LightNeed,
  humidityNeed: 'normal' as const, temperatureRangeC: '18-27°C', careNote: '',
  wateringFrequency: 'weekly' as WateringFrequency, wateringCycleAnchor: null as string | null,
  isToxicToPets: null, toxicityNotes: '', confidence: 40, identified: false as const,
}

function withMinDelay<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.all([promise, new Promise((r) => setTimeout(r, ms))]).then(([value]) => value)
}

/** Ask the OS for notification permission — triggered once, when the user adds their first plant. */
async function requestNotificationPermission(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    await LocalNotifications.requestPermissions()
  } catch (error) {
    console.error('[myJungle] notification permission request failed:', error)
  }
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

function DraftNameSheet({ draft, retrying, onRetry, onCancel, onSave }: {
  draft: DraftPlant; retrying: boolean; onRetry?: () => void; onCancel: () => void; onSave: (name: string) => void
}) {
  const [name, setName] = useState(draft.name === 'Unknown plant' ? '' : draft.name)
  const [open, setOpen] = useState(false)
  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close(action: () => void) { setOpen(false); setTimeout(action, 180) }
  return (
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onCancel)} />
      <div className="fixed left-0 right-0 bottom-0 z-[70]">
        <div className={`sheet-panel ${open ? 'is-open' : ''} p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-4`}>
          {!draft.identified && (
            <p className="font-body" style={{ fontSize: 13, color: '#8E8E93' }}>
              AI couldn&apos;t identify this plant{draft.error ? ` (${draft.error})` : ''}. Give it a name, or try again.
            </p>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase' }}>Plant name</span>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monstera"
              className="font-heading px-4"
              style={{ height: 48, fontSize: 16, color: '#111', background: '#f5f5f5', borderRadius: 14, border: 'none' }}
            />
          </label>
          <div className="flex gap-3">
            {onRetry && (
              <button type="button" onClick={onRetry} disabled={retrying} className="font-heading flex-1" style={{ height: 48, borderRadius: 9999, background: '#f0f0f0', color: '#111', opacity: retrying ? 0.6 : 1 }}>
                {retrying ? 'Retrying…' : 'Retry AI'}
              </button>
            )}
            <button
              type="button"
              disabled={!name.trim()}
              onClick={() => close(() => onSave(name.trim()))}
              className="btn-fill flex-1"
              style={{ height: 48 }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function DayPickerSheet({ selected, onSelect, onClose }: { selected: number; onSelect: (day: number) => void; onClose: () => void }) {
  const [open, setOpen] = useState(false)
  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close(action?: () => void) { setOpen(false); setTimeout(() => action?.(), 180) }
  return (
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onClose)} />
      <div className="fixed left-0 right-0 bottom-0 z-[70]">
        <div className={`sheet-panel ${open ? 'is-open' : ''} p-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-1`}>
          <span className="font-body block px-4 pt-2 pb-1" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Watering day</span>
          {FULL_DAY_NAMES.map((n, i) => (
            <button
              key={i}
              type="button"
              onClick={() => close(() => onSelect(i))}
              className="font-heading text-left px-4 py-3 flex items-center justify-between"
              style={{ fontSize: 16 }}
            >
              {n}
              {i === selected && <IconCheck size={18} />}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function AnalysisResultScreen({ drafts: initialDrafts, language, primaryDay: initialPrimaryDay, onChangePrimaryDay, onDone }: {
  drafts: DraftPlant[]; language: AppLanguage; primaryDay: number; onChangePrimaryDay: (day: number) => void
  onDone: (drafts: DraftPlant[]) => void
}) {
  const [drafts, setDrafts] = useState(initialDrafts)
  const [primaryDay, setPrimaryDay] = useState(initialPrimaryDay)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [retryingIndex, setRetryingIndex] = useState<number | null>(null)
  const [showDayPicker, setShowDayPicker] = useState(false)

  const daySet = new Set<number>()
  drafts.forEach((d) => d.wateringDays.forEach((i) => daySet.add(i)))
  const dayLabel = Array.from(daySet)
    .sort((a, b) => a - b)
    .map((i) => DAYS[i][0] + DAYS[i].slice(1).toLowerCase())
    .join(', ')

  const failedCount = drafts.filter((d) => !d.identified).length
  const subtitle =
    failedCount === 0
      ? 'We group your plants onto as few days as possible.'
      : `AI filled ${drafts.length - failedCount} of ${drafts.length} profile${drafts.length === 1 ? '' : 's'}. Tap the flagged ones to fix them.`

  async function retry(i: number) {
    setRetryingIndex(i)
    try {
      const updated = await identifyPhoto(drafts[i].photo, language, primaryDay)
      setDrafts((prev) => prev.map((d, idx) => (idx === i ? updated : d)))
    } finally {
      setRetryingIndex(null)
    }
  }

  function changePrimaryDay(day: number) {
    setPrimaryDay(day)
    setDrafts((prev) => prev.map((d) => ({ ...d, wateringDays: batchedWateringDays(d.waterNeed, day) })))
    onChangePrimaryDay(day)
  }

  return (
    <div className="app-shell-light fixed inset-0 flex flex-col">
      <div className="px-5 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-4 shrink-0">
        <h1 className="font-heading flex items-center gap-2" style={{ fontSize: 26, color: '#000' }}>
          {drafts.length} plant{drafts.length === 1 ? '' : 's'} added <IconCheck size={22} />
        </h1>
        <p className="font-body" style={{ fontSize: 14, color: '#666', marginTop: 6 }}>{subtitle}</p>
      </div>
      <div className="scroll-y flex-1 px-5 flex flex-col gap-3 pb-4">
        {drafts.map((d, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setEditingIndex(i)}
            className="flex items-center gap-3 p-3 rounded-[1.5rem] text-left w-full"
            style={{ background: d.identified ? '#f0f0ec' : '#fbeed9' }}
          >
            <img src={d.photo} alt="" className="rounded-full object-cover shrink-0" style={{ width: 56, height: 56 }} />
            <span className="font-heading flex-1 min-w-0 truncate" style={{ fontSize: 18, color: '#111' }}>{d.name}</span>
            {d.identified ? (
              <span className="font-heading" style={{ fontSize: 18, color: '#8E8E93' }}>{d.confidence}%</span>
            ) : (
              <span className="flex items-center gap-1.5" style={{ color: '#B8860B' }}>
                <IconAlert size={16} />
                <span className="font-body" style={{ fontSize: 13 }}>Name it</span>
              </span>
            )}
          </button>
        ))}
      </div>
      {dayLabel && (
        <div className="px-5 pb-3 shrink-0">
          <div className="rounded-2xl px-4 py-3 flex items-center justify-center gap-2" style={{ background: '#000' }}>
            <div style={{ color: GREEN }}><IconCalendarSmall size={16} /></div>
            <span className="font-heading" style={{ fontSize: 14, color: GREEN }}>Watering day: {dayLabel}</span>
          </div>
          <button type="button" onClick={() => setShowDayPicker(true)} className="font-body w-full text-center mt-2" style={{ fontSize: 13, color: '#666', textDecoration: 'underline' }}>
            Change
          </button>
        </div>
      )}
      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shrink-0">
        <button type="button" onClick={() => onDone(drafts)} className="btn-fill btn-forward w-full" style={{ height: 56, fontSize: 15 }}>
          Go to home
          <span className="btn-forward__arrow"><IconChevronRight size={20} /></span>
        </button>
      </div>
      {editingIndex !== null && (
        <DraftNameSheet
          draft={drafts[editingIndex]}
          retrying={retryingIndex === editingIndex}
          onRetry={drafts[editingIndex].identified ? undefined : () => void retry(editingIndex)}
          onCancel={() => setEditingIndex(null)}
          onSave={(name) => {
            setDrafts((prev) => prev.map((d, idx) => (idx === editingIndex ? { ...d, name } : d)))
            setEditingIndex(null)
          }}
        />
      )}
      {showDayPicker && (
        <DayPickerSheet selected={primaryDay} onClose={() => setShowDayPicker(false)} onSelect={changePrimaryDay} />
      )}
    </div>
  )
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange, onAdd }: { active: Tab; onChange: (t: Tab) => void; onAdd: () => void }) {
  const items: { id: Tab; label: string; icon: (p: { size?: number }) => React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: IconNavHome },
    { id: 'days', label: 'Days', icon: IconNavCalendar },
  ]
  const items2: { id: Tab; label: string; icon: (p: { size?: number }) => React.ReactNode }[] = [
    { id: 'health', label: 'Health', icon: IconNavHealth },
    { id: 'profile', label: 'Settings', icon: IconNavSettings },
  ]
  return (
    <div className="fixed left-4 right-4 z-40" style={{ bottom: 'calc(14px + env(safe-area-inset-bottom,0px))' }}>
      <div className="tab-bar">
        {items.map((t) => (
          <button key={t.id} type="button" onClick={() => onChange(t.id)} className={`tab-bar__item ${active === t.id ? 'is-active' : ''}`}>
            <div className="tab-bar__icon-badge"><t.icon size={20} /></div>
            <span className="tab-bar__label">{t.label}</span>
          </button>
        ))}
        <button type="button" onClick={onAdd} className="tab-bar__item" aria-label="Add plant">
          <div className="tab-bar__icon-badge"><IconNavAdd size={20} /></div>
          <span className="tab-bar__label">Add</span>
        </button>
        {items2.map((t) => (
          <button key={t.id} type="button" onClick={() => onChange(t.id)} className={`tab-bar__item ${active === t.id ? 'is-active' : ''}`}>
            <div className="tab-bar__icon-badge"><t.icon size={20} /></div>
            <span className="tab-bar__label">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Screen: Home ─────────────────────────────────────────────────────────────

function titleCaseDay(dayIdx: number): string {
  return DAYS[dayIdx][0] + DAYS[dayIdx].slice(1).toLowerCase()
}

function nextWaterStatus(plant: Plant, todayIdx: number): { label: string; dotColor: string } {
  if (plant.isWateredToday) {
    const dow = plant.lastWateredAt ? (new Date(plant.lastWateredAt).getDay() + 6) % 7 : null
    return { label: `Watered: ${dow !== null ? titleCaseDay(dow) : 'today'}`, dotColor: '#8E8E93' }
  }
  if (isPlantDueToday(plant, todayIdx)) {
    return { label: 'Water today', dotColor: GREEN }
  }
  for (let step = 1; step <= 7; step++) {
    const dayIdx = (todayIdx + step) % 7
    const refDate = new Date()
    refDate.setDate(refDate.getDate() + step)
    if (isPlantDueOnDay(plant, dayIdx, refDate)) {
      return { label: `Next water: ${step === 1 ? 'Tomorrow' : titleCaseDay(dayIdx)}`, dotColor: GREEN }
    }
  }
  return { label: 'No schedule', dotColor: '#8E8E93' }
}

function HomeScreen({ plants, todayIdx, onOpenPlant }: { plants: Plant[]; todayIdx: number; onOpenPlant: (p: Plant) => void }) {
  const thirsty = plants.filter((p) => isPlantDueToday(p, todayIdx) && !p.isWateredToday).length
  const healthScores = plants.map((p) => computeHealthStatus(p, todayIdx).score)
  const avgHealth = healthScores.length > 0 ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length) : 0
  return (
    <div className="app-shell-light scroll-y h-full px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-28">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-heading" style={{ fontSize: 22, color: '#000' }}>my Jungle</h1>
        <div className="icon-circle" style={{ background: '#000' }} aria-hidden>
          <div style={{ color: '#fff' }}><IconBell size={18} /></div>
        </div>
      </div>
      <div className="stat-tile mb-3" style={{ background: GREEN, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="stat-tile__value" style={{ color: '#000' }}>{plants.length}</span>
        <span className="stat-tile__label" style={{ color: '#000', opacity: 0.6 }}>Total plants</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="stat-tile" style={{ background: '#f0f0ec' }}>
          <span className="stat-tile__value" style={{ color: '#000' }}>{thirsty}</span>
          <span className="stat-tile__label" style={{ color: '#666' }}>Thirsty plants</span>
        </div>
        <div className="stat-tile" style={{ background: '#000' }}>
          <span className="stat-tile__value" style={{ color: GREEN }}>{avgHealth}%</span>
          <span className="stat-tile__label" style={{ color: '#8E8E93' }}>Avg. health</span>
        </div>
      </div>
      {plants.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div style={{ color: '#c7c7cc' }}><IconLeaf size={40} /></div>
          <p className="font-body" style={{ fontSize: 14, color: '#666' }}>No plants yet. Tap + to add your jungle.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {plants.map((p) => {
            const status = nextWaterStatus(p, todayIdx)
            return (
              <button key={p.id} type="button" onClick={() => onOpenPlant(p)} className="plant-tile text-left">
                <PlantPhoto photo={p.photo} alt={p.name} className="w-full h-full object-cover block" />
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

function DaysScreen({ plants, todayIdx, onToggleWatered }: { plants: Plant[]; todayIdx: number; onToggleWatered: (id: string) => void }) {
  const [selected, setSelected] = useState(todayIdx)
  const groupedDays = useMemo(() => {
    const set = new Set<number>()
    plants.forEach((p) => p.wateringDays.forEach((d) => set.add(d)))
    return set
  }, [plants])
  const todayName = FULL_DAY_NAMES[selected]
  const duePlants = plants.filter((p) => isPlantDueOnDay(p, selected, getDateForDayIndex(selected)))

  return (
    <div className="scroll-y h-full px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-28">
      <h1 className="font-heading text-center" style={{ fontSize: 20, color: '#fff', textTransform: 'uppercase' }}>Watering days</h1>
      <p className="font-body" style={{ fontSize: 14, color: '#8E8E93', marginTop: 8, marginBottom: 20 }}>
        The system grouped your {plants.length} plant{plants.length === 1 ? '' : 's'} into {groupedDays.size} day{groupedDays.size === 1 ? '' : 's'}.
      </p>
      <div className="flex justify-between gap-2 mb-6">
        {DAYS.map((d, i) => (
          <div key={d} className="flex flex-col items-center gap-1.5">
            <DayPill label={d[0]} active={i === selected} onClick={() => setSelected(i)} />
            <span style={{ width: 5, height: 5, borderRadius: 9999, background: groupedDays.has(i) ? GREEN : 'transparent' }} />
          </div>
        ))}
      </div>
      <h2 className="font-heading mb-3" style={{ fontSize: 16, color: '#fff' }}>
        {selected === todayIdx ? `Today: ${todayName}` : todayName}. {duePlants.length} plant{duePlants.length === 1 ? '' : 's'}
      </h2>
      <div className="flex flex-col gap-3">
        {duePlants.length === 0 && (
          <p className="font-body" style={{ fontSize: 14, color: '#8E8E93' }}>No plants scheduled for this day.</p>
        )}
        {duePlants.map((p) => (
          <button key={p.id} type="button" onClick={() => onToggleWatered(p.id)} className="check-row text-left">
            <PlantPhoto photo={p.photo} alt="" className="rounded-full object-cover shrink-0 w-12 h-12" />
            <span className="font-heading flex-1 min-w-0 truncate" style={{ fontSize: 17, color: '#111' }}>{p.name}</span>
            <div className={`check-circle ${p.isWateredToday ? 'is-checked' : ''}`}>
              {p.isWateredToday && <IconCheck size={14} />}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Screen: Plant detail ─────────────────────────────────────────────────────

function PlantDetailScreen({
  plant, user, todayIdx, onBack, onDelete, onWater, onShowLimitOrPro, onRunHealthCheck, onEdit, onLogGrowth,
}: {
  plant: Plant; user: UserState; todayIdx: number; onBack: () => void; onDelete: () => void; onWater: () => void
  onShowLimitOrPro: () => void; onRunHealthCheck: () => void; onEdit: () => void; onLogGrowth: () => void
}) {
  const [showActions, setShowActions] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const hasAccess = canAccessProFeatures(user)
  const timesPerWeek = plant.wateringFrequency === 'monthly' ? 1 : plant.wateringDays.length * (plant.wateringFrequency === 'biweekly' ? 0.5 : 1)
  const health = computeHealthStatus(plant, todayIdx)

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
        <IconCircleBtn onClick={onBack} label="Back"><IconChevronLeft /></IconCircleBtn>
        <span className="font-heading truncate px-2" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>Plant detail</span>
        <IconCircleBtn onClick={() => setShowActions(true)} label="More options"><IconDotsHorizontal /></IconCircleBtn>
      </div>
      <div className="scroll-y flex-1 pb-6">
        <div className="px-5" style={{ height: 220 }}>
          <div className="rounded-[1.5rem] overflow-hidden w-full h-full">
            <PlantPhoto photo={plant.photo} alt={plant.name} className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="card-white mx-5 p-5 flex flex-col gap-4 mt-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-heading" style={{ fontSize: 26 }}>{plant.name}</div>
              {plant.category && (
                <span className="font-body" style={{ fontSize: 13, color: '#8E8E93' }}>{plant.category}</span>
              )}
            </div>
            {hasAccess && (
              <span className="btn-outline-pro shrink-0" style={{ fontSize: 10, padding: '3px 10px' }}>PRO</span>
            )}
          </div>
          {plant.isToxicToPets === true && (
            <div className="flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: '#f3ecec' }}>
              <IconAlert size={18} />
              <span className="font-body font-medium" style={{ fontSize: 13 }}>Toxic to pets</span>
            </div>
          )}
          {plant.isToxicToPets === false && (
            <div className="flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: '#e8f9ee' }}>
              <IconPaw size={18} />
              <span className="font-body font-medium" style={{ fontSize: 13 }}>Pet safe</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Health status</span>
              <span className="font-body font-semibold" style={{ fontSize: 13, color: GREEN }}>{health.score}% {health.label}</span>
            </div>
            <div style={{ height: 8, borderRadius: 9999, background: '#eee', overflow: 'hidden' }}>
              <div style={{ width: `${health.score}%`, height: '100%', background: GREEN, borderRadius: 9999 }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: '#f5f5f5' }}>
              <div style={{ color: '#000' }}><IconDroplet size={16} /></div>
              <span className="font-heading" style={{ fontSize: 15, color: '#000' }}>{timesPerWeek}x/week</span>
              <span className="font-body" style={{ fontSize: 11, color: '#666' }}>Watering</span>
            </div>
            <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: '#f5f5f5' }}>
              <div style={{ color: '#000' }}><IconSun size={16} /></div>
              <span className="font-heading" style={{ fontSize: 15, color: '#000' }}>{plant.lightNeed === 'High' ? 'Direct' : plant.lightNeed === 'Low' ? 'Shade' : 'Indirect'}</span>
              <span className="font-body" style={{ fontSize: 11, color: '#666' }}>Light need</span>
            </div>
            <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: '#f5f5f5' }}>
              <div style={{ color: '#000' }}><IconThermometer size={16} /></div>
              <span className="font-heading" style={{ fontSize: 15, color: '#000' }}>{plant.temperatureRangeC ?? '18-27°C'}</span>
              <span className="font-body" style={{ fontSize: 11, color: '#666' }}>Temperature</span>
            </div>
            <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: '#f5f5f5' }}>
              <div style={{ color: '#000' }}><IconDroplets size={16} /></div>
              <span className="font-heading" style={{ fontSize: 15, color: '#000' }}>{plant.humidityNeed === 'high' ? 'High (60%+)' : plant.humidityNeed === 'low' ? 'Low' : 'Normal'}</span>
              <span className="font-body" style={{ fontSize: 11, color: '#666' }}>Humidity</span>
            </div>
          </div>

          <div>
            <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Watering schedule</span>
            <div className="flex items-center gap-2 mt-2">
              <span className="font-heading" style={{ fontSize: 11, background: GREEN, color: '#000', borderRadius: 8, padding: '4px 8px' }}>
                {plant.isWateredToday ? 'DONE' : isPlantDueToday(plant, todayIdx) ? 'TODAY' : (plant.scheduleDays[0] ?? '—')}
              </span>
              <div style={{ flex: 1, height: 1, background: '#eee' }} />
              <span className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>{nextWaterStatus(plant, todayIdx).label}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={hasAccess ? undefined : onShowLimitOrPro}
            className="flex items-center gap-2 rounded-2xl px-4 py-3"
            style={{ background: hasAccess ? '#e8f9ee' : '#f5f5f5', cursor: hasAccess ? 'default' : 'pointer' }}
          >
            {!hasAccess && <IconLock size={16} />}
            <span className="font-body font-medium" style={{ fontSize: 13 }}>
              {hasAccess ? 'Growth & health tracking unlocked' : 'Growth & health — unlocks with Pro'}
            </span>
          </button>

          {hasAccess && (
            <div>
              <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Health log</span>
              {plant.healthLogs.length === 0 ? (
                <p className="font-body mt-2" style={{ fontSize: 13, color: '#8E8E93' }}>No health checks yet.</p>
              ) : (
                <div className="flex flex-col gap-2 mt-2">
                  {plant.healthLogs.map((log) => {
                    const healthy = log.healthScore >= 70
                    const isOpen = expandedLog === log.id
                    return (
                      <div key={log.id} className="rounded-2xl overflow-hidden" style={{ background: '#f5f5f5' }}>
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
                              {healthy ? 'Healthy' : log.treatmentNotes}
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
                onClick={onRunHealthCheck}
                className="font-heading w-full mt-3"
                style={{ height: 48, borderRadius: 9999, background: 'transparent', border: `1.5px solid ${GREEN}`, color: '#0a8f3f', textTransform: 'uppercase', fontSize: 13 }}
              >
                Run new health check
              </button>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Grow history</span>
            </div>
            {plant.history.length === 0 ? (
              <p className="font-body mt-2" style={{ fontSize: 13, color: '#8E8E93' }}>No growth check-ins yet.</p>
            ) : (
              <div className="flex flex-col gap-2 mt-2">
                {plant.history.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: '#f5f5f5' }}>
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
            <button
              type="button"
              onClick={onLogGrowth}
              className="font-heading w-full mt-3"
              style={{ height: 48, borderRadius: 9999, background: 'transparent', border: '1.5px solid #111', color: '#111', textTransform: 'uppercase', fontSize: 13 }}
            >
              Log growth
            </button>
          </div>

          <button type="button" onClick={onWater} className="btn-fill w-full" style={{ height: 52, fontSize: 15 }}>
            {plant.isWateredToday ? 'Watered ✓' : 'Water now'}
          </button>
        </div>
      </div>
      {showActions && (
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
                Edit plant
              </button>
              <button
                type="button"
                onClick={() => { setShowActions(false); setShowDelete(true) }}
                className="font-heading text-left px-4 py-4"
                style={{ fontSize: 16, color: '#FF3B30' }}
              >
                Delete plant
              </button>
            </div>
          </div>
        </>
      )}
      {showDelete && (
        <ConfirmSheet
          title="Delete plant?"
          body={`Are you sure you want to delete ${plant.name}? This can't be undone.`}
          confirmLabel="Delete"
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
  const [open, setOpen] = useState(false)
  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close(action: () => void) { setOpen(false); setTimeout(action, 180) }
  return (
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onCancel)} />
      <div className="fixed left-4 right-4 z-[70]" style={{ top: '50%', transform: 'translateY(-50%)' }}>
        <div className={`modal-card ${open ? 'is-open' : ''} p-5 flex flex-col gap-4`}>
          <span className="font-heading" style={{ fontSize: 18 }}>{title}</span>
          <p className="font-body" style={{ fontSize: 14, color: '#444', lineHeight: 1.5 }}>{body}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => close(onCancel)} className="btn-ghost-dark flex-1" style={{ height: 46, background: '#f0f0f0', color: '#111' }}>Cancel</button>
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
    </>
  )
}

function LanguagePickerSheet({ current, onSelect, onClose }: { current: AppLanguage; onSelect: (l: AppLanguage) => void; onClose: () => void }) {
  const [open, setOpen] = useState(false)
  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close(action?: () => void) { setOpen(false); setTimeout(() => action?.(), 180) }
  return (
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onClose)} />
      <div className="fixed left-0 right-0 bottom-0 z-[70]">
        <div className={`sheet-panel ${open ? 'is-open' : ''} p-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-1`} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <span className="font-body block px-3 pt-2 pb-1" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Language</span>
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => close(() => onSelect(opt.code))}
              className="font-heading text-left px-4 py-3 flex items-center justify-between"
              style={{ fontSize: 16 }}
            >
              {LANGUAGE_NAMES[opt.code]}
              {opt.code === current && <IconCheck size={18} />}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Screen: Edit plant ─────────────────────────────────────────────────────

function EditPlantScreen({ plant, primaryDay, onBack, onSave }: {
  plant: Plant; primaryDay: number; onBack: () => void
  onSave: (updates: Pick<Plant, 'name' | 'category' | 'wateringDays' | 'scheduleDays' | 'isCustomSchedule'>) => void
}) {
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
        <IconCircleBtn onClick={onBack} label="Back"><IconChevronLeft /></IconCircleBtn>
        <span className="font-heading" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>Edit plant</span>
        <div style={{ width: 44 }} />
      </div>
      <div className="scroll-y flex-1 px-5 pt-2 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase' }}>Plant name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="font-heading px-4"
            style={{ height: 52, fontSize: 16, color: '#fff', background: 'var(--color-surface)', borderRadius: 14, border: 'none' }}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase' }}>Category</span>
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
          <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase' }}>{needsSecondDay ? 'Watering day 1' : 'Watering day'}</span>
          <select
            value={day1}
            onChange={(e) => setDay1(Number(e.target.value))}
            className="font-body px-4"
            style={{ height: 52, fontSize: 15, color: '#fff', background: 'var(--color-surface)', borderRadius: 14, border: 'none' }}
          >
            {FULL_DAY_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
          </select>
        </label>

        {needsSecondDay && (
          <label className="flex flex-col gap-1.5">
            <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase' }}>Watering day 2</span>
            <select
              value={day2}
              onChange={(e) => setDay2(Number(e.target.value))}
              className="font-body px-4"
              style={{ height: 52, fontSize: 15, color: '#fff', background: 'var(--color-surface)', borderRadius: 14, border: 'none' }}
            >
              {FULL_DAY_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
            </select>
          </label>
        )}

        <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: 'var(--color-surface)' }}>
          <span className="font-body" style={{ fontSize: 14, color: '#fff' }}>Water twice a week</span>
          <Toggle on={needsSecondDay} onChange={setNeedsSecondDay} />
        </div>
      </div>
      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-3 shrink-0">
        <button type="button" onClick={handleSave} className="btn-fill w-full" style={{ height: 52, fontSize: 15 }}>Save changes</button>
      </div>
    </div>
  )
}

// ─── Screen: Manual add (single, AI-assisted) ──────────────────────────────────

function ManualAddScreen({ onBack, onAdd, remainingFreeSlots, isPro, language, primaryDay }: {
  onBack: () => void; onAdd: (draft: DraftPlant) => void; remainingFreeSlots: number; isPro: boolean; language: AppLanguage; primaryDay: number
}) {
  const [photo, setPhoto] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftPlant | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [remindersOn, setRemindersOn] = useState(true)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    try {
      const compressed = await readAndCompressPhotoFile(file)
      setPhoto(compressed)
      setDraft(null)
      setAnalyzing(true)
      const result = await withMinDelay(identifyPhoto(compressed, language, primaryDay), 700)
      setDraft(result)
    } catch (error) {
      console.error('[myJungle] manual add analyze failed:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  const wateringFrequencyLabel = draft ? frequencyLabel(draft.wateringFrequency, draft.wateringDays.length) : ''
  const usedSlots = Math.max(0, MAX_FREE_PLANTS - remainingFreeSlots)

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = '' }} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = '' }} />
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
        <IconCircleBtn onClick={onBack} label="Back"><IconChevronLeft /></IconCircleBtn>
        <span className="font-body" style={{ fontSize: 13, color: '#8E8E93' }}>
          {isPro ? 'Unlimited plants' : `${remainingFreeSlots} of ${MAX_FREE_PLANTS} free slots left`}
        </span>
      </div>
      <div className="px-5 pb-4 shrink-0" style={{ height: 220 }}>
        {!photo ? (
          <div className="dash-picker w-full h-full flex flex-col items-center justify-center gap-2">
            <IconCamera size={28} />
            <span className="font-body" style={{ fontSize: 14, color: '#fff' }}>Upload photo</span>
          </div>
        ) : (
          <img src={photo} alt="" className="w-full h-full rounded-[1.5rem] object-cover" />
        )}
      </div>
      <div className="flex-1 min-h-0 flex flex-col" style={{ background: '#fff', borderRadius: '1.75rem 1.75rem 0 0' }}>
        <div className="scroll-y flex-1 px-5 pt-5">
          <button type="button" onClick={() => cameraInputRef.current?.click()} className="btn-fill w-full" style={{ height: 52, fontSize: 15 }}>Take photo</button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="font-heading w-full mt-3"
            style={{ height: 52, fontSize: 15, textTransform: 'uppercase', borderRadius: 9999, background: 'transparent', border: '1.5px solid #ddd', color: '#111' }}
          >
            From gallery
          </button>

          {analyzing && (
            <div className="flex flex-col items-center gap-2 mt-4">
              <AiThinkingLoader size={120} />
              <p className="font-body text-center" style={{ fontSize: 14, color: '#8E8E93' }}>Identifying your plant…</p>
            </div>
          )}

          {draft && (
            <>
              <div style={{ height: 1, background: '#eee', margin: '20px 0' }} />
              <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Enter details manually</span>

              <label className="flex flex-col gap-1.5 mt-4">
                <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase' }}>Plant name</span>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="font-heading px-4"
                  style={{ height: 48, fontSize: 16, color: '#111', background: '#f5f5f5', borderRadius: 14 }}
                />
              </label>

              <label className="flex flex-col gap-1.5 mt-4">
                <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase' }}>Category</span>
                <select
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  className="font-body px-4"
                  style={{ height: 48, fontSize: 15, color: '#111', background: '#f5f5f5', borderRadius: 14 }}
                >
                  {PLANT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>

              <div className="mt-4 rounded-2xl p-4 flex items-center justify-between" style={{ background: '#f5f5f5' }}>
                <span className="font-body" style={{ fontSize: 14, color: '#8E8E93' }}>Light requirement</span>
                <span className="font-heading" style={{ fontSize: 14, color: '#111' }}>{draft.lightNeed.toLowerCase()}</span>
              </div>
              <div className="mt-3 rounded-2xl p-4 flex items-center justify-between" style={{ background: '#f5f5f5' }}>
                <span className="font-body" style={{ fontSize: 14, color: '#8E8E93' }}>Humidity</span>
                <span className="font-heading" style={{ fontSize: 14, color: '#111' }}>{draft.humidityNeed}</span>
              </div>

              <div className="mt-3 rounded-2xl px-4 py-3 flex items-center gap-2" style={{ border: `1.5px solid ${GREEN}`, background: '#e6fbee' }}>
                <div style={{ color: '#0a8f3f' }}><IconCalendarSmall size={16} /></div>
                <span className="font-body" style={{ fontSize: 13, color: '#0a8f3f' }}>
                  Watering days: the system suggests {wateringFrequencyLabel}
                </span>
              </div>

              <div className="mt-3 rounded-2xl p-4 flex items-center justify-between" style={{ background: '#f5f5f5' }}>
                <div>
                  <div className="font-heading" style={{ fontSize: 14, color: '#111' }}>Set reminders</div>
                  <div className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>Receive watering notifications</div>
                </div>
                <Toggle on={remindersOn} onChange={setRemindersOn} />
              </div>

              {!isPro && (
                <p className="font-body text-center mt-4" style={{ fontSize: 12, color: '#8E8E93' }}>
                  {usedSlots}/{MAX_FREE_PLANTS} free slots used
                </p>
              )}
            </>
          )}
        </div>
        <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-3 flex gap-3 shrink-0">
          <button type="button" onClick={onBack} className="font-heading flex-1" style={{ height: 52, borderRadius: 9999, background: '#f0f0f0', color: '#111' }}>Edit</button>
          <button type="button" disabled={!draft} onClick={() => draft && onAdd(draft)} className="btn-fill flex-1" style={{ height: 52 }}>Add to jungle</button>
        </div>
      </div>
    </div>
  )
}

// ─── Screen: Health check ───────────────────────────────────────────────────

function healthScoreColor(score: number): string {
  if (score >= 70) return GREEN
  if (score >= 40) return '#FFC24B'
  return '#FF3B30'
}

function daysAgoLabel(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

function HealthReportCard({ photo, plantName, scannedAt, result }: {
  photo: string; plantName: string; scannedAt: string; result: AnalyzePlantHealthResult
}) {
  const healthy = result.healthScore >= 70
  return (
    <>
      <img src={photo} alt="" className="w-full rounded-[1.5rem] object-cover mb-4" style={{ height: 220 }} />
      <div className="mb-4">
        <div className="font-heading" style={{ fontSize: 22, color: '#fff' }}>{plantName}</div>
        <div className="font-body" style={{ fontSize: 13, color: '#8E8E93' }}>
          Scanned: {new Date(scannedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
      <div className="card-white p-5 flex flex-col gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span style={{ width: 8, height: 8, borderRadius: 9999, background: healthScoreColor(result.healthScore) }} />
          <span className="font-body font-semibold" style={{ fontSize: 12, color: healthScoreColor(result.healthScore), textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {healthy ? 'Healthy' : 'Needs attention'}
          </span>
        </div>
        <div className="font-heading" style={{ fontSize: 20 }}>{result.diagnosis}</div>
        <p className="font-body" style={{ fontSize: 14, color: '#555', lineHeight: 1.5 }}>{result.treatmentNotes}</p>
      </div>
      <div className="card-white p-5 flex flex-col gap-3">
        <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Recommended actions</span>
        {result.recommendedActions.map((a, i) => (
          <div key={i} className="flex items-start gap-2">
            <div style={{ color: '#111', marginTop: 2 }}><IconCheck size={16} /></div>
            <span className="font-body" style={{ fontSize: 14 }}>{a}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function HealthHubScreen({ plants, isPro, onScanNew, onCheckExisting, onOpenPlant, onShowPro }: {
  plants: Plant[]; isPro: boolean
  onScanNew: () => void; onCheckExisting: () => void; onOpenPlant: (p: Plant) => void; onShowPro: () => void
}) {
  const recentChecks = plants
    .flatMap((p) => p.healthLogs.map((log) => ({ plant: p, log })))
    .sort((a, b) => new Date(b.log.timestamp).getTime() - new Date(a.log.timestamp).getTime())
    .slice(0, 6)

  return (
    <div className="scroll-y h-full px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-28">
      {isPro && <span className="btn-outline-pro inline-block" style={{ fontSize: 10, padding: '3px 10px', marginBottom: 12 }}>PRO</span>}
      <h1 className="font-heading" style={{ fontSize: 26, color: '#fff' }}>Health Check</h1>
      <p className="font-body" style={{ fontSize: 14, color: '#8E8E93', marginTop: 4, marginBottom: 20 }}>
        Scan your plant to diagnose issues and get care advice.
      </p>

      <button type="button" onClick={isPro ? onScanNew : onShowPro} className="card-white p-4 flex items-center gap-3 w-full text-left mb-3">
        <div className="flex items-center justify-center rounded-full shrink-0" style={{ width: 44, height: 44, background: '#111', color: GREEN }}>
          <IconCamera size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading" style={{ fontSize: 16 }}>Scan a new plant</div>
          <div className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>Take a photo of any plant to check its health.</div>
        </div>
        <div style={{ color: '#8E8E93' }}>{isPro ? <IconChevronRight size={18} /> : <IconLock size={18} />}</div>
      </button>

      <button
        type="button"
        onClick={isPro ? onCheckExisting : onShowPro}
        disabled={isPro && plants.length === 0}
        className="card-white p-4 flex items-center gap-3 w-full text-left"
        style={{ opacity: isPro && plants.length === 0 ? 0.5 : 1 }}
      >
        <div className="flex items-center justify-center rounded-full shrink-0" style={{ width: 44, height: 44, background: '#111', color: GREEN }}>
          <IconLeaf size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading" style={{ fontSize: 16 }}>Check an existing plant</div>
          <div className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>Select from your jungle to run a health check.</div>
        </div>
        <div style={{ color: '#8E8E93' }}>{isPro ? <IconChevronRight size={18} /> : <IconLock size={18} />}</div>
      </button>

      {recentChecks.length > 0 && (
        <>
          <h2 className="font-heading mt-6 mb-3" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>Recent checks</h2>
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
                      <span className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>{daysAgoLabel(log.timestamp)}</span>
                      <span style={{ width: 4, height: 4, borderRadius: 9999, background: '#8E8E93' }} />
                      <span className="font-body font-semibold" style={{ fontSize: 12, color: healthScoreColor(log.healthScore) }}>{healthy ? 'Healthy' : 'Needs attention'}</span>
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
      setError('Could not analyze this photo. Please try again.')
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

  if (step === 'picker') {
    return (
      <div className="app-shell fixed inset-0 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
          <IconCircleBtn onClick={onBack} label="Back"><IconChevronLeft /></IconCircleBtn>
          <span className="font-heading" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>Select plant</span>
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
        <IconCircleBtn onClick={onBack} label="Back"><IconChevronLeft /></IconCircleBtn>
        <span className="font-heading" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>Health report</span>
        <div style={{ width: 44 }} />
      </div>
      <div className="scroll-y flex-1 px-5 pb-6">
        {!photo && (
          <div className="dash-picker w-full flex flex-col items-center justify-center gap-4" style={{ height: 260 }}>
            <div style={{ color: GREEN }}><IconNavHealth size={30} /></div>
            <div className="flex gap-3 w-full px-6">
              <button type="button" onClick={() => cameraInputRef.current?.click()} className="btn-fill flex-1" style={{ height: 48, fontSize: 13 }}>Take photo</button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="font-heading flex-1"
                style={{ height: 48, fontSize: 13, textTransform: 'uppercase', borderRadius: 9999, background: 'transparent', border: '1.5px solid #fff', color: '#fff' }}
              >
                From gallery
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
            <p className="font-body text-center" style={{ fontSize: 14, color: '#8E8E93' }}>Diagnosing plant health…</p>
          </div>
        )}

        {error && !analyzing && (
          <>
            <p className="font-body text-center mt-4" style={{ fontSize: 13, color: '#FF3B30' }}>{error}</p>
            <button type="button" onClick={reset} className="font-heading w-full mt-4" style={{ height: 52, borderRadius: 9999, background: '#1c1c1e', color: '#fff' }}>Try again</button>
          </>
        )}

        {photo && result && !analyzing && (
          <HealthReportCard photo={photo} plantName={selectedPlant?.name ?? 'New plant'} scannedAt={scannedAt ?? new Date().toISOString()} result={result} />
        )}
      </div>
      {photo && result && !analyzing && (
        <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-3 flex flex-col gap-3 shrink-0">
          {saved ? (
            <button type="button" onClick={onDone} className="btn-fill w-full" style={{ height: 52 }}>Done</button>
          ) : (
            <button
              type="button"
              onClick={() => (selectedPlant ? handleLogToProfile(selectedPlant) : setShowAttachPicker(true))}
              className="btn-fill w-full"
              style={{ height: 52 }}
            >
              Log to plant profile
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="font-heading w-full"
            style={{ height: 52, borderRadius: 9999, background: 'transparent', border: `1.5px solid ${GREEN}`, color: GREEN, textTransform: 'uppercase' }}
          >
            Scan again
          </button>
        </div>
      )}
      {showAttachPicker && (
        <>
          <div className="sheet-backdrop is-open" onClick={() => setShowAttachPicker(false)} />
          <div className="fixed left-0 right-0 bottom-0 z-[70]">
            <div className="sheet-panel is-open p-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-3">
              <span className="font-heading" style={{ fontSize: 18 }}>Attach to which plant?</span>
              {plants.length === 0 ? (
                <p className="font-body" style={{ fontSize: 14, color: '#666' }}>Add a plant first to save this check to its profile.</p>
              ) : (
                <div className="scroll-y flex flex-col gap-2" style={{ maxHeight: 320 }}>
                  {plants.map((p) => (
                    <button key={p.id} type="button" onClick={() => handleLogToProfile(p)} className="flex items-center gap-3 rounded-2xl px-3 py-2" style={{ background: '#f5f5f5' }}>
                      <PlantPhoto photo={p.photo} alt={p.name} className="rounded-xl object-cover shrink-0 w-10 h-10" />
                      <span className="font-heading" style={{ fontSize: 15 }}>{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => setShowAttachPicker(false)} className="font-body text-center mt-1" style={{ fontSize: 14, color: '#888' }}>Cancel</button>
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
      setError('Could not analyze this photo. Please try again.')
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

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = '' }} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = '' }} />
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
        <IconCircleBtn onClick={onBack} label="Back"><IconChevronLeft /></IconCircleBtn>
        <span className="font-heading" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>Log growth</span>
        <div style={{ width: 44 }} />
      </div>
      <div className="scroll-y flex-1 px-5 pb-6">
        {!photo && (
          <div className="dash-picker w-full flex flex-col items-center justify-center gap-4" style={{ height: 260 }}>
            <IconCamera size={30} />
            <div className="flex gap-3 w-full px-6">
              <button type="button" onClick={() => cameraInputRef.current?.click()} className="btn-fill flex-1" style={{ height: 48, fontSize: 13 }}>Take photo</button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="font-heading flex-1"
                style={{ height: 48, fontSize: 13, textTransform: 'uppercase', borderRadius: 9999, background: 'transparent', border: '1.5px solid #fff', color: '#fff' }}
              >
                From gallery
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
            <p className="font-body text-center" style={{ fontSize: 14, color: '#8E8E93' }}>Assessing growth stage…</p>
          </div>
        )}

        {error && !analyzing && (
          <>
            <p className="font-body text-center mt-4" style={{ fontSize: 13, color: '#FF3B30' }}>{error}</p>
            <button type="button" onClick={reset} className="font-heading w-full mt-4" style={{ height: 52, borderRadius: 9999, background: '#1c1c1e', color: '#fff' }}>Try again</button>
          </>
        )}

        {photo && result && !analyzing && (
          <>
            <img src={photo} alt="" className="w-full rounded-[1.5rem] object-cover mb-4" style={{ height: 220 }} />
            <div className="mb-4">
              <div className="font-heading" style={{ fontSize: 22, color: '#fff' }}>{plant.name}</div>
              <div className="font-body" style={{ fontSize: 13, color: '#8E8E93' }}>
                Checked: {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            <div className="card-white p-5 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: '#f5f5f5' }}>
                  <span className="font-heading" style={{ fontSize: 18 }}>{result.heightCm} cm</span>
                  <span className="font-body" style={{ fontSize: 11, color: '#8E8E93' }}>Estimated height</span>
                </div>
                <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: '#f5f5f5' }}>
                  <span className="font-heading" style={{ fontSize: 18 }}>{result.estimatedAge}</span>
                  <span className="font-body" style={{ fontSize: 11, color: '#8E8E93' }}>Estimated age</span>
                </div>
              </div>
              <div className="rounded-2xl p-4 mt-1" style={{ background: '#f5f5f5' }}>
                <span className="font-heading" style={{ fontSize: 16 }}>{result.condition}</span>
                <p className="font-body mt-1" style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{result.summary}</p>
              </div>
            </div>
          </>
        )}
      </div>
      {photo && result && !analyzing && (
        <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-3 flex flex-col gap-3 shrink-0">
          {saved ? (
            <button type="button" onClick={onBack} className="btn-fill w-full" style={{ height: 52 }}>Done</button>
          ) : (
            <button type="button" onClick={handleSave} className="btn-fill w-full" style={{ height: 52 }}>Save to grow history</button>
          )}
          <button
            type="button"
            onClick={reset}
            className="font-heading w-full"
            style={{ height: 52, borderRadius: 9999, background: 'transparent', border: `1.5px solid ${GREEN}`, color: GREEN, textTransform: 'uppercase' }}
          >
            Scan again
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Screen: Profile ────────────────────────────────────────────────────────

function ProfileScreen({ settings, user, onSave, onExport, onReset, onShowPro, onOpenLegal, language, onPickLanguage, onChangePrimaryWateringDay }: {
  settings: AppSettings; user: UserState; onSave: (s: AppSettings) => void
  onExport: () => void; onReset: () => void; onShowPro: () => void; onOpenLegal: (doc: LegalDoc) => void
  language: AppLanguage; onPickLanguage: () => void; onChangePrimaryWateringDay: (day: number) => void
}) {
  const [showNotifSettings, setShowNotifSettings] = useState(false)
  const [showDayPicker, setShowDayPicker] = useState(false)

  return (
    <div className="scroll-y h-full px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-28">
      <h1 className="font-heading text-center" style={{ fontSize: 22, color: '#fff', textTransform: 'uppercase' }}>Settings</h1>
      {!user.isPro && (
        <button type="button" onClick={onShowPro} className="btn-outline-pro w-full flex items-center justify-center gap-2 mt-5" style={{ height: 52 }}>
          <IconSparkles size={16} />
          <span>Unlock Pro</span>
        </button>
      )}
      <span className="font-body block" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 20 }}>Settings &amp; configuration</span>
      <div className="card-white overflow-hidden">
        <button type="button" onClick={() => setShowNotifSettings((v) => !v)} className="flex items-center justify-between w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>Notification preferences</span>
          <span style={{ color: '#111', transform: showNotifSettings ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}><IconChevronRight size={16} /></span>
        </button>
        {showNotifSettings && (
          <div className="px-5 py-4 flex flex-col gap-4" style={{ borderBottom: '1px solid #eee' }}>
            <div className="flex items-center justify-between">
              <span className="font-body" style={{ fontSize: 14, color: '#111' }}>Reminder time</span>
              <input
                type="time"
                value={settings.reminderTime}
                onChange={(e) => onSave({ ...settings, reminderTime: e.target.value })}
                className="font-body"
                style={{ fontSize: 14, border: 'none', borderRadius: 8, padding: '4px 8px', background: '#f0f0ec', color: '#111' }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body" style={{ fontSize: 14, color: '#111' }}>Sound alerts</span>
              <Toggle on={settings.soundAlerts} onChange={(v) => onSave({ ...settings, soundAlerts: v })} />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>Watering reminders</span>
          <Toggle on={settings.pushNotifications} onChange={(v) => onSave({ ...settings, pushNotifications: v })} />
        </div>
        <button type="button" onClick={() => setShowDayPicker(true)} className="flex items-center justify-between w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>Watering day</span>
          <span className="flex items-center gap-1.5">
            <span className="font-body" style={{ fontSize: 14, color: '#8E8E93' }}>{FULL_DAY_NAMES[settings.primaryWateringDay]}</span>
            <div style={{ color: '#111' }}><IconChevronRight size={16} /></div>
          </span>
        </button>
        <button type="button" onClick={onPickLanguage} className="flex items-center justify-between w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>Language</span>
          <span className="flex items-center gap-1.5">
            <span className="font-body" style={{ fontSize: 14, color: '#8E8E93' }}>{LANGUAGE_NAMES[language]}</span>
            <div style={{ color: '#111' }}><IconChevronRight size={16} /></div>
          </span>
        </button>
        <button type="button" onClick={onExport} className="flex items-center gap-3 w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <div style={{ color: '#111' }}><IconDownload size={18} /></div>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>Export my data</span>
        </button>
        <button type="button" onClick={onReset} className="flex items-center gap-3 w-full px-5 py-4" style={{ color: '#FF3B30' }}>
          <IconTrash size={18} />
          <span className="font-heading" style={{ fontSize: 16, color: '#FF3B30' }}>Reset all data</span>
        </button>
      </div>

      <span className="font-body block" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 20 }}>Legal</span>
      <div className="card-white overflow-hidden">
        <button type="button" onClick={() => onOpenLegal('terms')} className="flex items-center justify-between w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>Terms of Use</span>
          <div style={{ color: '#111' }}><IconChevronRight size={16} /></div>
        </button>
        <button type="button" onClick={() => onOpenLegal('privacy')} className="flex items-center justify-between w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>Privacy Policy</span>
          <div style={{ color: '#111' }}><IconChevronRight size={16} /></div>
        </button>
        <button type="button" onClick={() => onOpenLegal('impressum')} className="flex items-center justify-between w-full px-5 py-4">
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>Impressum</span>
          <div style={{ color: '#111' }}><IconChevronRight size={16} /></div>
        </button>
      </div>

      <p className="font-body text-center mt-6" style={{ fontSize: 12, color: '#5a5a5c' }}>
        Plant parent since {new Date().getFullYear()} · my Jungle v{APP_VERSION}
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

const LEGAL_CONTENT: Record<LegalDoc, { title: string; body: string }> = {
  terms: {
    title: 'Terms of Use',
    body:
      '[Placeholder — replace before publishing]\n\n' +
      'By using myJungle, you agree to use the app for its intended purpose of tracking and caring for your houseplants. ' +
      'AI-generated plant identification, health, and care guidance is provided for informational purposes only and may not always be accurate — always use your own judgment for plant and pet safety. ' +
      'The Pro unlock is a one-time, non-subscription purchase. ' +
      'We may update these terms from time to time; continued use of the app after changes constitutes acceptance.',
  },
  privacy: {
    title: 'Privacy Policy',
    body:
      '[Placeholder — replace before publishing]\n\n' +
      'myJungle stores your plants, photos, and settings locally on your device. ' +
      'Photos you capture are sent to our AI provider (Google Gemini) solely to identify plants and diagnose health issues, and are not stored by us beyond what your device retains. ' +
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
  const content = LEGAL_CONTENT[doc]
  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
        <IconCircleBtn onClick={onBack} label="Back"><IconChevronLeft /></IconCircleBtn>
        <span className="font-heading" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>{content.title}</span>
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
  const [open, setOpen] = useState(false)
  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close(action: () => void) { setOpen(false); setTimeout(action, 180) }
  return (
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onCancel)} />
      <div className="fixed left-0 right-0 bottom-0 z-[70]">
        <div className={`sheet-panel ${open ? 'is-open' : ''} p-6 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] flex flex-col items-center gap-4 text-center`}>
          <div className="flex items-center justify-center rounded-full" style={{ width: 64, height: 64, background: '#f3ecec' }}>
            <IconAlert size={28} />
          </div>
          <h2 className="font-heading" style={{ fontSize: 22 }}>You have reached your {MAX_FREE_PLANTS} free plants</h2>
          <p className="font-body" style={{ fontSize: 14, color: '#666', lineHeight: 1.5 }}>
            Pro lets you add unlimited plants, plus health &amp; growth tracking and priority support.
          </p>
          <button type="button" onClick={() => close(onUnlock)} className="btn-fill w-full" style={{ height: 52 }}>Unlock Pro</button>
          <button type="button" onClick={() => close(onCancel)} className="font-heading w-full" style={{ height: 52, borderRadius: 9999, background: '#f0f0f0', color: '#888' }}>Cancel</button>
        </div>
      </div>
    </>
  )
}

const PRO_BENEFITS = [
  'Unlimited plants',
  'AI identification',
  'Personalized care tips',
  'Health & growth tracking',
  'Priority support',
]

function ProUnlockScreen({ onClose, onUnlock }: { onClose: () => void; onUnlock: () => void }) {
  const [purchasing, setPurchasing] = useState(false)
  async function handleUnlock() {
    setPurchasing(true)
    try {
      await new Promise((r) => setTimeout(r, 400))
      onUnlock()
    } finally {
      setPurchasing(false)
    }
  }
  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-2 shrink-0">
        <IconCircleBtn onClick={onClose} label="Close"><IconX /></IconCircleBtn>
        <span className="font-heading" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>Upgrade</span>
        <div style={{ width: 44 }} />
      </div>
      <div className="scroll-y flex-1 px-6 pb-6 flex flex-col items-center">
        <div className="flex items-center justify-center rounded-full mb-6 mt-2" style={{ width: 88, height: 88, background: GREEN }}>
          <IconLock size={32} />
        </div>

        <div className="card-white w-full p-5">
          <div className="grid grid-cols-2 rounded-2xl overflow-hidden" style={{ background: '#f5f5f5' }}>
            <div className="p-4 flex flex-col gap-1 items-start text-left">
              <span className="font-body" style={{ fontSize: 11, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Free plan</span>
              <span className="font-heading" style={{ fontSize: 15, color: '#111' }}>{MAX_FREE_PLANTS} plants limit</span>
            </div>
            <div className="p-4 flex flex-col gap-1 items-start text-left" style={{ borderLeft: '1px solid #ddd' }}>
              <span className="font-body" style={{ fontSize: 11, color: '#0a8f3f', textTransform: 'uppercase', letterSpacing: 0.5 }}>Pro membership</span>
              <span className="font-heading" style={{ fontSize: 15, color: '#111' }}>Unlimited plants</span>
            </div>
          </div>

          <span className="font-body block mt-5" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Features unlocked</span>
          <div className="flex flex-col gap-3 mt-3 items-start w-full">
            {PRO_BENEFITS.map((b) => (
              <div key={b} className="flex items-center gap-3">
                <div style={{ color: '#111' }}><IconCheck size={18} /></div>
                <span className="font-body" style={{ fontSize: 15, color: '#111' }}>{b}</span>
              </div>
            ))}
          </div>
        </div>

        <span className="font-heading mt-6" style={{ fontSize: 34, color: '#fff' }}>$6.99</span>
        <span className="font-body" style={{ fontSize: 13, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 }}>One-time purchase</span>
        <button type="button" onClick={() => void handleUnlock()} disabled={purchasing} className="btn-fill w-full mt-4" style={{ height: 56, fontSize: 16 }}>
          {purchasing ? 'Processing…' : 'Unlock forever'}
        </button>
        <button type="button" onClick={() => void handleUnlock()} className="font-body underline mt-3" style={{ fontSize: 12, color: '#8E8E93' }}>Restore purchase</button>
      </div>
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [tab, setTab] = useState<Tab>('home')
  const [plants, setPlants] = useState<Plant[]>(loadPlants)
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [showLimitSheet, setShowLimitSheet] = useState(false)
  const [pendingDrafts, setPendingDrafts] = useState<DraftPlant[]>([])
  const [aiThinkingLabel, setAiThinkingLabel] = useState<string | null>(null)
  const [healthFlowConfig, setHealthFlowConfig] = useState<{ mode: 'new' | 'existing'; presetPlant: Plant | null } | null>(null)
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null)
  const [growthFlowPlant, setGrowthFlowPlant] = useState<Plant | null>(null)
  const [language, setLanguage] = useState<AppLanguage>(loadLanguage)
  const [showLanguagePicker, setShowLanguagePicker] = useState(false)
  const user = useUserState(settings)
  const todayIdx = getTodayDayIndex()

  useEffect(() => {
    async function configurePurchases() {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG })
      const platform = Capacitor.getPlatform()
      if (platform === 'ios' || platform === 'android') {
        await Purchases.configure({ apiKey: 'test_XsjuRyhMrzEQuaHZEwejrcVDtfL' })
      }
    }
    void configurePurchases()
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

  function handleSaveHealthLog(plantId: string, log: PlantHealthLog) {
    setPlants((prev) => prev.map((p) => (p.id === plantId ? { ...p, healthLogs: [log, ...p.healthLogs] } : p)))
  }

  function draftToPlant(d: DraftPlant): Plant {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: d.name,
      category: d.category,
      room: 'Unknown',
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
      checkIns: [],
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
    if (window.confirm('This will permanently delete all your plants and settings. Continue?')) {
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
        title="Bring in your jungle!"
        subtitle={`Photograph all your plants at once — ${MAX_FREE_PLANTS} free slots.`}
        freeSlots={MAX_FREE_PLANTS}
        doneLabel="Start AI analysis"
        onDone={(photos) => {
          setAiThinkingLabel(`Identifying ${photos.length} plant${photos.length === 1 ? '' : 's'}…`)
          void withMinDelay(Promise.all(photos.map((p) => identifyPhoto(p.dataUrl, language, settings.primaryWateringDay))), 900).then((drafts) => {
            setPendingDrafts(drafts)
            setAiThinkingLabel(null)
            setScreen('onboardingResult')
          })
        }}
      />
    )
  } else if (screen === 'onboardingResult') {
    content = (
      <AnalysisResultScreen
        drafts={pendingDrafts}
        language={language}
        primaryDay={settings.primaryWateringDay}
        onChangePrimaryDay={(day) => setSettings((s) => ({ ...s, primaryWateringDay: day }))}
        onDone={(finalDrafts) => {
          setPlants((prev) => [...prev, ...finalDrafts.map(draftToPlant)])
          setPendingDrafts([])
          setSettings((s) => ({ ...s, hasCompletedOnboarding: true }))
          if (settings.pushNotifications) void requestNotificationPermission()
          setScreen('main')
          setTab('home')
        }}
      />
    )
  } else if (screen === 'plantDetail' && selectedPlant) {
    const live = plants.find((p) => p.id === selectedPlant.id) || selectedPlant
    content = (
      <PlantDetailScreen
        plant={live}
        user={user}
        todayIdx={todayIdx}
        onBack={() => { setScreen('main'); setSelectedPlant(null) }}
        onDelete={() => handleDeletePlant(live.id)}
        onWater={() => handleWaterToggle(live.id)}
        onShowLimitOrPro={() => setScreen('proUnlock')}
        onRunHealthCheck={() => { setHealthFlowConfig({ mode: 'existing', presetPlant: live }); setScreen('healthFlow') }}
        onEdit={() => setScreen('editPlant')}
        onLogGrowth={() => { setGrowthFlowPlant(live); setScreen('growthFlow') }}
      />
    )
  } else if (screen === 'manualAdd') {
    content = (
      <ManualAddScreen
        isPro={user.isPro}
        language={language}
        primaryDay={settings.primaryWateringDay}
        remainingFreeSlots={Math.max(0, MAX_FREE_PLANTS - plants.length)}
        onBack={() => { setScreen('main'); setTab('home') }}
        onAdd={(draft) => {
          setPlants((prev) => [...prev, draftToPlant(draft)])
          setScreen('main')
          setTab('home')
        }}
      />
    )
  } else if (screen === 'proUnlock') {
    content = (
      <ProUnlockScreen
        onClose={() => { setScreen('main'); setTab('profile') }}
        onUnlock={() => {
          setSettings((s) => ({ ...s, isPro: true }))
          setScreen('bulkAdd')
        }}
      />
    )
  } else if (screen === 'bulkAdd') {
    content = (
      <BatchCaptureScreen
        title="Add the rest!"
        subtitle="Capture all your remaining plants to fill up."
        freeSlots={null}
        doneLabel="Add all in one tap"
        onBack={() => { setScreen('main'); setTab('home') }}
        onDone={(photos) => {
          setAiThinkingLabel(`Identifying ${photos.length} plant${photos.length === 1 ? '' : 's'}…`)
          void withMinDelay(Promise.all(photos.map((p) => identifyPhoto(p.dataUrl, language, settings.primaryWateringDay))), 900).then((drafts) => {
            setPendingDrafts(drafts)
            setAiThinkingLabel(null)
            setScreen('bulkResult')
          })
        }}
      />
    )
  } else if (screen === 'bulkResult') {
    content = (
      <AnalysisResultScreen
        drafts={pendingDrafts}
        language={language}
        primaryDay={settings.primaryWateringDay}
        onChangePrimaryDay={(day) => setSettings((s) => ({ ...s, primaryWateringDay: day }))}
        onDone={(finalDrafts) => {
          setPlants((prev) => [...prev, ...finalDrafts.map(draftToPlant)])
          setPendingDrafts([])
          setScreen('main')
          setTab('home')
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
  } else {
    let tabContent: React.ReactNode
    if (tab === 'home') {
      tabContent = <HomeScreen plants={plants} todayIdx={todayIdx} onOpenPlant={(p) => { setSelectedPlant(p); setScreen('plantDetail') }} />
    } else if (tab === 'days') {
      tabContent = <DaysScreen plants={plants} todayIdx={todayIdx} onToggleWatered={handleWaterToggle} />
    } else if (tab === 'health') {
      tabContent = (
        <HealthHubScreen
          plants={plants}
          isPro={user.isPro}
          onScanNew={() => { setHealthFlowConfig({ mode: 'new', presetPlant: null }); setScreen('healthFlow') }}
          onCheckExisting={() => { setHealthFlowConfig({ mode: 'existing', presetPlant: null }); setScreen('healthFlow') }}
          onOpenPlant={(p) => { setSelectedPlant(p); setScreen('plantDetail') }}
          onShowPro={() => setScreen('proUnlock')}
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
          onShowPro={() => setScreen('proUnlock')}
          onOpenLegal={(doc) => { setLegalDoc(doc); setScreen('legal') }}
          language={language}
          onPickLanguage={() => setShowLanguagePicker(true)}
          onChangePrimaryWateringDay={(day) => {
            setSettings((s) => ({ ...s, primaryWateringDay: day }))
            // Only remap plants still on the AI-batched schedule — a manually
            // customized schedule (isCustomSchedule) is left exactly as the user set it.
            setPlants((prev) => prev.map((p) => (
              p.isCustomSchedule
                ? p
                : { ...p, wateringDays: batchedWateringDays(p.waterNeed, day), scheduleDays: batchedWateringDays(p.waterNeed, day).map((i) => DAYS[i]) }
            )))
          }}
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
          onUnlock={() => { setShowLimitSheet(false); setScreen('proUnlock') }}
        />
      )}
      {showLanguagePicker && (
        <LanguagePickerSheet
          current={language}
          onClose={() => setShowLanguagePicker(false)}
          onSelect={(l) => { setLanguage(l); saveLanguage(l); setShowLanguagePicker(false) }}
        />
      )}
    </div>
  )
}
