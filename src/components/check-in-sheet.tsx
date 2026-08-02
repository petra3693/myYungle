import { useState } from 'react'
import type { CheckInLog, LeafStatus, PestStatus, SoilStatus } from '@/types/plant'

const GREEN = '#00FF66'

interface CheckInSheetProps {
  plantName: string
  onClose: () => void
  onSubmit: (data: Pick<CheckInLog, 'leafStatus' | 'soilStatus' | 'pestStatus' | 'note'>) => void
}

const LEAF_OPTIONS: { value: LeafStatus; label: string }[] = [
  { value: 'lush', label: 'Lush' },
  { value: 'brown_tips', label: 'Brown Tips' },
  { value: 'yellowing', label: 'Yellowing' },
  { value: 'drooping', label: 'Drooping' },
]

const SOIL_OPTIONS: { value: SoilStatus; label: string }[] = [
  { value: 'dry', label: 'Dry' },
  { value: 'moist', label: 'Moist' },
  { value: 'saturated', label: 'Saturated' },
]

const PEST_OPTIONS: { value: PestStatus; label: string }[] = [
  { value: 'clean', label: 'Clean' },
  { value: 'pests_detected', label: 'Pests Detected' },
]

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

export default function CheckInSheet({ plantName, onClose, onSubmit }: CheckInSheetProps) {
  const [leafStatus, setLeafStatus] = useState<LeafStatus>('lush')
  const [soilStatus, setSoilStatus] = useState<SoilStatus>('moist')
  const [pestStatus, setPestStatus] = useState<PestStatus>('clean')
  const [note, setNote] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      leafStatus,
      soilStatus,
      pestStatus,
      note: note.trim() || undefined,
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
          <div className="flex items-center justify-between gap-3">
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000', textTransform: 'uppercase' }}>
              Health Check
            </span>
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

          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#666', lineHeight: 1.4 }}>
            Quick check-in for {plantName}
          </p>

          <ChipGroup label="Leaf" options={LEAF_OPTIONS} value={leafStatus} onChange={setLeafStatus} />
          <ChipGroup label="Soil" options={SOIL_OPTIONS} value={soilStatus} onChange={setSoilStatus} />
          <ChipGroup label="Pest" options={PEST_OPTIONS} value={pestStatus} onChange={setPestStatus} />

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
            style={{ background: GREEN, minHeight: 52, height: 52 }}
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
