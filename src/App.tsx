import { useState, useEffect, useRef } from 'react'
import { submitFeedback } from '@/lib/submitFeedback'
import svgPaths from '@/imports/NewDesign2-1/svg-cm3nd9oy62'
import svgPaths2 from '@/imports/MyjungleSettimgs-2/svg-u9kpmn74e6'
import svgAdd from '@/imports/MyjungleAddPlant/svg-fer892chf7'
import svgDetail from '@/imports/MyjungleAddPlant-1/svg-op7ttlkxgr'
import svgBatch from '@/imports/MyjungleBatchChecklist/svg-yfmp6xfqu5'
import ProScreen from '@/components/ProScreen'
import svgSettings from '@/imports/MyjungleSettings/svg-doomn8mxv7'
import detailHeroImg from '@/imports/MyjungleAddPlant-1/06984fd808ab72dc75d1af5314ea222465c42869.png'
import detailThumbImg from '@/imports/MyjungleAddPlant-1/24c699409182c3e5d2a17cf3bf10988ef662ca0c.png'
import plantImg0 from '@/imports/MyjungleSettimgs-2/24c699409182c3e5d2a17cf3bf10988ef662ca0c.png'
import plantImg1 from '@/imports/MyjungleSettimgs-2/a629e756f91539ad0cd6c99c620a960b94d6a89d.png'
import plantImg2 from '@/imports/MyjungleSettimgs-2/c1e26fe342a3e4cbf5b479e973ae60ebe8c1d81e.png'
import plantImg3 from '@/imports/MyjungleSettimgs-2/f9057e3acb1771233585613c769e96893a7e8d76.png'

type WaterNeed = 'Light' | 'Moderate' | 'Heavy'
type Screen = 'splash' | 'onboarding' | 'main' | 'detail' | 'pro' | 'settings'
type TabScreen = 'home' | 'add' | 'watering' | 'settings'

interface HistoryEntry {
  id: string
  date: string
  note: string
  photo: string
  heightCm?: number
}

type DayCode = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'
type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

interface Plant {
  id: string
  name: string
  room: string
  careNote: string
  wateringDays: number[]
  isCustomSchedule: boolean
  scheduleDays: DayCode[]
  waterNeed: WaterNeed
  photo: string
  lastWateredAt: string | null
  previousWateredAt: string | null
  history: HistoryEntry[]
  isWateredToday: boolean
}

interface AppSettings {
  globalWaterSchedule: string[]
  hasCompletedOnboarding: boolean
  pushNotifications: boolean
  reminderTime: string
  soundAlerts: boolean
  hapticFeedback: boolean
  timezoneAutoSync: boolean
  timezone: string
  isPro: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GREEN = '#00FF66'
const BG = '#F7F7F7'
const BLACK = '#000000'
const RED = '#FF2D55'
const WATERED_BG = '#D9FFE8'
const DAYS: DayCode[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
const DAY_OF_WEEK: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
const MAX_FREE_PLANTS = 5
const PLANT_PHOTOS = [plantImg0, plantImg1, plantImg2, plantImg3]

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
}

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadPlants(): Plant[] {
  try {
    const r = localStorage.getItem('mj_plants')
    const raw = r ? JSON.parse(r) : []
    return (raw as Array<Plant & { watered?: boolean; lastWatered?: string | null }>).map(normalizePlant)
  } catch { return [] }
}
function savePlants(p: Plant[]) { localStorage.setItem('mj_plants', JSON.stringify(p)) }

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

function normalizePlant(raw: Plant & { watered?: boolean; lastWatered?: string | null; isCustomSchedule?: boolean; scheduleDays?: DayCode[] }): Plant {
  const wateringDays = [...(raw.wateringDays ?? [])].sort((a, b) => a - b)
  const scheduleDays = raw.scheduleDays?.length ? sortSchedule(raw.scheduleDays) as DayCode[] : indicesToSchedule(wateringDays)
  return {
    ...raw,
    wateringDays: scheduleToIndices(scheduleDays),
    scheduleDays,
    isCustomSchedule: raw.isCustomSchedule ?? false,
    isWateredToday: raw.isWateredToday ?? raw.watered ?? false,
    lastWateredAt: raw.lastWateredAt ?? raw.lastWatered ?? null,
    previousWateredAt: raw.previousWateredAt ?? null,
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
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      globalWaterSchedule,
      hasCompletedOnboarding,
      timezone,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}
function saveSettings(s: AppSettings) { localStorage.setItem('mj_settings', JSON.stringify(s)) }

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

function getTodayDayIndex(): number { return (new Date().getDay() + 6) % 7 }

function getDayOfWeek(index: number): DayOfWeek {
  return DAY_OF_WEEK[index] ?? 'MONDAY'
}

/** Hydration-safe: day index is null until after mount. */
function useTodayDayIndex(): number | null {
  const [todayIdx, setTodayIdx] = useState<number | null>(null)
  useEffect(() => { setTodayIdx(getTodayDayIndex()) }, [])
  return todayIdx
}

function getPlantsForDay(plants: Plant[], dayIdx: number): Plant[] {
  return plants.filter((p) => p.wateringDays.includes(dayIdx))
}

function getWateringDayOrder(globalWaterSchedule: string[], plants: Plant[], todayIdx: number): number[] {
  const fromGlobal = scheduleToIndices(globalWaterSchedule)
  const fromPlants = [...new Set(plants.flatMap((p) => p.wateringDays))]
  const allDays = [...new Set([...fromGlobal, ...fromPlants, todayIdx])].sort((a, b) => a - b)
  return [todayIdx, ...allDays.filter((d) => d !== todayIdx)]
}
function todayISO() { return new Date().toISOString().split('T')[0] }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }

// ─── Shared SVG components from import ───────────────────────────────────────

function SvgDrop() {
  return (
    <svg className="block" fill="none" height="116" viewBox="0 0 85 116" width="85">
      <path d={svgPaths.p1cd02a80} fill="black" stroke="black" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}
function SvgDropSmall({ color = '#000000', filled = false }: { color?: string; filled?: boolean }) {
  return (
    <svg className="block" fill="none" height="20" viewBox="0 0 12 20" width="12">
      <path d={svgPaths.p35497c00} fill={filled ? color : 'none'} stroke={color} strokeLinecap="round" strokeWidth="2" />
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
function SvgSettings() {
  return (
    <svg className="block" fill="none" height="18" viewBox="0 0 18 18" width="18">
      <path d={svgPaths.p1f61bb80} stroke="#000000" strokeLinecap="round" strokeWidth="2" />
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

function TabBar({ active, onChange }: { active: TabScreen; onChange: (t: TabScreen) => void }) {
  const tabs: { id: TabScreen; label: string; path: string; stroke: boolean }[] = [
    { id: 'home', label: 'MY JUNGLE', path: svgPaths2.p2046d6b0, stroke: true },
    { id: 'add', label: 'ADD NEW', path: svgPaths2.p3e11a380, stroke: true },
    { id: 'watering', label: 'WATERING', path: svgPaths2.p376ce800, stroke: true },
    { id: 'settings', label: 'PRO', path: svgPaths2.p1eebb470, stroke: false },
  ]
  return (
    <nav className="neo-tab-bar fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-black" aria-label="Main navigation">
      <div className="neo-tab-bar-inner">
      {tabs.map((t) => {
        const on = t.id === active
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className="flex flex-col items-center justify-center gap-1 min-w-0 cursor-pointer transition-colors py-2"
            style={{ background: on ? GREEN : 'transparent' }}
          >
            <div className="flex items-center justify-center" style={{ width: 20, height: 20 }}>
              <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
                {t.stroke
                  ? <path d={t.path} stroke={on ? BLACK : '#aaa'} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                  : <path d={t.path} fill={on ? BLACK : '#aaa'} />
                }
              </svg>
            </div>
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 8, color: on ? BLACK : '#aaa', textTransform: 'uppercase' }}>{t.label}</span>
          </button>
        )
      })}
      </div>
    </nav>
  )
}

// ─── Screen 1: Splash ─────────────────────────────────────────────────────────

function SplashScreen({ onNext }: { onNext: () => void }) {
  useEffect(() => {
    const t = setTimeout(onNext, 3200)
    return () => clearTimeout(t)
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
        <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 28, color: '#000', letterSpacing: '-0.01em' }}>MYJUNGLE</div>
        <div style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000', opacity: 0.55, marginTop: 4 }}>Version 1.0.0.</div>
      </div>
    </div>
  )
}

// ─── Screen 2: Onboarding ─────────────────────────────────────────────────────

function OnboardingScreen({ settings, onSave }: { settings: AppSettings; onSave: (s: AppSettings) => void }) {
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
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
      }}
    >
      <div className="flex flex-col items-center shrink-0 gap-1 w-full">
        <svg className="h-12 w-auto max-h-14 shrink-0" fill="none" viewBox="0 0 85 116">
          <path d={svgPaths.p1cd02a80} fill="black" stroke="black" strokeLinecap="round" strokeWidth="2" />
        </svg>
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 20, color: '#000' }}>MYJUNGLE</span>
      </div>

      <div className="text-center my-[20px] shrink-0 flex flex-col gap-1 w-full">
        <span className="section-header" style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>WEEKLY WATER SCHEDULE</span>
        <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 13, color: '#000' }}>Choose which days you&apos;d like to water</span>
      </div>

      <div className="flex flex-col gap-1.5 flex-1 min-h-0 justify-center w-full">
        {DAYS.map((d, i) => {
          const on = selectedDays.includes(i)
          return (
            <button
              key={d}
              type="button"
              onClick={() => toggleDay(i)}
              className="neo-pill relative flex items-center justify-between w-full cursor-pointer shrink-0"
              style={{ background: on ? GREEN : 'white', paddingLeft: 16, paddingRight: 16, paddingTop: 5, paddingBottom: 5 }}
            >
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}>{d}</span>
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

      <div className="my-[20px] shrink-0 flex flex-row items-center justify-between w-full gap-4">
        <div className="flex flex-col gap-1 flex-1 min-w-0 text-left">
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>Push Notification</span>
          <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 13, color: '#000' }}>Allow notifications for watering</span>
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
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000' }}>START</span>
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
  const counts = DAYS.map((_, i) => plants.filter((p) => p.wateringDays.includes(i)).length)
  return (
    <div className="px-5 py-3 shrink-0">
      <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000', marginBottom: 8 }}>WEEKLY WATER SCHEDULE</div>
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
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: textColor }}>{d}</span>
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

