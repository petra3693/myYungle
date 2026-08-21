import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Capacitor } from '@capacitor/core'
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor'
import { AlertTriangle, Calendar, Camera, Check, ChevronLeft, ChevronRight, Leaf, Lock, PawPrint, Plus, Sparkles, Star, Stethoscope, Sun, User } from 'lucide-react'
import LanguageSelector from '@/components/LanguageSelector'
import i18n, { getAppLanguage } from '@/i18n'
import { formatWateringDayTags, fullDayLabel, shortDayLabel, translateRoomLabel } from '@/i18n/labels'
import { submitFeedback } from '@/lib/submitFeedback'
import { analyzePlantImage, mapLightNeedToForm, mapWaterNeedToForm } from '@/lib/analyzePlant'
import { mapRecommendedDaysToIndices } from '@/lib/wateringSchedule'
import {
  cycleAnchorForFrequency,
  dayNamesFromIndices,
  getDateForDayIndex,
  isPlantDueOnDay,
  isPlantDueToday,
} from '@/lib/wateringDue'
import { loadPlantsFromStorage, readAndCompressPhotoFile, savePlantsToStorage, type StorageResult } from '@/lib/plantStorage'
import { sortPlantsForHomeList } from '@/lib/plantSort'
import { useFlipReorder } from '@/hooks/useFlipReorder'
import { clearAllPhotos, deletePlantPhotos, getPhotoBlob } from '@/lib/photoStore'
import PlantPhoto from '@/components/PlantPhoto'
import WateringBanner from '@/components/watering-banner'
import WateringScreen from '@/components/WateringScheduleScreen'
import PlantHealthTracker from '@/components/plant-health-tracker'
import PhotoActionSheet from '@/components/photo-action-sheet'
import HealthHubScreen from '@/components/HealthHubScreen'
import PaywallModal from '@/components/PaywallModal'
import ProFeatureGate from '@/components/ProFeatureGate'
import SlotConfirmationModal from '@/components/SlotConfirmationModal'
import type { HealthLogSubmitData } from '@/lib/health-log'
import { clampHealthScore } from '@/lib/health-log'
import { migrateLegacyCheckIn } from '@/lib/health-calculator'
import { canAccessProFeatures, clampProSlotsUsed, hasFreeProSlotsRemaining, MAX_PRO_SLOTS } from '@/lib/proAccess'
import { useUserState } from '@/hooks/useUserState'
import type { AppSettings, DayCode, HealthCheckIn, HistoryEntry, LightNeed, Plant, UserState, WaterNeed, WateringFrequency } from '@/types/plant'
import svgPaths from '@/imports/NewDesign2-1/svg-cm3nd9oy62'
import svgPaths2 from '@/imports/MyjungleSettimgs-2/svg-u9kpmn74e6'
import svgAdd from '@/imports/MyjungleAddPlant/svg-fer892chf7'
import svgDetail from '@/imports/MyjungleAddPlant-1/svg-op7ttlkxgr'
import LegalDocumentScreen, { type LegalDocument } from '@/components/LegalDocumentScreen'
import svgSettings from '@/imports/MyjungleSettings/svg-doomn8mxv7'
import detailHeroImg from '@/imports/MyjungleAddPlant-1/06984fd808ab72dc75d1af5314ea222465c42869.png'
import detailThumbImg from '@/imports/MyjungleAddPlant-1/24c699409182c3e5d2a17cf3bf10988ef662ca0c.png'
import plantImg0 from '@/imports/MyjungleSettimgs-2/24c699409182c3e5d2a17cf3bf10988ef662ca0c.png'
import plantImg1 from '@/imports/MyjungleSettimgs-2/a629e756f91539ad0cd6c99c620a960b94d6a89d.png'
import plantImg2 from '@/imports/MyjungleSettimgs-2/c1e26fe342a3e4cbf5b479e973ae60ebe8c1d81e.png'
import plantImg3 from '@/imports/MyjungleSettimgs-2/f9057e3acb1771233585613c769e96893a7e8d76.png'

type Screen = 'splash' | 'onboarding' | 'main' | 'detail' | 'healthDetail' | 'settings'
type TabScreen = 'home' | 'schedule' | 'add' | 'health' | 'profile'

// ─── Constants ────────────────────────────────────────────────────────────────

const GREEN = '#00FF66'
const BG = '#F2ECEC'
const BLACK = '#000000'
const RED = '#FF2D55'
const WATERED_BG = '#D9FFE8'
const DAYS: DayCode[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const MAX_FREE_PLANTS = 5
const APP_VERSION = '1.0.0'
const PLANT_PHOTOS = [plantImg0, plantImg1, plantImg2, plantImg3]

function isFreeTierLimitReached(plantCount: number, isPro: boolean): boolean {
  return !isPro && plantCount >= MAX_FREE_PLANTS
}

function canAddMorePlants(plantCount: number, isPro: boolean): boolean {
  return isPro || plantCount < MAX_FREE_PLANTS
}

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
  isProUser: false,
  proSlotsUsed: 0,
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadPlants(): Plant[] {
  return loadPlantsFromStorage(normalizePlant)
}

function savePlants(p: Plant[]): Promise<StorageResult> {
  return savePlantsToStorage(p)
}

function saveSettings(s: AppSettings) {
  try {
    localStorage.setItem('mj_settings', JSON.stringify(s))
  } catch (error) {
    console.error('[myJungle] Failed to save settings:', error)
  }
}

function plantHistory(plant: Plant): HistoryEntry[] {
  return Array.isArray(plant.history) ? plant.history : []
}

function sortSchedule(schedule: readonly string[]): DayCode[] {
  return [...schedule]
    .filter((d): d is DayCode => (DAYS as readonly string[]).includes(d))
    .sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b))
}

function scheduleToIndices(schedule: string[]): number[] {
  return sortSchedule(schedule).map((d) => DAYS.indexOf(d)).filter((i) => i >= 0)
}

function indicesToSchedule(indices: number[]): DayCode[] {
  return sortSchedule(indices.map((i) => DAYS[i]).filter(Boolean))
}

function scheduleIndicesFromPlant(plant: Pick<Plant, 'wateringDays' | 'scheduleDays'>): number[] {
  if (plant.scheduleDays?.length) return scheduleToIndices(plant.scheduleDays)
  return [...plant.wateringDays].sort((a, b) => a - b)
}

function normalizeHealthLog(raw: unknown): Plant['healthLogs'][number] | null {
  if (!raw || typeof raw !== 'object') return null
  const log = raw as Partial<Plant['healthLogs'][number]> & {
    severity?: string
    isHealthy?: boolean
  }
  if (!log.id || !log.timestamp || !log.diagnosis) return null

  let healthScore = typeof log.healthScore === 'number' ? log.healthScore : NaN
  if (Number.isNaN(healthScore)) {
    if (log.isHealthy === true) healthScore = 90
    else if (log.severity === 'high') healthScore = 35
    else if (log.severity === 'medium') healthScore = 60
    else healthScore = 75
  }

  return {
    id: String(log.id),
    timestamp: String(log.timestamp),
    photo: typeof log.photo === 'string' ? log.photo : '',
    healthScore: clampHealthScore(healthScore),
    diagnosis: String(log.diagnosis),
    treatmentNotes: typeof log.treatmentNotes === 'string' ? log.treatmentNotes : '',
    analyzedByAI: log.analyzedByAI !== false,
  }
}

function normalizePlant(raw: Plant & { watered?: boolean; lastWatered?: string | null; isCustomSchedule?: boolean; scheduleDays?: DayCode[] }): Plant {
  const wateringDays = [...(raw.wateringDays ?? [])].sort((a, b) => a - b)
  const scheduleDays = raw.scheduleDays?.length ? sortSchedule(raw.scheduleDays) : indicesToSchedule(wateringDays)
  const waterNeed: WaterNeed = raw.waterNeed === 'Light' || raw.waterNeed === 'Heavy' ? raw.waterNeed : 'Moderate'
  const lightNeed: LightNeed = raw.lightNeed === 'Low' || raw.lightNeed === 'High' ? raw.lightNeed : 'Medium'
  const photo = typeof raw.photo === 'string' && raw.photo.length > 0
    ? raw.photo
    : PLANT_PHOTOS[Math.floor(Math.random() * PLANT_PHOTOS.length)]

  return {
    id: String(raw.id ?? Date.now()),
    name: raw.name?.trim() || i18n.t('plantDetails.unnamedPlant'),
    room: raw.room?.trim() || i18n.t('rooms.unknown'),
    careNote: raw.careNote ?? '',
    wateringDays: scheduleToIndices(scheduleDays),
    scheduleDays,
    isCustomSchedule: raw.isCustomSchedule ?? false,
    wateringFrequency: raw.wateringFrequency === 'biweekly' || raw.wateringFrequency === 'monthly'
      ? raw.wateringFrequency
      : 'weekly',
    wateringCycleAnchor: raw.wateringCycleAnchor ?? null,
    waterNeed,
    lightNeed,
    photo,
    lastWateredAt: raw.lastWateredAt ?? raw.lastWatered ?? null,
    previousWateredAt: raw.previousWateredAt ?? null,
    history: Array.isArray(raw.history) ? raw.history : [],
    checkIns: Array.isArray(raw.checkIns)
      ? raw.checkIns.map(migrateLegacyCheckIn).filter((c): c is HealthCheckIn => c != null)
      : [],
    healthLogs: Array.isArray(raw.healthLogs)
      ? raw.healthLogs.map(normalizeHealthLog).filter((log): log is Plant['healthLogs'][number] => log != null)
      : [],
    isWateredToday: raw.isWateredToday ?? raw.watered ?? false,
    isToxicToPets: raw.isToxicToPets === true ? true : raw.isToxicToPets === false ? false : null,
    toxicityNotes: typeof raw.toxicityNotes === 'string' ? raw.toxicityNotes : '',
    isProSlotActivated: raw.isProSlotActivated === true,
  }
}

