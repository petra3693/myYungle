import { useState, useEffect, useRef } from 'react'
import svgPaths from '@/imports/NewDesign2-1/svg-cm3nd9oy62'
import svgPaths2 from '@/imports/MyjungleSettimgs-2/svg-u9kpmn74e6'
import svgAdd from '@/imports/MyjungleAddPlant/svg-fer892chf7'
import svgDetail from '@/imports/MyjungleAddPlant-1/svg-op7ttlkxgr'
import svgBatch from '@/imports/MyjungleBatchChecklist/svg-yfmp6xfqu5'
import svgPro from '@/imports/MyjungleProPaywall/svg-frfo2l2sh3'
import svgSettings from '@/imports/MyjungleSettings/svg-doomn8mxv7'
import detailHeroImg from '@/imports/MyjungleAddPlant-1/06984fd808ab72dc75d1af5314ea222465c42869.png'
import detailThumbImg from '@/imports/MyjungleAddPlant-1/24c699409182c3e5d2a17cf3bf10988ef662ca0c.png'
import plantImg0 from '@/imports/MyjungleSettimgs-2/24c699409182c3e5d2a17cf3bf10988ef662ca0c.png'
import plantImg1 from '@/imports/MyjungleSettimgs-2/a629e756f91539ad0cd6c99c620a960b94d6a89d.png'
import plantImg2 from '@/imports/MyjungleSettimgs-2/c1e26fe342a3e4cbf5b479e973ae60ebe8c1d81e.png'
import plantImg3 from '@/imports/MyjungleSettimgs-2/f9057e3acb1771233585613c769e96893a7e8d76.png'
import photoUploadImg from '@/imports/NewDesign2-1/06984fd808ab72dc75d1af5314ea222465c42869.png'

// ─── Types ────────────────────────────────────────────────────────────────────

type WaterNeed = 'Light' | 'Moderate' | 'Heavy'
type Screen = 'splash' | 'onboarding' | 'main' | 'detail' | 'pro' | 'settings'
type TabScreen = 'home' | 'add' | 'watering' | 'settings'

interface HistoryEntry {
  id: string
  date: string
  note: string
  photo: string
}

interface Plant {
  id: string
  name: string
  room: string
  careNote: string
  wateringDays: number[]
  waterNeed: WaterNeed
  photo: string
  lastWatered: string | null
  history: HistoryEntry[]
  watered: boolean
}