function PlantCard({ plant, onTap, onDelete, onWater, todayIdx }: {
  plant: Plant; onTap: () => void; onDelete: () => void; onWater: () => void; todayIdx: number
}) {
  const startX = useRef(0)
  const [swiped, setSwiped] = useState(false)
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
        onClick={onDelete}
      >
        <svg fill="none" height="28" viewBox="46 27 27 28" width="27">
          <path d={svgPaths2.p36f8ca80} fill="white" />
        </svg>
      </div>
      {/* Card slides left to reveal delete */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer relative w-full"
        style={{ background: cardBg, transform: swiped ? 'translateX(-95px)' : 'none', transition: 'transform .22s cubic-bezier(0.4,0,0.2,1)', zIndex: 1 }}
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
          <img src={plant.photo} alt={plant.name} className="w-full h-full object-cover" />
        </div>
        {/* Title + badges */}
        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
            {plant.name}
          </div>
          <div className="flex flex-wrap gap-1">
            <span className="badge px-1.5 py-0.5" style={{ background: BG, fontSize: 9, color: '#000' }}>{plant.room}</span>
            <span className="badge px-1.5 py-0.5" style={{ background: GREEN, fontSize: 9, color: '#000' }}>
              {plant.wateringDays.map((d) => DAYS[d]).join(' & ')}
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
          aria-label={plant.isWateredToday ? 'Plant watered' : 'Mark as watered'}
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

function HomeScreen({ plants, settings, onSelectPlant, onDeletePlant, onWaterPlant, onGoAdd, onSettings, onShowPro, todayIdx }: {
  plants: Plant[]; settings: AppSettings; onSelectPlant: (p: Plant) => void;
  onDeletePlant: (id: string) => void; onWaterPlant: (id: string) => void; onGoAdd: () => void; onSettings: () => void; onShowPro: () => void; todayIdx: number
}) {
  const needsWater = plants.filter((p) => p.wateringDays.includes(todayIdx) && !p.isWateredToday)

  return (
    <div className="flex flex-col h-full" style={{ background: BG }}>
      <div className="app-header" style={{ background: BG }}>
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 24, color: '#000' }}>MYJUNGLE</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onShowPro}
            className="badge flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer"
            style={{ background: GREEN }}
          >
            <SvgLeaf />
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>PRO</span>
          </button>
          <button type="button" onClick={onSettings} className="flex items-center justify-center rounded-full border-2 border-black bg-white cursor-pointer" style={{ width: 38, height: 38 }}>
            <SvgSettings />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Alert banner */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-black" style={{ background: GREEN }}>
            <SvgDroplet24 />
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000', lineHeight: 1.2 }}>
              {needsWater.length} PLANTS NEED WATER TODAY!
            </span>
          </div>
        </div>

        {/* Weekly strip */}
        <WeeklyStrip plants={plants} todayIdx={todayIdx} />

        {/* Specimens */}
        <div className="px-5">
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000' }}>
              MY SPECIMENS ({plants.length})
            </span>
          </div>

          {plants.length === 0 ? (
            <div className="flex flex-col items-center py-12 opacity-40">
              <SvgDrop />
              <div style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000', marginTop: 12 }}>No plants yet. Tap below to add one!</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 mb-4">
              {plants.map((p) => (
                <PlantCard key={p.id} plant={p} onTap={() => onSelectPlant(p)} onDelete={() => onDeletePlant(p.id)} onWater={() => onWaterPlant(p.id)} todayIdx={todayIdx} />
              ))}
            </div>
          )}

          {/* Add plant button */}
            <button type="button" onClick={onGoAdd}
            className="btn-primary btn-green w-full flex items-center justify-center rounded-full border-2 border-black mb-4 cursor-pointer"
            style={{ background: GREEN, height: 56 }}
          >
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 13, color: '#000' }}>+ ADD PLANT</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Free Tier Card ───────────────────────────────────────────────────────────

function AddPlantForm({
  currentPlantCount,
  onUpgrade,
}: {
  currentPlantCount: number
  onUpgrade: () => void
}) {
  const isLimitReached = currentPlantCount >= MAX_FREE_PLANTS
  const remainingSlots = Math.max(0, MAX_FREE_PLANTS - currentPlantCount)
  const progressPercentage = (currentPlantCount / MAX_FREE_PLANTS) * 100

  return (
    <div className="free-tier-card w-full">
      <div className="free-tier-header">
        <span className="font-display font-bold" style={{ fontSize: 10, color: '#000' }}>FREE TIER</span>
        <div className="plants-used-badge">
          {currentPlantCount}/{MAX_FREE_PLANTS} PLANTS USED
        </div>
      </div>

      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <p className="text-sm text-gray-500" style={{ fontFamily: 'Geist, sans-serif' }}>
        {isLimitReached ? (
          <span className="font-bold" style={{ color: RED }}>Limit reached. </span>
        ) : (
          `${remainingSlots} slots remaining. `
        )}
        <button
          type="button"
          onClick={onUpgrade}
          className="underline font-bold text-black cursor-pointer bg-transparent border-0 p-0"
          style={{ fontFamily: 'Geist, sans-serif', fontSize: 'inherit' }}
        >
          Upgrade to add unlimited plants
        </button>
      </p>
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
  const fillPct = Math.min(plantsUsed / plantsMax, 1)
  return (
    <div className="free-tier-card w-full">
      <div className="free-tier-header">
        <span className="font-display" style={{ fontSize: 10, color: '#000' }}>{title}</span>
        <span className="plants-used-badge">{plantsUsed}/{plantsMax} PLANTS USED</span>
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

function PhotoActionSheet({
  onClose,
  onTakePhoto,
  onChooseLibrary,
}: {
  onClose: () => void
  onTakePhoto: () => void
  onChooseLibrary: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden />
      <div
        className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        role="dialog"
        aria-modal="true"
        aria-label="Choose photo source"
      >
        <div className="flex flex-col gap-2 w-full max-w-lg mx-auto">
          <div className="neo-card flex flex-col overflow-hidden rounded-2xl border-2 border-black bg-white">
            <button
              type="button"
              onClick={onTakePhoto}
              className="flex w-full items-center justify-center border-b-2 border-black px-4 py-4 cursor-pointer active:bg-[#F7F7F7]"
              style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 16, color: '#000' }}
            >
              Take Photo
            </button>
            <button
              type="button"
              onClick={onChooseLibrary}
              className="flex w-full items-center justify-center px-4 py-4 cursor-pointer active:bg-[#F7F7F7]"
              style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 16, color: '#000' }}
            >
              Choose from Library
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="neo-card flex w-full items-center justify-center rounded-2xl border-2 border-black bg-white px-4 py-4 cursor-pointer active:bg-[#F7F7F7]"
            style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 16, color: '#000' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}

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

  const globalLabel = globalSchedule.length ? globalSchedule.join(', ') : 'No global days set'

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} aria-hidden />
      <div className="fixed inset-x-4 top-1/2 z-[70] -translate-y-1/2 mx-auto max-w-md">
        <div className="neo-card rounded-2xl border-2 border-black bg-white p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000', textTransform: 'uppercase' }}>
              Custom Watering Schedule
            </span>
            <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 12, color: '#888', lineHeight: 1.4 }}>
              Pick any days for this plant only. General schedule: {globalLabel}
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
                  className="neo-pill relative w-full cursor-pointer active:scale-[0.99] transition-all rounded-full border-2 border-black"
                  style={{ background: on ? GREEN : '#F3F4F6' }}
                >
                  <div className="flex items-center justify-between px-5 py-2">
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: on ? '#000' : '#888' }}>{d}</span>
                      {inGlobal && !on && (
                        <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 9, color: '#888' }}>in general</span>
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
            Edit Global General Schedule
          </button>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleApply}
              disabled={draftDays.length === 0}
              className="btn-primary btn-green flex w-full items-center justify-center rounded-full border-2 border-black cursor-pointer disabled:opacity-40"
              style={{ background: GREEN, height: 48 }}
            >
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>Apply for this Plant</span>
            </button>
            <button
              type="button"
              onClick={() => { onUseDefault(); onClose() }}
              className="flex w-full items-center justify-center rounded-full border-2 border-black bg-white cursor-pointer"
              style={{ height: 44, fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}
            >
              Use General Default Schedule
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex w-full items-center justify-center cursor-pointer"
              style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 13, color: '#888' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function WateringScheduleSection({
  days,
  isCustomSchedule,
  globalIndices,
  onToggleDay,
  onOpenCustomModal,
  onResetToDefault,
}: {
  days: number[]
  isCustomSchedule: boolean
  globalIndices: number[]
  onToggleDay: (index: number) => void
  onOpenCustomModal: () => void
  onResetToDefault: () => void
}) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase', lineHeight: 1.4 }}>
          How often does your plant need<br />to be watered? *
        </div>
        {isCustomSchedule && (
          <span
            className="rounded-full border-2 border-black px-2.5 py-1 shrink-0"
            style={{ background: GREEN, fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 9, color: '#000' }}
          >
            Custom Schedule
          </span>
        )}
      </div>

      <div className="flex flex-col gap-[7px] w-full">
        {DAYS.map((d, i) => {
          const on = days.includes(i)
          const disabled = !isCustomSchedule && !globalIndices.includes(i)
          return (
            <button
              key={d}
              type="button"
              onClick={() => onToggleDay(i)}
              disabled={disabled}
              className={`neo-pill relative w-full transition-all rounded-full border-2 border-black ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-[0.99]'}`}
              style={{ background: on ? GREEN : disabled ? '#E5E5E5' : '#F3F4F6' }}
            >
              <div className="flex items-center justify-between px-5 py-1.5">
                <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: disabled && !on ? '#888' : '#000' }}>{d}</span>
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

      {isCustomSchedule ? (
        <button
          type="button"
          onClick={onResetToDefault}
          className="text-left cursor-pointer underline"
          style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 12, color: '#000' }}
        >
          Use General Default Schedule
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenCustomModal}
          className="text-left cursor-pointer underline"
          style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 12, color: '#000' }}
        >
          Modify schedule / Enable extra days for this plant
        </button>
      )}
    </div>
  )
}