function loadSettings(): AppSettings {
  try {
    const r = localStorage.getItem('mj_settings')
    if (!r) return DEFAULT_SETTINGS
    const parsed = JSON.parse(r) as Partial<AppSettings> & { wateringDays?: number[] }
    const globalWaterSchedule = parsed.globalWaterSchedule?.length
      ? sortSchedule(parsed.globalWaterSchedule)
      : parsed.wateringDays?.length
        ? indicesToSchedule(parsed.wateringDays)
        : []
    const hasCompletedOnboarding = parsed.hasCompletedOnboarding ?? globalWaterSchedule.length > 0
    const timezone = parsed.timezone || getDeviceTimezone()
    const reminderTime = formatReminderTime(parsed.reminderTime ?? DEFAULT_SETTINGS.reminderTime)
    const isProUser = parsed.isProUser === true || parsed.isPro === true
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      globalWaterSchedule,
      hasCompletedOnboarding,
      timezone,
      reminderTime,
      isProUser,
      isPro: isProUser,
      proSlotsUsed: clampProSlotsUsed(parsed.proSlotsUsed),
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

// ─── Notifications ────────────────────────────────────────────────────────────

function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

function getEffectiveTimezone(settings: Pick<AppSettings, 'timezoneAutoSync' | 'timezone'>): string {
  return settings.timezoneAutoSync ? getDeviceTimezone() : settings.timezone
}

async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

function sendTestNotification(settings: AppSettings): boolean {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return false
  try {
    const tz = getEffectiveTimezone(settings)
    new Notification('myJungle — Test Alert', {
      body: `Watering reminder test for ${settings.reminderTime} (${tz}).`,
      tag: 'myjungle-test',
    })
    if (settings.hapticFeedback && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([15, 30, 15])
    }
    return true
  } catch {
    return false
  }
}

function formatReminderTime(value: string): string {
  const [h, m] = value.split(':')
  if (!h || !m) return value
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWaterNeedFills(need: WaterNeed): number {
  return need === 'Heavy' ? 3 : need === 'Moderate' ? 2 : 1
}

function formatWaterLevelLabel(need: WaterNeed, translate: (key: string) => string): string {
  const fills = getWaterNeedFills(need)
  const label =
    need === 'Heavy'
      ? translate('needLevels.waterHeavy')
      : need === 'Moderate'
        ? translate('needLevels.waterModerate')
        : translate('needLevels.waterLight')
  return `${label} · ${fills}/3`
}

function getLightNeedFills(need: LightNeed): number {
  return need === 'High' ? 3 : need === 'Medium' ? 2 : 1
}

function DetailStarIcon({ filled, size = 14 }: { filled: boolean; size?: number }) {
  return (
    <Star
      size={size}
      strokeWidth={2}
      aria-hidden
      className={filled ? 'shrink-0 text-[#FFB800] fill-[#FFB800]' : 'shrink-0 text-[#C4C4C4]'}
    />
  )
}

function formatLastWateredShort(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function getTodayDayIndex(): number { return (new Date().getDay() + 6) % 7 }

/** Hydration-safe: day index is null until after mount. */
function useTodayDayIndex(): number | null {
  const [todayIdx, setTodayIdx] = useState<number | null>(null)
  useEffect(() => { setTodayIdx(getTodayDayIndex()) }, [])
  return todayIdx
}

function todayISO() { return new Date().toISOString().split('T')[0] }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }

// ─── Shared SVG components from import ───────────────────────────────────────

function SvgDrop() {
  return (
    <svg className="block" fill="none" height="116" viewBox="0 0 85 116" width="85">
      <path d={svgPaths.p1cd02a80} fill="none" stroke="#B5B5B5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
    </svg>
  )
}
function SvgDropSmall({ color = GREEN, filled = false }: { color?: string; filled?: boolean }) {
  const stroke = filled ? color : '#C4C4C4'
  return (
    <svg className="block" fill="none" height="20" viewBox="0 0 12 20" width="12">
      <path d={svgPaths.p35497c00} fill={filled ? color : 'none'} stroke={stroke} strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}
function SvgDroplet24() {
  return (
    <svg className="block" fill="none" height="24" viewBox="0 0 24 24" width="24">
      <path d={svgPaths.p32e52500} stroke="#000000" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}
function SvgCheck() {
  return (
    <svg className="block" fill="none" height="18" viewBox="0 0 18 18" width="18">
      <path d={svgPaths.p3901e500} stroke="#000000" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}
function SvgSettingsWhite() {
  return (
    <svg className="block" fill="none" height="18" viewBox="0 0 18 18" width="18">
      <path clipRule="evenodd" d={svgPaths.p3b43000} fill="white" fillRule="evenodd" />
    </svg>
  )
}
function SvgLeaf() {
  return (
    <svg className="block" fill="none" height="10" viewBox="0 0 8 10" width="8">
      <path d={svgPaths.p1a37e900} fill="black" />
    </svg>
  )
}
function SvgStar() {
  return (
    <svg className="block" fill="none" height="16" viewBox="0 0 16 16" width="16">
      <g clipPath="url(#star-clip)">
        <path d={svgPaths.p397b9d00} stroke="#000000" strokeLinecap="round" strokeWidth="2" />
      </g>
      <defs><clipPath id="star-clip"><rect fill="white" height="16" width="16" /></clipPath></defs>
    </svg>
  )
}
function SvgCloverHero() {
  return (
    <svg className="block" fill="none" height="160" viewBox="0 0 160 160" width="160">
      <path d={svgPaths.p1e4fc7f0} fill="black" stroke="black" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function TabBar({
  active,
  onChange,
  plantCount = 0,
  isPro = false,
  onUpgrade,
}: {
  active: TabScreen
  onChange: (t: TabScreen) => void
  plantCount?: number
  isPro?: boolean
  onUpgrade?: () => void
}) {
  const { t } = useTranslation()
  const limitReached = isFreeTierLimitReached(plantCount, isPro)
  const sideTabs: { id: TabScreen; label: string; Icon: typeof Leaf; proBadge?: boolean }[] = [
    { id: 'home', label: t('tabs.plants'), Icon: Leaf },
    { id: 'schedule', label: t('tabs.schedule'), Icon: Calendar },
    { id: 'health', label: t('tabs.health'), Icon: Stethoscope, proBadge: !isPro },
    { id: 'profile', label: t('tabs.profile'), Icon: User },
  ]
  const leftTabs = sideTabs.slice(0, 2)
  const rightTabs = sideTabs.slice(2)
  const AddIcon = limitReached ? Lock : Plus

  function renderSideTab(tabItem: (typeof sideTabs)[number]) {
    const on = tabItem.id === active
    const Icon = tabItem.Icon
    return (
      <button
        key={tabItem.id}
        type="button"
        onClick={() => onChange(tabItem.id)}
        className="neo-tab-icon-btn relative cursor-pointer"
        style={{ background: on ? GREEN : 'transparent' }}
        aria-current={on ? 'page' : undefined}
        aria-label={tabItem.label}
      >
        <Icon className="size-5 text-black" strokeWidth={2.25} aria-hidden />
        {tabItem.proBadge && (
          <span
            className="absolute -top-1 -right-1 neo-pill px-1 py-px"
            style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 5, background: RED, color: '#fff', lineHeight: 1.2 }}
            aria-hidden
          >
            {t('common.pro')}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="neo-tab-bar-floating-wrap fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <nav className="neo-tab-bar-capsule relative flex items-center justify-between pointer-events-auto" aria-label={t('common.mainNav')}>
        {leftTabs.map(renderSideTab)}
        <div aria-hidden style={{ width: 56, flexShrink: 0 }} />
        {rightTabs.map(renderSideTab)}
        <button
          type="button"
          onClick={() => {
            if (limitReached && onUpgrade) {
              onUpgrade()
              return
            }
            onChange('add')
          }}
          className="neo-tab-add-btn-float flex items-center justify-center cursor-pointer"
          aria-current={active === 'add' ? 'page' : undefined}
          aria-label={limitReached ? t('tabs.upgradeToPro') : t('tabs.add')}
        >
          <AddIcon className="size-6 text-black" strokeWidth={2.5} aria-hidden />
        </button>
      </nav>
    </div>
  )
}

// ─── Screen 1: Splash ─────────────────────────────────────────────────────────

function SplashScreen({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation()

  useEffect(() => {
    const timer = setTimeout(onNext, 3200)
    return () => clearTimeout(timer)
  }, [onNext])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center min-h-dvh h-dvh w-full overflow-hidden" style={{ background: GREEN }}>
      {/* White flash ring on impact */}
      <div className="splash-ring absolute rounded-full border-4 border-white pointer-events-none"
        style={{ width: 90, height: 90 }} />

      {/* Background brightness flash */}
      <div className="bg-flash absolute inset-0 bg-white pointer-events-none" />

      {/* Drop */}
      <div className="drop-animate" style={{ marginBottom: 24 }}>
        <svg fill="none" height="182" viewBox="0 0 134 182" width="134">
          <path
            d="M67 4.56152C72.5269 26.7781 86.0478 47.7995 103.759 62.3135L105.543 63.7578C123.915 78.7871 133 96.4534 133 114.947C133 132.466 126.046 149.267 113.669 161.654C101.291 174.041 84.504 181 67 181C49.496 181 32.7085 174.041 20.3311 161.654C7.95357 149.267 1 132.466 1 114.947C1.00003 96.4534 10.0853 78.7871 28.457 63.7578L30.2412 62.3135C47.9522 47.7995 61.4731 26.7781 67 4.56152Z"
            fill="black" stroke="black" strokeLinecap="round" strokeWidth="2"
          />
        </svg>
      </div>

      {/* Text */}
      <div className="text-animate text-center">
        <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 28, color: '#000', letterSpacing: '-0.01em' }}>{t('app.name')}</div>
        <div style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000', opacity: 0.55, marginTop: 4 }}>{t('app.version')}</div>
      </div>
    </div>
  )
}

// ─── Screen 2: Onboarding ─────────────────────────────────────────────────────

function OnboardingScreen({ settings, onSave }: { settings: AppSettings; onSave: (s: AppSettings) => void }) {
  const { t } = useTranslation()
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [pushNotifications, setPushNotifications] = useState(settings.pushNotifications)

  function toggleDay(i: number) {
    setSelectedDays((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))
  }

  function handleStart() {
    onSave({
      ...settings,
      globalWaterSchedule: indicesToSchedule(selectedDays),
      hasCompletedOnboarding: true,
      pushNotifications,
    })
  }
  return (
    <div
      className="flex flex-col h-[100dvh] p-4 overflow-hidden box-border"
      style={{
        background: BG,
        paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="flex flex-col items-center shrink-0 gap-0.5 w-full">
        <svg className="h-10 w-auto max-h-12 shrink-0" fill="none" viewBox="0 0 85 116">
          <path d={svgPaths.p1cd02a80} fill="black" stroke="black" strokeLinecap="round" strokeWidth="2" />
        </svg>
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 18, color: '#000' }}>{t('app.name')}</span>
      </div>

      <div className="text-center mt-3 mb-2 shrink-0 flex flex-col gap-0.5 w-full">
        <span className="section-header" style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>{t('onboarding.weeklySchedule')}</span>
        <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 13, color: '#000' }}>{t('onboarding.chooseDays')}</span>
      </div>

      <div className="flex flex-col gap-1 flex-1 min-h-0 justify-center w-full">
        {DAYS.map((d, i) => {
          const on = selectedDays.includes(i)
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(i)}
              className={`neo-pill relative flex items-center justify-between w-full cursor-pointer shrink-0 transition-all ${on ? 'option-selected' : ''}`}
              style={{ background: on ? undefined : 'white', paddingLeft: 16, paddingRight: 16, paddingTop: 5, paddingBottom: 5 }}
            >
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}>{shortDayLabel(t, d)}</span>
              {on ? (
                <svg fill="none" height="16" viewBox="0 0 18 18" width="16">
                  <path d={svgPaths.p2c13d500} stroke="#000000" strokeLinecap="round" strokeWidth="2" />
                </svg>
              ) : (
                <div style={{ width: 16, height: 16 }} />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-3 mb-2 shrink-0 w-full">
        <LanguageSelector showSubtitle />
      </div>

      <div className="mb-3 shrink-0 flex flex-row items-center justify-between w-full gap-4">
        <div className="flex flex-col gap-1 flex-1 min-w-0 text-left">
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>{t('onboarding.pushNotification')}</span>
          <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 13, color: '#000' }}>{t('onboarding.allowNotifications')}</span>
        </div>
        <div
          onClick={() => setPushNotifications((p) => !p)}
          className="relative cursor-pointer shrink-0"
          style={{ width: 66, height: 38 }}
        >
          <div style={{
            width: 64, height: 36, borderRadius: 18,
            background: pushNotifications ? GREEN : 'white',
            border: '2px solid black',
            position: 'relative', margin: '1px',
            transition: 'background .2s',
          }}>
            <div style={{
              position: 'absolute',
              top: 2,
              left: pushNotifications ? 30 : 2,
              width: 26, height: 26,
              borderRadius: 13,
              background: pushNotifications ? BLACK : '#D9D9D9',
              border: '2px solid black',
              transition: 'left .2s',
            }} />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleStart}
        className="btn-primary btn-green flex w-full shrink-0 items-center justify-center rounded-full border-2 border-black cursor-pointer"
        style={{ background: GREEN, height: 52 }}
      >
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000' }}>{t('onboarding.start')}</span>
      </button>
    </div>
  )
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} className="cursor-pointer select-none relative" style={{ width: 50, height: 28 }}>
      <div style={{ width: 50, height: 28, borderRadius: 14, background: checked ? GREEN : '#ddd', border: '2px solid black', transition: 'background .2s', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 2, left: checked ? 22 : 2, width: 20, height: 20, borderRadius: 10, background: BLACK, transition: 'left .2s' }} />
      </div>
    </div>
  )
}

// ─── Weekly Day Strip (horizontal, compact) ───────────────────────────────────

function WeeklyStrip({ plants, todayIdx }: { plants: Plant[]; todayIdx: number }) {
  const { t } = useTranslation()
  const today = new Date()
  const counts = DAYS.map((_, i) =>
    plants.filter((p) => isPlantDueOnDay(p, i, getDateForDayIndex(i, today))).length,
  )
  return (
    <div className="px-5 py-3 shrink-0">
      <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000', marginBottom: 8 }}>{t('home.weeklySchedule')}</div>
      <div className="flex items-start justify-between gap-1">
        {DAYS.map((d, i) => {
          const isToday = i === todayIdx
          const count = counts[i]
          const hasPlants = count > 0
          // Card bg: today=black, scheduled=green, empty=white
          const bg = isToday ? BLACK : hasPlants ? GREEN : 'white'
          const textColor = isToday ? 'white' : BLACK
          // Badge: today=white bg+black text; scheduled=black bg+green text; empty=transparent+#888 text
          const badgeBg = isToday ? 'white' : hasPlants ? BLACK : 'transparent'
          const badgeText = isToday ? BLACK : hasPlants ? GREEN : '#888'
          return (
            <div key={d} className="neo-pill flex flex-col items-center gap-1 py-2.5" style={{ background: bg, width: 44 }}>
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: textColor }}>{shortDayLabel(t, d)}</span>
              <div className="flex items-center justify-center rounded-full" style={{ width: 18, height: 18, background: badgeBg }}>
                <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: badgeText }}>{count}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Plant Card ───────────────────────────────────────────────────────────────

function PlantCard({ plant, onTap, onDeleteRequest, onWater, todayIdx, swipeResetToken = 0 }: {
  plant: Plant
  onTap: () => void
  onDeleteRequest: () => void
  onWater: () => void
  todayIdx: number
  swipeResetToken?: number
}) {
  const { t } = useTranslation()
  const startX = useRef(0)
  const [swiped, setSwiped] = useState(false)

  useEffect(() => {
    setSwiped(false)
  }, [swipeResetToken])
  const waterNeedCount = plant.waterNeed === 'Heavy' ? 3 : plant.waterNeed === 'Moderate' ? 2 : 1
  // isWateredToday: mint-green card bg + white btn + green droplet
  // unisWateredToday: white card bg + green btn + black checkmark
  const cardBg = plant.isWateredToday ? WATERED_BG : 'white'

  return (
    <div className="neo-plant-card relative rounded-2xl overflow-hidden shrink-0">
      {/* Pink delete panel always behind card */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center cursor-pointer"
        style={{ width: 95, background: RED }}
        onClick={(e) => { e.stopPropagation(); onDeleteRequest() }}
        aria-label={t('common.deleteNamed', { name: plant.name })}
      >
        <svg fill="none" height="28" viewBox="46 27 27 28" width="27" aria-hidden>
          <path d={svgPaths2.p36f8ca80} fill="white" />
        </svg>
      </div>
      {/* Card slides left to reveal delete */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer relative w-full"
        style={{
          background: cardBg,
          transform: swiped ? 'translateX(-95px)' : 'none',
          transition: 'transform .22s cubic-bezier(0.4,0,0.2,1), background .28s ease',
          zIndex: 1,
        }}
        onTouchStart={(e) => { startX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          const dx = startX.current - e.changedTouches[0].clientX
          if (dx > 50) setSwiped(true)
          if (dx < -30) setSwiped(false)
        }}
        onClick={() => { if (swiped) setSwiped(false); else onTap() }}
      >
        {/* Thumbnail */}
        <div className="shrink-0 size-[54px] rounded-full overflow-hidden border-2 border-black">
          <PlantPhoto photo={plant.photo} alt={plant.name} className="w-full h-full object-cover" />
        </div>
        {/* Title + badges */}
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
            {plant.name}
          </div>
          <div className="flex flex-wrap gap-1">
            <span className="badge px-1.5 py-0.5" style={{ background: BG, fontSize: 9, color: '#000' }}>{translateRoomLabel(t, plant.room)}</span>
            <span className="badge px-1.5 py-0.5" style={{ background: GREEN, fontSize: 9, color: '#000' }}>
              {formatWateringDayTags(t, plant.wateringDays)}
            </span>
          </div>
          <div className="flex gap-1 items-end" style={{ height: 16 }}>
            {Array.from({ length: 3 }).map((_, idx) => (
              <SvgDropSmall key={idx} color={GREEN} filled={idx < waterNeedCount} />
            ))}
          </div>
        </div>
        {/* Quick water — right-aligned */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onWater() }}
          className="ml-auto shrink-0 flex items-center justify-center rounded-full border-2 border-black size-10 cursor-pointer active:scale-90 transition-all"
          style={{ background: plant.isWateredToday ? 'white' : GREEN }}
          aria-label={plant.isWateredToday ? t('home.watered') : t('home.markWatered')}
        >
          {plant.isWateredToday ? (
            <svg fill="none" height="18" viewBox="7 5.5 14 18" width="14">
              <path d={svgPaths2.p64f2600} fill={GREEN} />
            </svg>
          ) : (
            <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
              <path d={svgPaths2.p3901e500} stroke={BLACK} strokeLinecap="round" strokeWidth="2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Screen 3 & 4: Home ───────────────────────────────────────────────────────

function HomeScreen({ plants, settings, onSelectPlant, onDeletePlant, onWaterPlant, onGoAdd, onShowPro, todayIdx }: {
  plants: Plant[]; settings: AppSettings; onSelectPlant: (p: Plant) => void;
  onDeletePlant: (id: string) => void; onWaterPlant: (id: string) => void; onGoAdd: () => void; onShowPro: () => void; todayIdx: number
}) {
  const { t } = useTranslation()
  const [plantToDelete, setPlantToDelete] = useState<Plant | null>(null)
  const [swipeResetTokens, setSwipeResetTokens] = useState<Record<string, number>>({})
  const sortedPlants = useMemo(
    () => sortPlantsForHomeList(plants, { todayIdx }),
    [plants, todayIdx],
  )
  const sortedPlantIds = useMemo(() => sortedPlants.map((p) => p.id), [sortedPlants])
  const plantListRef = useFlipReorder(sortedPlantIds)
  const needsWater = plants.filter((p) => isPlantDueToday(p, todayIdx) && !p.isWateredToday)
  const limitReached = isFreeTierLimitReached(plants.length, settings.isProUser || settings.isPro)

  function requestDeletePlant(plant: Plant) {
    setPlantToDelete(plant)
  }

  function cancelDeletePlant() {
    if (plantToDelete) {
      setSwipeResetTokens((prev) => ({
        ...prev,
        [plantToDelete.id]: (prev[plantToDelete.id] ?? 0) + 1,
      }))
    }
    setPlantToDelete(null)
  }

  function confirmDeletePlant() {
    if (!plantToDelete) return
    onDeletePlant(plantToDelete.id)
    setPlantToDelete(null)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: BG }}>
      <div className="app-header" style={{ background: BG }}>
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 24, color: '#000' }}>{t('app.name')}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onShowPro}
            className="badge flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer"
            style={{ background: GREEN }}
          >
            <SvgLeaf />
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>{t('common.pro')}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto home-dashboard-scroll">
        {/* Alert banner */}
        <div className="px-5 pt-4 pb-3">
          <WateringBanner count={needsWater.length} />
        </div>

        {/* Weekly strip */}
        <WeeklyStrip plants={plants} todayIdx={todayIdx} />

        {/* Specimens */}
        <div className="px-5 home-dashboard-content">
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000' }}>
              {t('home.mySpecimens', { count: plants.length })}
            </span>
          </div>

          {plants.length === 0 ? (
            <div className="home-empty-state">
              <div className="home-empty-state__icon" aria-hidden>
                <SvgDrop />
              </div>
              <p className="home-empty-state__text">{t('home.noPlants')}</p>
            </div>
          ) : (
            <div ref={plantListRef} className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 w-full">
              {sortedPlants.map((p) => (
                <div key={p.id} data-flip-id={p.id} className="min-w-0">
                  <PlantCard
                    plant={p}
                    onTap={() => onSelectPlant(p)}
                    onDeleteRequest={() => requestDeletePlant(p)}
                    onWater={() => onWaterPlant(p.id)}
                    todayIdx={todayIdx}
                    swipeResetToken={swipeResetTokens[p.id] ?? 0}
                  />
                </div>
              ))}
            </div>
          )}

          {plantToDelete && (
            <DeletePlantConfirmModal
              plantName={plantToDelete.name}
              onCancel={cancelDeletePlant}
              onConfirm={confirmDeletePlant}
            />
          )}

          {/* Add plant / Upgrade CTA */}
          <button
            type="button"
            onClick={limitReached ? onShowPro : onGoAdd}
            className={`home-add-plant-btn w-full flex items-center justify-center rounded-full border-2 border-black cursor-pointer transition-all min-h-[52px] py-3.5 px-6 ${
              limitReached ? 'btn-primary bg-[#F2ECEC]' : 'btn-primary btn-green'
            }`}
            style={{ background: limitReached ? '#F2ECEC' : GREEN }}
          >
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 13, color: '#000' }}>
              {limitReached ? t('home.upgradeToPro') : t('home.addPlant')}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Free Tier Card ───────────────────────────────────────────────────────────

function AddPlantForm({
  proSlotsUsed,
  onUpgrade,
}: {
  proSlotsUsed: number
  onUpgrade: () => void
}) {
  const { t } = useTranslation()
  const isLimitReached = proSlotsUsed >= MAX_PRO_SLOTS
  const remainingSlots = Math.max(0, MAX_PRO_SLOTS - proSlotsUsed)
  const progressPercentage = Math.min(100, (proSlotsUsed / MAX_PRO_SLOTS) * 100)

  return (
    <div className={`free-tier-card w-full transition-colors ${isLimitReached ? 'free-tier-card--limit' : ''}`}>
      <div className="free-tier-header">
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000', textTransform: 'uppercase' }}>
          {t('common.freeTier')}
        </span>
        <span className={`plants-used-badge ${isLimitReached ? 'plants-used-badge--limit' : ''}`}>
          {t('common.proSlotsBadge', { used: proSlotsUsed, max: MAX_PRO_SLOTS })}
        </span>
      </div>

      <div className="progress-bar-track">
        <div
          className={`progress-bar-fill ${isLimitReached ? 'progress-bar-fill--limit' : ''}`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {isLimitReached ? (
        <div className="flex flex-col gap-3">
          <p
            className="flex items-center gap-2"
            style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 14, color: RED, lineHeight: 1.4 }}
            role="alert"
          >
            <span aria-hidden>⚠️</span>
            <span>{t('common.proSlotsLimitReached')}</span>
          </p>
          <button
            type="button"
            onClick={onUpgrade}
            className="btn-primary btn-green w-full flex items-center justify-center rounded-full border-2 border-black cursor-pointer min-h-[44px] py-2.5 px-5 transition-all"
            style={{ background: GREEN }}
          >
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>
              {t('common.upgradeAiScanCta')}
            </span>
          </button>
        </div>
      ) : (
        <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 13, color: '#888', lineHeight: 1.5 }}>
          {t('common.proSlotsRemaining', { count: remainingSlots })}{' '}
          <button
            type="button"
            onClick={onUpgrade}
            className="cursor-pointer underline bg-transparent border-0 p-0"
            style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 13, color: '#000' }}
          >
            {t('common.upgradeUnlimited')}
          </button>
        </p>
      )}
    </div>
  )
}