interface AppSettings {
  wateringDays: number[]
  pushNotifications: boolean
  reminderTime: string
  isPro: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GREEN = '#00FF66'
const BG = '#F7F7F7'
const BLACK = '#000000'
const RED = '#FF2D55'
const WATERED_BG = '#D9FFE8'
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const FREE_LIMIT = 5
const PLANT_PHOTOS = [plantImg0, plantImg1, plantImg2, plantImg3]

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_PLANTS: Plant[] = [
  {
    id: '1', name: 'Monstera Deliciosa', room: 'Living Room', careNote: 'Loves indirect light. Water when top 2 inches of soil are dry.',
    wateringDays: [2, 4], waterNeed: 'Moderate', photo: plantImg0, lastWatered: '2026-07-28',
    history: [
      { id: 'h1', date: '2026-07-28', note: 'Watered and checked for new leaf growth.', photo: plantImg0 },
      { id: 'h2', date: '2026-07-21', note: 'New aerial root spotted.', photo: plantImg0 },
    ], watered: false,
  },
  {
    id: '2', name: 'Ficus Leaf Fig', room: 'Office', careNote: 'Keep away from drafts. Rotate monthly for even growth.',
    wateringDays: [3], waterNeed: 'Light', photo: plantImg1, lastWatered: '2026-07-29',
    history: [{ id: 'h3', date: '2026-07-29', note: 'Light misting done.', photo: plantImg1 }],
    watered: false,
  },
  {
    id: '3', name: 'Snake Plant', room: 'Bedroom', careNote: 'Extremely drought tolerant.',
    wateringDays: [5, 6], waterNeed: 'Light', photo: plantImg2, lastWatered: '2026-07-25',
    history: [], watered: false,
  },
  {
    id: '4', name: 'Calathea Ornata', room: 'Bathroom', careNote: 'Loves humidity. Mist leaves daily.',
    wateringDays: [2, 5], waterNeed: 'Heavy', photo: plantImg3, lastWatered: '2026-07-30',
    history: [{ id: 'h4', date: '2026-07-30', note: 'Looking lush and vibrant.', photo: plantImg3 }],
    watered: true,
  },
]

// ─── Storage ──────────────────────────────────────────────────────────────────

function loadPlants(): Plant[] {
  try { const r = localStorage.getItem('mj_plants'); return r ? JSON.parse(r) : SEED_PLANTS } catch { return SEED_PLANTS }
}
function savePlants(p: Plant[]) { localStorage.setItem('mj_plants', JSON.stringify(p)) }
function loadSettings(): AppSettings {
  try { const r = localStorage.getItem('mj_settings'); return r ? JSON.parse(r) : { wateringDays: [0, 2, 4], pushNotifications: true, reminderTime: '09:00', isPro: false } }
  catch { return { wateringDays: [0, 2, 4], pushNotifications: true, reminderTime: '09:00', isPro: false } }
}
function saveSettings(s: AppSettings) { localStorage.setItem('mj_settings', JSON.stringify(s)) }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayDayIndex() { return (new Date().getDay() + 6) % 7 }
function todayISO() { return new Date().toISOString().split('T')[0] }
function formatDate(iso: string) { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }

// ─── Shared SVG components from import ───────────────────────────────────────

function SvgSignal() {
  return (
    <svg className="block" fill="none" height="20" viewBox="0 0 20 20" width="20">
      <path clipRule="evenodd" d={svgPaths.p2bb6eb80} fill="#000000" fillRule="evenodd" />
    </svg>
  )
}
function SvgWifi() {
  return (
    <svg className="block" fill="none" height="20" viewBox="0 0 20 20" width="20">
      <path clipRule="evenodd" d={svgPaths.p646c5c0} fill="#000000" fillRule="evenodd" />
    </svg>
  )
}
function SvgBattery() {
  return (
    <svg className="block" fill="none" height="20" viewBox="0 0 28 20" width="28">
      <path d={svgPaths.p66c9640} fill="#000000" />
    </svg>
  )
}
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

// ─── Status Bar ───────────────────────────────────────────────────────────────

function StatusBar({ light = false }: { light?: boolean }) {
  const c = light ? '#fff' : BLACK
  return (
    <div className="flex items-center justify-between px-6 shrink-0" style={{ height: 44 }}>
      <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: 12, color: c }}>9:41</span>
      <div className="flex items-center gap-1.5">
        <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
          <path clipRule="evenodd" d={svgPaths.p2bb6eb80} fill={c} fillRule="evenodd" />
        </svg>
        <svg fill="none" height="20" viewBox="0 0 20 20" width="20">
          <path clipRule="evenodd" d={svgPaths.p646c5c0} fill={c} fillRule="evenodd" />
        </svg>
        <svg fill="none" height="20" viewBox="0 0 28 20" width="28">
          <path d={svgPaths.p66c9640} fill={c} />
        </svg>
      </div>
    </div>
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
    <nav
      className="neo-tab-bar flex items-stretch"
      style={{ height: 72 }}
      aria-label="Main navigation"
    >
      {tabs.map((t) => {
        const on = t.id === active
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className="flex flex-1 flex-col items-center justify-center gap-1 min-w-0 cursor-pointer transition-colors"
            style={{ background: on ? GREEN : 'transparent', paddingTop: 4, paddingBottom: 4 }}
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
    <div className="flex flex-col items-center justify-center h-full relative overflow-hidden" style={{ background: GREEN }}>
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
  const [s, setS] = useState(settings)
  function toggleDay(i: number) {
    setS((p) => ({ ...p, wateringDays: p.wateringDays.includes(i) ? p.wateringDays.filter((x) => x !== i) : [...p.wateringDays, i] }))
  }
  return (
    <div className="flex flex-col h-full" style={{ background: BG }}>
      <StatusBar />

      {/* Drop art + brand */}
      <div className="flex flex-col items-center gap-[10px] py-[30px] shrink-0 w-full">
        <svg fill="none" height="116" viewBox="0 0 85 116" width="85">
          <path d={svgPaths.p1cd02a80} fill="black" stroke="black" strokeLinecap="round" strokeWidth="2" />
        </svg>
        <div className="flex items-center justify-center px-5 py-4 w-full">
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 24, color: '#000' }}>MYJUNGLE</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Weekly strip */}
        <div className="flex flex-col gap-2 px-5 py-3">
        <span className="section-header" style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>WEEKLY WATER SCHEDULE</span>
          <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}>Choose which days you&apos;d like to water</span>
          {/* Day cards — full-width vertical list, gap-[7px] */}
          <div className="flex flex-col" style={{ gap: 7, marginTop: 4 }}>
            {DAYS.map((d, i) => {
              const on = s.wateringDays.includes(i)
              return (
                <button
                  key={d}
                  onClick={() => toggleDay(i)}
                  className="neo-pill relative flex items-center justify-between w-full cursor-pointer active:scale-[0.98] transition-all"
                  style={{ background: on ? GREEN : 'white', paddingLeft: 20, paddingRight: 20, paddingTop: 6, paddingBottom: 6 }}
                >
                  <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}>{d}</span>
                  {on ? (
                    <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
                      <path d={svgPaths.p2c13d500} stroke="#000000" strokeLinecap="round" strokeWidth="2" />
                    </svg>
                  ) : (
                    <div style={{ width: 18, height: 18 }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Push notification */}
        <div className="flex flex-col px-5" style={{ paddingTop: 52, paddingBottom: 12, gap: 12 }}>
          <div className="flex items-start justify-between w-full" style={{ gap: 25 }}>
            <div className="flex flex-col" style={{ gap: 12 }}>
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000', textTransform: 'uppercase' }}>Push Notification</span>
              <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}>Allow notifications for watering</span>
            </div>
            {/* Toggle — 66×38, rounded-[18px] pill */}
            <div
              onClick={() => setS((p) => ({ ...p, pushNotifications: !p.pushNotifications }))}
              className="relative cursor-pointer shrink-0"
              style={{ width: 66, height: 38 }}
            >
              <div style={{
                width: 64, height: 36, borderRadius: 18,
                background: s.pushNotifications ? GREEN : 'white',
                border: '2px solid black',
                position: 'relative', margin: '1px',
                transition: 'background .2s',
              }}>
                <div style={{
                  position: 'absolute',
                  top: 2,
                  left: s.pushNotifications ? 30 : 2,
                  width: 26, height: 26,
                  borderRadius: 13,
                  background: s.pushNotifications ? BLACK : '#D9D9D9',
                  border: '2px solid black',
                  transition: 'left .2s',
                }} />
              </div>
            </div>
          </div>

          {/* Start button — pill */}
          <div className="flex items-start pt-2 pb-5 w-full">
            <button
              onClick={() => onSave(s)}
              className="flex flex-1 items-center justify-center rounded-full border-2 border-black btn-primary cursor-pointer active:scale-[0.98] transition-all"
              style={{ background: GREEN, height: 56 }}
            >
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000' }}>START</span>
            </button>
          </div>
        </div>
      </div>
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
  // watered: mint-green card bg + white btn + green droplet
  // unwatered: white card bg + green btn + black checkmark
  const cardBg = plant.watered ? WATERED_BG : 'white'

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
          style={{ background: plant.watered ? 'white' : GREEN }}
          aria-label={plant.watered ? 'Plant watered' : 'Mark as watered'}
        >
          {plant.watered ? (
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

function HomeScreen({ plants, settings, onSelectPlant, onDeletePlant, onWaterPlant, onGoAdd, onSettings, todayIdx }: {
  plants: Plant[]; settings: AppSettings; onSelectPlant: (p: Plant) => void;
  onDeletePlant: (id: string) => void; onWaterPlant: (id: string) => void; onGoAdd: () => void; onSettings: () => void; todayIdx: number
}) {
  const needsWater = plants.filter((p) => p.wateringDays.includes(todayIdx) && !p.watered)

  return (
    <div className="flex flex-col h-full" style={{ background: BG }}>
      {/* Header */}
      <div style={{ background: BG }}>
        <StatusBar />
        <div className="flex items-center justify-between px-5 pb-2">
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 24, color: '#000' }}>MYJUNGLE</span>
          <div className="flex items-center gap-2">
            {/* PRO badge */}
            <div className="badge flex items-center gap-1.5 px-2.5 py-1.5" style={{ background: GREEN }}>
              <SvgLeaf />
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>PRO</span>
            </div>
            {/* Settings button */}
            <button onClick={onSettings} className="flex items-center justify-center rounded-full border-2 border-black bg-white cursor-pointer active:scale-90 transition-all" style={{ width: 38, height: 38 }}>
              <SvgSettings />
            </button>
          </div>
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
            <button onClick={onGoAdd}
            className="btn-primary w-full flex items-center justify-center rounded-full border-2 border-black mb-4 cursor-pointer active:scale-95 transition-all"
            style={{ background: GREEN, height: 56 }}
          >
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 13, color: '#000' }}>+ ADD PLANT</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Screen 5: Add New ───────────────────────────────────────────────────────

function AddScreen({ plants, settings, onSave, onCancel }: {
  plants: Plant[]; settings: AppSettings; onSave: (p: Plant) => void; onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [room, setRoom] = useState('')
  const [note, setNote] = useState('')
  const [days, setDays] = useState<number[]>([0, 3])
  const [waterNeed, setWaterNeed] = useState<WaterNeed>('Moderate')
  const canAdd = settings.isPro || plants.length < FREE_LIMIT
  const slotsLeft = FREE_LIMIT - plants.length

  function toggleDay(i: number) {
    setDays((p) => p.includes(i) ? p.filter((x) => x !== i) : [...p, i])
  }

  function save() {
    if (!name.trim()) return
    onSave({
      id: Date.now().toString(), name: name.trim(), room: room || 'Unknown', careNote: note,
      wateringDays: days, waterNeed, photo: PLANT_PHOTOS[Math.floor(Math.random() * PLANT_PHOTOS.length)],
      lastWatered: null, history: [], watered: false,
    })
  }

  const dropletPath = svgAdd.p13e3d5f0
  const checkPath = svgAdd.p2c13d500

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
      <StatusBar />

      {/* Modal header */}
      <div className="flex flex-col items-center pb-[16px] pt-[8px] shrink-0 w-full">
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 18, color: '#000' }}>ADD NEW </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-[16px] items-start px-[20px] pb-[20px]">

          {/* Photo upload */}
          <div className="neo-card relative rounded-3xl w-full">
            <div className="flex items-center gap-[16px] p-[16px]">
              {/* Photo placeholder */}
              <div className="bg-[#F7F7F7] relative rounded-full shrink-0 size-[64px] overflow-hidden border-2 border-black">
                <div className="absolute" style={{ left: 20, top: 20 }}>
                  <svg fill="none" height="24" viewBox="0 0 24 24" width="24">
                    <path d={svgAdd.p22b7c700} fill="black" />
                  </svg>
                </div>
              </div>
              {/* Upload action */}
              <div className="flex flex-col gap-[6px] flex-1 min-w-0">
                <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>Your Plant&apos;s Photo</span>
                <div className="relative inline-flex rounded-full border-2 border-black cursor-pointer active:scale-95 transition-all btn-primary" style={{ background: GREEN }}>
                  <span className="px-[12px] py-[6px]" style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}>+ TAKE PHOTO</span>
                </div>
              </div>
            </div>
          </div>

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

          {/* Watering days */}
          <div className="flex flex-col gap-[8px] w-full">
            <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase', lineHeight: 1.4 }}>
              How often does your plant need<br />to be watered? *
            </div>
            <div className="flex flex-col gap-[7px] w-full">
              {DAYS.map((d, i) => {
                const on = days.includes(i)
                return (
                  <button
                    key={d}
                    onClick={() => toggleDay(i)}
                    className="neo-pill relative w-full cursor-pointer active:scale-[0.99] transition-all"
                    style={{ background: on ? GREEN : 'white' }}
                  >
                    <div className="flex items-center justify-between px-[20px] py-[6px]">
                      <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}>{d}</span>
                      {on ? (
                        <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
                          <path d={checkPath} stroke="#000000" strokeLinecap="round" strokeWidth="2" />
                        </svg>
                      ) : (
                        <div style={{ width: 18, height: 18, borderRadius: '100px', background: 'rgba(0,0,0,0)' }} />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

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
            <div className="overflow-clip relative rounded-2xl w-full border-2 border-black" style={{ height: 109 }}>
              <span className="font-display" style={{ fontSize: 10, color: '#000', position: 'absolute', left: 14, top: 27 }}>FREE TIER</span>
              <span className="badge" style={{ fontSize: 11, color: '#888', position: 'absolute', right: 14, top: 27 }}>{plants.length}/{FREE_LIMIT} PLANTS USED</span>
              {/* Progress track */}
              <div className="absolute rounded-full" style={{ background: BG, border: '2px solid black', height: 10, left: 14, top: 50, width: 326 }} />
              {/* Progress fill */}
              <div className="absolute rounded-full" style={{ background: GREEN, border: '2px solid black', height: 10, left: 14, top: 50, width: Math.round((plants.length / FREE_LIMIT) * 326) }} />
              {/* Slots remaining text */}
              <div style={{ position: 'absolute', left: 14, top: 70 }}>
                <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 11, color: '#888' }}>{slotsLeft} slots remaining. </span>
                <span
                  onClick={() => {}}
                  style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 11, color: '#040404', textDecoration: 'underline', cursor: 'pointer' }}
                >Upgrade to add unlimited plants</span>
              </div>
            </div>
          )}

          {/* Save button */}
          <div className="flex w-full pt-[8px]">
            <button
              onClick={save}
              disabled={!name.trim() || !canAdd}
              className="btn-primary flex flex-1 items-center justify-center rounded-full border-2 border-black cursor-pointer active:scale-95 transition-all disabled:opacity-40"
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

// ─── Screen 6: Plant Details ─────────────────────────────────────────────────

function PlantDetailScreen({ plant, onBack, onDelete, onMarkWatered, todayIdx }: {
  plant: Plant; onBack: () => void; onDelete: () => void; onMarkWatered: () => void; todayIdx: number
}) {
  const needsWater = plant.wateringDays.includes(todayIdx) && !plant.watered
  const waterFills = plant.waterNeed === 'Heavy' ? 3 : plant.waterNeed === 'Moderate' ? 2 : 1

  function formatDetailDate(iso: string) {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
  }

  return (
    <div className="content-stretch flex flex-col items-start justify-between relative size-full" style={{ background: BG }}>
      {/* Sheet content */}
      <div className="content-stretch flex flex-col items-start relative shrink-0 w-full flex-1 min-h-0">
        <StatusBar />

        {/* Modal header */}
        <div className="relative shrink-0 w-full">
          <div className="flex flex-row items-center justify-center size-full">
            <div className="content-stretch flex items-center justify-between pb-[36px] pt-[28px] px-[20px] relative size-full">
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 18, color: '#000', textTransform: 'uppercase' }}>Plant Details</span>
              {/* × close button */}
              <button
                onClick={onBack}
                className="bg-black content-stretch flex items-center justify-center relative rounded-full shrink-0 size-[38px] cursor-pointer active:scale-90 transition-all border-2 border-black"
              >
                <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
                  <path clipRule="evenodd" d={svgDetail.p3b43000} fill="white" fillRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto w-full">
          <div className="content-stretch flex flex-col gap-[16px] items-start px-[20px] pb-[20px] relative w-full">

            {/* Hero photo */}
            <div className="h-[219px] relative rounded-3xl shrink-0 w-full overflow-hidden border-2 border-black">
              <img
                alt={plant.name}
                src={plant.photo}
                className="absolute h-[107.47%] left-0 max-w-none top-[-1.66%] w-full object-cover"
              />
            </div>

            {/* Info card */}
            <div className="neo-card relative rounded-3xl shrink-0 w-full">
              <div className="content-stretch flex flex-col gap-[24px] items-start justify-center p-[16px] relative size-full">

                {/* Name + tags + edit */}
                <div className="content-stretch flex items-start justify-between relative shrink-0 w-full">
                  <div className="content-stretch flex flex-col gap-[6px] items-start relative shrink-0">
                    <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 13, color: '#000', textTransform: 'uppercase' }}>{plant.name}</span>
                    <div className="content-stretch flex gap-[4px] items-start relative shrink-0">
                      {/* Room tag */}
                      <div className="badge bg-[#F7F7F7] content-stretch flex items-start px-[6px] py-[2px] relative shrink-0">
                        <span style={{ fontSize: 9, color: '#000' }}>{plant.room}</span>
                      </div>
                      {/* Day tags */}
                      {plant.wateringDays.map((d) => (
                        <div key={d} className="badge content-stretch flex items-start px-[6px] py-[2px] relative shrink-0" style={{ background: GREEN }}>
                          <span style={{ fontSize: 9, color: '#000' }}>{DAY_NAMES[d]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Pencil edit icon */}
                  <div className="relative shrink-0" style={{ width: 16, height: 15 }}>
                    <svg fill="none" height="15" viewBox="0 0 16 15" width="16">
                      <path d={svgDetail.p3c709780} fill="black" />
                    </svg>
                  </div>
                </div>

                {/* Care Note */}
                <div className="content-stretch flex flex-col gap-[8px] items-start justify-center relative shrink-0 w-full">
                  <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>Care Note</span>
                  <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000', lineHeight: 1.5 }}>
                    {plant.careNote || 'No care notes added yet.'}
                  </span>
                </div>

                {/* Water Level */}
                <div className="content-stretch flex flex-col gap-[4px] items-start justify-center relative shrink-0">
                  <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>Water Level</span>
                  <div className="content-stretch flex gap-[5px] h-[16px] items-end relative shrink-0">
                    {Array.from({ length: waterFills }).map((_, i) => (
                      <div key={i} className="h-[20px] relative shrink-0 w-[12px]">
                        <svg fill="none" height="20" viewBox="0 0 12 20" width="12">
                          <path d={svgDetail.p35497c00} fill="#00FF66" stroke="#00FF66" strokeLinecap="round" strokeWidth="2" />
                        </svg>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Last Watered */}
                <div className="content-stretch flex flex-col gap-[4px] items-start justify-center relative shrink-0">
                  <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>Last Watered</span>
                  <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}>
                    {plant.lastWatered ? formatDetailDate(plant.lastWatered) : 'Never'}
                  </span>
                </div>

                {/* Status */}
                <div className="content-stretch flex flex-col gap-[4px] items-start justify-center relative shrink-0 w-full">
                  <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>Status</span>
                  <div className="content-stretch flex h-[24px] items-center justify-between relative shrink-0 w-full">
                    <span className="font-display" style={{ fontSize: 14, color: needsWater ? RED : '#000', textTransform: 'uppercase' }}>
                      {needsWater ? 'NEED WATER' : 'WATERED ✓'}
                    </span>
                    {needsWater && (
                      <div className="inline-grid place-items-start" style={{ gridTemplateColumns: 'max-content', gridTemplateRows: 'max-content' }}>
                        <span className="font-display" style={{ fontSize: 12, color: '#000', gridColumn: 1, gridRow: 1, marginTop: 11, textTransform: 'uppercase' }}>MARK AS WATERED</span>
                        <button
                          onClick={onMarkWatered}
                          className="flex items-center justify-center relative rounded-full size-[40px] cursor-pointer active:scale-90 transition-all border-2 border-black"
                          style={{ background: GREEN, gridColumn: 1, gridRow: 1, marginLeft: 126 }}
                        >
                          <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
                            <path d={svgDetail.p2afd9fa0} stroke="#000000" strokeLinecap="round" strokeWidth="2" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* History card */}
            <div className="neo-card relative rounded-3xl shrink-0 w-full">
              <div className="content-stretch flex flex-col gap-[24px] items-start justify-center p-[16px] relative size-full">

                {/* Section heading */}
                <div className="content-stretch flex flex-col gap-[8px] items-start justify-center relative shrink-0 w-full">
                  <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>GROWN HISTORY</span>
                  {plant.history.length === 0 && (
                    <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}>No history entries yet.</span>
                  )}
                </div>

                {/* History entries */}
                {plant.history.map((h) => (
                  <div key={h.id} className="content-stretch flex gap-[16px] items-start relative shrink-0 w-full">
                    {/* Thumb */}
                    <div className="relative rounded-full shrink-0 size-[54px] overflow-hidden border-2 border-black">
                      <img alt="" src={h.photo} className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-full size-full" />
                    </div>
                    {/* Meta */}
                    <div className="content-stretch flex flex-1 flex-col gap-[4px] items-start min-w-0 relative">
                      <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{plant.name.toUpperCase()}</span>
                      <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#888' }}>{formatDetailDate(h.date)}</span>
                      <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000', width: 230 }}>{h.note}</span>
                    </div>
                    {/* Trash icon */}
                    <div className="relative shrink-0 size-[18px]">
                      <svg fill="none" height="18" viewBox="0 0 18 18" width="18">
                        <path d={svgDetail.p31294280} fill="black" />
                      </svg>
                    </div>
                    {/* Expand icon */}
                    <div className="relative shrink-0 size-[19px]">
                      <div className="absolute inset-[-5.26%]">
                        <svg fill="none" height="21" viewBox="0 0 21 21" width="21">
                          <path d={svgDetail.p264e700} stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}

                {/* + NEW STATUS */}
                <div className="content-stretch flex gap-[16px] items-center relative shrink-0 w-full cursor-pointer active:opacity-70">
                  {/* Camera placeholder circle */}
                  <div className="relative shrink-0 size-[54px]">
                    <svg fill="none" height="54" viewBox="0 0 54 54" width="54">
                      <rect fill="#F7F7F7" height="54" rx="27" width="54" />
                      <path d={svgDetail.p1a54b00} fill="black" />
                    </svg>
                  </div>
                  <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>+ NEW STATUS</span>
                </div>

              </div>
            </div>

            {/* Delete button */}
            <div className="content-stretch flex items-start pb-[20px] pt-[8px] relative shrink-0 w-full">
              <button
                onClick={onDelete}
                className="btn-secondary bg-white flex flex-1 h-[41px] items-center justify-center relative rounded-full cursor-pointer active:scale-95 transition-all border-2"
                style={{ borderColor: RED }}
              >
                <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: RED }}>DELETE PLANT</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Tab bar */}
      <TabBar active="home" onChange={() => onBack()} />
    </div>
  )
}

// ─── Screen 7: Watering ───────────────────────────────────────────────────────

function WateringScreen({ plants, todayIdx, onMarkWatered, onMarkAll }: {
  plants: Plant[]; todayIdx: number; onMarkWatered: (id: string) => void; onMarkAll: () => void
}) {
  const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
  const grouped: Record<number, Plant[]> = {}
  plants.forEach((p) => p.wateringDays.forEach((d) => { if (!grouped[d]) grouped[d] = []; grouped[d].push(p) }))

  const totalUnwatered = Object.values(grouped).flat().filter((p) => !p.watered).length

  const waterNeedFills = (need: WaterNeed) => need === 'Light' ? 1 : need === 'Moderate' ? 2 : 3

  return (
    <div className="flex flex-col h-full" style={{ background: BG }}>
      <StatusBar />
      {/* Batch header */}
      <div className="shrink-0 px-5 py-4">
        <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 20, color: '#000', lineHeight: 1.2 }}>WATERING</p>
        <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#888' }}>{plants.length} PLANTS</p>
      </div>
      {/* Mark all button */}
      <div className="shrink-0 px-5 pb-4">
        <button onClick={onMarkAll}
          className="btn-primary relative w-full flex items-center justify-center rounded-full border-2 border-black cursor-pointer active:scale-95 transition-all"
          style={{ background: GREEN, height: 48 }}
        >
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>
            MARK ALL {totalUnwatered} AS WATERED
          </span>
        </button>
      </div>
      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto pb-4 flex flex-col gap-5">
        {ALL_DAYS.map((di) => {
          const dayPlants = grouped[di] || []
          const dayName = DAY_NAMES[di].toUpperCase()
          return (
            <div key={di} className="flex flex-col gap-[10px] px-5">
              <div className="shrink-0">
                <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000' }}>{dayName} ROUTINE</p>
                {dayPlants.length === 0 && (
                  <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}>No plants assigned</p>
                )}
              </div>
              {dayPlants.map((p) => {
                const fills = waterNeedFills(p.waterNeed)
                return (
                  <div key={p.id} className="neo-plant-card relative rounded-2xl shrink-0 w-full overflow-hidden"
                    style={{ background: p.watered ? WATERED_BG : 'white' }}
                  >
                    <div className="flex items-center gap-3 px-4 py-3 w-full">
                      {/* Thumbnail */}
                      <div className="shrink-0 size-[54px] rounded-full overflow-hidden border-2 border-black">
                        <img alt="" className="w-full h-full object-cover" src={p.photo} />
                      </div>
                      {/* Title + badges */}
                      <div className="flex flex-1 flex-col gap-1 min-w-0">
                        <p className="overflow-hidden text-ellipsis whitespace-nowrap uppercase"
                          style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>
                          {p.name}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          <div className="badge px-1.5 py-0.5" style={{ background: BG }}>
                            <span style={{ fontSize: 9, color: '#000' }}>{p.room.toUpperCase()}</span>
                          </div>
                          <div className="badge px-1.5 py-0.5" style={{ background: GREEN }}>
                            <span style={{ fontSize: 9, color: '#000' }}>{DAY_NAMES[di].toUpperCase()}</span>
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
                      {/* Quick water — right-aligned */}
                      <button
                        type="button"
                        onClick={() => onMarkWatered(p.id)}
                        className="ml-auto shrink-0 flex items-center justify-center rounded-full size-10 cursor-pointer active:scale-90 transition-all border-2 border-black"
                        style={{ background: p.watered ? 'white' : GREEN }}
                        aria-label={p.watered ? 'Plant watered' : 'Mark as watered'}
                      >
                        {p.watered ? (
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

// ─── Screen 8: Pro Paywall ───────────────────────────────────────────────────

function ProPaywallScreen({ onUnlock, onClose }: { onUnlock: () => void; onClose: () => void }) {
  const props = [
    { title: 'UNLIMITED PLANTS', sub: 'No caps on your growing jungle' },
    { title: 'GROWTH TIMELINE', sub: 'Interactive logs of plant status' },
    { title: '100% OFFLINE & PRIVATE', sub: 'All data stored strictly on your device' },
  ]
  return (
    <div className="flex flex-col h-full" style={{ background: BG }}>
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto flex flex-col items-start shrink-0 w-full">
        {/* Hero collage */}
        <div className="h-[180px] relative shrink-0 w-full overflow-clip" style={{ background: GREEN }}>
          <StatusBar />
          {/* Centered clover droplet illustration */}
          <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[160px] top-1/2">
            <svg className="absolute block inset-0 size-full" fill="none" height="160" preserveAspectRatio="none" viewBox="0 0 160 160" width="160">
              <path d={svgPro.p1e4fc7f0} fill="black" stroke="black" strokeLinecap="round" strokeWidth="2" />
            </svg>
          </div>
          <div className="absolute border-black border-b-2 inset-0 pointer-events-none" />
        </div>

        {/* Intro text */}
        <div className="flex flex-col items-center w-full">
          <div className="flex flex-col gap-2 items-center pb-3 pt-5 px-6 w-full text-center">
            <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 20, color: '#000', lineHeight: 1.2 }}>
              NO SUBSCRIPTIONS. UNLIMITED JUNGLE.
            </p>
            <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 13, color: '#888' }}>
              Take absolute control of your collection offline.
            </p>
          </div>
        </div>

        {/* Value props list */}
        <div className="flex flex-col gap-3 px-6 w-full shrink-0">
          {props.map((p, i) => (
            <div key={i} className="neo-card relative rounded-2xl w-full">
              <div className="flex items-center gap-3 p-3">
                {/* Badge icon */}
                <div className="relative flex items-center justify-center rounded-full shrink-0 size-9 border-2 border-black" style={{ background: GREEN }}>
                  <svg fill="none" height="16" viewBox="0 0 16 16" width="16">
                    <clipPath id={`clip-${i}`}><rect fill="white" height="16" width="16" /></clipPath>
                    <g clipPath={`url(#clip-${i})`}>
                      <path d={svgPro.p397b9d00} stroke="#000000" strokeLinecap="round" strokeWidth="2" />
                    </g>
                  </svg>
                </div>
                {/* Text */}
                <div className="flex flex-col gap-[2px] flex-1 min-w-0">
                  <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}>{p.title}</p>
                  <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 11, color: '#888' }}>{p.sub}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Buy section */}
        <div className="flex flex-col items-center w-full">
          <div className="flex flex-col gap-[10px] items-center px-6 py-5 w-full">
            <button onClick={onUnlock}
              className="btn-primary relative flex items-center justify-center rounded-full shrink-0 w-full cursor-pointer active:scale-95 transition-all border-2 border-black"
              style={{ background: GREEN, height: 58 }}
            >
              <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>
                UNLOCK PRO FOREVER — $5.99
              </p>
            </button>
            <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 11, color: '#000', textAlign: 'center' }}>
              One-time payment. No monthly fees. Yours forever.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Screen 9: Settings ───────────────────────────────────────────────────────

function SettingsScreen({ plants, settings, onSave, onExport, onReset, onClose, onShowPro }: {
  plants: Plant[]; settings: AppSettings; onSave: (s: AppSettings) => void; onExport: () => void; onReset: () => void; onClose: () => void; onShowPro: () => void
}) {
  const [s, setS] = useState(settings)
  const [feedback, setFeedback] = useState({ mind: '', issue: '', feature: '' })
  useEffect(() => { onSave(s) }, [s])

  function toggleDay(i: number) {
    setS((p) => ({ ...p, wateringDays: p.wateringDays.includes(i) ? p.wateringDays.filter((x) => x !== i) : [...p.wateringDays, i] }))
  }

  const plantsUsed = plants.length
  const plantsMax = 5
  const fillPct = Math.min(plantsUsed / plantsMax, 1)

  return (
    <div className="flex flex-col h-full" style={{ background: BG }}>
      <StatusBar />
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0">
        <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 20, color: '#000' }}>SETTINGS</p>
        <button onClick={onClose}
          className="relative bg-black flex items-center justify-center rounded-full shrink-0 size-[38px] cursor-pointer active:scale-90 transition-all border-2 border-black"
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
                const on = s.wateringDays.includes(i)
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

          {/* Push notification */}
          <div className="flex gap-[25px] items-start py-3 w-full">
            <div className="flex flex-col gap-3 flex-1">
              <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000', textTransform: 'uppercase' }}>Push Notification</p>
              <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}>Allow notifications for watering</p>
            </div>
            {/* Toggle */}
            <button onClick={() => setS((p) => ({ ...p, pushNotifications: !p.pushNotifications }))}
              className="relative shrink-0 cursor-pointer"
              style={{ width: 66, height: 38 }}
            >
              <svg fill="none" height="38" viewBox="0 0 66 38" width="66">
                <rect fill={s.pushNotifications ? GREEN : '#ccc'} height="36" rx="18" width="64" x="1" y="1" />
                <rect height="36" rx="18" stroke="black" strokeWidth="2" width="64" x="1" y="1" />
                <circle cx={s.pushNotifications ? 46 : 20} cy="19" fill="white" r="13" stroke="black" strokeWidth="2" />
              </svg>
            </button>
          </div>

          {/* Watering reminder time */}
          <div className="flex gap-[25px] items-start py-3 w-full">
            <div className="flex flex-col gap-3 flex-1">
              <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000', textTransform: 'uppercase' }}>Watering Reminder Time</p>
              <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}>Alert at this time</p>
            </div>
            <div className="relative bg-white border-2 border-black flex gap-3 items-center px-[11px] py-[3px] rounded-full shrink-0" style={{ height: 45, minWidth: 103 }}>
              <input
                type="time" value={s.reminderTime}
                onChange={(e) => setS((p) => ({ ...p, reminderTime: e.target.value }))}
                className="outline-none bg-transparent w-[56px]"
                style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 16, color: '#000' }}
              />
              <svg fill="none" height="15" viewBox="0 0 16 15" width="16">
                <path d={svgSettings.p3c709780} fill="black" />
              </svg>
            </div>
          </div>
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
            <button onClick={onExport}
              className="btn-primary absolute bg-white border-2 border-black flex gap-3 items-center px-[11px] py-[3px] rounded-full cursor-pointer active:scale-95"
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
          <div className="flex flex-col gap-2 pb-3 w-full">
            <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}>We&apos;d love to hear from you!</p>
            {[
              { key: 'mind' as const, placeholder: "Tell us what's on your mind..." },
              { key: 'issue' as const, placeholder: 'What went wrong?" / "Describe the issue' },
              { key: 'feature' as const, placeholder: 'What would you like to see in the app?' },
            ].map(({ key, placeholder }) => (
              <div key={key} className="neo-input relative rounded-2xl w-full" style={{ height: 46 }}>
                <input
                  value={feedback[key]} onChange={(e) => setFeedback((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="absolute left-5 top-[14px] outline-none bg-transparent w-[calc(100%-40px)] font-body"
                  style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#888' }}
                />
              </div>
            ))}
            <button className="btn-primary relative flex items-center justify-center rounded-full w-full cursor-pointer active:scale-95 transition-all border-2 border-black" style={{ background: GREEN, height: 41 }}>
              <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>SEND</p>
            </button>
          </div>
        </div>

        {/* ── MY JUNGLE PRO STATUS ── */}
        <div className="flex flex-col gap-3 px-5">
          <p className="section-header" style={{ fontSize: 14 }}>MY JUNGLE PRO STATUS</p>
          <div className="flex flex-col gap-2 py-3 w-full">
            {/* Free tier card */}
            <div className="neo-card relative rounded-2xl w-full" style={{ height: 109 }}>
              <p className="absolute" style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000', left: 14, top: 27 }}>
                {s.isPro ? 'PRO MEMBER' : 'FREE TIER'}
              </p>
              <p className="absolute" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 11, color: '#888', right: 14, top: 27 }}>
                {plantsUsed}/{plantsMax} PLANTS USED
              </p>
              {/* Progress bar background */}
              <div className="absolute bg-[#F7F7F7] border-2 border-black rounded-full" style={{ height: 10, left: 14, top: 50, width: 326 }} />
              {/* Progress bar fill */}
              <div className="absolute border-2 border-black rounded-full" style={{ background: GREEN, height: 10, left: 14, top: 50, width: Math.round(326 * fillPct) }} />
              <p className="absolute" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 11, color: '#888', left: 14, top: 70 }}>
                {s.isPro ? 'Unlimited plants · All features unlocked.' : `${plantsMax - plantsUsed} plants slot remaining on free tier.`}
              </p>
            </div>
            {/* Unlock button */}
            {!s.isPro && (
              <button onClick={onShowPro}
                className="btn-primary relative flex items-center justify-center rounded-full w-full cursor-pointer active:scale-95 transition-all border-2 border-black"
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
  const todayIdx = getTodayDayIndex()

  useEffect(() => { savePlants(plants) }, [plants])
  useEffect(() => { saveSettings(settings) }, [settings])

  function handleSaveSettings(s: AppSettings) { setSettings(s) }

  function handleAddPlant(p: Plant) { setPlants((prev) => [...prev, p]); setTab('home') }

  function handleDeletePlant(id: string) {
    setPlants((prev) => prev.filter((p) => p.id !== id))
    setScreen('main'); setSelectedPlant(null)
  }

  function handleWaterPlant(id: string) {
    const iso = todayISO()
    setPlants((prev) => prev.map((p) =>
      p.id === id ? { ...p, watered: true, lastWatered: iso, history: [{ id: Date.now().toString(), date: iso, note: 'Watered.', photo: p.photo }, ...p.history] } : p
    ))
    if (selectedPlant?.id === id) setSelectedPlant((p) => p ? { ...p, watered: true, lastWatered: iso } : p)
  }

  function handleMarkAll() {
    const iso = todayISO()
    setPlants((prev) => prev.map((p) =>
      p.wateringDays.includes(todayIdx) ? { ...p, watered: true, lastWatered: iso, history: [{ id: Date.now().toString(), date: iso, note: 'Watered.', photo: p.photo }, ...p.history] } : p
    ))
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify({ plants, settings }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'myjungle-data.json'; a.click()
    URL.revokeObjectURL(url)
  }

  function handleReset() {
    if (window.confirm('Reset all app data?')) {
      localStorage.clear(); setPlants(SEED_PLANTS)
      setSettings({ wateringDays: [0, 2, 4], pushNotifications: true, reminderTime: '09:00', isPro: false })
    }
  }

  // Build content
  let content: React.ReactNode

  if (screen === 'splash') {
    content = <SplashScreen onNext={() => setScreen('onboarding')} />
  } else if (screen === 'onboarding') {
    content = <OnboardingScreen settings={settings} onSave={(s) => { handleSaveSettings(s); setScreen('main') }} />
  } else if (screen === 'pro') {
    content = (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex-1 min-h-0 overflow-hidden">
          <ProPaywallScreen
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
        plant={live} todayIdx={todayIdx}
        onBack={() => { setScreen('main'); setSelectedPlant(null) }}
        onDelete={() => handleDeletePlant(live.id)}
        onMarkWatered={() => handleWaterPlant(live.id)}
      />
    )
  } else {
    // Main tabbed shell
    let tabContent: React.ReactNode
    if (tab === 'home') {
      tabContent = (
        <HomeScreen
          plants={plants} settings={settings} todayIdx={todayIdx}
          onSelectPlant={(p) => { setSelectedPlant(p); setScreen('detail') }}
          onDeletePlant={handleDeletePlant}
          onWaterPlant={handleWaterPlant}
          onGoAdd={() => setTab('add')}
          onSettings={() => setScreen('settings')}
        />
      )
    } else if (tab === 'add') {
      tabContent = <AddScreen plants={plants} settings={settings} onSave={handleAddPlant} onCancel={() => setTab('home')} />
    } else if (tab === 'watering') {
      tabContent = <WateringScreen plants={plants} todayIdx={todayIdx} onMarkWatered={handleWaterPlant} onMarkAll={handleMarkAll} />
    } else {
      tabContent = (
        <ProPaywallScreen
          onUnlock={() => { setSettings((s) => ({ ...s, isPro: true })); setTab('home') }}
          onClose={() => setTab('home')}
        />
      )
    }
    content = (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex-1 min-h-0 overflow-hidden">{tabContent}</div>
        <TabBar active={tab} onChange={(t) => { setTab(t); setScreen('main') }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BLACK }}>
      <div style={{ width: 393, height: 852, background: BG, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {content}
      </div>
    </div>
  )
}
