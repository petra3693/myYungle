import { useEffect, useMemo, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor'
import PlantPhoto from '@/components/PlantPhoto'
import { analyzePlantImage, mapLightNeedToForm, mapWaterNeedToForm } from '@/lib/analyzePlant'
import {
  cycleAnchorForFrequency,
  getDateForDayIndex,
  getTodayDayIndex,
  isPlantDueOnDay,
  isPlantDueToday,
} from '@/lib/wateringDue'
import { loadPlantsFromStorage, readAndCompressPhotoFile, savePlantsToStorage, type StorageResult } from '@/lib/plantStorage'
import { clearAllPhotos, deletePlantPhotos } from '@/lib/photoStore'
import { MAX_FREE_PLANTS, canAccessProFeatures, canAddMorePlants } from '@/lib/proAccess'
import { useUserState } from '@/hooks/useUserState'
import type { AppSettings, DayCode, HistoryEntry, LightNeed, Plant, UserState, WaterNeed, WateringFrequency } from '@/types/plant'

// ─── Constants ────────────────────────────────────────────────────────────────

const GREEN = '#00FF66'
const DAYS: DayCode[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
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
  darkMode: true,
  isPro: false,
}

type Screen =
  | 'splash'
  | 'onboardingWelcome'
  | 'onboardingCapture'
  | 'onboardingResult'
  | 'main'
  | 'plantDetail'
  | 'customSchedule'
  | 'manualAdd'
  | 'proUnlock'
  | 'bulkAdd'
  | 'bulkResult'

type Tab = 'home' | 'days' | 'profile'

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
const IconLeaf = (p: { size?: number }) => <Icon {...p}><path d="M11 20A7 7 0 0 1 4 13c0-6 5-11 11-11 1 6-3 11-9 13" /><path d="M4 13c0 5 4 7 7 7" /></Icon>
const IconPlus = (p: { size?: number }) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>
const IconCalendar = (p: { size?: number }) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></Icon>
const IconUser = (p: { size?: number }) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></Icon>
const IconChevronLeft = (p: { size?: number }) => <Icon {...p}><path d="M15 5l-7 7 7 7" /></Icon>
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

function todayISO() { return new Date().toISOString() }

function getStreakDays(plants: Plant[]): number {
  const dates = plants.flatMap((p) => plantHistory(p).map((h) => h.date.slice(0, 10)))
  if (dates.length === 0) return 0
  const unique = Array.from(new Set(dates)).sort().reverse()
  let streak = 0
  const cursor = new Date()
  for (let i = 0; i < unique.length; i += 1) {
    const expected = new Date(cursor)
    expected.setDate(cursor.getDate() - i)
    if (unique[i] === expected.toISOString().slice(0, 10)) streak += 1
    else break
  }
  return streak
}

function daysSinceLabel(iso: string | null): string {
  if (!iso) return 'Never'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

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

function OnboardingWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="app-shell fixed inset-0 flex flex-col px-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
      <div style={{ color: GREEN }} className="mb-4">
        <svg width="56" height="66" viewBox="0 0 85 116" fill="currentColor">
          <path d="M42.5 2.9C45.9 16.9 53.7 29.9 63.9 38.2l1.1 0.9C77.4 48.9 83 59.4 83 71.9c0 11-4.4 21.6-12.1 29.4C63.2 109 52.6 113.4 42.5 113.4S21.8 109 14 101.3C6.3 93.5 1.9 82.9 1.9 71.9c0-11.6 5.7-22.7 17.2-32.2l1.1-0.9C29.5 29.9 39.1 16.9 42.5 2.9z" />
        </svg>
      </div>
      <h1 className="font-heading" style={{ fontSize: 34, lineHeight: 1.08, color: '#fff' }}>
        Watering,<br />made simple.
      </h1>
      <div className="flex flex-col gap-4 mt-8 flex-1">
        {ONBOARDING_STEPS.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="icon-circle" style={{ color: step.pro ? GREEN : '#fff' }}>
              <step.icon size={20} />
            </div>
            <span className="font-body" style={{ fontSize: 16, color: '#fff', fontWeight: 500 }}>
              {step.text}
            </span>
            {step.pro && (
              <span className="btn-outline-pro" style={{ fontSize: 10, padding: '3px 10px' }}>PRO</span>
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={onNext} className="btn-fill w-full" style={{ height: 56, fontSize: 16 }}>
        Get started →
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

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void handleFiles(e.target.files); e.target.value = '' }} />
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4 shrink-0">
        {onBack ? <IconCircleBtn onClick={onBack} label="Back"><IconChevronLeft /></IconCircleBtn> : <div style={{ width: 44 }} />}
        <span className="font-body" style={{ fontSize: 14, color: '#8E8E93' }}>
          {freeSlots !== null ? `${Math.max(0, limit - photos.length)} free slot${limit - photos.length === 1 ? '' : 's'} left` : `${photos.length} photos — no upper limit`}
        </span>
      </div>
      <div className="px-5 shrink-0">
        <h1 className="font-heading" style={{ fontSize: 24, color: '#fff' }}>{title}</h1>
        <p className="font-body" style={{ fontSize: 14, color: '#8E8E93', marginTop: 4 }}>{subtitle}</p>
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
                style={{ width: 30, height: 30, background: 'rgba(0,0,0,0.55)' }}
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
              className="dash-picker"
              style={{ aspectRatio: '1/1' }}
              disabled={busy}
            >
              <IconCamera size={26} />
              <span className="font-body" style={{ fontSize: 13, color: '#fff' }}>{busy ? 'Adding…' : 'Add photo'}</span>
            </button>
          )}
          {Array.from({ length: Math.max(0, slotsCells - photos.length - (atLimit ? 0 : 1)) }).map((_, i) => (
            <div key={`empty-${i}`} className="surface-dark" style={{ aspectRatio: '1/1', opacity: 0.4 }} />
          ))}
        </div>
      </div>
      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shrink-0">
        <button
          type="button"
          disabled={photos.length === 0}
          onClick={() => onDone(photos)}
          className="btn-fill w-full"
          style={{ height: 56, fontSize: 15 }}
        >
          {doneLabel}
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
  isToxicToPets: boolean | null
  toxicityNotes: string
  confidence: number
}