function FreeTierCard({
  title,
  plantsUsed,
  plantsMax,
  footer,
}: {
  title: string
  plantsUsed: number
  plantsMax: number
  footer: React.ReactNode
}) {
  const { t } = useTranslation()
  const fillPct = Math.min(plantsUsed / plantsMax, 1)
  return (
    <div className="free-tier-card w-full">
      <div className="free-tier-header">
        <span className="font-display" style={{ fontSize: 10, color: '#000' }}>{title}</span>
        <span className="plants-used-badge">{t('common.plantsUsed', { used: plantsUsed, max: plantsMax })}</span>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${fillPct * 100}%` }} />
      </div>
      <div style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 11, color: '#888' }}>
        {footer}
      </div>
    </div>
  )
}

// ─── Photo Picker ─────────────────────────────────────────────────────────────

// ─── Custom Schedule ──────────────────────────────────────────────────────────

const CHECK_PATH = svgAdd.p2c13d500

function CustomScheduleModal({
  isOpen,
  selectedDays,
  globalSchedule,
  onClose,
  onApply,
  onUseDefault,
  onEditGlobalSchedule,
}: {
  isOpen: boolean
  selectedDays: number[]
  globalSchedule: DayCode[]
  onClose: () => void
  onApply: (days: number[]) => void
  onUseDefault: () => void
  onEditGlobalSchedule: () => void
}) {
  const { t } = useTranslation()
  const [draftDays, setDraftDays] = useState<number[]>(selectedDays)

  useEffect(() => {
    if (isOpen) setDraftDays(selectedDays)
  }, [isOpen, selectedDays])

  if (!isOpen) return null

  function toggleDraftDay(i: number) {
    setDraftDays((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))
  }

  function handleApply() {
    if (draftDays.length === 0) return
    onApply([...draftDays].sort((a, b) => a - b))
  }

  const globalLabel = globalSchedule.length
    ? globalSchedule.map((d) => shortDayLabel(t, d)).join(', ')
    : t('customSchedule.noGlobalDays')

  return createPortal(
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} aria-hidden />
      <div className="fixed inset-x-4 top-1/2 z-[70] -translate-y-1/2 mx-auto max-w-md">
        <div className="neo-card rounded-2xl border-2 border-black bg-white p-4 flex flex-col gap-4 max-h-[85dvh] overflow-y-auto">
          <div className="flex flex-col gap-1">
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000', textTransform: 'uppercase' }}>
              {t('customSchedule.title')}
            </span>
            <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 12, color: '#888', lineHeight: 1.4 }}>
              {t('customSchedule.subtitle', { schedule: globalLabel })}
            </span>
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            {DAYS.map((d, i) => {
              const on = draftDays.includes(i)
              const inGlobal = globalSchedule.includes(d as DayCode)
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDraftDay(i)}
                  className={`neo-pill w-full cursor-pointer active:scale-[0.99] transition-all rounded-full border-2 border-black ${on ? 'option-selected' : ''}`}
                  style={{ background: on ? undefined : '#F3F4F6' }}
                >
                  <div className="flex items-center justify-between px-5 py-2">
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: on ? '#000' : '#888' }}>{shortDayLabel(t, d)}</span>
                      {inGlobal && !on && (
                        <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 9, color: '#888' }}>{t('customSchedule.inGeneral')}</span>
                      )}
                    </div>
                    {on ? (
                      <svg fill="none" height="18" viewBox="0 0 18 18" width="18" aria-hidden>
                        <path d={CHECK_PATH} stroke="#000" strokeLinecap="round" strokeWidth="2" />
                      </svg>
                    ) : (
                      <div className="size-[18px] rounded-full border-2 border-[#888]" aria-hidden />
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => { onClose(); onEditGlobalSchedule() }}
            className="w-full text-left underline cursor-pointer"
            style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 12, color: '#000' }}
          >
            {t('customSchedule.editGlobal')}
          </button>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleApply}
              disabled={draftDays.length === 0}
              className="btn-primary btn-green flex w-full items-center justify-center rounded-full border-2 border-black cursor-pointer disabled:opacity-40"
              style={{ background: GREEN, height: 48 }}
            >
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>{t('customSchedule.apply')}</span>
            </button>
            <button
              type="button"
              onClick={() => { onUseDefault(); onClose() }}
              className="flex w-full items-center justify-center rounded-full border-2 border-black bg-white cursor-pointer"
              style={{ height: 44, fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}
            >
              {t('customSchedule.useDefault')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex w-full items-center justify-center cursor-pointer"
              style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 13, color: '#888' }}
            >
              {t('deleteModal.cancel')}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}

function WateringScheduleSection({
  days,
  isCustomSchedule,
  globalIndices,
  wateringFrequency,
  aiHighlightedDays,
  aiHighlightedFrequency,
  onToggleDay,
  onFrequencyChange,
  onOpenCustomModal,
  onResetToDefault,
}: {
  days: number[]
  isCustomSchedule: boolean
  globalIndices: number[]
  wateringFrequency: WateringFrequency
  aiHighlightedDays?: number[]
  aiHighlightedFrequency?: WateringFrequency | null
  onToggleDay: (index: number) => void
  onFrequencyChange: (frequency: WateringFrequency) => void
  onOpenCustomModal: () => void
  onResetToDefault: () => void
}) {
  const { t } = useTranslation()

  function selectFrequencyOption(option: 'biweekly' | 'monthly') {
    onFrequencyChange(wateringFrequency === option ? 'weekly' : option)
  }

  function frequencyOptionClass(checked: boolean, highlighted: boolean) {
    const base = 'neo-pill relative flex-1 min-w-0 transition-all rounded-full border-2 border-black cursor-pointer active:scale-[0.99]'
    if (checked) return `${base} option-selected`
    if (highlighted) return `${base} option-ai-hint`
    return base
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase', lineHeight: 1.4, whiteSpace: 'pre-line' }}>
          {t('addPlant.waterScheduleQuestion')}
        </div>
        {isCustomSchedule && (
          <span
            className="rounded-full border-2 border-black px-2.5 py-1 shrink-0"
            style={{ background: GREEN, fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 9, color: '#000' }}
          >
            {t('addPlant.customSchedule')}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-[7px] w-full">
        {DAYS.map((d, i) => {
          const on = days.includes(i)
          const disabled = !isCustomSchedule && !globalIndices.includes(i)
          const aiHighlighted = aiHighlightedDays?.includes(i) ?? false
          const dayClass = on ? 'option-selected' : aiHighlighted ? 'option-ai-hint' : ''
          return (
            <button
              key={d}
              type="button"
              onClick={() => onToggleDay(i)}
              disabled={disabled}
              className={`neo-pill relative w-full transition-all rounded-full border-2 border-black ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-[0.99]'} ${dayClass}`}
              style={{ background: disabled && !on ? '#E5E5E5' : on || aiHighlighted ? undefined : '#F3F4F6' }}
            >
              <div className="flex items-center justify-between px-5 py-1.5">
                <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: disabled && !on ? '#888' : '#000' }}>{shortDayLabel(t, d)}</span>
                {on ? (
                  <svg fill="none" height="18" viewBox="0 0 18 18" width="18" aria-hidden>
                    <path d={CHECK_PATH} stroke="#000" strokeLinecap="round" strokeWidth="2" />
                  </svg>
                ) : (
                  <div className="size-[18px] rounded-full border-2 border-[#888]" aria-hidden />
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex flex-row gap-2 w-full mt-1" role="radiogroup" aria-label={t('addPlant.waterScheduleQuestion')}>
        <button
          type="button"
          role="radio"
          aria-checked={wateringFrequency === 'biweekly'}
          onClick={() => selectFrequencyOption('biweekly')}
          className={frequencyOptionClass(wateringFrequency === 'biweekly', aiHighlightedFrequency === 'biweekly')}
          style={{ background: wateringFrequency === 'biweekly' || aiHighlightedFrequency === 'biweekly' ? undefined : '#F3F4F6' }}
        >
          <div className="flex items-center justify-between gap-1 px-3 py-1.5">
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 9, color: '#000', lineHeight: 1.2 }}>{t('addPlant.every2Weeks')}</span>
            {wateringFrequency === 'biweekly' ? (
              <svg fill="none" height="16" viewBox="0 0 18 18" width="16" aria-hidden className="shrink-0">
                <path d={CHECK_PATH} stroke="#000" strokeLinecap="round" strokeWidth="2" />
              </svg>
            ) : (
              <div className="size-4 rounded-full border-2 border-[#888] shrink-0" aria-hidden />
            )}
          </div>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={wateringFrequency === 'monthly'}
          onClick={() => selectFrequencyOption('monthly')}
          className={frequencyOptionClass(wateringFrequency === 'monthly', aiHighlightedFrequency === 'monthly')}
          style={{ background: wateringFrequency === 'monthly' || aiHighlightedFrequency === 'monthly' ? undefined : '#F3F4F6' }}
        >
          <div className="flex items-center justify-between gap-1 px-3 py-1.5">
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 9, color: '#000', lineHeight: 1.2 }}>{t('addPlant.onceAMonth')}</span>
            {wateringFrequency === 'monthly' ? (
              <svg fill="none" height="16" viewBox="0 0 18 18" width="16" aria-hidden className="shrink-0">
                <path d={CHECK_PATH} stroke="#000" strokeLinecap="round" strokeWidth="2" />
              </svg>
            ) : (
              <div className="size-4 rounded-full border-2 border-[#888] shrink-0" aria-hidden />
            )}
          </div>
        </button>
      </div>

      {isCustomSchedule ? (
        <button
          type="button"
          onClick={onResetToDefault}
          className="text-left cursor-pointer underline"
          style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 12, color: '#000' }}
        >
          {t('addPlant.useDefaultSchedule')}
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenCustomModal}
          className="text-left cursor-pointer underline"
          style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 12, color: '#000' }}
        >
          {t('addPlant.modifySchedule')}
        </button>
      )}
    </div>
  )
}

// ─── Need level segmented pickers (water / light) ─────────────────────────────

function NeedLevelSegmentPicker<T extends string>({
  label,
  value,
  options,
  onChange,
  renderIndicator,
}: {
  label: string
  value: T
  options: { value: T; label: string; indicatorCount: number }[]
  onChange: (value: T) => void
  renderIndicator: (active: boolean) => React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-[8px] w-full">
      <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase', whiteSpace: 'pre' }}>
        {label}
      </span>
      <div className="need-segment-track" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const on = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(option.value)}
              className={`need-segment-btn ${on ? 'is-active' : ''}`}
            >
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}>
                {option.label.toUpperCase()}
              </span>
              {Array.from({ length: option.indicatorCount }).map((_, idx) => (
                <span key={idx} className="shrink-0">{renderIndicator(on)}</span>
              ))}
            </button>
          )
        })}
      </div>
    </div>
  )
}

type PetToxicityChoice = 'unknown' | 'safe' | 'toxic'

function petToxicityFromBoolean(value: boolean | null | undefined): PetToxicityChoice {
  if (value === true) return 'toxic'
  if (value === false) return 'safe'
  return 'unknown'
}

function booleanFromPetToxicity(choice: PetToxicityChoice): boolean | null {
  if (choice === 'toxic') return true
  if (choice === 'safe') return false
  return null
}

