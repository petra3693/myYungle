import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { HEALTH_SMART_DEFAULTS } from '@/lib/health-calculator'
import type {
  HealthCheckIn,
  HealthCheckMode,
  HumidityReaction,
  LeafColor,
  LightStress,
  NewGrowth,
  PestCheck,
  PlantHealthMetrics8P,
  SoilMoisture,
  SoilSurface,
  StemHealth,
} from '@/types/plant'

const GREEN = '#00FF66'

export type CheckInSubmitData = Omit<PlantHealthMetrics8P, 'timestamp'> & { mode: HealthCheckMode }

interface CheckInSheetProps {
  plantName: string
  lastCheckIn: HealthCheckIn | null
  onClose: () => void
  onSubmit: (data: CheckInSubmitData) => void
}

function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="detail-stat-label">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className="rounded-full border-2 border-black px-3 py-1.5 cursor-pointer active:scale-[0.98] transition-transform min-h-[36px]"
              style={{
                background: selected ? GREEN : '#fff',
                fontFamily: 'Unbounded, sans-serif',
                fontWeight: 900,
                fontSize: 9,
                color: '#000',
                textTransform: 'uppercase',
                boxShadow: selected ? '2px 2px 0px 0px rgba(0,0,0,1)' : 'none',
              }}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const LEAF_COLOR_OPTIONS: { value: LeafColor; label: string }[] = [
  { value: 'healthy', label: 'Healthy' },
  { value: 'brown_tips', label: 'Brown Tips' },
  { value: 'yellowing', label: 'Yellowing' },
  { value: 'brown_spots', label: 'Brown Spots' },
]

const NEW_GROWTH_OPTIONS: { value: NewGrowth; label: string }[] = [
  { value: 'thriving', label: 'Thriving' },
  { value: 'stagnant', label: 'Stagnant' },
  { value: 'dead_shoots', label: 'Dead Shoots' },
]

const STEM_HEALTH_OPTIONS: { value: StemHealth; label: string }[] = [
  { value: 'firm', label: 'Firm' },
  { value: 'drooping', label: 'Drooping' },
  { value: 'soft_rotting', label: 'Soft / Rotting' },
]

const SOIL_MOISTURE_OPTIONS: { value: SoilMoisture; label: string }[] = [
  { value: 'dry', label: 'Dry' },
  { value: 'optimal', label: 'Optimal' },
  { value: 'waterlogged', label: 'Waterlogged' },
]

const SOIL_SURFACE_OPTIONS: { value: SoilSurface; label: string }[] = [
  { value: 'clean', label: 'Clean' },
  { value: 'mold_salt', label: 'Mold / Salt' },
  { value: 'foul_odor', label: 'Foul Odor' },
]

const PEST_OPTIONS: { value: PestCheck; label: string }[] = [
  { value: 'clean', label: 'Clean' },
  { value: 'pests_detected', label: 'Pests Detected' },
]

const LIGHT_STRESS_OPTIONS: { value: LightStress; label: string }[] = [
  { value: 'ideal', label: 'Ideal' },
  { value: 'etiolated', label: 'Etiolated' },
  { value: 'sunburn', label: 'Sunburn' },
]

const HUMIDITY_OPTIONS: { value: HumidityReaction; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'curling', label: 'Curling' },
  { value: 'crispy_edges', label: 'Crispy Edges' },
]

function initialMetrics(lastCheckIn: HealthCheckIn | null): Omit<PlantHealthMetrics8P, 'timestamp'> {
  if (lastCheckIn) {
    return {
      leafColor: lastCheckIn.leafColor,
      newGrowth: lastCheckIn.newGrowth,
      stemHealth: lastCheckIn.stemHealth,
      soilMoisture: lastCheckIn.soilMoisture,
      soilSurface: lastCheckIn.soilSurface,
      pestCheck: lastCheckIn.pestCheck,
      lightStress: lastCheckIn.lightStress,
      humidityReaction: lastCheckIn.humidityReaction,
      note: lastCheckIn.note,
    }
  }
  return { ...HEALTH_SMART_DEFAULTS }
}