const PLANT_CATEGORIES = ['Houseplant', 'Succulent', 'Herb', 'Flowering', 'Tree', 'Other']

const FALLBACK_DRAFT_BASE = {
  name: 'Unknown plant', category: 'Houseplant', waterNeed: 'Moderate' as WaterNeed, lightNeed: 'Medium' as LightNeed,
  humidityNeed: 'normal' as const, temperatureRangeC: '18-27°C', careNote: '', wateringDays: [0, 3],
  isToxicToPets: null, toxicityNotes: '', confidence: 40,
}

async function identifyPhoto(dataUrl: string): Promise<DraftPlant> {
  try {
    const result = await analyzePlantImage(dataUrl, [])
    if (!result.ok) {
      return { photo: dataUrl, ...FALLBACK_DRAFT_BASE }
    }
    const days = result.data.recommendedDays
      .map((d) => DAYS.findIndex((code) => code.toLowerCase() === d.slice(0, 3).toLowerCase()))
      .filter((i) => i >= 0)
    return {
      photo: dataUrl,
      name: result.data.name,
      category: 'Houseplant',
      waterNeed: mapWaterNeedToForm(result.data.waterNeed),
      lightNeed: mapLightNeedToForm(result.data.lightNeed),
      humidityNeed: result.data.humidityNeed,
      temperatureRangeC: result.data.temperatureRangeC,
      careNote: result.data.careNotes.slice(0, 300),
      wateringDays: days.length > 0 ? days : [0, 3],
      isToxicToPets: result.data.isToxicToPets,
      toxicityNotes: result.data.toxicityNotes ?? '',
      confidence: confidenceLabel(result.data.confidence),
    }
  } catch (error) {
    console.error('[myJungle] identify failed:', error)
    return { photo: dataUrl, ...FALLBACK_DRAFT_BASE }
  }
}