function PetToxicityPicker({
  value,
  onChange,
  notes,
  onNotesChange,
}: {
  value: PetToxicityChoice
  onChange: (value: PetToxicityChoice) => void
  notes: string
  onNotesChange: (notes: string) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-2 w-full">
      <NeedLevelSegmentPicker
        label={t('toxicity.question')}
        value={value}
        options={[
          { value: 'unknown' as PetToxicityChoice, label: t('toxicity.unknown'), indicatorCount: 0 },
          { value: 'safe' as PetToxicityChoice, label: t('toxicity.safe'), indicatorCount: 0 },
          { value: 'toxic' as PetToxicityChoice, label: t('toxicity.toxic'), indicatorCount: 0 },
        ]}
        onChange={onChange}
        renderIndicator={() => null}
      />
      {(value === 'toxic' || notes.trim()) && (
        <div className="flex flex-col gap-1.5 w-full shrink-0">
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>
            {t('toxicity.notesLabel')}
          </span>
          <div className="neo-input rounded-[12px] w-full" style={{ minHeight: 72 }}>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value.slice(0, 200))}
              placeholder={t('toxicity.notesPlaceholder')}
              className="w-full h-full min-h-[72px] p-[14px] outline-none bg-transparent rounded-[12px] resize-none"
              style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: notes.trim() ? '#000' : '#888' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function PetToxicityBadge({
  isToxicToPets,
  toxicityNotes,
}: {
  isToxicToPets: boolean | null
  toxicityNotes?: string
}) {
  const { t } = useTranslation()
  const status = isToxicToPets === true ? 'toxic' : isToxicToPets === false ? 'safe' : 'unknown'
  const label =
    status === 'toxic'
      ? t('toxicity.badgeToxic')
      : status === 'safe'
        ? t('toxicity.badgeSafe')
        : t('toxicity.badgeUnknown')

  return (
    <div className={`pet-toxicity-badge pet-toxicity-badge--${status}`} role="status">
      {status === 'toxic' ? (
        <AlertTriangle size={18} strokeWidth={2.5} aria-hidden className="shrink-0" />
      ) : (
        <PawPrint size={18} strokeWidth={2.5} aria-hidden className="shrink-0" />
      )}
      <div className="pet-toxicity-badge__copy min-w-0">
        <span className="pet-toxicity-badge__title break-words">{label}</span>
        {toxicityNotes?.trim() && (
          <p className="pet-toxicity-badge__notes break-words">{toxicityNotes}</p>
        )}
      </div>
    </div>
  )
}

// ─── Screen 5: Add New ───────────────────────────────────────────────────────

function AddScreen({ plants, settings, user, onSave, onCancel, onUpgrade, onActivateSlot, onEditGlobalSchedule }: {
  plants: Plant[]; settings: AppSettings; user: UserState; onSave: (p: Plant) => void; onCancel: () => void; onUpgrade: () => void
  onActivateSlot: () => void; onEditGlobalSchedule: () => void
}) {
  const { t } = useTranslation()
  const globalIndices = scheduleToIndices(settings.globalWaterSchedule)
  const [addMode, setAddMode] = useState<'ai' | 'manual'>('ai')
  const [name, setName] = useState('')
  const [room, setRoom] = useState('')
  const [note, setNote] = useState('')
  const [days, setDays] = useState<number[]>(globalIndices)
  const [isCustomSchedule, setIsCustomSchedule] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [waterNeed, setWaterNeed] = useState<WaterNeed>('Moderate')
  const [lightNeed, setLightNeed] = useState<LightNeed>('Medium')
  const [wateringFrequency, setWateringFrequency] = useState<WateringFrequency>('weekly')
  const [aiHighlightedDays, setAiHighlightedDays] = useState<number[]>([])
  const [aiHighlightedFrequency, setAiHighlightedFrequency] = useState<WateringFrequency | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [analyzeNotice, setAnalyzeNotice] = useState<string | null>(null)
  const [slotActivated, setSlotActivated] = useState(false)
  const [showSlotConfirm, setShowSlotConfirm] = useState(false)
  const [petToxicity, setPetToxicity] = useState<PetToxicityChoice>('unknown')
  const [toxicityNotes, setToxicityNotes] = useState('')
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)
  const canAdd = canAddMorePlants(plants.length, settings.isProUser || settings.isPro)

  useEffect(() => {
    if (!isCustomSchedule) setDays(scheduleToIndices(settings.globalWaterSchedule))
  }, [settings.globalWaterSchedule.join(','), isCustomSchedule, settings.globalWaterSchedule])

  async function handlePhotoFile(file: File) {
    try {
      const compressed = await readAndCompressPhotoFile(file)
      setPhoto(compressed)
    } catch (error) {
      console.error('[myJungle] Photo processing failed:', error)
    }
  }

  function handlePhotoInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handlePhotoFile(file)
    e.target.value = ''
    setAnalyzeError(null)
    setAnalyzeNotice(null)
  }

  const aiScanLocked = !user.isProUser && !slotActivated && !hasFreeProSlotsRemaining(user)

  function handleAiScanClick() {
    if (!photo || analyzing) return
    if (user.isProUser || slotActivated) {
      void handleAnalyzeWithAi()
      return
    }
    if (hasFreeProSlotsRemaining(user)) {
      setShowSlotConfirm(true)
      return
    }
    onUpgrade()
  }

  function confirmSlotAndScan() {
    setShowSlotConfirm(false)
    setSlotActivated(true)
    onActivateSlot()
    void handleAnalyzeWithAi()
  }

  async function handleAnalyzeWithAi() {
    if (!photo || analyzing) return
    setAnalyzeError(null)
    setAnalyzeNotice(null)
    setAnalyzing(true)
    try {
      const preferredDays = dayNamesFromIndices(globalIndices)
      const result = await analyzePlantImage(photo, preferredDays, getAppLanguage())
      if (!result.ok) {
        setAnalyzeError(result.error)
        return
      }
      if (result.data.confidence === 'low') {
        setAnalyzeNotice(t('analyze.lowConfidence'))
      }
      const mappedNeed = mapWaterNeedToForm(result.data.waterNeed)
      const { days: suggestedDays, isCustomSchedule: customSchedule } = mapRecommendedDaysToIndices(
        result.data.recommendedDays,
        result.data.waterNeed,
        globalIndices,
      )
      const frequency = result.data.frequency ?? 'weekly'
      setName(result.data.name)
      setWaterNeed(mappedNeed)
      setLightNeed(mapLightNeedToForm(result.data.lightNeed))
      setNote(result.data.careNotes.slice(0, 500))
      setDays(suggestedDays)
      setIsCustomSchedule(customSchedule)
      setWateringFrequency(frequency)
      setAiHighlightedDays(suggestedDays)
      setAiHighlightedFrequency(frequency !== 'weekly' ? frequency : null)
      if (result.data.isToxicToPets !== null) {
        setPetToxicity(petToxicityFromBoolean(result.data.isToxicToPets))
      }
      if (result.data.toxicityNotes) {
        setToxicityNotes(result.data.toxicityNotes.slice(0, 200))
      }
    } catch (error) {
      console.error('[myJungle] Plant analysis error:', error)
      setAnalyzeError(
        error instanceof Error ? error.message : t('analyze.failed'),
      )
    } finally {
      setAnalyzing(false)
    }
  }

  function toggleDay(i: number) {
    setAiHighlightedDays([])
    setAiHighlightedFrequency(null)
    if (!isCustomSchedule && !globalIndices.includes(i)) {
      setShowScheduleModal(true)
      return
    }
    if (!isCustomSchedule) {
      setDays((prev) => {
        const next = prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
        return next.length ? next : prev
      })
      return
    }
    setDays((prev) => {
      const next = prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
      return next.length ? next : prev
    })
  }

  function applyCustomSchedule(selected: number[]) {
    setDays(selected)
    setIsCustomSchedule(true)
    setShowScheduleModal(false)
  }

  function resetToGeneralSchedule() {
    setDays(globalIndices)
    setIsCustomSchedule(false)
    setShowScheduleModal(false)
    setAiHighlightedDays([])
    setAiHighlightedFrequency(null)
  }

  function handleFrequencyChange(frequency: WateringFrequency) {
    setWateringFrequency(frequency)
    setAiHighlightedFrequency(null)
    setAiHighlightedDays([])
  }

  async function save() {
    if (!name.trim() || days.length === 0 || !canAdd || saving) return
    setSaveError(null)
    setSaving(true)

    try {
      const photoUrl = photo ?? PLANT_PHOTOS[Math.floor(Math.random() * PLANT_PHOTOS.length)]

      const scheduleDays = indicesToSchedule(days)
      const newPlant: Plant = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: name.trim(),
        room: room.trim() || t('rooms.unknown'),
        careNote: note,
        wateringDays: scheduleToIndices(scheduleDays),
        scheduleDays,
        isCustomSchedule,
        wateringFrequency,
        wateringCycleAnchor: cycleAnchorForFrequency(wateringFrequency, null),
        waterNeed,
        lightNeed,
        photo: photoUrl,
        lastWateredAt: null,
        previousWateredAt: null,
        history: [],
        checkIns: [],
        healthLogs: [],
        isWateredToday: false,
        isToxicToPets: booleanFromPetToxicity(petToxicity),
        toxicityNotes: toxicityNotes.trim(),
        isProSlotActivated: slotActivated,
      }

      onSave(newPlant)
    } catch (error) {
      console.error('[myJungle] Save plant failed:', error)
      setSaveError(t('addPlant.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const dropletPath = svgAdd.p13e3d5f0

  function WaterDroplet({ active }: { active: boolean }) {
    const c = active ? BLACK : GREEN
    return (
      <svg fill="none" height="12" viewBox="0 0 12 12" width="12" aria-hidden>
        <path d={dropletPath} fill={c} stroke={c} strokeLinecap="round" strokeWidth="2" />
      </svg>
    )
  }

  function LightSunIcon({ active }: { active: boolean }) {
    return (
      <Sun
        size={12}
        strokeWidth={2.25}
        aria-hidden
        className={active ? 'text-black' : 'text-[#00FF66]'}
        fill={active ? BLACK : GREEN}
      />
    )
  }

  return (
    <div className="add-screen flex flex-col flex-1 min-h-0 h-full w-full" style={{ background: BG }}>
      <div className="flex flex-col items-center shrink-0 w-full px-5 pt-2 pb-3">
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 18, color: '#000' }}>
          {t('addPlant.title')}
        </span>
      </div>

      <div className="add-screen-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full">
        <div className="flex flex-col gap-4 w-full px-5 pb-24">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoInputChange}
          />
          <input
            ref={libraryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoInputChange}
          />

          {/* AI Instant Scan / Manual Entry toggle */}
          <div className="add-mode-toggle w-full shrink-0" role="tablist" aria-label={t('addPlant.modeToggleLabel')}>
            <button
              type="button"
              role="tab"
              aria-selected={addMode === 'ai'}
              onClick={() => setAddMode('ai')}
              className={`add-mode-toggle__option ${addMode === 'ai' ? 'add-mode-toggle__option--active' : ''}`}
            >
              <Sparkles size={13} strokeWidth={2.5} aria-hidden className="shrink-0" />
              <span>{t('addPlant.modeAiScan')}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={addMode === 'manual'}
              onClick={() => setAddMode('manual')}
              className={`add-mode-toggle__option ${addMode === 'manual' ? 'add-mode-toggle__option--active' : ''}`}
            >
              <Check size={13} strokeWidth={2.5} aria-hidden className="shrink-0" />
              <span>{t('addPlant.modeManual')}</span>
            </button>
          </div>

          {addMode === 'ai' && (
            <>
              {/* Photo uploader */}
              <div className="neo-card rounded-3xl w-full shrink-0">
                <div className="flex flex-col items-center gap-4 p-4">
                  <div className="bg-white rounded-full shrink-0 size-20 overflow-hidden border-2 border-black flex items-center justify-center">
                    {photo ? (
                      <img src={photo} alt={t('photo.selectedPlant')} className="block w-full h-full object-cover" />
                    ) : (
                      <svg fill="none" height="28" viewBox="0 0 24 24" width="28" aria-hidden>
                        <path d={svgAdd.p22b7c700} fill="black" />
                      </svg>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPhotoPicker(true)}
                    className="btn-primary btn-green inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-black cursor-pointer px-4 py-2"
                    style={{ background: GREEN, minHeight: 36 }}
                  >
                    <svg fill="none" height="14" viewBox="0 0 20 20" width="14" aria-hidden className="shrink-0">
                      <path d={svgAdd.p3e11a380} stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', lineHeight: 1 }}>
                      {t('addPlant.takePhoto')}
                    </span>
                  </button>
                </div>
              </div>

              {/* AI analyze */}
              <div className="w-full flex flex-col items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleAiScanClick}
                  disabled={!photo || analyzing}
                  className="gemini-analyze-btn w-full max-w-[340px] flex items-center justify-center gap-2 px-6 py-4"
                  style={aiScanLocked ? { filter: 'grayscale(0.35)' } : undefined}
                >
                  <span className="gemini-analyze-btn__shine" aria-hidden />
                  {aiScanLocked ? (
                    <Lock size={18} strokeWidth={2.5} aria-hidden className="shrink-0 gemini-analyze-btn__icon text-white drop-shadow-sm" />
                  ) : (
                    <Sparkles size={18} strokeWidth={2.5} aria-hidden className="shrink-0 gemini-analyze-btn__icon text-white drop-shadow-sm" />
                  )}
                  <span
                    className="gemini-analyze-btn__label"
                    style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 13, color: '#fff', lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}
                  >
                    {analyzing ? t('addPlant.analyzingWithAi') : aiScanLocked ? t('addPlant.unlockAiScan') : t('addPlant.analyzeWithAi')}
                  </span>
                  {aiScanLocked ? (
                    <Lock size={18} strokeWidth={2.5} aria-hidden className="shrink-0 gemini-analyze-btn__icon text-white drop-shadow-sm" />
                  ) : (
                    <Sparkles size={18} strokeWidth={2.5} aria-hidden className="shrink-0 gemini-analyze-btn__icon text-white drop-shadow-sm" />
                  )}
                </button>
                {!photo && (
                  <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 12, color: '#888' }}>
                    {t('addPlant.addPhotoFirst')}
                  </p>
                )}
                {analyzeError && (
                  <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 12, color: RED }} role="alert">
                    {analyzeError}
                  </p>
                )}
                {analyzeNotice && !analyzeError && (
                  <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 12, color: '#9a7b00' }} role="status">
                    {analyzeNotice}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Plant name */}
          <div className="flex flex-col gap-1.5 w-full shrink-0">
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>
              {t('addPlant.plantName').toUpperCase()}
            </span>
            <div className="neo-input rounded-[12px] w-full">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('addPlant.plantNamePlaceholder')}
                className="w-full p-[14px] outline-none bg-transparent rounded-[12px]"
                style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}
              />
            </div>
          </div>

          {/* Room */}
          <div className="flex flex-col gap-1.5 w-full shrink-0">
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>
              {t('addPlant.room').toUpperCase()}
            </span>
            <div className="neo-input rounded-[12px] w-full">
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder={t('addPlant.roomPlaceholder')}
                className="w-full p-[14px] outline-none bg-transparent rounded-[12px]"
                style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: room.trim() ? '#000' : '#888' }}
              />
            </div>
          </div>

          {/* Care note */}
          <div className="flex flex-col gap-1.5 w-full shrink-0">
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>
              {t('addPlant.careNote')}
            </span>
            <div className="neo-input rounded-[12px] w-full" style={{ height: 96 }}>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('addPlant.careNotePlaceholder')}
                className="w-full h-full p-[14px] outline-none bg-transparent rounded-[12px] resize-none"
                style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: note.trim() ? '#000' : '#888' }}
              />
            </div>
          </div>

          <PetToxicityPicker
            value={petToxicity}
            onChange={setPetToxicity}
            notes={toxicityNotes}
            onNotesChange={setToxicityNotes}
          />

          {/* Water & light */}
          <div className="flex flex-col gap-4 w-full shrink-0">
            <NeedLevelSegmentPicker
              label={t('addPlant.waterNeedQuestion')}
              value={waterNeed}
              options={[
                { value: 'Light' as WaterNeed, label: t('needLevels.waterLight'), indicatorCount: 1 },
                { value: 'Moderate' as WaterNeed, label: t('needLevels.waterModerate'), indicatorCount: 2 },
                { value: 'Heavy' as WaterNeed, label: t('needLevels.waterHeavy'), indicatorCount: 3 },
              ]}
              onChange={setWaterNeed}
              renderIndicator={(active) => <WaterDroplet active={active} />}
            />

            <NeedLevelSegmentPicker
              label={t('addPlant.lightNeedQuestion')}
              value={lightNeed}
              options={[
                { value: 'Low' as LightNeed, label: t('needLevels.lightLow'), indicatorCount: 1 },
                { value: 'Medium' as LightNeed, label: t('needLevels.lightMedium'), indicatorCount: 2 },
                { value: 'High' as LightNeed, label: t('needLevels.lightHigh'), indicatorCount: 3 },
              ]}
              onChange={setLightNeed}
              renderIndicator={(active) => <LightSunIcon active={active} />}
            />
          </div>

          {/* Schedule / day pickers */}
          <div className="w-full shrink-0">
            <WateringScheduleSection
              days={days}
              isCustomSchedule={isCustomSchedule}
              globalIndices={globalIndices}
              wateringFrequency={wateringFrequency}
              aiHighlightedDays={aiHighlightedDays}
              aiHighlightedFrequency={aiHighlightedFrequency}
              onToggleDay={toggleDay}
              onFrequencyChange={handleFrequencyChange}
              onOpenCustomModal={() => setShowScheduleModal(true)}
              onResetToDefault={resetToGeneralSchedule}
            />
          </div>

          {!(settings.isProUser || settings.isPro) && (
            <div className="w-full shrink-0">
              <AddPlantForm proSlotsUsed={user.proSlotsUsed} onUpgrade={onUpgrade} />
            </div>
          )}

          <div className="flex flex-col gap-2 w-full shrink-0 pt-1">
            {saveError && (
              <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 13, color: RED }} role="alert">
                {saveError}
              </p>
            )}
            <button
              type="button"
              onClick={() => { void save() }}
              disabled={!name.trim() || !canAdd || days.length === 0 || saving}
              className="btn-primary btn-green save-jungle-btn w-full flex items-center justify-center rounded-full border-2 border-black cursor-pointer transition-all"
            >
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: 'inherit' }}>
                {saving ? t('addPlant.saving') : t('addPlant.savePlant')}
              </span>
            </button>
          </div>

          <div className="flex w-full shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary btn-green flex flex-1 items-center justify-center rounded-full border-2 border-black cursor-pointer bg-white"
              style={{ height: 48, background: 'white' }}
            >
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>{t('common.cancel')}</span>
            </button>
          </div>
        </div>
      </div>

      {showPhotoPicker && (
        <PhotoActionSheet
          onClose={() => setShowPhotoPicker(false)}
          onTakePhoto={() => {
            setShowPhotoPicker(false)
            cameraInputRef.current?.click()
          }}
          onChooseLibrary={() => {
            setShowPhotoPicker(false)
            libraryInputRef.current?.click()
          }}
        />
      )}

      {showSlotConfirm && (
        <SlotConfirmationModal
          plantName={name.trim() || t('addPlant.plantNamePlaceholder')}
          onCancel={() => setShowSlotConfirm(false)}
          onConfirm={confirmSlotAndScan}
        />
      )}

      <CustomScheduleModal
        isOpen={showScheduleModal}
        selectedDays={days}
        globalSchedule={settings.globalWaterSchedule as DayCode[]}
        onClose={() => setShowScheduleModal(false)}
        onApply={applyCustomSchedule}
        onUseDefault={resetToGeneralSchedule}
        onEditGlobalSchedule={onEditGlobalSchedule}
      />
    </div>
  )
}