// ─── Screen 5: Add New ───────────────────────────────────────────────────────

function AddScreen({ plants, settings, onSave, onCancel, onUpgrade, onEditGlobalSchedule }: {
  plants: Plant[]; settings: AppSettings; onSave: (p: Plant) => void; onCancel: () => void; onUpgrade: () => void
  onEditGlobalSchedule: () => void
}) {
  const globalIndices = scheduleToIndices(settings.globalWaterSchedule)
  const [name, setName] = useState('')
  const [room, setRoom] = useState('')
  const [note, setNote] = useState('')
  const [days, setDays] = useState<number[]>(globalIndices)
  const [isCustomSchedule, setIsCustomSchedule] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [waterNeed, setWaterNeed] = useState<WaterNeed>('Moderate')
  const [photo, setPhoto] = useState<string | null>(null)
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)
  const canAdd = settings.isPro || plants.length < MAX_FREE_PLANTS

  useEffect(() => {
    if (!isCustomSchedule) setDays(scheduleToIndices(settings.globalWaterSchedule))
  }, [settings.globalWaterSchedule.join(','), isCustomSchedule, settings.globalWaterSchedule])

  function handlePhotoFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setPhoto(reader.result)
    }
    reader.readAsDataURL(file)
  }

  function handlePhotoInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handlePhotoFile(file)
    e.target.value = ''
  }

  function toggleDay(i: number) {
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
  }

  function save() {
    if (!name.trim() || days.length === 0) return
    const scheduleDays = indicesToSchedule(days)
    onSave({
      id: Date.now().toString(), name: name.trim(), room: room || 'Unknown', careNote: note,
      wateringDays: scheduleToIndices(scheduleDays), scheduleDays, isCustomSchedule,
      waterNeed, photo: photo ?? PLANT_PHOTOS[Math.floor(Math.random() * PLANT_PHOTOS.length)],
      lastWateredAt: null, previousWateredAt: null, history: [], isWateredToday: false,
    })
  }

  const dropletPath = svgAdd.p13e3d5f0

  function WaterDroplet({ filled }: { filled: boolean }) {
    const c = filled ? 'black' : GREEN
    return (
      <svg fill="none" height="12" viewBox="0 0 12 12" width="12">
        <path d={dropletPath} fill={c} stroke={c} strokeLinecap="round" strokeWidth="2" />
      </svg>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ background: BG }}>
      {/* Modal header */}
      <div className="flex flex-col items-center pb-[16px] pt-[8px] shrink-0 w-full">
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 18, color: '#000' }}>ADD NEW </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-[16px] items-start px-[20px] pb-[20px]">

          {/* Photo upload */}
          <div className="neo-card relative rounded-3xl w-full">
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
            <div className="flex items-center gap-[16px] p-[16px]">
              {/* Photo placeholder */}
              <div className="bg-[#F7F7F7] relative rounded-full shrink-0 size-[64px] overflow-hidden border-2 border-black flex items-center justify-center">
                {photo ? (
                  <img src={photo} alt="Selected plant" className="w-full h-full object-cover" />
                ) : (
                  <svg fill="none" height="24" viewBox="0 0 24 24" width="24" aria-hidden>
                    <path d={svgAdd.p22b7c700} fill="black" />
                  </svg>
                )}
              </div>
              {/* Upload action */}
              <div className="flex flex-col gap-[6px] flex-1 min-w-0">
                <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>Your Plant&apos;s Photo</span>
                <button
                  type="button"
                  onClick={() => setShowPhotoPicker(true)}
                  className="btn-primary btn-green inline-flex items-center justify-center gap-1 rounded-full border-2 border-black cursor-pointer self-start px-3 py-1.5"
                  style={{ background: GREEN, minHeight: 28 }}
                >
                  <svg fill="none" height="12" viewBox="0 0 20 20" width="12" aria-hidden className="shrink-0">
                    <path d={svgAdd.p3e11a380} stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                  <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000', lineHeight: 1 }}>
                    TAKE PHOTO
                  </span>
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

          {/* Inputs group */}
          <div className="flex flex-col gap-[12px] w-full">
            {/* Plant Name */}
            <div className="flex flex-col gap-[6px] w-full">
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>PLANT NAME *</span>
              <div className="neo-input relative rounded-[12px] w-full">
                <input
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Pilea Peperomioides"
                  className="w-full p-[14px] outline-none bg-transparent rounded-[12px]"
                  style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}
                />
              </div>
            </div>

            {/* Room Location */}
            <div className="flex flex-col gap-[6px] w-full">
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>ROOM LOCATION</span>
              <div className="neo-input relative rounded-[12px] w-full">
                <input
                  value={room} onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g. Living Room, Kitchen"
                  className="w-full p-[14px] outline-none bg-transparent rounded-[12px]"
                  style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#888' }}
                />
              </div>
            </div>

            {/* Care Note */}
            <div className="flex flex-col gap-[6px] w-full">
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>Care Note (max 500 Ca.)</span>
              <div className="neo-input relative rounded-[12px] w-full" style={{ height: 96 }}>
                <textarea
                  value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional care notes for this plant"
                  className="w-full h-full p-[14px] outline-none bg-transparent rounded-[12px] resize-none"
                  style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#888' }}
                />
              </div>
            </div>
          </div>

          <WateringScheduleSection
            days={days}
            isCustomSchedule={isCustomSchedule}
            globalIndices={globalIndices}
            onToggleDay={toggleDay}
            onOpenCustomModal={() => setShowScheduleModal(true)}
            onResetToDefault={resetToGeneralSchedule}
          />

          <CustomScheduleModal
            isOpen={showScheduleModal}
            selectedDays={days}
            globalSchedule={settings.globalWaterSchedule as DayCode[]}
            onClose={() => setShowScheduleModal(false)}
            onApply={applyCustomSchedule}
            onUseDefault={resetToGeneralSchedule}
            onEditGlobalSchedule={onEditGlobalSchedule}
          />

          {/* Water needs segmented */}
          <div className="flex flex-col gap-[8px] w-full">
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase', whiteSpace: 'pre' }}>
              {`How much water does your plant need?  *`}
            </span>
            <div className="neo-input relative rounded-[12px] w-full" style={{ height: 37 }}>
              <div className="flex items-center h-full px-[4px]">
                {(['Light', 'Moderate', 'Heavy'] as WaterNeed[]).map((w) => {
                  const on = waterNeed === w
                  const dropCount = w === 'Light' ? 1 : w === 'Moderate' ? 2 : 3
                  return (
                    <button
                      key={w}
                      onClick={() => setWaterNeed(w)}
                      className="flex items-center justify-center gap-[2px] py-[10px] rounded-full cursor-pointer active:scale-95 transition-all"
                      style={{
                        flex: on ? '0 0 auto' : '1 0 0',
                        width: on ? 135 : undefined,
                        height: 37,
                        background: on ? GREEN : 'transparent',
                        border: on ? '2px solid black' : '2px solid transparent',
                      }}
                    >
                      <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}>{w.toUpperCase()}</span>
                      {Array.from({ length: dropCount }).map((_, idx) => (
                        <WaterDroplet key={idx} filled={on} />
                      ))}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Free tier bar */}
          {!settings.isPro && (
            <AddPlantForm
              currentPlantCount={plants.length}
              onUpgrade={onUpgrade}
            />
          )}

          {/* Save button */}
          <div className="flex w-full pt-[8px]">
            <button
              type="button"
              onClick={save}
              disabled={!name.trim() || !canAdd || days.length === 0}
              className="btn-primary btn-green flex flex-1 items-center justify-center rounded-full border-2 border-black cursor-pointer disabled:opacity-40"
              style={{ background: GREEN, height: 56 }}
            >
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000' }}>SAVE TO JUNGLE</span>
            </button>
          </div>

          {/* Cancel button */}
          <div className="flex w-full pb-[40px]">
            <button
              onClick={onCancel}
              className="btn-secondary flex flex-1 items-center justify-center rounded-full border-2 border-black cursor-pointer active:scale-95 transition-all bg-white"
              style={{ height: 41 }}
            >
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>CANCEL</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

const DETAIL_BLUE = '#3B82F6'
const DETAIL_BLUE_LIGHT = '#DBEAFE'
const DETAIL_ORANGE_LIGHT = '#FFEDD5'
const DETAIL_GRAY_LIGHT = '#F3F4F6'
const DETAIL_MINT_LIGHT = '#D9FFE8'
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface HealthCheckItem {
  id: string
  label: string
  status: 'ok' | 'warning'
  timeAgo: string
}

// ─── Plant Detail Helpers ─────────────────────────────────────────────────────

function formatDetailDate(iso: string) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

function formatTimelineChip(iso: string) {
  const d = new Date(iso)
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`
}

function daysSinceLabel(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return '1 day ago'
  return `${diff} days ago`
}

function getPlantAgeDays(plant: Plant): number {
  const created = Number(plant.id)
  const startMs = Number.isFinite(created) && created > 0 ? created : Date.now()
  return Math.max(1, Math.floor((Date.now() - startMs) / 86400000))
}

function getWateringCount(plant: Plant): number {
  return plant.history.filter((h) => h.note.toLowerCase().includes('water')).length
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
  const withHeight = [...plant.history]
    .filter((h) => h.heightCm != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  if (withHeight.length >= 1) {
    const start = withHeight[0].heightCm!
    const current = withHeight[withHeight.length - 1].heightCm!
    return { start, current, delta: Math.round((current - start) * 10) / 10 }
  }
  const base = 12
  const growth = Math.max(plant.history.length, 1) * 0.8
  const current = Math.round((base + growth) * 10) / 10
  return { start: base, current, delta: Math.round((current - base) * 10) / 10 }
}

function getGrowthTimeline(plant: Plant) {
  const sorted = [...plant.history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const baseHeight = getGrowthHeights(plant).current
  return sorted.map((entry, idx) => ({
    ...entry,
    heightCm: entry.heightCm ?? Math.round((baseHeight - idx * 0.8) * 10) / 10,
  }))
}

function getGrowthChartPoints(plant: Plant, previewMode = false) {
  if (previewMode) {
    return [
      { label: 'May', value: 12 },
      { label: 'Jun', value: 12.5 },
      { label: 'Jul', value: 13 },
    ]
  }
  const chronological = [...getGrowthTimeline(plant)].reverse()
  if (chronological.length === 0) {
    return [{ label: MONTHS_SHORT[new Date().getMonth()], value: getGrowthHeights(plant).start }]
  }
  return chronological.map((entry) => {
    const d = new Date(entry.date)
    return {
      label: MONTHS_SHORT[d.getMonth()],
      value: entry.heightCm ?? getGrowthHeights(plant).start,
    }
  })
}

function getHealthScore(plant: Plant, todayIdx: number): number {
  let score = 68
  if (plant.isWateredToday || !plant.wateringDays.includes(todayIdx)) score += 14
  if (plant.lastWateredAt) score += 8
  if (plant.careNote.trim()) score += 5
  if (plant.history.length > 0) score += 5
  return Math.min(92, score)
}

function healthRating(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  return 'Needs Care'
}

function getHealthChecks(plant: Plant, previewMode = false): HealthCheckItem[] {
  if (previewMode) {
    return [
      { id: 'h1', label: 'Leaf Vitality: Lush & Vibrant', status: 'ok', timeAgo: 'Today' },
      { id: 'h2', label: 'Soil Condition: Moist & Balanced', status: 'ok', timeAgo: '2 days ago' },
      { id: 'h3', label: 'Minor Dust on Leaves — Cleaned', status: 'warning', timeAgo: '1 week ago' },
    ]
  }
  const checks: HealthCheckItem[] = [
    {
      id: 'leaf',
      label: plant.isWateredToday ? 'Leaf Vitality: Lush & Vibrant' : 'Leaf Vitality: Monitor hydration',
      status: plant.isWateredToday ? 'ok' : 'warning',
      timeAgo: 'Today',
    },
    {
      id: 'soil',
      label: plant.lastWateredAt ? 'Soil Condition: Moist & Balanced' : 'Soil Condition: Check moisture',
      status: plant.lastWateredAt ? 'ok' : 'warning',
      timeAgo: plant.lastWateredAt ? daysSinceLabel(plant.lastWateredAt) : 'Today',
    },
  ]
  if (plant.careNote) {
    checks.push({ id: 'care', label: `Care Note: ${plant.careNote.slice(0, 40)}${plant.careNote.length > 40 ? '…' : ''}`, status: 'ok', timeAgo: '1 week ago' })
  }
  return checks
}

const GROWTH_PREVIEW_ENTRIES = [
  { id: 'preview-1', date: '2026-05-15', note: 'Baseline measurement.', heightCm: 12 },
  { id: 'preview-2', date: '2026-06-20', note: 'Steady growth.', heightCm: 12.5 },
  { id: 'preview-3', date: '2026-07-15', note: 'Weekly growth check.', heightCm: 13 },
]

function LockIcon({ size = 28 }: { size?: number }) {
  return (
    <svg fill="none" height={size} viewBox="0 0 24 24" width={size} aria-hidden>
      <rect height="10" rx="2" stroke="#000" strokeWidth="2" width="14" x="5" y="11" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#000" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function ProSectionLock({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
      <div className="neo-card flex flex-col items-center gap-3 rounded-2xl border-2 border-black bg-white p-5 text-center w-full max-w-[300px]">
        <LockIcon />
        <span
          className="rounded-full border-2 border-black px-3 py-1"
          style={{ background: GREEN, fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}
        >
          PRO FEATURE
        </span>
        <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 14, color: '#000', lineHeight: 1.4 }}>
          PRO Feature: Unlock History &amp; Tracking
        </p>
        <button
          type="button"
          onClick={onUpgrade}
          className="btn-primary btn-green flex w-full items-center justify-center rounded-full border-2 border-black cursor-pointer"
          style={{ background: GREEN, height: 48 }}
        >
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>UPGRADE TO PRO</span>
        </button>
      </div>
    </div>
  )
}

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
      <div className="fixed inset-x-4 top-1/2 z-[70] -translate-y-1/2 mx-auto max-w-md">
        <div className="neo-card rounded-2xl border-2 border-black bg-white p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000', textTransform: 'uppercase' }}>{title}</span>
            <button type="button" onClick={onClose} className="flex items-center justify-center size-8 rounded-full border-2 border-black bg-black cursor-pointer">
              <svg fill="none" height="14" viewBox="0 0 18 18" width="14"><path clipRule="evenodd" d={svgDetail.p3b43000} fill="white" fillRule="evenodd" /></svg>
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  )
}

function GrowthStatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="growth-stat-card flex-1">
      <span className="detail-stat-label">{label}</span>
      <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 18, color: '#000', lineHeight: 1.1 }}>{value}</span>
      {sub && <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 11, color: '#888' }}>{sub}</span>}
    </div>
  )
}

function GrowthChart({ points }: { points: { label: string; value: number }[] }) {
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
    <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-3 w-full">
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000', textTransform: 'uppercase' }}>Growth Over Time</span>
        <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 11, color: '#888' }}>cm</span>
      </div>
      <svg className="w-full" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Plant growth chart">
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
  return (
    <div className="flex flex-col gap-3 w-full">
      <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000', textTransform: 'uppercase' }}>Photo Timeline</span>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        <button type="button" onClick={onNewSnapshot} className="detail-snapshot-new cursor-pointer active:opacity-80">
          <svg fill="none" height="22" viewBox="0 0 24 24" width="22" aria-hidden>
            <path d={svgDetail.p1a54b00} fill={GREEN} />
          </svg>
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 9, color: GREEN, textTransform: 'uppercase' }}>New Snapshot</span>
        </button>
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onPhotoClick(entry.photo)}
            className="detail-snapshot-thumb cursor-pointer active:scale-[0.98] transition-transform"
          >
            <img alt="" src={entry.photo} className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1.5">
              <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 10, color: '#fff' }}>
                {formatTimelineChip(entry.date)} · {entry.heightCm}cm
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
  const chartPoints = getGrowthChartPoints(plant, previewMode)

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="grid grid-cols-3 gap-2 w-full">
        <GrowthStatCard label="Days Tracked" value={`${ageDays}`} sub="Plant age" />
        <GrowthStatCard label="Total Growth" value={`+${heights.delta} cm`} sub={`${heights.start} → ${heights.current} cm`} />
        <GrowthStatCard label="Waterings" value={`${wateringCount}`} sub={`${consistency}% consistent`} />
      </div>

      <div className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-3 w-full">
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000', textTransform: 'uppercase' }}>Consistency Score</span>
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
  isPro,
  onUpgrade,
  onLogGrowth,
  onNewSnapshot,
  onPhotoClick,
}: {
  plant: Plant
  isPro: boolean
  onUpgrade: () => void
  onLogGrowth: () => void
  onNewSnapshot: () => void
  onPhotoClick: (photo: string) => void
}) {
  return (
    <div className="neo-card relative rounded-3xl shrink-0 w-full overflow-hidden">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-3 w-full">
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>
            Growth History
          </span>
          <button
            type="button"
            onClick={isPro ? onLogGrowth : onUpgrade}
            className="btn-primary btn-green shrink-0 inline-flex items-center justify-center rounded-full border-2 border-black cursor-pointer px-3 py-1.5"
            style={{ background: GREEN }}
          >
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}>+ Log Growth</span>
          </button>
        </div>

        {isPro ? (
          <GrowthHistoryContent plant={plant} onNewSnapshot={onNewSnapshot} onPhotoClick={onPhotoClick} />
        ) : (
          <div className="relative min-h-[380px]">
            <div className="pro-section-preview">
              <GrowthHistoryContent plant={plant} previewMode />
            </div>
            <ProSectionLock onUpgrade={onUpgrade} />
          </div>
        )}
      </div>
    </div>
  )
}

function HealthGauge({ score }: { score: number }) {
  const r = 36
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  return (
    <svg height="88" viewBox="0 0 88 88" width="88" aria-hidden>
      <circle className="health-gauge-track" cx="44" cy="44" r={r} />
      <circle
        className="health-gauge-fill"
        cx="44"
        cy="44"
        r={r}
        strokeDasharray={c}
        strokeDashoffset={offset}
      />
      <text fill="#000" fontFamily="Unbounded, sans-serif" fontSize="16" fontWeight="900" textAnchor="middle" x="44" y="48">{score}%</text>
    </svg>
  )
}

function HealthTrackerContent({
  plant,
  todayIdx,
  previewMode = false,
  onRecordHealth,
}: {
  plant: Plant
  todayIdx: number
  previewMode?: boolean
  onRecordHealth?: () => void
}) {
  const score = previewMode ? 92 : getHealthScore(plant, todayIdx)
  const checks = getHealthChecks(plant, previewMode)

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="rounded-2xl p-4 flex gap-4 items-center w-full" style={{ background: DETAIL_MINT_LIGHT, border: '2px solid #000' }}>
        <HealthGauge score={score} />
        <div className="flex flex-col gap-1 min-w-0">
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>Overall Health Score</span>
          <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 13, color: '#666' }}>Thriving in current conditions</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full">
        {checks.map((item) => (
          <div key={item.id} className="flex items-start gap-3 w-full">
            <div
              className="flex items-center justify-center shrink-0 size-7 rounded-full border-2 border-black"
              style={{ background: item.status === 'ok' ? GREEN : '#FFB020' }}
            >
              {item.status === 'ok' ? (
                <svg fill="none" height="12" viewBox="0 0 12 12" width="12"><path d="M2 6l3 3 5-6" stroke="#000" strokeLinecap="round" strokeWidth="2" /></svg>
              ) : (
                <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>!</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 13, color: '#000', lineHeight: 1.35 }}>{item.label}</p>
            </div>
            <span className="shrink-0" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 11, color: '#888' }}>{item.timeAgo}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onRecordHealth}
        className="btn-primary btn-green flex w-full items-center justify-center rounded-full border-2 border-black cursor-pointer"
        style={{ background: GREEN, height: 52 }}
      >
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>Record Health Check</span>
      </button>
    </div>
  )
}

function HealthTrackerSection({
  plant,
  todayIdx,
  isPro,
  onUpgrade,
  onRecordHealth,
}: {
  plant: Plant
  todayIdx: number
  isPro: boolean
  onUpgrade: () => void
  onRecordHealth: () => void
}) {
  const score = isPro ? getHealthScore(plant, todayIdx) : 92
  const rating = healthRating(score)

  return (
    <div className="neo-card relative rounded-3xl shrink-0 w-full overflow-hidden">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-3 w-full">
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>
            Health Tracker
          </span>
          <span
            className="shrink-0 rounded-full px-3 py-1 border-2 border-black"
            style={{ background: DETAIL_MINT_LIGHT, fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 11, color: '#047857' }}
          >
            {score}% {rating}
          </span>
        </div>

        {isPro ? (
          <HealthTrackerContent plant={plant} todayIdx={todayIdx} onRecordHealth={onRecordHealth} />
        ) : (
          <div className="relative min-h-[340px]">
            <div className="pro-section-preview">
              <HealthTrackerContent plant={plant} todayIdx={todayIdx} previewMode />
            </div>
            <ProSectionLock onUpgrade={onUpgrade} />
          </div>
        )}
      </div>
    </div>
  )
}

function WaterDropletIcon({ filled }: { filled: boolean }) {
  return (
    <svg fill="none" height="20" viewBox="0 0 12 20" width="12">
      <path
        d={svgDetail.p35497c00}
        fill={filled ? DETAIL_BLUE : DETAIL_BLUE_LIGHT}
        stroke={filled ? DETAIL_BLUE : '#93C5FD'}
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  )
}

// ─── Screen 6: Plant Details ─────────────────────────────────────────────────

function PlantDetailScreen({ plant, isPro, globalWaterSchedule, onBack, onDelete, onUpdate, onMarkWatered, onShowPro, onEditGlobalSchedule, todayIdx }: {
  plant: Plant; isPro: boolean; globalWaterSchedule: DayCode[]; onBack: () => void; onDelete: () => void; onUpdate: (p: Plant) => void
  onMarkWatered: () => void; onShowPro: () => void; onEditGlobalSchedule: () => void; todayIdx: number
}) {
  const globalIndices = scheduleToIndices(globalWaterSchedule)
  const [showEdit, setShowEdit] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showLogGrowth, setShowLogGrowth] = useState(false)
  const [showRecordHealth, setShowRecordHealth] = useState(false)
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)
  const [editName, setEditName] = useState(plant.name)
  const [editRoom, setEditRoom] = useState(plant.room)
  const [editNote, setEditNote] = useState(plant.careNote)
  const [editDays, setEditDays] = useState<number[]>(scheduleIndicesFromPlant(plant))
  const [editIsCustomSchedule, setEditIsCustomSchedule] = useState(plant.isCustomSchedule)
  const [growthNote, setGrowthNote] = useState('')
  const [growthHeight, setGrowthHeight] = useState('')
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)

  const needsWater = plant.wateringDays.includes(todayIdx) && !plant.isWateredToday
  const waterFills = plant.waterNeed === 'Heavy' ? 3 : plant.waterNeed === 'Moderate' ? 2 : 1
  const primaryDay = plant.wateringDays[0]
  const onSchedule = !needsWater

  function handlePhotoFile(file: File, asGrowthLog = false) {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') return
      if (asGrowthLog && isPro) {
        const height = growthHeight ? Number(growthHeight) : undefined
        onUpdate({
          ...plant,
          photo: reader.result,
          history: [{
            id: Date.now().toString(),
            date: new Date().toISOString(),
            note: growthNote.trim() || 'Growth snapshot logged.',
            photo: reader.result,
            heightCm: height,
          }, ...plant.history],
        })
        setGrowthNote('')
        setGrowthHeight('')
        setShowLogGrowth(false)
      } else if (asGrowthLog) {
        onUpdate({
          ...plant,
          history: [{
            id: Date.now().toString(),
            date: new Date().toISOString(),
            note: 'New growth snapshot.',
            photo: reader.result,
            heightCm: growthHeight ? Number(growthHeight) : getGrowthHeights(plant).current,
          }, ...plant.history],
        })
        setShowPhotoPicker(false)
      } else {
        onUpdate({ ...plant, photo: reader.result })
      }
    }
    reader.readAsDataURL(file)
  }

  function handlePhotoInputChange(e: React.ChangeEvent<HTMLInputElement>, asGrowthLog = false) {
    const file = e.target.files?.[0]
    if (file) handlePhotoFile(file, asGrowthLog)
    e.target.value = ''
  }

  function saveEdit() {
    if (!editName.trim() || editDays.length === 0) return
    const scheduleDays = indicesToSchedule(editDays)
    onUpdate({
      ...plant,
      name: editName.trim(),
      room: editRoom.trim() || plant.room,
      careNote: editNote,
      wateringDays: scheduleToIndices(scheduleDays),
      scheduleDays,
      isCustomSchedule: editIsCustomSchedule,
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
    setShowEdit(true)
  }

  function logGrowthEntry() {
    onUpdate({
      ...plant,
      history: [{
        id: Date.now().toString(),
        date: new Date().toISOString(),
        note: growthNote.trim() || 'Growth check logged.',
        photo: plant.photo,
        heightCm: growthHeight ? Number(growthHeight) : getGrowthHeights(plant).current,
      }, ...plant.history],
    })
    setGrowthNote('')
    setGrowthHeight('')
    setShowLogGrowth(false)
  }

  function recordHealthCheck() {
    onUpdate({
      ...plant,
      history: [{
        id: Date.now().toString(),
        date: new Date().toISOString(),
        note: 'Health check recorded.',
        photo: plant.photo,
      }, ...plant.history],
    })
    setShowRecordHealth(false)
  }

  return (
    <div className="content-stretch flex flex-col items-start justify-between relative size-full" style={{ background: BG }}>
      <div className="content-stretch flex flex-col items-start relative shrink-0 w-full flex-1 min-h-0">
        <div className="app-header relative shrink-0 w-full">
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 18, color: '#000', textTransform: 'uppercase' }}>Plant Details</span>
          <button
            type="button"
            onClick={onBack}
            className="bg-black flex items-center justify-center rounded-full shrink-0 cursor-pointer border-2 border-black"
            style={{ width: 38, height: 38 }}
            aria-label="Close plant details"
          >
            <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
              <path clipRule="evenodd" d={svgDetail.p3b43000} fill="white" fillRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto w-full pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
          <div className="content-stretch flex flex-col gap-4 items-start px-5 pb-6 relative w-full">

            {/* Hero photo + species tag */}
            <div className="h-[219px] relative rounded-3xl shrink-0 w-full overflow-hidden border-2 border-black">
              <img alt={plant.name} src={plant.photo} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute bottom-3 left-3">
                <span className="detail-tag detail-tag-filled">{plant.name}</span>
              </div>
            </div>

            {/* Species info card */}
            <div className="neo-card relative rounded-3xl shrink-0 w-full">
              <div className="flex flex-col gap-4 p-4">
                <div className="flex items-start justify-between gap-3 w-full">
                  <div className="flex flex-col gap-2 min-w-0">
                    <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000' }}>{plant.name}</span>
                    <div className="flex flex-wrap gap-2">
                      {plant.isCustomSchedule ? (
                        <button type="button" className="detail-tag detail-tag-filled cursor-default">Custom Schedule</button>
                      ) : null}
                      <button type="button" className="detail-tag detail-tag-outline cursor-default">{plant.room.toUpperCase()}</button>
                      {primaryDay != null && (
                        <button type="button" className="detail-tag detail-tag-filled cursor-default">{DAY_NAMES[primaryDay].toUpperCase()}</button>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="flex items-center justify-center shrink-0 size-9 rounded-full border-2 border-black bg-white cursor-pointer active:scale-95"
                    aria-label="Edit plant"
                  >
                    <svg fill="none" height="15" viewBox="0 0 16 15" width="16">
                      <path d={svgDetail.p3c709780} fill="black" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full">
                  <div className="detail-mini-card" style={{ background: DETAIL_BLUE_LIGHT }}>
                    <span className="detail-stat-label">Water Level</span>
                    <div className="flex gap-1 items-end">
                      {[0, 1, 2].map((i) => (
                        <WaterDropletIcon key={i} filled={i < waterFills} />
                      ))}
                    </div>
                  </div>
                  <div className="detail-mini-card" style={{ background: DETAIL_ORANGE_LIGHT }}>
                    <span className="detail-stat-label">Last Watered</span>
                    <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000' }}>
                      {daysSinceLabel(plant.lastWateredAt)}
                    </span>
                  </div>
                </div>

                <div className="detail-mini-card w-full" style={{ background: DETAIL_GRAY_LIGHT }}>
                  <span className="detail-stat-label">Care Note</span>
                  <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000', lineHeight: 1.5 }}>
                    {plant.careNote || 'No care notes added yet.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full shrink-0" style={{ background: onSchedule ? GREEN : RED }} aria-hidden />
                  <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 13, color: '#000' }}>
                    {onSchedule ? 'On Schedule' : 'Needs Water'}
                  </span>
                  {needsWater && (
                    <button
                      type="button"
                      onClick={onMarkWatered}
                      className="ml-auto shrink-0 rounded-full border-2 border-black px-3 py-1 cursor-pointer active:scale-95"
                      style={{ background: GREEN, fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 9, color: '#000' }}
                    >
                      MARK WATERED
                    </button>
                  )}
                </div>
              </div>
            </div>

            <GrowthHistorySection
              plant={plant}
              isPro={isPro}
              onUpgrade={onShowPro}
              onLogGrowth={() => (isPro ? setShowLogGrowth(true) : onShowPro())}
              onNewSnapshot={() => (isPro ? setShowPhotoPicker(true) : onShowPro())}
              onPhotoClick={setLightboxPhoto}
            />

            <HealthTrackerSection
              plant={plant}
              todayIdx={todayIdx}
              isPro={isPro}
              onUpgrade={onShowPro}
              onRecordHealth={() => (isPro ? setShowRecordHealth(true) : onShowPro())}
            />

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-secondary bg-white flex w-full h-[52px] items-center justify-center rounded-full cursor-pointer active:scale-[0.98] transition-all border-2"
              style={{ borderColor: RED }}
            >
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: RED }}>Delete Plant</span>
            </button>
          </div>
        </div>
      </div>

      <TabBar active="home" onChange={() => onBack()} />

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoInputChange(e, true)} />
      <input ref={libraryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoInputChange(e, true)} />

      {showEdit && (
        <DetailModal title="Edit Plant" onClose={() => setShowEdit(false)}>
          <div className="flex flex-col gap-3 max-h-[70dvh] overflow-y-auto">
            <label className="flex flex-col gap-1">
              <span className="detail-stat-label">Plant Name</span>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="neo-input rounded-xl border-2 border-black px-3 py-2 w-full" style={{ fontFamily: 'Geist, sans-serif', fontSize: 14 }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="detail-stat-label">Room</span>
              <input value={editRoom} onChange={(e) => setEditRoom(e.target.value)} className="neo-input rounded-xl border-2 border-black px-3 py-2 w-full" style={{ fontFamily: 'Geist, sans-serif', fontSize: 14 }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="detail-stat-label">Care Note</span>
              <textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} rows={3} className="neo-input rounded-xl border-2 border-black px-3 py-2 w-full resize-none" style={{ fontFamily: 'Geist, sans-serif', fontSize: 14 }} />
            </label>
            <WateringScheduleSection
              days={editDays}
              isCustomSchedule={editIsCustomSchedule}
              globalIndices={globalIndices}
              onToggleDay={toggleEditDay}
              onOpenCustomModal={() => setShowScheduleModal(true)}
              onResetToDefault={resetEditToGeneralSchedule}
            />
            <button type="button" onClick={saveEdit} disabled={editDays.length === 0} className="btn-primary btn-green flex w-full items-center justify-center rounded-full border-2 border-black cursor-pointer disabled:opacity-40" style={{ background: GREEN, height: 48 }}>
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>SAVE CHANGES</span>
            </button>
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
        <DetailModal title="Delete Plant?" onClose={() => setShowDeleteConfirm(false)}>
          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000', lineHeight: 1.5 }}>
            This will permanently remove {plant.name} from your jungle.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 h-11 rounded-full border-2 border-black bg-white cursor-pointer" style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10 }}>Cancel</button>
            <button type="button" onClick={() => { setShowDeleteConfirm(false); onDelete() }} className="flex-1 h-11 rounded-full border-2 cursor-pointer" style={{ borderColor: RED, color: RED, fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, background: '#fff' }}>Delete</button>
          </div>
        </DetailModal>
      )}

      {showLogGrowth && (
        <DetailModal title="Log Growth" onClose={() => setShowLogGrowth(false)}>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="detail-stat-label">Height (cm)</span>
              <input value={growthHeight} onChange={(e) => setGrowthHeight(e.target.value)} inputMode="decimal" placeholder={`${getGrowthHeights(plant).current}`} className="neo-input rounded-xl border-2 border-black px-3 py-2 w-full" style={{ fontFamily: 'Geist, sans-serif', fontSize: 14 }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="detail-stat-label">Note</span>
              <textarea value={growthNote} onChange={(e) => setGrowthNote(e.target.value)} rows={2} placeholder="What changed since last check?" className="neo-input rounded-xl border-2 border-black px-3 py-2 w-full resize-none" style={{ fontFamily: 'Geist, sans-serif', fontSize: 14 }} />
            </label>
            <button type="button" onClick={logGrowthEntry} className="btn-primary btn-green flex w-full items-center justify-center rounded-full border-2 border-black cursor-pointer" style={{ background: GREEN, height: 44 }}>
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}>SAVE LOG</span>
            </button>
          </div>
        </DetailModal>
      )}

      {showRecordHealth && (
        <DetailModal title="Record Health Check" onClose={() => setShowRecordHealth(false)}>
          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}>
            Log a quick health snapshot for {plant.name}?
          </p>
          <button type="button" onClick={recordHealthCheck} className="btn-primary btn-green flex w-full items-center justify-center rounded-full border-2 border-black cursor-pointer" style={{ background: GREEN, height: 48 }}>
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>CONFIRM</span>
          </button>
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
            <img alt="Growth snapshot" src={lightboxPhoto} className="max-w-full max-h-full object-contain rounded-2xl border-2 border-white" />
            <button type="button" onClick={() => setLightboxPhoto(null)} className="absolute top-6 right-6 size-10 rounded-full border-2 border-white bg-black/50 text-white cursor-pointer">✕</button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Screen 7: Watering ───────────────────────────────────────────────────────

function WateringScreen({ plants, globalWaterSchedule, todayIdx, onMarkWatered, onMarkAll }: {
  plants: Plant[]
  globalWaterSchedule: string[]
  todayIdx: number | null
  onMarkWatered: (id: string) => void
  onMarkAll: () => void
}) {
  const grouped: Record<number, Plant[]> = {}
  plants.forEach((p) => {
    p.wateringDays.forEach((d) => {
      if (!grouped[d]) grouped[d] = []
      if (!grouped[d].some((x) => x.id === p.id)) grouped[d].push(p)
    })
  })

  const todayPlantCount = todayIdx === null ? 0 : getPlantsForDay(plants, todayIdx).length
  const orderedDays = todayIdx === null ? scheduleToIndices(globalWaterSchedule) : getWateringDayOrder(globalWaterSchedule, plants, todayIdx)
  const waterNeedFills = (need: WaterNeed) => (need === 'Light' ? 1 : need === 'Moderate' ? 2 : 3)

  return (
    <div className="flex flex-col h-full" style={{ background: BG }}>
      <div className="app-header shrink-0">
        <div className="flex flex-col">
          <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 20, color: '#000', lineHeight: 1.2 }}>WATERING</p>
          <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#888' }}>
            {todayPlantCount} {todayPlantCount === 1 ? 'PLANT' : 'PLANTS'}
          </p>
        </div>
      </div>

      {todayPlantCount > 0 && (
        <div className="shrink-0 px-5 pb-4">
          <button
            type="button"
            onClick={onMarkAll}
            className="btn-primary btn-green relative w-full flex items-center justify-center rounded-full border-2 border-black cursor-pointer"
            style={{ background: GREEN, height: 48 }}
          >
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>
              MARK ALL {todayPlantCount} PLANTS TODAY AS WATERED
            </span>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-4 flex flex-col gap-5">
        {orderedDays.map((di) => {
          const dayPlants = grouped[di] || []
          const isToday = todayIdx !== null && di === todayIdx
          const dayName = getDayOfWeek(di)
          return (
            <div
              key={di}
              className={`flex flex-col gap-[10px] mx-5 ${isToday ? 'neo-card rounded-2xl p-4 border-2 border-black' : 'px-0'}`}
              style={isToday ? { background: `${GREEN}40` } : undefined}
            >
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000' }}>
                  {isToday ? 'TODAY ROUTINE' : `${dayName} ROUTINE`}
                </p>
                {isToday && (
                  <span
                    className="neo-pill inline-flex items-center px-2 py-0.5 border-2 border-black"
                    style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 9, background: GREEN, color: '#000' }}
                  >
                    {dayName}
                  </span>
                )}
              </div>
              {dayPlants.length === 0 && (
                <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}>No plants assigned</p>
              )}
              {dayPlants.map((p) => {
                const fills = waterNeedFills(p.waterNeed)
                return (
                  <div
                    key={p.id}
                    className="neo-plant-card relative rounded-2xl shrink-0 w-full overflow-hidden"
                    style={{ background: p.isWateredToday ? WATERED_BG : 'white' }}
                  >
                    <div className="flex items-center gap-3 px-4 py-3 w-full">
                      <div className="shrink-0 size-[54px] rounded-full overflow-hidden border-2 border-black">
                        <img alt="" className="w-full h-full object-cover" src={p.photo} />
                      </div>
                      <div className="flex flex-1 flex-col gap-1 min-w-0">
                        <p
                          className="overflow-hidden text-ellipsis whitespace-nowrap uppercase"
                          style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}
                        >
                          {p.name}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          <div className="badge px-1.5 py-0.5" style={{ background: BG }}>
                            <span style={{ fontSize: 9, color: '#000' }}>{p.room.toUpperCase()}</span>
                          </div>
                          <div className="badge px-1.5 py-0.5" style={{ background: isToday ? GREEN : BG }}>
                            <span style={{ fontSize: 9, color: '#000' }}>{isToday ? 'TODAY' : dayName}</span>
                          </div>
                        </div>
                        <div className="flex gap-[5px] h-4 items-end">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className="flex items-center justify-center h-5 w-3 shrink-0">
                              {i < fills ? (
                                <svg fill="none" height="20" viewBox="0 0 12 20" width="12">
                                  <path d={svgBatch.p35497c00} fill={GREEN} stroke={GREEN} strokeLinecap="round" strokeWidth="2" />
                                </svg>
                              ) : (
                                <div className="h-5 w-3" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onMarkWatered(p.id)}
                        className="ml-auto shrink-0 flex items-center justify-center rounded-full size-10 cursor-pointer active:scale-90 transition-all border-2 border-black"
                        style={{ background: p.isWateredToday ? 'white' : GREEN }}
                        aria-label={p.isWateredToday ? 'Plant watered' : 'Mark as watered'}
                      >
                        {p.isWateredToday ? (
                          <svg fill="none" height="27" viewBox="0 0 27 27" width="27">
                            <path d={svgBatch.p64f2600} fill={GREEN} stroke="black" strokeLinecap="round" strokeWidth="2" />
                          </svg>
                        ) : (
                          <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
                            <path d={svgBatch.p2afd9fa0} stroke={BLACK} strokeLinecap="round" strokeWidth="2" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Screen 8: Pro Paywall — see @/components/ProScreen.tsx ──────────────────

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
    if (typeof input.showPicker === 'function') {
      input.showPicker()
    } else {
      input.click()
    }
  }

  function handleTestNotification() {
    if (!isNotificationSupported()) {
      setTestResult('Notifications are not supported on this device.')
      return
    }
    if (Notification.permission !== 'granted') {
      setTestResult('Enable push notifications first.')
      return
    }
    const ok = sendTestNotification(settings)
    setTestResult(ok ? 'Test notification sent!' : 'Could not send test notification.')
  }

  return (
    <>
      {/* Push notification */}
      <div className="flex gap-4 items-center py-3 w-full min-h-[44px]">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000', textTransform: 'uppercase' }}>Push Notification</p>
          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}>Allow notifications for watering</p>
        </div>
        <SettingsToggle on={settings.pushNotifications} onToggle={handlePushToggle} ariaLabel="Toggle push notifications" />
      </div>

      {permissionDenied && (
        <div className="neo-card rounded-2xl border-2 border-black bg-white p-3 flex flex-col gap-2">
          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 13, color: RED, lineHeight: 1.4 }}>
            Notifications are blocked. Open your device or browser settings and allow notifications for myJungle, then try again.
          </p>
          <button
            type="button"
            onClick={() => setPermissionDenied(false)}
            className="self-start underline cursor-pointer"
            style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 12, color: '#000' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Watering reminder time */}
      <div className="flex gap-4 items-center py-3 w-full min-h-[44px]">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000', textTransform: 'uppercase' }}>Watering Reminder Time</p>
          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}>Alert at this time ({effectiveTz})</p>
        </div>
        <button
          type="button"
          onClick={openTimePicker}
          className="relative bg-white border-2 border-black flex items-center justify-center gap-2 min-w-[100px] px-4 py-2 rounded-full shrink-0 h-11 whitespace-nowrap cursor-pointer active:scale-[0.98]"
        >
          <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 16, color: '#000' }}>
            {formatReminderTime(settings.reminderTime)}
          </span>
          <svg fill="none" height="15" viewBox="0 0 16 15" width="16" aria-hidden className="shrink-0">
            <path d={svgSettings.p3c709780} fill="black" />
          </svg>
          <input
            ref={timeInputRef}
            type="time"
            value={settings.reminderTime}
            onChange={(e) => onChange({ reminderTime: e.target.value })}
            className="absolute opacity-0 pointer-events-none w-0 h-0"
            tabIndex={-1}
            aria-hidden
          />
        </button>
      </div>

      {/* Device timezone sync */}
      <div className="flex gap-4 items-center py-3 w-full min-h-[44px]">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000', textTransform: 'uppercase' }}>Device Timezone Sync</p>
          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}>
            {settings.timezoneAutoSync ? `Auto-synced: ${deviceTz}` : `Manual: ${settings.timezone}`}
          </p>
        </div>
        <SettingsToggle
          on={settings.timezoneAutoSync}
          onToggle={() => onChange({
            timezoneAutoSync: !settings.timezoneAutoSync,
            timezone: settings.timezoneAutoSync ? settings.timezone : deviceTz,
          })}
          ariaLabel="Toggle timezone auto sync"
        />
      </div>

      {!settings.timezoneAutoSync && (
        <div className="neo-input rounded-xl border-2 border-black w-full min-h-[44px]">
          <select
            value={settings.timezone}
            onChange={(e) => onChange({ timezone: e.target.value })}
            className="w-full h-11 px-3 bg-transparent outline-none rounded-xl"
            style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 14, color: '#000' }}
          >
            {timezoneOptions.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
      )}

      {/* Sound alerts */}
      <div className="flex gap-4 items-center py-3 w-full min-h-[44px]">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000', textTransform: 'uppercase' }}>Sound Alerts</p>
          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}>Play sound with notifications</p>
        </div>
        <SettingsToggle
          on={settings.soundAlerts}
          onToggle={() => onChange({ soundAlerts: !settings.soundAlerts })}
          ariaLabel="Toggle sound alerts"
        />
      </div>

      {/* Haptic feedback */}
      <div className="flex gap-4 items-center py-3 w-full min-h-[44px]">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000', textTransform: 'uppercase' }}>Haptic Feedback</p>
          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}>Vibrate on alerts and toggles</p>
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
          ariaLabel="Toggle haptic feedback"
        />
      </div>

      {/* Test notification */}
      <div className="flex flex-col gap-2 py-2 w-full">
        <button
          type="button"
          onClick={handleTestNotification}
          className="btn-secondary flex w-full min-h-[44px] items-center justify-center rounded-full border-2 border-black bg-white cursor-pointer active:scale-[0.98]"
        >
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>Send Test Notification</span>
        </button>
        {testResult && (
          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 12, color: '#888' }}>{testResult}</p>
        )}
      </div>
    </>
  )
}

// ─── Feedback Form ────────────────────────────────────────────────────────────

interface FeedbackFormState {
  thought: string
  issue: string
  contact: string
}

function FeedbackForm() {
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
        setSuccessMessage('Thanks! Your feedback was sent.')
      } else {
        setErrorMessage(result.error ?? 'Failed to send feedback.')
      }
    } catch {
      setErrorMessage('Failed to send feedback. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const fieldConfig = [
    { key: 'thought' as const, placeholder: "Tell us what's on your mind..." },
    { key: 'issue' as const, placeholder: 'What went wrong? / Describe the issue' },
    { key: 'contact' as const, placeholder: 'What would you like to see in the app?' },
  ]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 pb-3 w-full">
      <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}>We&apos;d love to hear from you!</p>
      {fieldConfig.map(({ key, placeholder }) => (
        <div key={key} className="neo-input relative rounded-2xl w-full min-h-[46px]">
          <input
            value={fields[key]}
            onChange={(e) => {
              setFields((f) => ({ ...f, [key]: e.target.value }))
              setSuccessMessage(null)
              setErrorMessage(null)
            }}
            placeholder={placeholder}
            disabled={submitting}
            className="w-full h-[46px] px-5 outline-none bg-transparent rounded-2xl focus:ring-2 focus:ring-[#00FF66] focus:ring-inset disabled:opacity-60"
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
          {submitting ? 'SENDING…' : 'SEND'}
        </p>
      </button>
    </form>
  )
}

// ─── Screen 9: Settings ───────────────────────────────────────────────────────

function SettingsScreen({ plants, settings, onSave, onExport, onReset, onClose, onShowPro }: {
  plants: Plant[]; settings: AppSettings; onSave: (s: AppSettings) => void; onExport: () => void; onReset: () => void; onClose: () => void; onShowPro: () => void
}) {
  const [s, setS] = useState(settings)
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
        <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 20, color: '#000' }}>SETTINGS</p>
        <button type="button" onClick={onClose}
          className="relative bg-black flex items-center justify-center rounded-full shrink-0 cursor-pointer border-2 border-black"
          style={{ width: 38, height: 38 }}
        >
          <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
            <path clipRule="evenodd" d={svgSettings.p3b43000} fill="white" fillRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-6 pb-6">
        {/* ── Notification Reminder & Routines ── */}
        <div className="flex flex-col gap-3 px-5">
          <div className="section-header" style={{ fontSize: 14, lineHeight: 0 }}>
            <p style={{ lineHeight: 'normal', marginBottom: 0 }}>Notification</p>
            <p style={{ lineHeight: 'normal' }}>Reminder &amp; Routines</p>
          </div>

          {/* Weekly water schedule */}
          <div className="flex flex-col gap-2 py-3">
            <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>WEEKLY WATER SCHEDULE</p>
            <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}>Choose which days you&apos;d like to water</p>
            <div className="flex items-start justify-between w-full">
              {DAYS.map((d, i) => {
                const on = s.globalWaterSchedule.includes(d)
                return (
                  <button key={d} onClick={() => toggleDay(i)}
                    className="neo-pill relative flex flex-col gap-1 items-center py-[10px] shrink-0 w-[44px] cursor-pointer active:scale-95 transition-all"
                    style={{ background: on ? GREEN : 'white' }}
                  >
                    <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}>{d}</p>
                    {on ? (
                      <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
                        <path d={svgSettings.p2c13d500} stroke="#000000" strokeLinecap="round" strokeWidth="2" />
                      </svg>
                    ) : (
                      <div className="size-[18px] rounded-full" />
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
          <p className="section-header" style={{ fontSize: 14 }}>Data &amp; Privacy</p>
          <div className="neo-card relative rounded-2xl w-full" style={{ height: 109 }}>
            {/* Export row */}
            <p className="absolute font-['Unbounded:Black',sans-serif]"
              style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000', left: 14, top: 27 }}>
              EXPORT JUNGLE DATA (JSON)
            </p>
            <button type="button" onClick={onExport}
              className="absolute bg-white border-2 border-black flex gap-3 items-center px-[11px] py-[3px] rounded-full cursor-pointer"
              style={{ height: 35, right: 14, top: 15 }}
            >
              <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}>EXPORT</p>
              <div className="flex-none rotate-180" style={{ width: 13.28, height: 14 }}>
                <svg fill="none" height="14" viewBox="0 0 13.2793 14" width="13.2793">
                  <path d={svgSettings.p218111f0} fill="black" />
                </svg>
              </div>
            </button>
            {/* Reset row */}
            <p className="absolute"
              style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: RED, left: 14, top: 71 }}>
              RESET APP DATA
            </p>
            <button onClick={onReset}
              className="absolute bg-white flex items-center px-[11px] py-[3px] rounded-full cursor-pointer active:scale-95 border-2"
              style={{ height: 35, right: 14, top: 59, borderColor: RED }}
            >
              <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: RED }}>RESET</p>
            </button>
          </div>
        </div>

        {/* ── Send Feedback ── */}
        <div className="flex flex-col gap-3 px-5">
          <p className="section-header" style={{ fontSize: 14 }}>Send Feedback</p>
          <FeedbackForm />
        </div>

        {/* ── MY JUNGLE PRO STATUS ── */}
        <div className="flex flex-col gap-3 px-5">
          <p className="section-header" style={{ fontSize: 14 }}>MY JUNGLE PRO STATUS</p>
          <div className="flex flex-col gap-2 py-3 w-full">
            {/* Free tier card */}
            <FreeTierCard
              title={s.isPro ? 'PRO MEMBER' : 'FREE TIER'}
              plantsUsed={plantsUsed}
              plantsMax={plantsMax}
              footer={
                s.isPro
                  ? 'Unlimited plants · All features unlocked.'
                  : `${plantsMax - plantsUsed} plants slot remaining on free tier.`
              }
            />
            {/* Unlock button */}
            {!s.isPro && (
              <button type="button" onClick={onShowPro}
                className="btn-primary btn-green relative flex items-center justify-center rounded-full w-full cursor-pointer border-2 border-black"
                style={{ background: GREEN, height: 58 }}
              >
                <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>UNLOCK PRO FOREVER — $5.99</p>
              </button>
            )}
          </div>
        </div>
      </div>
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
  const todayIdx = useTodayDayIndex()
  const todayIdxSafe = todayIdx ?? -1

  useEffect(() => { savePlants(plants) }, [plants])
  useEffect(() => { saveSettings(settings) }, [settings])

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', screen === 'splash' ? GREEN : BG)
    document.documentElement.style.backgroundColor = screen === 'splash' ? GREEN : BG
    document.body.style.backgroundColor = screen === 'splash' ? GREEN : BG
  }, [screen])

  function handleSaveSettings(s: AppSettings) { setSettings(s) }

  function handleAddPlant(p: Plant) { setPlants((prev) => [...prev, p]); setTab('home') }

  function handleDeletePlant(id: string) {
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
          const history = wateredAt && plant.history[0]?.date === wateredAt && plant.history[0]?.note === 'Watered.'
            ? plant.history.slice(1)
            : plant.history
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
          history: [{ id: Date.now().toString(), date: now, note: 'Watered.', photo: plant.photo }, ...plant.history],
        }
      })
    )
    setSelectedPlant((p) => {
      if (!p || p.id !== plantId) return p
      if (p.isWateredToday) {
        const wateredAt = p.lastWateredAt
        const history = wateredAt && p.history[0]?.date === wateredAt && p.history[0]?.note === 'Watered.'
          ? p.history.slice(1)
          : p.history
        return { ...p, isWateredToday: false, lastWateredAt: p.previousWateredAt, previousWateredAt: null, history }
      }
      const now = new Date().toISOString()
      return {
        ...p,
        isWateredToday: true,
        previousWateredAt: p.lastWateredAt,
        lastWateredAt: now,
        history: [{ id: Date.now().toString(), date: now, note: 'Watered.', photo: p.photo }, ...p.history],
      }
    })
  }

  function handleMarkAll() {
    if (todayIdxSafe < 0) return
    setPlants((prev) => prev.map((p) => {
      if (!p.wateringDays.includes(todayIdxSafe) || p.isWateredToday) return p
      const now = new Date().toISOString()
      return {
        ...p,
        isWateredToday: true,
        previousWateredAt: p.lastWateredAt,
        lastWateredAt: now,
        history: [{ id: Date.now().toString(), date: now, note: 'Watered.', photo: p.photo }, ...p.history],
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
    if (window.confirm('Reset all app data?')) {
      localStorage.clear(); setPlants([])
      setSettings({ ...DEFAULT_SETTINGS })
      setScreen('onboarding')
    }
  }

  // Build content
  let content: React.ReactNode

  if (screen === 'splash') {
    content = <SplashScreen onNext={() => setScreen(settings.hasCompletedOnboarding ? 'main' : 'onboarding')} />
  } else if (screen === 'onboarding') {
    content = <OnboardingScreen settings={settings} onSave={(s) => { handleSaveSettings(s); setScreen('main') }} />
  } else if (screen === 'pro') {
    content = (
      <div className="relative flex flex-col h-full min-h-0">
        <div className="flex-1 min-h-0 overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
          <ProScreen
            onUnlock={() => { setSettings((s) => ({ ...s, isPro: true })); setScreen('main') }}
            onClose={() => setScreen('main')}
          />
        </div>
        <TabBar active="settings" onChange={(t) => { setTab(t); setScreen('main') }} />
      </div>
    )
  } else if (screen === 'settings') {
    content = (
      <SettingsScreen
        plants={plants} settings={settings} onSave={handleSaveSettings}
        onExport={handleExport} onReset={handleReset}
        onClose={() => setScreen('main')}
        onShowPro={() => setScreen('pro')}
      />
    )
  } else if (screen === 'detail' && selectedPlant) {
    const live = plants.find((p) => p.id === selectedPlant.id) || selectedPlant
    content = (
      <PlantDetailScreen
        plant={live} isPro={settings.isPro} todayIdx={todayIdxSafe}
        globalWaterSchedule={settings.globalWaterSchedule as DayCode[]}
        onBack={() => { setScreen('main'); setSelectedPlant(null) }}
        onDelete={() => handleDeletePlant(live.id)}
        onUpdate={handleUpdatePlant}
        onMarkWatered={() => handleWaterToggle(live.id)}
        onShowPro={() => setScreen('pro')}
        onEditGlobalSchedule={() => setScreen('settings')}
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
          onSettings={() => setScreen('settings')}
          onShowPro={() => { setTab('settings'); setScreen('main') }}
        />
      )
    } else if (tab === 'add') {
      tabContent = <AddScreen plants={plants} settings={settings} onSave={handleAddPlant} onCancel={() => setTab('home')} onUpgrade={() => setScreen('pro')} onEditGlobalSchedule={() => { setTab('settings'); setScreen('settings') }} />
    } else if (tab === 'watering') {
      tabContent = <WateringScreen plants={plants} globalWaterSchedule={settings.globalWaterSchedule} todayIdx={todayIdx} onMarkWatered={handleWaterToggle} onMarkAll={handleMarkAll} />
    } else {
      tabContent = (
        <ProScreen
          onUnlock={() => { setSettings((s) => ({ ...s, isPro: true })); setTab('home') }}
          onClose={() => setTab('home')}
        />
      )
    }
    content = (
      <div className="relative flex flex-col h-full min-h-0">
        <div className="flex-1 min-h-0 overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom))]">{tabContent}</div>
        <TabBar active={tab} onChange={(t) => { setTab(t); setScreen('main') }} />
      </div>
    )
  }

  const isSplash = screen === 'splash'
  const isOnboarding = screen === 'onboarding'
  const skipTopSafeArea = isSplash || isOnboarding

  return (
    <div className="relative min-h-dvh max-h-dvh h-dvh w-full overflow-hidden flex flex-col" style={{ background: isSplash ? GREEN : BG }}>
      <div className={`flex flex-col flex-1 min-h-0 ${skipTopSafeArea ? '' : 'pt-[env(safe-area-inset-top)]'}`}>
        {content}
      </div>
    </div>
  )
}