export default function CheckInSheet({ plantName, lastCheckIn, onClose, onSubmit }: CheckInSheetProps) {
  const [deepMode, setDeepMode] = useState(false)
  const [leafColor, setLeafColor] = useState<LeafColor>(() => initialMetrics(lastCheckIn).leafColor)
  const [newGrowth, setNewGrowth] = useState<NewGrowth>(() => initialMetrics(lastCheckIn).newGrowth)
  const [stemHealth, setStemHealth] = useState<StemHealth>(() => initialMetrics(lastCheckIn).stemHealth)
  const [soilMoisture, setSoilMoisture] = useState<SoilMoisture>(() => initialMetrics(lastCheckIn).soilMoisture)
  const [soilSurface, setSoilSurface] = useState<SoilSurface>(() => initialMetrics(lastCheckIn).soilSurface)
  const [pestCheck, setPestCheck] = useState<PestCheck>(() => initialMetrics(lastCheckIn).pestCheck)
  const [lightStress, setLightStress] = useState<LightStress>(() => initialMetrics(lastCheckIn).lightStress)
  const [humidityReaction, setHumidityReaction] = useState<HumidityReaction>(() => initialMetrics(lastCheckIn).humidityReaction)
  const [note, setNote] = useState(() => initialMetrics(lastCheckIn).note ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      mode: deepMode ? 'deep' : 'quick',
      leafColor,
      soilMoisture,
      pestCheck,
      note: note.trim() || undefined,
      newGrowth: deepMode ? newGrowth : HEALTH_SMART_DEFAULTS.newGrowth,
      stemHealth: deepMode ? stemHealth : HEALTH_SMART_DEFAULTS.stemHealth,
      soilSurface: deepMode ? soilSurface : HEALTH_SMART_DEFAULTS.soilSurface,
      lightStress: deepMode ? lightStress : HEALTH_SMART_DEFAULTS.lightStress,
      humidityReaction: deepMode ? humidityReaction : HEALTH_SMART_DEFAULTS.humidityReaction,
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/40" onClick={onClose} aria-hidden />
      <div
        className="fixed inset-x-0 bottom-0 z-[90] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        role="dialog"
        aria-modal="true"
        aria-label="Record health check"
      >
        <form
          onSubmit={handleSubmit}
          className="neo-card flex flex-col gap-4 rounded-t-3xl rounded-b-2xl border-2 border-black bg-white p-5 w-full max-w-lg mx-auto max-h-[85vh] overflow-y-auto"
          style={{ boxShadow: '0 -4px 0 0 #000' }}
        >
          <div className="flex items-center justify-between gap-3 shrink-0">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000', textTransform: 'uppercase' }}>
                {deepMode ? 'Deep Check' : 'Quick Check'}
              </span>
              <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 12, color: '#666' }}>
                {plantName}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center size-8 rounded-full border-2 border-black bg-black cursor-pointer shrink-0"
              aria-label="Close"
            >
              <svg fill="none" height="14" viewBox="0 0 18 18" width="14">
                <path clipRule="evenodd" d="M4.5 4.5l9 9m0-9l-9 9" stroke="white" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </button>
          </div>

          {!deepMode && (
            <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 13, color: '#666', lineHeight: 1.4 }}>
              3 core parameters — remaining metrics use smart defaults.
            </p>
          )}

          <ChipGroup label="Leaf Color" options={LEAF_COLOR_OPTIONS} value={leafColor} onChange={setLeafColor} />
          <ChipGroup label="Soil Moisture" options={SOIL_MOISTURE_OPTIONS} value={soilMoisture} onChange={setSoilMoisture} />
          <ChipGroup label="Pest Check" options={PEST_OPTIONS} value={pestCheck} onChange={setPestCheck} />

          {deepMode && (
            <div className="flex flex-col gap-4 border-t-2 border-black pt-4">
              <ChipGroup label="New Growth" options={NEW_GROWTH_OPTIONS} value={newGrowth} onChange={setNewGrowth} />
              <ChipGroup label="Stem Health" options={STEM_HEALTH_OPTIONS} value={stemHealth} onChange={setStemHealth} />
              <ChipGroup label="Soil Surface" options={SOIL_SURFACE_OPTIONS} value={soilSurface} onChange={setSoilSurface} />
              <ChipGroup label="Light Stress" options={LIGHT_STRESS_OPTIONS} value={lightStress} onChange={setLightStress} />
              <ChipGroup label="Humidity Reaction" options={HUMIDITY_OPTIONS} value={humidityReaction} onChange={setHumidityReaction} />
            </div>
          )}

          <button
            type="button"
            onClick={() => setDeepMode((v) => !v)}
            className="flex items-center justify-center gap-2 w-full rounded-full border-2 border-black bg-white py-2.5 cursor-pointer active:scale-[0.98] min-h-[44px]"
            style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}
          >
            {deepMode ? (
              <>
                <ChevronUp size={16} aria-hidden />
                Collapse to Quick Check
              </>
            ) : (
              <>
                <ChevronDown size={16} aria-hidden />
                Expand to Deep Check (5 more)
              </>
            )}
          </button>

          <label className="flex flex-col gap-1">
            <span className="detail-stat-label">Note (optional)</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Brief observation..."
              className="neo-input rounded-xl border-2 border-black px-3 py-2 w-full"
              style={{ fontFamily: 'Geist, sans-serif', fontSize: 14 }}
            />
          </label>

          <button
            type="submit"
            className="btn-primary btn-green flex w-full shrink-0 items-center justify-center rounded-full border-2 border-black cursor-pointer"
            style={{ background: GREEN, minHeight: 52, height: 52, boxShadow: '2px 2px 0px 0px rgba(0,0,0,1)' }}
          >
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>
              SAVE CHECK-IN
            </span>
          </button>
        </form>
      </div>
    </>
  )
}