const DETAIL_GRAY_LIGHT = '#F3F4F6'
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const

// ─── Plant Detail Helpers ─────────────────────────────────────────────────────

function formatDetailDate(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

function monthShortLabel(monthIndex: number, translate: (key: string) => string = (key) => i18n.t(key)) {
  return translate(`months.short.${MONTH_KEYS[monthIndex] ?? 'jan'}`)
}

function formatTimelineChip(iso: string, translate: (key: string) => string = (key) => i18n.t(key)) {
  const d = new Date(iso)
  return `${monthShortLabel(d.getMonth(), translate)} ${d.getDate()}`
}

function daysSinceLabel(iso: string | null, translate: (key: string, options?: { count?: number }) => string): string {
  if (!iso) return translate('plantDetails.never')
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (diff <= 0) return translate('plantDetails.today')
  return translate('plantDetails.daysAgo', { count: diff })
}

function lightLevelLabel(need: LightNeed, translate: (key: string) => string): string {
  if (need === 'Low') return translate('plantDetails.lowLight')
  if (need === 'High') return translate('plantDetails.highLight')
  return translate('plantDetails.mediumLight')
}

function getPlantAgeDays(plant: Plant): number {
  const created = Number(plant.id)
  const startMs = Number.isFinite(created) && created > 0 ? created : Date.now()
  return Math.max(1, Math.floor((Date.now() - startMs) / 86400000))
}

function getWateringCount(plant: Plant): number {
  return plantHistory(plant).filter((h) => h.note.toLowerCase().includes('water')).length
}

function getConsistencyScore(plant: Plant): number {
  const daysTracked = getPlantAgeDays(plant)
  const weeksTracked = Math.max(1, daysTracked / 7)
  const expected = Math.round(weeksTracked * plant.wateringDays.length)
  const actual = getWateringCount(plant)
  if (expected === 0) return actual > 0 ? 100 : 0
  return Math.min(100, Math.round((actual / expected) * 100))
}

function getGrowthHeights(plant: Plant): { start: number; current: number; delta: number } {
  const withHeight = plantHistory(plant)
    .filter((h) => h.heightCm != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  if (withHeight.length >= 1) {
    const start = withHeight[0].heightCm!
    const current = withHeight[withHeight.length - 1].heightCm!
    return { start, current, delta: Math.round((current - start) * 10) / 10 }
  }
  const base = 12
  const growth = Math.max(plantHistory(plant).length, 1) * 0.8
  const current = Math.round((base + growth) * 10) / 10
  return { start: base, current, delta: Math.round((current - base) * 10) / 10 }
}

function getGrowthTimeline(plant: Plant) {
  const sorted = [...plantHistory(plant)].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const baseHeight = getGrowthHeights(plant).current
  return sorted.map((entry, idx) => ({
    ...entry,
    heightCm: entry.heightCm ?? Math.round((baseHeight - idx * 0.8) * 10) / 10,
  }))
}

function getGrowthChartPoints(plant: Plant, previewMode = false, translate: (key: string) => string = (key) => i18n.t(key)) {
  if (previewMode) {
    return [
      { label: monthShortLabel(4, translate), value: 12 },
      { label: monthShortLabel(5, translate), value: 12.5 },
      { label: monthShortLabel(6, translate), value: 13 },
    ]
  }
  const chronological = [...getGrowthTimeline(plant)].reverse()
  if (chronological.length === 0) {
    return [{ label: monthShortLabel(new Date().getMonth(), translate), value: getGrowthHeights(plant).start }]
  }
  return chronological.map((entry) => {
    const d = new Date(entry.date)
    return {
      label: monthShortLabel(d.getMonth(), translate),
      value: entry.heightCm ?? getGrowthHeights(plant).start,
    }
  })
}

const GROWTH_PREVIEW_ENTRIES = [
  { id: 'preview-1', date: '2026-05-15', note: 'Baseline measurement.', heightCm: 12 },
  { id: 'preview-2', date: '2026-06-20', note: 'Steady growth.', heightCm: 12.5 },
  { id: 'preview-3', date: '2026-07-15', note: 'Weekly growth check.', heightCm: 13 },
]

function DetailModal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <div className="neo-card rounded-2xl border-2 border-black bg-white px-4 pt-4 pb-6 flex flex-col gap-4 w-full max-w-md max-h-[90vh] min-h-0 overflow-hidden pointer-events-auto">
          <div className="flex items-center justify-between shrink-0">
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000', textTransform: 'uppercase' }}>{title}</span>
            <button type="button" onClick={onClose} className="flex items-center justify-center size-8 rounded-full border-2 border-black bg-black cursor-pointer">
              <svg fill="none" height="14" viewBox="0 0 18 18" width="14"><path clipRule="evenodd" d={svgDetail.p3b43000} fill="white" fillRule="evenodd" /></svg>
            </button>
          </div>
          <div className="flex flex-col flex-1 min-h-0 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}

function DeletePlantConfirmModal({
  plantName,
  onCancel,
  onConfirm,
}: {
  plantName: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const closingRef = useRef(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsOpen(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeWithAnimation(onCancel)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  function closeWithAnimation(action: () => void) {
    if (closingRef.current) return
    closingRef.current = true
    setIsOpen(false)
    window.setTimeout(action, 220)
  }

  return (
    <>
      <div
        className={`confirm-modal-backdrop ${isOpen ? 'is-open' : ''}`}
        onClick={() => closeWithAnimation(onCancel)}
        aria-hidden
      />
      <div className="confirm-modal-wrap">
        <div
          className={`confirm-modal-panel neo-card rounded-2xl border-2 border-black bg-white px-4 pt-4 pb-6 flex flex-col gap-4 ${isOpen ? 'is-open' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-plant-title"
          aria-describedby="delete-plant-desc"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between shrink-0">
            <span
              id="delete-plant-title"
              style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000', textTransform: 'uppercase' }}
            >
              {t('deleteModal.title')}
            </span>
            <button
              type="button"
              onClick={() => closeWithAnimation(onCancel)}
              className="flex items-center justify-center size-8 rounded-full border-2 border-black bg-black cursor-pointer"
              aria-label={t('deleteModal.close')}
            >
              <svg fill="none" height="14" viewBox="0 0 18 18" width="14" aria-hidden>
                <path clipRule="evenodd" d={svgDetail.p3b43000} fill="white" fillRule="evenodd" />
              </svg>
            </button>
          </div>
          <p
            id="delete-plant-desc"
            style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000', lineHeight: 1.5 }}
          >
            {t('deleteModal.body', { name: plantName })}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => closeWithAnimation(onCancel)}
              className="flex-1 h-11 rounded-full border-2 border-black bg-white cursor-pointer"
              style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10 }}
            >
              {t('deleteModal.cancel')}
            </button>
            <button
              type="button"
              onClick={() => closeWithAnimation(onConfirm)}
              className="flex-1 h-11 rounded-full border-2 cursor-pointer"
              style={{ borderColor: RED, background: RED, color: '#fff', fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10 }}
            >
              {t('deleteModal.delete')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function GrowthStatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="plant-detail-stat-cell">
      <span className="detail-stat-label">{label}</span>
      <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 18, color: '#000', lineHeight: 1.1 }}>{value}</span>
      {sub && <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 11, color: '#888' }}>{sub}</span>}
    </div>
  )
}

function GrowthChart({ points }: { points: { label: string; value: number }[] }) {
  const { t } = useTranslation()
  const max = Math.max(...points.map((p) => p.value), 1)
  const min = Math.min(...points.map((p) => p.value), 0)
  const range = Math.max(max - min, 0.5)
  const width = 300
  const height = 110
  const padX = 16
  const padY = 14
  const chartW = width - padX * 2
  const chartH = height - padY * 2 - 12

  const coords = points.map((p, i) => {
    const x = padX + (points.length <= 1 ? chartW / 2 : (i / (points.length - 1)) * chartW)
    const y = padY + chartH - ((p.value - min) / range) * chartH
    return { x, y, ...p }
  })
  const polyline = coords.map((c) => `${c.x},${c.y}`).join(' ')

  return (
    <div className="plant-detail-chart w-full">
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000', textTransform: 'uppercase' }}>{t('growth.growthOverTime')}</span>
        <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 11, color: '#888' }}>{t('growth.unitCm')}</span>
      </div>
      <svg className="w-full" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t('growth.chartAria')}>
        {[0, 0.5, 1].map((t) => {
          const y = padY + chartH * (1 - t)
          return <line key={t} stroke="#EFEFEF" strokeWidth="1" x1={padX} x2={width - padX} y1={y} y2={y} />
        })}
        {coords.length > 1 && (
          <polyline fill="none" points={polyline} stroke={GREEN} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        )}
        {coords.map((c, i) => (
          <g key={`${c.label}-${i}`}>
            <circle cx={c.x} cy={c.y} fill={GREEN} r="6" stroke="#000" strokeWidth="2" />
            <text fill="#888" fontFamily="Geist, sans-serif" fontSize="10" textAnchor="middle" x={c.x} y={height - 2}>{c.label}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function PhotoTimelineStrip({
  entries,
  onNewSnapshot,
  onPhotoClick,
}: {
  entries: ReturnType<typeof getGrowthTimeline>
  onNewSnapshot: () => void
  onPhotoClick: (photo: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3 w-full">
      <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000', textTransform: 'uppercase' }}>{t('growth.photoTimeline')}</span>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        <button type="button" onClick={onNewSnapshot} className="detail-snapshot-new cursor-pointer active:opacity-80">
          <Camera size={22} strokeWidth={2.5} className="shrink-0 text-black" aria-hidden />
          <span className="detail-snapshot-new-label">
            <span>{t('growth.newSnapshotLine1')}</span>
            <span>{t('growth.newSnapshotLine2')}</span>
          </span>
        </button>
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onPhotoClick(entry.photo)}
            className="detail-snapshot-thumb relative cursor-pointer active:scale-[0.98] transition-transform"
          >
            <PlantPhoto photo={entry.photo} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1.5">
              <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 10, color: '#fff' }}>
                {formatTimelineChip(entry.date, t)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function GrowthHistoryContent({
  plant,
  previewMode = false,
  onNewSnapshot,
  onPhotoClick,
}: {
  plant: Plant
  previewMode?: boolean
  onNewSnapshot?: () => void
  onPhotoClick?: (photo: string) => void
}) {
  const ageDays = previewMode ? 6 : getPlantAgeDays(plant)
  const heights = previewMode ? { start: 12, current: 13, delta: 0.8 } : getGrowthHeights(plant)
  const wateringCount = previewMode ? 1 : getWateringCount(plant)
  const consistency = previewMode ? 50 : getConsistencyScore(plant)
  const timeline = previewMode
    ? GROWTH_PREVIEW_ENTRIES.map((entry) => ({ ...entry, photo: plant.photo }))
    : getGrowthTimeline(plant)
  const { t } = useTranslation()
  const chartPoints = getGrowthChartPoints(plant, previewMode, t)

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="plant-detail-stats-row">
        <GrowthStatCard label={t('growth.daysTracked')} value={`${ageDays}`} sub={t('growth.plantAge')} />
        <GrowthStatCard label={t('growth.totalGrowth')} value={`+${heights.delta} ${t('growth.unitCm')}`} sub={`${heights.start} → ${heights.current} ${t('growth.unitCm')}`} />
        <GrowthStatCard label={t('growth.waterings')} value={`${wateringCount}`} sub={t('growth.consistent', { percent: consistency })} />
      </div>

      <div className="plant-detail-chart w-full">
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000', textTransform: 'uppercase' }}>{t('growth.consistencyScore')}</span>
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: GREEN }}>{consistency}%</span>
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${consistency}%` }} />
        </div>
      </div>

      <GrowthChart points={chartPoints} />
      <PhotoTimelineStrip
        entries={timeline}
        onNewSnapshot={onNewSnapshot ?? (() => {})}
        onPhotoClick={onPhotoClick ?? (() => {})}
      />
    </div>
  )
}

function GrowthHistorySection({
  plant,
  hasAccess,
  canActivateSlot,
  onActivateSlot,
  onUpgrade,
  onLogGrowth,
  onNewSnapshot,
  onPhotoClick,
}: {
  plant: Plant
  hasAccess: boolean
  canActivateSlot: boolean
  onActivateSlot: () => void
  onUpgrade: () => void
  onLogGrowth: () => void
  onNewSnapshot: () => void
  onPhotoClick: (photo: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="plant-detail-section-card relative shrink-0 w-full overflow-hidden">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-3 w-full">
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>
            {t('growth.history')}
          </span>
          <button
            type="button"
            onClick={hasAccess ? onLogGrowth : (canActivateSlot ? onActivateSlot : onUpgrade)}
            className="btn-primary btn-green shrink-0 inline-flex items-center justify-center rounded-full border-2 border-black cursor-pointer px-3 py-1.5"
            style={{ background: GREEN }}
          >
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}>{t('growth.logGrowthBtn')}</span>
          </button>
        </div>

        <ProFeatureGate
          hasAccess={hasAccess}
          canActivateSlot={canActivateSlot}
          onActivateSlot={onActivateSlot}
          onUpgrade={onUpgrade}
          preview={<GrowthHistoryContent plant={plant} previewMode />}
        >
          <GrowthHistoryContent plant={plant} onNewSnapshot={onNewSnapshot} onPhotoClick={onPhotoClick} />
        </ProFeatureGate>
      </div>
    </div>
  )
}

// ─── Screen 6: Plant Details ─────────────────────────────────────────────────

function PlantDetailScreen({ plant, user, globalWaterSchedule, onBack, onDelete, onUpdate, onMarkWatered, onShowPro, onActivateProSlot, onOpenHealth, onEditGlobalSchedule, onTabChange, todayIdx }: {
  plant: Plant; user: UserState; globalWaterSchedule: DayCode[]; onBack: () => void; onDelete: () => void; onUpdate: (p: Plant) => void
  onMarkWatered: () => void; onShowPro: () => void; onActivateProSlot: (plant: Plant) => void; onOpenHealth: () => void
  onEditGlobalSchedule: () => void; onTabChange: (t: TabScreen) => void; todayIdx: number
}) {
  const { t } = useTranslation()
  const globalIndices = scheduleToIndices(globalWaterSchedule)
  const hasAccess = canAccessProFeatures(plant, user)
  const canActivateSlot = hasFreeProSlotsRemaining(user)
  const [showEdit, setShowEdit] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showSlotConfirm, setShowSlotConfirm] = useState(false)
  const [editName, setEditName] = useState(plant.name)
  const [editRoom, setEditRoom] = useState(plant.room)
  const [editNote, setEditNote] = useState(plant.careNote)
  const [editDays, setEditDays] = useState<number[]>(scheduleIndicesFromPlant(plant))
  const [editIsCustomSchedule, setEditIsCustomSchedule] = useState(plant.isCustomSchedule)
  const [editWateringFrequency, setEditWateringFrequency] = useState<WateringFrequency>(plant.wateringFrequency ?? 'weekly')
  const [editLightNeed, setEditLightNeed] = useState<LightNeed>(plant.lightNeed ?? 'Medium')
  const [editPetToxicity, setEditPetToxicity] = useState<PetToxicityChoice>(petToxicityFromBoolean(plant.isToxicToPets))
  const [editToxicityNotes, setEditToxicityNotes] = useState(plant.toxicityNotes ?? '')

  const needsWater = isPlantDueToday(plant, todayIdx) && !plant.isWateredToday
  const waterFills = getWaterNeedFills(plant.waterNeed)
  const lightFills = getLightNeedFills(plant.lightNeed ?? 'Medium')

  function saveEdit() {
    if (!editName.trim() || editDays.length === 0) return
    const scheduleDays = indicesToSchedule(editDays)
    const frequencyChanged = editWateringFrequency !== (plant.wateringFrequency ?? 'weekly')
    const nextAnchor = cycleAnchorForFrequency(
      editWateringFrequency,
      frequencyChanged ? null : plant.wateringCycleAnchor,
    )
    onUpdate({
      ...plant,
      name: editName.trim(),
      room: editRoom.trim() || plant.room,
      careNote: editNote,
      wateringDays: scheduleToIndices(scheduleDays),
      scheduleDays,
      isCustomSchedule: editIsCustomSchedule,
      wateringFrequency: editWateringFrequency,
      wateringCycleAnchor: nextAnchor,
      lightNeed: editLightNeed,
      isToxicToPets: booleanFromPetToxicity(editPetToxicity),
      toxicityNotes: editToxicityNotes.trim(),
    })
    setShowEdit(false)
  }

  function toggleEditDay(i: number) {
    if (!editIsCustomSchedule && !globalIndices.includes(i)) {
      setShowScheduleModal(true)
      return
    }
    if (!editIsCustomSchedule) {
      setEditDays((prev) => {
        const next = prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
        return next.length ? next : prev
      })
      return
    }
    setEditDays((prev) => {
      const next = prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
      return next.length ? next : prev
    })
  }

  function applyEditCustomSchedule(selected: number[]) {
    setEditDays(selected)
    setEditIsCustomSchedule(true)
    setShowScheduleModal(false)
  }

  function resetEditToGeneralSchedule() {
    setEditDays(globalIndices)
    setEditIsCustomSchedule(false)
    setShowScheduleModal(false)
  }

  function openEditModal() {
    setEditName(plant.name)
    setEditRoom(plant.room)
    setEditNote(plant.careNote)
    setEditDays(scheduleIndicesFromPlant(plant))
    setEditIsCustomSchedule(plant.isCustomSchedule)
    setEditWateringFrequency(plant.wateringFrequency ?? 'weekly')
    setEditLightNeed(plant.lightNeed ?? 'Medium')
    setEditPetToxicity(petToxicityFromBoolean(plant.isToxicToPets))
    setEditToxicityNotes(plant.toxicityNotes ?? '')
    setShowEdit(true)
  }

  function requestProAccess() {
    if (hasAccess) return
    if (canActivateSlot) setShowSlotConfirm(true)
    else onShowPro()
  }

  function confirmActivateSlot() {
    setShowSlotConfirm(false)
    onActivateProSlot(plant)
    onOpenHealth()
  }

  return (
    <div className="content-stretch flex flex-col items-start justify-between relative size-full" style={{ background: BG }}>
      <div className="content-stretch flex flex-col items-start relative shrink-0 w-full flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto w-full pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
          {/* Full-bleed hero photo */}
          <div
            className="plant-detail-hero relative shrink-0 w-full overflow-hidden"
            style={{ height: 'calc(240px + env(safe-area-inset-top, 0px))' }}
          >
            <PlantPhoto photo={plant.photo} alt={plant.name} className="absolute inset-0 w-full h-full object-cover" />
            <div className="plant-detail-hero__scrim absolute inset-0 pointer-events-none" aria-hidden />
            <button
              type="button"
              onClick={onBack}
              className="absolute z-10 bg-black flex items-center justify-center rounded-full shrink-0 cursor-pointer border-2 border-black"
              style={{
                width: 38,
                height: 38,
                top: 'calc(12px + env(safe-area-inset-top, 0px))',
                right: 16,
              }}
              aria-label={t('plantDetails.close')}
            >
              <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
                <path clipRule="evenodd" d={svgDetail.p3b43000} fill="white" fillRule="evenodd" />
              </svg>
            </button>
            <div className="absolute bottom-4 left-4 z-10 max-w-[70%]">
              <h1 className="plant-detail-hero__name">{plant.name.toUpperCase()}</h1>
            </div>
            {plant.isWateredToday && (
              <div className="plant-detail-hero__watered absolute z-10 bottom-4 right-4">
                <Check size={14} strokeWidth={3} aria-hidden />
                <span>{t('plantDetails.watered')}</span>
              </div>
            )}
            {!plant.isWateredToday && needsWater && (
              <button
                type="button"
                onClick={onMarkWatered}
                className="plant-detail-hero__watered plant-detail-hero__watered--action absolute z-10 bottom-4 right-4 cursor-pointer active:scale-95"
              >
                <span>{t('plantDetails.markWatered')}</span>
              </button>
            )}
          </div>

          <div className="content-stretch flex flex-col gap-4 items-start px-5 pt-4 pb-6 relative w-full">

            {/* Location & schedule tags */}
            <div className="flex flex-wrap gap-2 items-center w-full">
              <span className="detail-tag detail-tag-outline">{translateRoomLabel(t, plant.room).toUpperCase()}</span>
              {plant.wateringDays.map((dayIdx) => (
                <span key={dayIdx} className="detail-tag detail-tag-filled">
                  {shortDayLabel(t, DAYS[dayIdx])}
                </span>
              ))}
              {plant.isCustomSchedule && (
                <span className="detail-tag detail-tag-outline">{t('plantDetails.customSchedule')}</span>
              )}
              <button
                type="button"
                onClick={openEditModal}
                className="ml-auto flex items-center justify-center shrink-0 size-9 rounded-full border-2 border-black bg-white cursor-pointer active:scale-95"
                aria-label={t('plantDetails.edit')}
              >
                <svg fill="none" height="15" viewBox="0 0 16 15" width="16" aria-hidden>
                  <path d={svgDetail.p3c709780} fill="black" />
                </svg>
              </button>
            </div>

            <PetToxicityBadge
              isToxicToPets={plant.isToxicToPets ?? null}
              toxicityNotes={plant.toxicityNotes}
            />

            {/* Plant metrics grid */}
            <div className="plant-detail-metrics-grid w-full">
              <div className="plant-detail-metric-cell">
                <span className="detail-stat-label">{t('plantDetails.waterLevel')}</span>
                <div className="flex gap-1 items-end">
                  {[0, 1, 2].map((i) => (
                    <SvgDropSmall key={i} color={GREEN} filled={i < waterFills} />
                  ))}
                </div>
                <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 13, color: '#000', lineHeight: 1.2 }}>
                  {formatWaterLevelLabel(plant.waterNeed, t)}
                </span>
              </div>
              <div className="plant-detail-metric-cell">
                <span className="detail-stat-label">{t('plantDetails.lightLevel')}</span>
                <div className="flex gap-0.5 items-center">
                  {[0, 1, 2].map((i) => (
                    <DetailStarIcon key={i} filled={i < lightFills} />
                  ))}
                </div>
                <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 13, color: '#000', lineHeight: 1.2 }}>
                  {lightLevelLabel(plant.lightNeed ?? 'Medium', t)}
                </span>
              </div>
              <div className="plant-detail-metric-cell">
                <span className="detail-stat-label">{t('plantDetails.lastWatered')}</span>
                <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 16, color: '#000', lineHeight: 1.2 }}>
                  {daysSinceLabel(plant.lastWateredAt, t)}
                </span>
                {plant.lastWateredAt && (
                  <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 12, color: '#888' }}>
                    {formatLastWateredShort(plant.lastWateredAt)}
                  </span>
                )}
              </div>
              <div className="plant-detail-metric-cell">
                <span className="detail-stat-label">{t('plantDetails.careNote')}</span>
                <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 13, color: '#000', lineHeight: 1.45 }}>
                  {plant.careNote || t('plantDetails.noCareNotes')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={hasAccess ? onOpenHealth : requestProAccess}
              className="plant-detail-section-card w-full flex items-center gap-3 p-4 cursor-pointer text-left active:scale-[0.99] transition-all"
            >
              <div className="flex items-center justify-center rounded-full shrink-0 size-10 border-2 border-black" style={{ background: GREEN }}>
                <Stethoscope className="size-4 text-black" strokeWidth={2.5} aria-hidden />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000', textTransform: 'uppercase' }}>
                  {t('plantDetails.healthSectionTitle')}
                </span>
                <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 12, color: '#888', lineHeight: 1.4 }}>
                  {hasAccess
                    ? t('plantDetails.viewHealthCta')
                    : canActivateSlot
                      ? t('slots.activateHint')
                      : t('slots.unlockHint')}
                </span>
              </div>
              <ChevronRight className="size-4 text-black shrink-0" strokeWidth={2.5} aria-hidden />
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="plant-detail-delete-btn flex w-full h-[52px] items-center justify-center rounded-full cursor-pointer active:scale-[0.98] transition-all border-2 bg-white"
            >
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: RED, textTransform: 'uppercase' }}>{t('plantDetails.deletePlant')}</span>
            </button>
          </div>
        </div>
      </div>

      <TabBar active="home" onChange={(t) => { onBack(); onTabChange(t) }} isPro={user.isProUser} />

      {showEdit && (
        <DetailModal title={t('plantDetails.editPlant')} onClose={() => setShowEdit(false)}>
          <div className="flex flex-col flex-1 min-h-0 gap-3">
            <div className="flex flex-col gap-3 overflow-y-auto flex-1 min-h-0">
              <label className="flex flex-col gap-1">
                <span className="detail-stat-label">{t('plantDetails.plantName')}</span>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="neo-input rounded-xl border-2 border-black px-3 py-2 w-full" style={{ fontFamily: 'Geist, sans-serif', fontSize: 14 }} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="detail-stat-label">{t('plantDetails.room')}</span>
                <input value={editRoom} onChange={(e) => setEditRoom(e.target.value)} className="neo-input rounded-xl border-2 border-black px-3 py-2 w-full" style={{ fontFamily: 'Geist, sans-serif', fontSize: 14 }} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="detail-stat-label">{t('plantDetails.careNote')}</span>
                <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={3} className="neo-input rounded-xl border-2 border-black px-3 py-2 w-full resize-none" style={{ fontFamily: 'Geist, sans-serif', fontSize: 14 }} />
              </label>
              <PetToxicityPicker
                value={editPetToxicity}
                onChange={setEditPetToxicity}
                notes={editToxicityNotes}
                onNotesChange={setEditToxicityNotes}
              />
              <WateringScheduleSection
                days={editDays}
                isCustomSchedule={editIsCustomSchedule}
                globalIndices={globalIndices}
                wateringFrequency={editWateringFrequency}
                onToggleDay={toggleEditDay}
                onFrequencyChange={setEditWateringFrequency}
                onOpenCustomModal={() => setShowScheduleModal(true)}
                onResetToDefault={resetEditToGeneralSchedule}
              />
              <NeedLevelSegmentPicker
                label={t('addPlant.lightNeedQuestion')}
                value={editLightNeed}
                options={[
                  { value: 'Low' as LightNeed, label: t('needLevels.lightLow'), indicatorCount: 1 },
                  { value: 'Medium' as LightNeed, label: t('needLevels.lightMedium'), indicatorCount: 2 },
                  { value: 'High' as LightNeed, label: t('needLevels.lightHigh'), indicatorCount: 3 },
                ]}
                onChange={setEditLightNeed}
                renderIndicator={(active) => (
                  <Sun
                    size={12}
                    strokeWidth={2.25}
                    aria-hidden
                    className={active ? 'text-black' : 'text-[#00FF66]'}
                    fill={active ? BLACK : GREEN}
                  />
                )}
              />
            </div>
            <div className="shrink-0 mt-4">
              <button type="button" onClick={saveEdit} disabled={editDays.length === 0} className="btn-primary btn-green flex w-full shrink-0 items-center justify-center rounded-full border-2 border-black cursor-pointer disabled:opacity-40" style={{ background: GREEN, minHeight: 48, height: 48 }}>
                <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>{t('plantDetails.saveChanges')}</span>
              </button>
            </div>
          </div>
        </DetailModal>
      )}

      <CustomScheduleModal
        isOpen={showScheduleModal}
        selectedDays={editDays}
        globalSchedule={globalWaterSchedule}
        onClose={() => setShowScheduleModal(false)}
        onApply={applyEditCustomSchedule}
        onUseDefault={resetEditToGeneralSchedule}
        onEditGlobalSchedule={() => { setShowScheduleModal(false); setShowEdit(false); onEditGlobalSchedule() }}
      />

      {showDeleteConfirm && (
        <DeletePlantConfirmModal
          plantName={plant.name}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => { setShowDeleteConfirm(false); onDelete() }}
        />
      )}

      {showSlotConfirm && (
        <SlotConfirmationModal
          plantName={plant.name}
          onCancel={() => setShowSlotConfirm(false)}
          onConfirm={confirmActivateSlot}
        />
      )}
    </div>
  )
}