function AnalysisResultScreen({ drafts, onDone }: { drafts: DraftPlant[]; onDone: () => void }) {
  const daySet = new Set<number>()
  drafts.forEach((d) => d.wateringDays.forEach((i) => daySet.add(i)))
  const dayLabel = Array.from(daySet).sort((a, b) => a - b).map((i) => DAYS[i][0]).join(' & ')

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <div className="px-5 pt-[calc(2rem+env(safe-area-inset-top,0px))] pb-4 shrink-0">
        <h1 className="font-heading flex items-center gap-2" style={{ fontSize: 26, color: '#fff' }}>
          {drafts.length} plant{drafts.length === 1 ? '' : 's'} added <IconCheck size={22} />
        </h1>
        <p className="font-body" style={{ fontSize: 14, color: '#8E8E93', marginTop: 6 }}>
          AI filled in the profiles and computed your watering days.
        </p>
      </div>
      <div className="scroll-y flex-1 px-5 flex flex-col gap-3 pb-4">
        {drafts.map((d, i) => (
          <div key={i} className="card-white flex items-center gap-3 p-3">
            <img src={d.photo} alt="" className="rounded-2xl object-cover shrink-0" style={{ width: 56, height: 56 }} />
            <span className="font-heading flex-1 min-w-0 truncate" style={{ fontSize: 18 }}>{d.name}</span>
            <span className="font-heading" style={{ fontSize: 18, color: '#8E8E93' }}>{d.confidence}%</span>
          </div>
        ))}
      </div>
      {dayLabel && (
        <div className="px-5 pb-3 shrink-0">
          <p className="font-body text-center" style={{ fontSize: 13, color: '#8E8E93' }}>Watering day: {dayLabel}</p>
        </div>
      )}
      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shrink-0">
        <button type="button" onClick={onDone} className="btn-fill w-full" style={{ height: 56, fontSize: 15 }}>
          Go to home →
        </button>
      </div>
    </div>
  )
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange, onAdd }: { active: Tab; onChange: (t: Tab) => void; onAdd: () => void }) {
  const items: { id: Tab; label: string; icon: (p: { size?: number }) => React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: IconLeaf },
    { id: 'days', label: 'Days', icon: IconCalendar },
  ]
  const items2: { id: Tab; label: string; icon: (p: { size?: number }) => React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: IconUser },
  ]
  return (
    <div className="fixed left-4 right-4 z-40" style={{ bottom: 'calc(14px + env(safe-area-inset-bottom,0px))' }}>
      <div className="tab-bar">
        {items.map((t) => (
          <button key={t.id} type="button" onClick={() => onChange(t.id)} className={`tab-bar__item ${active === t.id ? 'is-active' : ''}`}>
            <t.icon size={20} />
            <span className="tab-bar__label">{t.label}</span>
          </button>
        ))}
        <button type="button" onClick={onAdd} className="tab-bar__item" aria-label="Add plant">
          <div className="flex items-center justify-center rounded-full" style={{ width: 40, height: 40, background: GREEN, color: '#05170c', marginTop: -14, boxShadow: '0 4px 10px rgba(0,0,0,0.35)' }}>
            <IconPlus size={20} />
          </div>
        </button>
        {items2.map((t) => (
          <button key={t.id} type="button" onClick={() => onChange(t.id)} className={`tab-bar__item ${active === t.id ? 'is-active' : ''}`}>
            <t.icon size={20} />
            <span className="tab-bar__label">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Screen: Home ─────────────────────────────────────────────────────────────

function HomeScreen({ plants, todayIdx, onOpenPlant }: { plants: Plant[]; todayIdx: number; onOpenPlant: (p: Plant) => void }) {
  const thirsty = plants.filter((p) => isPlantDueToday(p, todayIdx) && !p.isWateredToday).length
  const streak = getStreakDays(plants)
  return (
    <div className="scroll-y h-full px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-28">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-heading" style={{ fontSize: 30, color: '#fff' }}>my Jungle</h1>
        <div className="icon-circle text-white"><IconBell /></div>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="stat-tile"><span className="stat-tile__value">{plants.length}</span><span className="stat-tile__label">plants</span></div>
        <div className="stat-tile"><span className="stat-tile__value">{thirsty}</span><span className="stat-tile__label">thirsty</span></div>
        <div className="stat-tile"><span className="stat-tile__value">{streak}</span><span className="stat-tile__label">day{streak === 1 ? '' : 's'} streak</span></div>
      </div>
      <h2 className="font-heading mb-3" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>Your plants</h2>
      {plants.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div style={{ color: '#3a3a3c' }}><IconLeaf size={40} /></div>
          <p className="font-body" style={{ fontSize: 14, color: '#8E8E93' }}>No plants yet. Tap + to add your jungle.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {plants.map((p) => (
            <button key={p.id} type="button" onClick={() => onOpenPlant(p)} className="plant-tile text-left">
              <PlantPhoto photo={p.photo} alt={p.name} className="w-full h-full object-cover" />
              {isPlantDueToday(p, todayIdx) && !p.isWateredToday && (
                <span className="plant-tile__badge" style={{ background: GREEN, color: '#05170c' }}>Thirsty</span>
              )}
              <div className="plant-tile__label">
                <span className="font-heading" style={{ fontSize: 15, color: '#111' }}>{p.name}</span>
              </div>
            </button>
          ))}
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
  const todayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][selected]
  const duePlants = plants.filter((p) => isPlantDueOnDay(p, selected, getDateForDayIndex(selected)))

  return (
    <div className="scroll-y h-full px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-28">
      <h1 className="font-heading" style={{ fontSize: 24, color: '#fff' }}>Watering days</h1>
      <p className="font-body" style={{ fontSize: 14, color: '#8E8E93', marginTop: 4, marginBottom: 20 }}>
        The system grouped your {plants.length} plant{plants.length === 1 ? '' : 's'} into {groupedDays.size} day{groupedDays.size === 1 ? '' : 's'}.
      </p>
      <div className="flex justify-between gap-2 mb-6">
        {DAYS.map((d, i) => (
          <DayPill key={d} label={d[0]} active={i === selected} onClick={() => setSelected(i)} />
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
            <PlantPhoto photo={p.photo} alt="" className="rounded-2xl object-cover shrink-0 w-12 h-12" />
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
  plant, user, todayIdx, onBack, onDelete, onWater, onOpenSchedule, onShowLimitOrPro,
}: {
  plant: Plant; user: UserState; todayIdx: number; onBack: () => void; onDelete: () => void; onWater: () => void
  onOpenSchedule: () => void; onShowLimitOrPro: () => void
}) {
  const [showDelete, setShowDelete] = useState(false)
  const hasAccess = canAccessProFeatures(user)
  const timesPerWeek = plant.wateringFrequency === 'monthly' ? 1 : plant.wateringDays.length * (plant.wateringFrequency === 'biweekly' ? 0.5 : 1)
  const health = computeHealthStatus(plant, todayIdx)
  const timeline = plantHistory(plant).slice(0, 5)

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
        <IconCircleBtn onClick={onBack} label="Back"><IconChevronLeft /></IconCircleBtn>
        <span className="font-heading" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>Plant detail</span>
        <div style={{ width: 44 }} />
      </div>
      <div className="scroll-y flex-1 px-5 pb-6">
        <div className="rounded-[1.5rem] overflow-hidden mb-4" style={{ height: 240 }}>
          <PlantPhoto photo={plant.photo} alt={plant.name} className="w-full h-full object-cover" />
        </div>
        <div className="card-white p-5 flex flex-col gap-4">
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
          <button type="button" onClick={onOpenSchedule} className="font-body text-left" style={{ fontSize: 14, color: '#111', opacity: 0.7 }}>
            {plant.room} · {plant.scheduleDays.join(', ')} — tap to edit schedule
          </button>
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
              <div className="flex items-center gap-2"><IconDroplet size={16} /><span className="font-heading" style={{ fontSize: 14 }}>Water: {timesPerWeek}x/week</span></div>
              <span className="font-body" style={{ fontSize: 11, color: '#8E8E93' }}>Soil hydration</span>
            </div>
            <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: '#f5f5f5' }}>
              <div className="flex items-center gap-2"><IconSun size={16} /><span className="font-heading" style={{ fontSize: 14 }}>Light: {plant.lightNeed}</span></div>
              <span className="font-body" style={{ fontSize: 11, color: '#8E8E93' }}>{plant.lightNeed === 'High' ? 'Direct sun' : plant.lightNeed === 'Low' ? 'Shade tolerant' : 'Bright filtered'}</span>
            </div>
            <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: '#f5f5f5' }}>
              <div className="flex items-center gap-2"><IconThermometer size={16} /><span className="font-heading" style={{ fontSize: 14 }}>Temp: {plant.temperatureRangeC ?? '18-27°C'}</span></div>
              <span className="font-body" style={{ fontSize: 11, color: '#8E8E93' }}>Keep stable</span>
            </div>
            <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: '#f5f5f5' }}>
              <div className="flex items-center gap-2"><IconDroplets size={16} /><span className="font-heading" style={{ fontSize: 14 }}>Humidity: {(plant.humidityNeed ?? 'normal').replace(/^./, (c) => c.toUpperCase())}</span></div>
              <span className="font-body" style={{ fontSize: 11, color: '#8E8E93' }}>{plant.humidityNeed === 'high' ? 'Mist regularly' : plant.humidityNeed === 'low' ? 'Avoid misting' : 'Normal room air'}</span>
            </div>
          </div>

          <div>
            <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Watering timeline</span>
            <div className="flex items-center gap-2 mt-2">
              {timeline.length > 0 ? (
                <span className="font-heading" style={{ fontSize: 11, background: '#111', color: GREEN, borderRadius: 8, padding: '4px 8px' }}>
                  {new Date(timeline[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
                </span>
              ) : (
                <span className="font-body" style={{ fontSize: 13, color: '#8E8E93' }}>No waterings logged yet</span>
              )}
              <div style={{ flex: 1, height: 1, background: '#eee' }} />
              <span className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>Last watered: {daysSinceLabel(plant.lastWateredAt)}</span>
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
          <button type="button" onClick={onWater} className="btn-fill w-full" style={{ height: 52, fontSize: 15, textTransform: 'uppercase' }}>
            {plant.isWateredToday ? 'Watered ✓' : 'Water now'}
          </button>
          <button type="button" onClick={() => setShowDelete(true)} className="font-body text-center" style={{ fontSize: 13, color: '#FF3B30' }}>
            Delete plant
          </button>
        </div>
      </div>
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

// ─── Screen: Custom schedule ───────────────────────────────────────────────────

function CustomScheduleScreen({ plant, onBack, onSave }: { plant: Plant; onBack: () => void; onSave: (days: number[]) => void }) {
  const [days, setDays] = useState<number[]>(plant.wateringDays)
  function toggle(i: number) {
    setDays((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort((a, b) => a - b)))
  }
  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
        <IconCircleBtn onClick={onBack} label="Back"><IconChevronLeft /></IconCircleBtn>
        <span className="font-heading" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>Custom schedule</span>
        <div style={{ width: 44 }} />
      </div>
      <div className="px-5 pt-4">
        <h2 className="font-heading" style={{ fontSize: 22, color: '#fff' }}>Set custom watering days</h2>
        <p className="font-body" style={{ fontSize: 14, color: '#8E8E93', marginTop: 8, lineHeight: 1.5 }}>
          Select the days of the week you want to manually water this plant. The AI auto-care cycle will respect this window.
        </p>
        <div className="flex justify-between gap-2 mt-6">
          {DAYS.map((d, i) => (
            <DayPill key={d} label={d[0]} active={days.includes(i)} onClick={() => toggle(i)} />
          ))}
        </div>
      </div>
      <div className="flex-1" />
      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-3">
        <button type="button" onClick={() => onSave(days)} disabled={days.length === 0} className="btn-fill w-full" style={{ height: 52, fontSize: 15 }}>Save</button>
        <button type="button" onClick={onBack} className="font-body text-center" style={{ fontSize: 13, color: '#8E8E93' }}>Revert to automatic</button>
      </div>
    </div>
  )
}

// ─── Screen: Manual add (single, AI-assisted) ──────────────────────────────────

function ManualAddScreen({ onBack, onAdd, remainingFreeSlots, isPro }: {
  onBack: () => void; onAdd: (draft: DraftPlant) => void; remainingFreeSlots: number; isPro: boolean
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
      const result = await identifyPhoto(compressed)
      setDraft(result)
    } catch (error) {
      console.error('[myJungle] manual add analyze failed:', error)
    } finally {
      setAnalyzing(false)
    }
  }

  const timesPerWeekLabel = draft ? `${draft.wateringDays.length}x weekly` : ''

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
      <div className="scroll-y flex-1 px-5">
        {!photo ? (
          <div className="dash-picker w-full flex flex-col items-center justify-center gap-4" style={{ height: 340 }}>
            <IconCamera size={30} />
            <div className="flex gap-3 w-full px-6">
              <button type="button" onClick={() => cameraInputRef.current?.click()} className="btn-fill flex-1" style={{ height: 48, fontSize: 13 }}>Take photo</button>
              <button type="button" onClick={() => galleryInputRef.current?.click()} className="font-heading flex-1" style={{ height: 48, fontSize: 13, borderRadius: 9999, background: 'transparent', border: '1.5px solid #fff', color: '#fff' }}>From gallery</button>
            </div>
          </div>
        ) : (
          <img src={photo} alt="" className="w-full rounded-[1.5rem] object-cover mb-4" style={{ height: 260 }} />
        )}
        {analyzing && (
          <p className="font-body text-center mt-4" style={{ fontSize: 14, color: '#8E8E93' }}>Identifying your plant…</p>
        )}
        {draft && (
          <div className="flex flex-col gap-3 mt-4">
            <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase' }}>AI identified:</span>
            <span className="font-heading" style={{ fontSize: 28, color: '#fff' }}>{draft.name}</span>

            <label className="flex flex-col gap-1.5">
              <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase' }}>Category</span>
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className="surface-dark font-body px-4"
                style={{ height: 48, fontSize: 15, color: '#fff', border: 'none' }}
              >
                {PLANT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <div className="surface-dark p-4 flex items-center justify-between">
              <span className="font-body" style={{ fontSize: 14, color: '#8E8E93' }}>Light requirement</span>
              <span className="font-heading" style={{ fontSize: 14, color: '#fff' }}>{draft.lightNeed.toLowerCase()}</span>
            </div>
            <div className="surface-dark p-4 flex items-center justify-between">
              <span className="font-body" style={{ fontSize: 14, color: '#8E8E93' }}>Humidity</span>
              <span className="font-heading" style={{ fontSize: 14, color: '#fff' }}>{draft.humidityNeed}</span>
            </div>

            <div className="rounded-2xl px-4 py-3 flex items-center gap-2" style={{ border: `1.5px solid ${GREEN}`, background: 'var(--color-green-dim)' }}>
              <IconCalendarSmall size={16} />
              <span className="font-body" style={{ fontSize: 13, color: '#fff' }}>
                Watering days: the system suggests {timesPerWeekLabel}
              </span>
            </div>

            <div className="surface-dark p-4 flex items-center justify-between">
              <div>
                <div className="font-heading" style={{ fontSize: 14, color: '#fff' }}>Set reminders</div>
                <div className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>Receive watering notifications</div>
              </div>
              <Toggle on={remindersOn} onChange={setRemindersOn} />
            </div>
          </div>
        )}
      </div>
      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-3 flex gap-3 shrink-0">
        <button type="button" onClick={onBack} className="btn-ghost-dark flex-1" style={{ height: 52 }}>Edit</button>
        <button type="button" disabled={!draft} onClick={() => draft && onAdd(draft)} className="btn-fill flex-1" style={{ height: 52, textTransform: 'uppercase' }}>Add to jungle</button>
      </div>
    </div>
  )
}

// ─── Screen: Profile ────────────────────────────────────────────────────────

function ProfileScreen({ plants, settings, user, onSave, onExport, onReset, onShowPro }: {
  plants: Plant[]; settings: AppSettings; user: UserState; onSave: (s: AppSettings) => void
  onExport: () => void; onReset: () => void; onShowPro: () => void
}) {
  const waterings = plants.reduce((sum, p) => sum + plantHistory(p).length, 0)
  const [showNotifSettings, setShowNotifSettings] = useState(false)

  return (
    <div className="scroll-y h-full px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-28">
      <h1 className="font-heading text-center" style={{ fontSize: 22, color: '#fff', textTransform: 'uppercase' }}>Settings</h1>
      {!user.isPro && (
        <button type="button" onClick={onShowPro} className="btn-outline-pro w-full flex items-center justify-center gap-2 mt-5" style={{ height: 52 }}>
          <IconSparkles size={16} />
          <span>Unlock Pro</span>
        </button>
      )}
      <div className="grid grid-cols-3 gap-3 mt-5 mb-6">
        <div className="stat-tile"><span className="stat-tile__value">{plants.length}</span><span className="stat-tile__label">plants</span></div>
        <div className="stat-tile"><span className="stat-tile__value">{waterings}</span><span className="stat-tile__label">waterings</span></div>
        <div className="stat-tile"><span className="stat-tile__value">{plants.length > 0 ? 100 : 0}%</span><span className="stat-tile__label">health</span></div>
      </div>
      <div className="card-white overflow-hidden">
        <button type="button" onClick={() => setShowNotifSettings((v) => !v)} className="flex items-center justify-between w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <span className="font-heading" style={{ fontSize: 16 }}>Notifications</span>
          <span style={{ transform: showNotifSettings ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}><IconChevronLeft size={16} /></span>
        </button>
        {showNotifSettings && (
          <div className="px-5 py-4 flex flex-col gap-4" style={{ borderBottom: '1px solid #eee' }}>
            <div className="flex items-center justify-between">
              <span className="font-body" style={{ fontSize: 14 }}>Reminder time</span>
              <input
                type="time"
                value={settings.reminderTime}
                onChange={(e) => onSave({ ...settings, reminderTime: e.target.value })}
                className="font-body"
                style={{ fontSize: 14, border: '1px solid #ddd', borderRadius: 8, padding: '4px 8px' }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-body" style={{ fontSize: 14 }}>Sound alerts</span>
              <Toggle on={settings.soundAlerts} onChange={(v) => onSave({ ...settings, soundAlerts: v })} />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <span className="font-heading" style={{ fontSize: 16 }}>Reminders toggle</span>
          <Toggle on={settings.pushNotifications} onChange={(v) => onSave({ ...settings, pushNotifications: v })} />
        </div>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <span className="font-heading" style={{ fontSize: 16 }}>Dark mode toggle</span>
          <Toggle on={settings.darkMode} onChange={(v) => onSave({ ...settings, darkMode: v })} />
        </div>
        <button type="button" onClick={onExport} className="flex items-center gap-3 w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <IconDownload size={18} />
          <span className="font-heading" style={{ fontSize: 16 }}>Export my data</span>
        </button>
        <button type="button" onClick={onReset} className="flex items-center gap-3 w-full px-5 py-4">
          <IconTrash size={18} />
          <span className="font-heading" style={{ fontSize: 16, color: '#FF3B30' }}>Reset all data</span>
        </button>
      </div>
      <p className="font-body text-center mt-6" style={{ fontSize: 12, color: '#5a5a5c' }}>
        Plant parent since {new Date().getFullYear()} · my Jungle v{APP_VERSION}
      </p>
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
            Pro lets you add unlimited plants, one at a time or in bulk.
          </p>
          <button type="button" onClick={() => close(onUnlock)} className="btn-fill w-full" style={{ height: 52 }}>Unlock Pro</button>
          <button type="button" onClick={() => close(onCancel)} className="font-body" style={{ fontSize: 14, color: '#888' }}>Cancel</button>
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
      <div className="scroll-y flex-1 flex flex-col items-center px-6 pt-6 text-center">
        <div className="flex items-center justify-center rounded-full mb-6" style={{ width: 96, height: 96, background: 'var(--color-surface)' }}>
          <div className="flex items-center justify-center rounded-full" style={{ width: 64, height: 64, border: `2px solid ${GREEN}`, color: GREEN }}>
            <IconX size={28} />
          </div>
        </div>
        <h1 className="font-heading" style={{ fontSize: 34, lineHeight: 1.1, color: '#fff' }}>Unlimited<br />growth.</h1>

        <div className="grid grid-cols-2 gap-3 mt-8 w-full">
          <div className="surface-dark p-4 flex flex-col gap-1 items-start text-left">
            <span className="font-body" style={{ fontSize: 11, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Free plan</span>
            <span className="font-heading" style={{ fontSize: 15, color: '#fff' }}>{MAX_FREE_PLANTS} plants limit</span>
          </div>
          <div className="p-4 flex flex-col gap-1 items-start text-left rounded-2xl" style={{ background: 'var(--color-green-dim)', border: `1.5px solid ${GREEN}` }}>
            <span className="font-body" style={{ fontSize: 11, color: GREEN, textTransform: 'uppercase', letterSpacing: 0.5 }}>Pro membership</span>
            <span className="font-heading" style={{ fontSize: 15, color: '#fff' }}>Unlimited plants</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-6 items-start w-full">
          {PRO_BENEFITS.map((b) => (
            <div key={b} className="flex items-center gap-3">
              <div style={{ color: GREEN }}><IconCheck size={18} /></div>
              <span className="font-body" style={{ fontSize: 15, color: '#fff' }}>{b}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-4 flex flex-col items-center gap-3 shrink-0">
        <span className="font-heading" style={{ fontSize: 34, color: '#fff' }}>$6.99</span>
        <span className="font-body" style={{ fontSize: 13, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 }}>One-time purchase</span>
        <button type="button" onClick={() => void handleUnlock()} disabled={purchasing} className="btn-fill w-full mt-2" style={{ height: 56, fontSize: 16 }}>
          {purchasing ? 'Processing…' : 'Unlock forever'}
        </button>
        <button type="button" onClick={() => void handleUnlock()} className="font-body underline" style={{ fontSize: 12, color: '#8E8E93' }}>Restore purchase</button>
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
      wateringFrequency: 'weekly',
      wateringCycleAnchor: null,
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
    content = <OnboardingWelcome onNext={() => setScreen('onboardingCapture')} />
  } else if (screen === 'onboardingCapture') {
    content = (
      <BatchCaptureScreen
        title="Bring in your jungle!"
        subtitle={`Photograph all your plants at once — ${MAX_FREE_PLANTS} free slots.`}
        freeSlots={MAX_FREE_PLANTS}
        doneLabel="Start AI analysis"
        onDone={(photos) => {
          void Promise.all(photos.map((p) => identifyPhoto(p.dataUrl))).then((drafts) => {
            setPendingDrafts(drafts)
            setScreen('onboardingResult')
          })
        }}
      />
    )
  } else if (screen === 'onboardingResult') {
    content = (
      <AnalysisResultScreen
        drafts={pendingDrafts}
        onDone={() => {
          setPlants((prev) => [...prev, ...pendingDrafts.map(draftToPlant)])
          setPendingDrafts([])
          setSettings((s) => ({ ...s, hasCompletedOnboarding: true }))
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
        onOpenSchedule={() => setScreen('customSchedule')}
        onShowLimitOrPro={() => setScreen('proUnlock')}
      />
    )
  } else if (screen === 'customSchedule' && selectedPlant) {
    const live = plants.find((p) => p.id === selectedPlant.id) || selectedPlant
    content = (
      <CustomScheduleScreen
        plant={live}
        onBack={() => setScreen('plantDetail')}
        onSave={(days) => {
          setPlants((prev) => prev.map((p) => (p.id === live.id ? { ...p, wateringDays: days, scheduleDays: days.map((i) => DAYS[i]), isCustomSchedule: true } : p)))
          setSelectedPlant((prev) => (prev ? { ...prev, wateringDays: days } : prev))
          setScreen('plantDetail')
        }}
      />
    )
  } else if (screen === 'manualAdd') {
    content = (
      <ManualAddScreen
        isPro={user.isPro}
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
          void Promise.all(photos.map((p) => identifyPhoto(p.dataUrl))).then((drafts) => {
            setPendingDrafts(drafts)
            setScreen('bulkResult')
          })
        }}
      />
    )
  } else if (screen === 'bulkResult') {
    content = (
      <AnalysisResultScreen
        drafts={pendingDrafts}
        onDone={() => {
          setPlants((prev) => [...prev, ...pendingDrafts.map(draftToPlant)])
          setPendingDrafts([])
          setScreen('main')
          setTab('home')
        }}
      />
    )
  } else {
    let tabContent: React.ReactNode
    if (tab === 'home') {
      tabContent = <HomeScreen plants={plants} todayIdx={todayIdx} onOpenPlant={(p) => { setSelectedPlant(p); setScreen('plantDetail') }} />
    } else if (tab === 'days') {
      tabContent = <DaysScreen plants={plants} todayIdx={todayIdx} onToggleWatered={handleWaterToggle} />
    } else {
      tabContent = (
        <ProfileScreen
          plants={plants}
          settings={settings}
          user={user}
          onSave={setSettings}
          onExport={handleExport}
          onReset={handleReset}
          onShowPro={() => setScreen('proUnlock')}
        />
      )
    }
    content = (
      <div className="app-shell fixed inset-0">
        {tabContent}
        <TabBar active={tab} onChange={setTab} onAdd={openAddFlow} />
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
      {content}
      {showLimitSheet && (
        <LimitReachedSheet
          onCancel={() => setShowLimitSheet(false)}
          onUnlock={() => { setShowLimitSheet(false); setScreen('proUnlock') }}
        />
      )}
    </div>
  )
}