// ─── Screen 6b: Plant Health & Growth (Health tab detail) ────────────────────

function PlantHealthDetailScreen({ plant, user, onBack, onUpdate, onShowPro, onActivateProSlot, onTabChange }: {
  plant: Plant; user: UserState; onBack: () => void; onUpdate: (p: Plant) => void
  onShowPro: () => void; onActivateProSlot: (plant: Plant) => void; onTabChange: (t: TabScreen) => void
}) {
  const { t } = useTranslation()
  const hasAccess = canAccessProFeatures(plant, user)
  const canActivateSlot = hasFreeProSlotsRemaining(user)
  const [showSlotConfirm, setShowSlotConfirm] = useState(false)
  const [showLogGrowth, setShowLogGrowth] = useState(false)
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)
  const [growthNote, setGrowthNote] = useState('')
  const [growthHeight, setGrowthHeight] = useState('')
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)

  function requestProAccess() {
    if (hasAccess) return
    if (canActivateSlot) setShowSlotConfirm(true)
    else onShowPro()
  }

  function confirmActivateSlot() {
    setShowSlotConfirm(false)
    onActivateProSlot(plant)
  }

  async function handlePhotoFile(file: File) {
    try {
      const compressed = await readAndCompressPhotoFile(file)
      const height = growthHeight ? Number(growthHeight) : undefined
      onUpdate({
        ...plant,
        photo: compressed,
        history: [{
          id: Date.now().toString(),
          date: new Date().toISOString(),
          note: growthNote.trim() || t('growth.defaultSnapshotNote'),
          photo: compressed,
          heightCm: height,
        }, ...plantHistory(plant)],
      })
      setGrowthNote('')
      setGrowthHeight('')
      setShowPhotoPicker(false)
    } catch (error) {
      console.error('[myJungle] Photo processing failed:', error)
    }
  }

  function handlePhotoInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handlePhotoFile(file)
    e.target.value = ''
  }

  function logGrowthEntry() {
    onUpdate({
      ...plant,
      history: [{
        id: Date.now().toString(),
        date: new Date().toISOString(),
        note: growthNote.trim() || t('growth.defaultNote'),
        photo: plant.photo,
        heightCm: growthHeight ? Number(growthHeight) : getGrowthHeights(plant).current,
      }, ...plantHistory(plant)],
    })
    setGrowthNote('')
    setGrowthHeight('')
    setShowLogGrowth(false)
  }

  function saveHealthLog(data: HealthLogSubmitData) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const timestamp = new Date().toISOString()
    const log = {
      id,
      timestamp,
      photo: data.photo,
      healthScore: clampHealthScore(data.healthScore),
      diagnosis: data.diagnosis,
      treatmentNotes: data.treatmentNotes,
      analyzedByAI: true,
    }
    onUpdate({
      ...plant,
      healthLogs: [log, ...(plant.healthLogs ?? [])],
    })
  }

  function openLightbox(photo: string) {
    void getPhotoBlob(photo).then((resolved) => setLightboxPhoto(resolved ?? photo))
  }

  return (
    <div className="content-stretch flex flex-col items-start justify-between relative size-full" style={{ background: BG }}>
      <div className="content-stretch flex flex-col items-start relative shrink-0 w-full flex-1 min-h-0">
        <div className="app-header shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center rounded-full border-2 border-black bg-white cursor-pointer shrink-0"
            style={{ width: 38, height: 38 }}
            aria-label={t('plantDetails.close')}
          >
            <ChevronLeft className="size-5 text-black" strokeWidth={2.5} aria-hidden />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center px-2">
            <PlantPhoto photo={plant.photo} alt="" className="size-8 rounded-full object-cover border-2 border-black shrink-0" />
            <span className="truncate" style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000', textTransform: 'uppercase' }}>
              {plant.name}
            </span>
          </div>
          <div style={{ width: 38 }} aria-hidden />
        </div>

        <div className="flex-1 overflow-y-auto w-full pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
          <div className="content-stretch flex flex-col gap-4 items-start px-5 pt-4 pb-6 relative w-full">
            <GrowthHistorySection
              plant={plant}
              hasAccess={hasAccess}
              canActivateSlot={canActivateSlot}
              onActivateSlot={requestProAccess}
              onUpgrade={onShowPro}
              onLogGrowth={() => (hasAccess ? setShowLogGrowth(true) : requestProAccess())}
              onNewSnapshot={() => (hasAccess ? setShowPhotoPicker(true) : requestProAccess())}
              onPhotoClick={openLightbox}
            />

            <PlantHealthTracker
              plant={plant}
              hasAccess={hasAccess}
              canActivateSlot={canActivateSlot}
              onActivateSlot={requestProAccess}
              onUpgrade={onShowPro}
              onSaveHealthLog={saveHealthLog}
            />
          </div>
        </div>
      </div>

      <TabBar active="health" onChange={(t) => { onBack(); onTabChange(t) }} isPro={user.isProUser} />

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoInputChange} />
      <input ref={libraryInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoInputChange} />

      {showSlotConfirm && (
        <SlotConfirmationModal
          plantName={plant.name}
          onCancel={() => setShowSlotConfirm(false)}
          onConfirm={confirmActivateSlot}
        />
      )}

      {showLogGrowth && (
        <DetailModal title={t('growth.logGrowth')} onClose={() => setShowLogGrowth(false)}>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="detail-stat-label">{t('growth.heightCm')}</span>
              <input value={growthHeight} onChange={(e) => setGrowthHeight(e.target.value)} inputMode="decimal" placeholder={`${getGrowthHeights(plant).current}`} className="neo-input rounded-xl border-2 border-black px-3 py-2 w-full" style={{ fontFamily: 'Geist, sans-serif', fontSize: 14 }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="detail-stat-label">{t('growth.note')}</span>
              <textarea value={growthNote} onChange={(e) => setGrowthNote(e.target.value)} rows={2} placeholder={t('growth.notePlaceholder')} className="neo-input rounded-xl border-2 border-black px-3 py-2 w-full resize-none" style={{ fontFamily: 'Geist, sans-serif', fontSize: 14 }} />
            </label>
            <button type="button" onClick={logGrowthEntry} className="btn-primary btn-green flex w-full items-center justify-center rounded-full border-2 border-black cursor-pointer" style={{ background: GREEN, height: 44 }}>
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}>{t('growth.saveLog')}</span>
            </button>
          </div>
        </DetailModal>
      )}

      {showPhotoPicker && (
        <PhotoActionSheet
          onClose={() => setShowPhotoPicker(false)}
          onTakePhoto={() => { setShowPhotoPicker(false); cameraInputRef.current?.click() }}
          onChooseLibrary={() => { setShowPhotoPicker(false); libraryInputRef.current?.click() }}
        />
      )}

      {lightboxPhoto && (
        <>
          <div className="fixed inset-0 z-[80] bg-black/80" onClick={() => setLightboxPhoto(null)} aria-hidden />
          <div className="fixed inset-4 z-[90] flex items-center justify-center">
            <img alt={t('growth.snapshotAlt')} src={lightboxPhoto} className="max-w-full max-h-full object-contain rounded-2xl border-2 border-white" />
            <button type="button" onClick={() => setLightboxPhoto(null)} className="absolute top-6 right-6 size-10 rounded-full border-2 border-white bg-black/50 text-white cursor-pointer">✕</button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Screen 7: Watering — see @/components/WateringScheduleScreen.tsx ─────────

// ─── Settings UI ──────────────────────────────────────────────────────────────

function SettingsToggle({ on, onToggle, ariaLabel }: { on: boolean; onToggle: () => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative shrink-0 cursor-pointer min-h-[44px] min-w-[66px] flex items-center justify-center"
      aria-label={ariaLabel}
      aria-pressed={on}
    >
      <svg fill="none" height="38" viewBox="0 0 66 38" width="66" aria-hidden>
        <rect fill={on ? GREEN : '#ccc'} height="36" rx="18" width="64" x="1" y="1" />
        <rect height="36" rx="18" stroke="black" strokeWidth="2" width="64" x="1" y="1" />
        <circle cx={on ? 46 : 20} cy="19" fill="white" r="13" stroke="black" strokeWidth="2" />
      </svg>
    </button>
  )
}

const TIMEZONE_OPTIONS = [
  'UTC',
  'Europe/Berlin',
  'Europe/London',
  'Europe/Paris',
  'Europe/Budapest',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
]

function NotificationSettingsPanel({
  settings,
  onChange,
}: {
  settings: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
}) {
  const { t } = useTranslation()
  const timeInputRef = useRef<HTMLInputElement>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const deviceTz = getDeviceTimezone()
  const effectiveTz = getEffectiveTimezone(settings)
  const timezoneOptions = TIMEZONE_OPTIONS.includes(deviceTz)
    ? TIMEZONE_OPTIONS
    : [deviceTz, ...TIMEZONE_OPTIONS]

  useEffect(() => {
    if (!isNotificationSupported()) return
    if (settings.pushNotifications && Notification.permission === 'denied') {
      setPermissionDenied(true)
      onChange({ pushNotifications: false })
    }
  }, [])

  async function handlePushToggle() {
    if (settings.pushNotifications) {
      onChange({ pushNotifications: false })
      setTestResult(null)
      return
    }

    if (!isNotificationSupported()) {
      setPermissionDenied(true)
      return
    }

    const permission = await requestNotificationPermission()
    if (permission === 'granted') {
      onChange({ pushNotifications: true })
      setPermissionDenied(false)
      if (settings.hapticFeedback && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10)
      }
      return
    }

    if (permission === 'denied') {
      setPermissionDenied(true)
      onChange({ pushNotifications: false })
      return
    }

    onChange({ pushNotifications: false })
  }

  function openTimePicker() {
    const input = timeInputRef.current
    if (!input) return
    input.focus()
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker()
        return
      }
    } catch {
      // showPicker requires a user gesture and may throw in some browsers
    }
    input.click()
  }

  function handleReminderTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ reminderTime: formatReminderTime(e.target.value) })
  }

  function handleTestNotification() {
    if (!isNotificationSupported()) {
      setTestResult(t('notifications.unsupported'))
      return
    }
    if (Notification.permission !== 'granted') {
      setTestResult(t('notifications.enableFirst'))
      return
    }
    const ok = sendTestNotification(settings)
    setTestResult(ok ? t('notifications.testSent') : t('notifications.testFailed'))
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="settings-card">
        {/* Push notification */}
        <div className="settings-card-row">
          <div className="settings-row-copy">
            <p className="settings-row-title">{t('notifications.pushTitle')}</p>
            <p className="settings-row-subtitle">{t('notifications.pushSubtitle')}</p>
          </div>
          <SettingsToggle on={settings.pushNotifications} onToggle={handlePushToggle} ariaLabel={t('notifications.togglePush')} />
        </div>

        {/* Watering reminder time */}
        <div className="settings-card-row">
          <div className="settings-row-copy">
            <p className="settings-row-title">{t('notifications.reminderTime')}</p>
            <p className="settings-row-subtitle">{t('notifications.alertAt', { tz: effectiveTz })}</p>
          </div>
          <label
            htmlFor="watering-reminder-time"
            onClick={openTimePicker}
            className="settings-time-btn"
          >
            <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 16, color: '#000' }} aria-hidden>
              {formatReminderTime(settings.reminderTime)}
            </span>
            <svg fill="none" height="15" viewBox="0 0 16 15" width="16" aria-hidden className="shrink-0 pointer-events-none">
              <path d={svgSettings.p3c709780} fill="black" />
            </svg>
            <input
              id="watering-reminder-time"
              ref={timeInputRef}
              type="time"
              value={formatReminderTime(settings.reminderTime)}
              onChange={handleReminderTimeChange}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              aria-label={t('notifications.reminderTime')}
            />
          </label>
        </div>

        {/* Device timezone sync */}
        <div className="settings-card-row">
          <div className="settings-row-copy">
            <p className="settings-row-title">{t('notifications.timezoneSync')}</p>
            <p className="settings-row-subtitle">
              {settings.timezoneAutoSync
                ? t('notifications.timezoneAutoSynced', { tz: deviceTz })
                : t('notifications.timezoneManualValue', { tz: settings.timezone })}
            </p>
          </div>
          <SettingsToggle
            on={settings.timezoneAutoSync}
            onToggle={() => onChange({
              timezoneAutoSync: !settings.timezoneAutoSync,
              timezone: settings.timezoneAutoSync ? settings.timezone : deviceTz,
            })}
            ariaLabel={t('notifications.toggleTimezone')}
          />
        </div>

        {!settings.timezoneAutoSync && (
          <div className="settings-card-row settings-card-row--stacked">
            <select
              value={settings.timezone}
              onChange={(e) => onChange({ timezone: e.target.value })}
              className="neo-input w-full min-h-[44px] rounded-xl border-2 border-black px-3 outline-none bg-white"
              style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 14, color: '#000' }}
            >
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        )}

        {/* Sound alerts */}
        <div className="settings-card-row">
          <div className="settings-row-copy">
            <p className="settings-row-title">{t('notifications.soundAlerts')}</p>
            <p className="settings-row-subtitle">{t('notifications.soundSubtitle')}</p>
          </div>
          <SettingsToggle
            on={settings.soundAlerts}
            onToggle={() => onChange({ soundAlerts: !settings.soundAlerts })}
            ariaLabel={t('notifications.toggleSound')}
          />
        </div>

        {/* Haptic feedback */}
        <div className="settings-card-row">
          <div className="settings-row-copy">
            <p className="settings-row-title">{t('notifications.haptic')}</p>
            <p className="settings-row-subtitle">{t('notifications.hapticSubtitle')}</p>
          </div>
          <SettingsToggle
            on={settings.hapticFeedback}
            onToggle={() => {
              const next = !settings.hapticFeedback
              onChange({ hapticFeedback: next })
              if (next && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(10)
              }
            }}
            ariaLabel={t('notifications.toggleHaptic')}
          />
        </div>
      </div>

      {permissionDenied && (
        <div className="settings-card p-3 flex flex-col gap-2">
          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 13, color: RED, lineHeight: 1.4 }}>
            {t('notifications.blocked')}
          </p>
          <button
            type="button"
            onClick={() => setPermissionDenied(false)}
            className="self-start underline cursor-pointer"
            style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 12, color: '#000' }}
          >
            {t('common.dismiss')}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleTestNotification}
        className="settings-action-btn"
      >
        {t('notifications.sendTest')}
      </button>
      {testResult && (
        <p className="settings-row-subtitle">{testResult}</p>
      )}
    </div>
  )
}

// ─── Feedback Form ────────────────────────────────────────────────────────────

interface FeedbackFormState {
  thought: string
  issue: string
  contact: string
}

function FeedbackForm() {
  const { t } = useTranslation()
  const [fields, setFields] = useState<FeedbackFormState>({ thought: '', issue: '', contact: '' })
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSuccessMessage(null)
    setErrorMessage(null)
    setSubmitting(true)

    try {
      const result = await submitFeedback({
        thought: fields.thought,
        issue: fields.issue,
        contact: fields.contact,
      })

      if (result.success) {
        setFields({ thought: '', issue: '', contact: '' })
        setSuccessMessage(t('feedback.success'))
      } else {
        setErrorMessage(result.error ?? t('feedback.failedShort'))
      }
    } catch {
      setErrorMessage(t('feedback.failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const fieldConfig = [
    { key: 'thought' as const, placeholder: t('feedback.thought') },
    { key: 'issue' as const, placeholder: t('feedback.issue') },
    { key: 'contact' as const, placeholder: t('feedback.contact') },
  ]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 pb-3 w-full">
      <p className="settings-row-subtitle" style={{ color: '#888' }}>{t('feedback.intro')}</p>
      {fieldConfig.map(({ key, placeholder }) => (
        <div key={key} className="settings-card min-h-[46px] flex items-center">
          <input
            value={fields[key]}
            onChange={(e) => {
              setFields((f) => ({ ...f, [key]: e.target.value }))
              setSuccessMessage(null)
              setErrorMessage(null)
            }}
            placeholder={placeholder}
            disabled={submitting}
            className="w-full h-[46px] px-5 outline-none bg-transparent rounded-2xl focus:ring-2 focus:ring-[#00FF66] focus:ring-inset disabled:opacity-60 placeholder:text-[#888]"
            style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}
          />
        </div>
      ))}

      {errorMessage && (
        <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 13, color: RED, lineHeight: 1.4 }} role="alert">
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 13, color: '#047857', lineHeight: 1.4 }} role="status">
          {successMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary btn-green relative flex items-center justify-center rounded-full w-full min-h-[44px] cursor-pointer border-2 border-black disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: GREEN, height: 44 }}
      >
        <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>
          {submitting ? t('feedback.sending') : t('feedback.sendShort')}
        </p>
      </button>
    </form>
  )
}

// ─── Screen 9: Settings ───────────────────────────────────────────────────────

function SettingsScreen({ plants, settings, onSave, onExport, onReset, onClose, onShowPro, user }: {
  plants: Plant[]; settings: AppSettings; onSave: (s: AppSettings) => void; onExport: () => void; onReset: () => void; onClose?: () => void; onShowPro: () => void; user: UserState
}) {
  const { t } = useTranslation()
  const [s, setS] = useState(settings)
  const [legalDocument, setLegalDocument] = useState<LegalDocument | null>(null)
  useEffect(() => { onSave(s) }, [s])

  function toggleDay(i: number) {
    const day = DAYS[i]
    setS((p) => ({
      ...p,
      globalWaterSchedule: sortSchedule(
        p.globalWaterSchedule.includes(day)
          ? p.globalWaterSchedule.filter((d) => d !== day)
          : [...p.globalWaterSchedule, day]
      ),
    }))
  }

  const plantsUsed = plants.length
  const plantsMax = MAX_FREE_PLANTS

  return (
    <div className="flex flex-col h-full" style={{ background: BG }}>
      <div className="app-header shrink-0">
        <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 20, color: '#000' }}>{t('settings.title')}</p>
        {onClose && (
        <button type="button" onClick={onClose}
          className="relative bg-black flex items-center justify-center rounded-full shrink-0 cursor-pointer border-2 border-black"
          style={{ width: 38, height: 38 }}
        >
          <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
            <path clipRule="evenodd" d={svgSettings.p3b43000} fill="white" fillRule="evenodd" />
          </svg>
        </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-6 settings-screen-scroll">
        <div className="px-5">
          <LanguageSelector />
        </div>

        {/* ── Notification Reminder & Routines ── */}
        <div className="flex flex-col gap-3 px-5">
          <div className="section-header" style={{ fontSize: 14, lineHeight: 1.2 }}>
            <p style={{ lineHeight: 'normal', marginBottom: 0 }}>{t('settings.notification')}</p>
            <p style={{ lineHeight: 'normal' }}>{t('settings.reminderRoutines')}</p>
          </div>

          {/* Weekly water schedule */}
          <div className="flex flex-col gap-2 py-1">
            <p className="settings-inline-title">{t('settings.weeklySchedule')}</p>
            <p className="settings-row-subtitle" style={{ color: '#000' }}>{t('settings.chooseDays')}</p>
            <div className="flex items-start justify-between w-full">
              {DAYS.map((d, i) => {
                const on = s.globalWaterSchedule.includes(d)
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`settings-day-pill ${on ? 'settings-day-pill--active' : 'settings-day-pill--inactive'}`}
                  >
                    <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}>{shortDayLabel(t, d)}</p>
                    {on ? (
                      <svg fill="none" height="18" viewBox="0 0 18 18" width="18" aria-hidden>
                        <path d={svgSettings.p2c13d500} stroke="#000000" strokeLinecap="round" strokeWidth="2" />
                      </svg>
                    ) : (
                      <div className="size-[18px]" aria-hidden />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <NotificationSettingsPanel
            settings={s}
            onChange={(patch) => setS((p) => ({ ...p, ...patch }))}
          />
        </div>

        {/* ── Data & Privacy ── */}
        <div className="flex flex-col gap-3 px-5">
          <p className="section-header" style={{ fontSize: 14 }}>{t('settings.dataPrivacy')}</p>
          <div className="settings-card">
            <div className="settings-card-row">
              <div className="settings-row-copy">
                <p className="settings-row-title settings-row-title--compact">{t('settings.exportData')}</p>
                <p className="settings-row-subtitle">{t('settings.exportSubtitle')}</p>
              </div>
              <button
                type="button"
                onClick={onExport}
                className="settings-chip-btn"
              >
                <span>{t('settings.export')}</span>
                <span aria-hidden>↑</span>
              </button>
            </div>
            <div className="settings-card-row">
              <div className="settings-row-copy">
                <p className="settings-row-title settings-row-title--compact">{t('settings.resetData')}</p>
                <p className="settings-row-subtitle">{t('settings.resetSubtitle')}</p>
              </div>
              <button
                type="button"
                onClick={onReset}
                className="settings-chip-btn settings-chip-btn--danger"
              >
                {t('settings.reset')}
              </button>
            </div>
          </div>
        </div>

        {/* ── Legal & About ── */}
        <div className="flex flex-col gap-3 px-5">
          <p className="section-header" style={{ fontSize: 14 }}>{t('settings.legalAbout')}</p>
          <div className="settings-card">
            <button
              type="button"
              onClick={() => setLegalDocument('privacy')}
              className="settings-card-row settings-card-row--link"
            >
              <span className="settings-row-title settings-row-title--compact text-left">{t('settings.privacyPolicy')}</span>
              <ChevronRight size={18} strokeWidth={2.5} className="shrink-0 text-black" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setLegalDocument('impressum')}
              className="settings-card-row settings-card-row--link"
            >
              <span className="settings-row-title settings-row-title--compact text-left">{t('settings.legalNotice')}</span>
              <ChevronRight size={18} strokeWidth={2.5} className="shrink-0 text-black" aria-hidden />
            </button>
          </div>
          <p className="settings-row-subtitle text-center w-full">
            {t('settings.appVersion', { version: APP_VERSION })}
          </p>
        </div>

        {/* ── Send Feedback ── */}
        <div className="flex flex-col gap-3 px-5">
          <p className="section-header" style={{ fontSize: 14 }}>{t('settings.sendFeedback')}</p>
          <FeedbackForm />
        </div>

        {/* ── MY JUNGLE PRO STATUS ── */}
        <div className="flex flex-col gap-3 px-5">
          <p className="section-header" style={{ fontSize: 14 }}>{t('settings.proStatus')}</p>
          <FreeTierCard
            title={user.isProUser ? t('settings.proMember') : t('settings.freeTier')}
            plantsUsed={plantsUsed}
            plantsMax={plantsMax}
            footer={
              user.isProUser
                ? t('settings.proFooter')
                : (
                  <>
                    {t('settings.freeFooter', { count: plantsMax - plantsUsed })}
                    {' '}
                    {t('settings.slotsUsed', { used: user.proSlotsUsed, max: MAX_PRO_SLOTS })}
                  </>
                )
            }
          />
          {!user.isProUser && (
            <button
              type="button"
              onClick={onShowPro}
              className="btn-primary btn-green relative flex items-center justify-center rounded-full w-full cursor-pointer border-2 border-black min-h-[58px]"
              style={{ background: GREEN }}
            >
              <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>{t('settings.unlockPro')}</p>
            </button>
          )}
        </div>
      </div>

      {legalDocument && (
        <LegalDocumentScreen
          document={legalDocument}
          onClose={() => setLegalDocument(null)}
          onOpenDocument={setLegalDocument}
        />
      )}
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [tab, setTab] = useState<TabScreen>('home')
  const [plants, setPlants] = useState<Plant[]>(loadPlants)
  const [settings, setSettings] = useState<AppSettings>(loadSettings)
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const user = useUserState(settings)
  const todayIdx = useTodayDayIndex()
  const todayIdxSafe = todayIdx ?? -1

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
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', screen === 'splash' ? GREEN : BG)
    document.documentElement.style.backgroundColor = screen === 'splash' ? GREEN : BG
    document.body.style.backgroundColor = screen === 'splash' ? GREEN : BG
  }, [screen])

  function handleSaveSettings(s: AppSettings) { setSettings(s) }

  function handleAddPlant(p: Plant) {
    try {
      if (!canAddMorePlants(plants.length, user.isProUser)) {
        console.error('[myJungle] Free tier plant limit reached')
        setStorageError(i18n.t('errors.freeTierLimit'))
        return
      }
      const normalized = normalizePlant(p)
      setPlants((prev) => [...prev, normalized])
      setTab('home')
    } catch (error) {
      console.error('[myJungle] handleAddPlant failed:', error)
      setStorageError(i18n.t('errors.couldNotAdd'))
    }
  }

  function handleDeletePlant(id: string) {
    const removed = plants.find((p) => p.id === id)
    if (removed) void deletePlantPhotos(removed.id, plantHistory(removed), removed.healthLogs ?? [])
    setPlants((prev) => prev.filter((p) => p.id !== id))
    setScreen('main'); setSelectedPlant(null)
  }

  function handleUpdatePlant(updated: Plant) {
    setPlants((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setSelectedPlant(updated)
  }

  function handleWaterToggle(plantId: string) {
    setPlants((prevPlants) =>
      prevPlants.map((plant) => {
        if (plant.id !== plantId) return plant

        if (plant.isWateredToday) {
          const wateredAt = plant.lastWateredAt
          const existingHistory = plantHistory(plant)
          const history = wateredAt && existingHistory[0]?.date === wateredAt && existingHistory[0]?.note === 'Watered.'
            ? existingHistory.slice(1)
            : existingHistory
          return {
            ...plant,
            isWateredToday: false,
            lastWateredAt: plant.previousWateredAt,
            previousWateredAt: null,
            history,
          }
        }

        const now = new Date().toISOString()
        return {
          ...plant,
          isWateredToday: true,
          previousWateredAt: plant.lastWateredAt,
          lastWateredAt: now,
          history: [{ id: Date.now().toString(), date: now, note: 'Watered.', photo: plant.photo }, ...plantHistory(plant)],
        }
      })
    )
    setSelectedPlant((p) => {
      if (!p || p.id !== plantId) return p
      if (p.isWateredToday) {
        const wateredAt = p.lastWateredAt
        const existingHistory = plantHistory(p)
        const history = wateredAt && existingHistory[0]?.date === wateredAt && existingHistory[0]?.note === 'Watered.'
          ? existingHistory.slice(1)
          : existingHistory
        return { ...p, isWateredToday: false, lastWateredAt: p.previousWateredAt, previousWateredAt: null, history }
      }
      const now = new Date().toISOString()
      return {
        ...p,
        isWateredToday: true,
        previousWateredAt: p.lastWateredAt,
        lastWateredAt: now,
        history: [{ id: Date.now().toString(), date: now, note: 'Watered.', photo: p.photo }, ...plantHistory(p)],
      }
    })
  }

  function handleMarkAll() {
    if (todayIdxSafe < 0) return
    const today = new Date()
    setPlants((prev) => prev.map((p) => {
      if (!isPlantDueOnDay(p, todayIdxSafe, today) || p.isWateredToday) return p
      const now = new Date().toISOString()
      return {
        ...p,
        isWateredToday: true,
        previousWateredAt: p.lastWateredAt,
        lastWateredAt: now,
        history: [{ id: Date.now().toString(), date: now, note: 'Watered.', photo: p.photo }, ...plantHistory(p)],
      }
    }))
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify({ plants, settings }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'myjungle-data.json'; a.click()
    URL.revokeObjectURL(url)
  }

  function handleReset() {
    if (window.confirm(i18n.t('confirm.resetData'))) {
      void clearAllPhotos()
      localStorage.clear(); setPlants([])
      setSettings({ ...DEFAULT_SETTINGS })
      setScreen('onboarding')
    }
  }

  function handleActivateProSlot(plant: Plant) {
    if (canAccessProFeatures(plant, user) || !hasFreeProSlotsRemaining(user)) {
      if (!canAccessProFeatures(plant, user)) setShowPaywall(true)
      return
    }
    setSettings((s) => ({
      ...s,
      proSlotsUsed: clampProSlotsUsed((s.proSlotsUsed ?? 0) + 1),
    }))
    handleUpdatePlant({ ...plant, isProSlotActivated: true })
  }

  function handleActivateSlotForDraft() {
    setSettings((s) => ({
      ...s,
      proSlotsUsed: clampProSlotsUsed((s.proSlotsUsed ?? 0) + 1),
    }))
  }

  function handleUnlockPro() {
    setSettings((s) => ({ ...s, isPro: true, isProUser: true }))
    setShowPaywall(false)
  }

  function openPaywall() {
    setShowPaywall(true)
  }

  // Build content
  let content: React.ReactNode

  if (screen === 'splash') {
    content = <SplashScreen onNext={() => setScreen(settings.hasCompletedOnboarding ? 'main' : 'onboarding')} />
  } else if (screen === 'onboarding') {
    content = <OnboardingScreen settings={settings} onSave={(s) => { handleSaveSettings(s); setScreen('main') }} />
  } else if (screen === 'settings') {
    content = (
      <SettingsScreen
        plants={plants} settings={settings} user={user} onSave={handleSaveSettings}
        onExport={handleExport} onReset={handleReset}
        onClose={() => setScreen('main')}
        onShowPro={openPaywall}
      />
    )
  } else if (screen === 'detail' && selectedPlant) {
    const live = plants.find((p) => p.id === selectedPlant.id) || selectedPlant
    content = (
      <PlantDetailScreen
        plant={live} user={user} todayIdx={todayIdxSafe}
        globalWaterSchedule={settings.globalWaterSchedule as DayCode[]}
        onBack={() => { setScreen('main'); setSelectedPlant(null) }}
        onDelete={() => handleDeletePlant(live.id)}
        onUpdate={handleUpdatePlant}
        onMarkWatered={() => handleWaterToggle(live.id)}
        onShowPro={openPaywall}
        onActivateProSlot={handleActivateProSlot}
        onOpenHealth={() => setScreen('healthDetail')}
        onEditGlobalSchedule={() => setScreen('settings')}
        onTabChange={(nextTab) => { setTab(nextTab); setScreen('main'); setSelectedPlant(null) }}
      />
    )
  } else if (screen === 'healthDetail' && selectedPlant) {
    const live = plants.find((p) => p.id === selectedPlant.id) || selectedPlant
    content = (
      <PlantHealthDetailScreen
        plant={live} user={user}
        onBack={() => { setScreen('main'); setSelectedPlant(null) }}
        onUpdate={handleUpdatePlant}
        onShowPro={openPaywall}
        onActivateProSlot={handleActivateProSlot}
        onTabChange={(nextTab) => { setTab(nextTab); setScreen('main'); setSelectedPlant(null) }}
      />
    )
  } else {
    // Main tabbed shell
    let tabContent: React.ReactNode
    if (tab === 'home') {
      tabContent = (
        <HomeScreen
          plants={plants} settings={settings} todayIdx={todayIdxSafe}
          onSelectPlant={(p) => { setSelectedPlant(p); setScreen('detail') }}
          onDeletePlant={handleDeletePlant}
          onWaterPlant={handleWaterToggle}
          onGoAdd={() => setTab('add')}
          onShowPro={openPaywall}
        />
      )
    } else if (tab === 'add') {
      tabContent = <AddScreen plants={plants} settings={settings} user={user} onSave={handleAddPlant} onCancel={() => setTab('home')} onUpgrade={openPaywall} onActivateSlot={handleActivateSlotForDraft} onEditGlobalSchedule={() => { setTab('profile'); setScreen('main') }} />
    } else if (tab === 'schedule') {
      tabContent = <WateringScreen plants={plants} globalWaterSchedule={settings.globalWaterSchedule} todayIdx={todayIdx} onMarkWatered={handleWaterToggle} onMarkAll={handleMarkAll} />
    } else if (tab === 'health') {
      tabContent = (
        <HealthHubScreen
          plants={plants}
          user={user}
          onOpenPlant={(p) => { setSelectedPlant(p); setScreen('healthDetail') }}
          onShowPaywall={openPaywall}
        />
      )
    } else {
      tabContent = (
        <SettingsScreen
          plants={plants} settings={settings} user={user} onSave={handleSaveSettings}
          onExport={handleExport} onReset={handleReset}
          onClose={() => setTab('home')}
          onShowPro={openPaywall}
        />
      )
    }
    content = (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
          {tabContent}
        </div>
        <TabBar active={tab} onChange={(t) => { setTab(t); setScreen('main') }} plantCount={plants.length} isPro={user.isProUser} onUpgrade={openPaywall} />
      </div>
    )
  }

  const isSplash = screen === 'splash'
  const isOnboarding = screen === 'onboarding'
  const isDetailView = screen === 'detail'
  const skipTopSafeArea = isSplash || isOnboarding || isDetailView

  return (
    <div className="relative min-h-dvh max-h-dvh h-dvh w-full overflow-hidden flex flex-col" style={{ background: isSplash ? GREEN : BG }}>
      {storageError && !isSplash && (
        <div className="shrink-0 px-4 py-2 border-b-2 border-black text-center" style={{ background: RED, fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 12, color: '#fff' }} role="alert">
          {storageError}
        </div>
      )}
      <div className={`flex flex-col flex-1 min-h-0 ${skipTopSafeArea ? '' : 'pt-[env(safe-area-inset-top)]'}`}>
        {content}
      </div>
      {showPaywall && (
        <PaywallModal
          onClose={() => setShowPaywall(false)}
          onStartTrial={() => handleUnlockPro()}
        />
      )}
    </div>
  )
}
