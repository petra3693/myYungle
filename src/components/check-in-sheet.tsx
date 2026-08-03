import { useMemo, useState } from 'react'
import {
  DEFAULT_DIAGNOSTIC_ANSWERS,
  LEAF_DISCOLORATION_LABELS,
  LEAF_VITALITY_LABELS,
  LIGHT_STRESS_LABELS,
  HUMIDITY_LABELS,
  PEST_TYPE_LABELS,
  ROOT_STABILITY_LABELS,
  SOIL_MOISTURE_LABELS,
  SOIL_SURFACE_LABELS,
  STEM_FIRMNESS_LABELS,
} from '@/lib/health-calculator'
import { DIAGNOSTIC_QUESTION_COUNT, DOMAIN_LABELS } from '@/lib/diagnostic-schema'
import type {
  ComprehensiveCheckInPayload,
  HealthCheckIn,
  HumidityReactionLevel,
  LeafDiscoloration,
  LeafVitalityLevel,
  LightStressLevel,
  NewGrowthVigor,
  PestSeverity,
  PestType,
  RootStabilityLevel,
  SoilMoistureLevel,
  SoilSurfaceCondition,
  StemFirmnessLevel,
} from '@/types/plant'

const GREEN = '#00FF66'

export type CheckInSubmitData = Omit<ComprehensiveCheckInPayload, 'timestamp'>

interface CheckInSheetProps {
  plantName: string
  lastCheckIn: HealthCheckIn | null
  onClose: () => void
  onSubmit: (data: CheckInSubmitData) => void
}

function initialAnswers(lastCheckIn: HealthCheckIn | null): CheckInSubmitData {
  if (lastCheckIn) {
    const { id: _id, timestamp: _ts, ...rest } = lastCheckIn
    return rest
  }
  return { ...DEFAULT_DIAGNOSTIC_ANSWERS }
}

function QuestionCard({ title, description, children }: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="neo-card rounded-2xl border-2 border-black bg-white p-4 flex flex-col gap-3 w-full">
      <div className="flex flex-col gap-0.5">
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000', textTransform: 'uppercase' }}>
          {title}
        </span>
        {description && (
          <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 12, color: '#666', lineHeight: 1.4 }}>
            {description}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function BooleanToggle({
  value,
  onChange,
  onTouch,
}: {
  value: boolean
  onChange: (v: boolean) => void
  onTouch: () => void
}) {
  return (
    <div className="flex gap-2">
      {([true, false] as const).map((option) => {
        const selected = value === option
        return (
          <button
            key={String(option)}
            type="button"
            onClick={() => { onTouch(); onChange(option) }}
            className="flex-1 rounded-full border-2 border-black py-2.5 min-h-[44px] cursor-pointer active:scale-[0.98] transition-transform"
            style={{
              background: selected ? GREEN : '#fff',
              fontFamily: 'Unbounded, sans-serif',
              fontWeight: 900,
              fontSize: 11,
              color: '#000',
              boxShadow: selected ? '2px 2px 0px 0px rgba(0,0,0,1)' : 'none',
            }}
          >
            {option ? 'YES' : 'NO'}
          </button>
        )
      })}
    </div>
  )
}

function RangeSlider({
  min,
  max,
  value,
  labels,
  onChange,
  onTouch,
}: {
  min: number
  max: number
  value: number
  labels: Record<number, string>
  onChange: (v: number) => void
  onTouch: () => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 13, color: '#000' }}>
          {value}/{max} — {labels[value] ?? ''}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => { onTouch(); onChange(Number(e.target.value)) }}
        className="health-range w-full cursor-pointer"
      />
      <div className="flex justify-between text-[10px]" style={{ fontFamily: 'Geist, sans-serif', color: '#888' }}>
        <span>{labels[min]}</span>
        <span>{labels[max]}</span>
      </div>
    </div>
  )
}

function ChipSelect<T extends string>({
  options,
  value,
  onChange,
  onTouch,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  onTouch: () => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => { onTouch(); onChange(option.value) }}
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
  )
}

function DomainHeader({ domain }: { domain: keyof typeof DOMAIN_LABELS }) {
  return (
    <span
      className="sticky top-0 z-[1] bg-[#F7F7F7] py-1"
      style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}
    >
      {DOMAIN_LABELS[domain]}
    </span>
  )
}

export default function CheckInSheet({ plantName, lastCheckIn, onClose, onSubmit }: CheckInSheetProps) {
  const [answers, setAnswers] = useState<CheckInSubmitData>(() => initialAnswers(lastCheckIn))
  const [touched, setTouched] = useState<Set<string>>(() => new Set())

  const progressCount = useMemo(() => Math.min(touched.size, DIAGNOSTIC_QUESTION_COUNT), [touched])
  const progressPct = Math.round((progressCount / DIAGNOSTIC_QUESTION_COUNT) * 100)

  function touch(id: string) {
    setTouched((prev) => new Set(prev).add(id))
  }

  function patch<K extends keyof CheckInSubmitData>(key: K, value: CheckInSubmitData[K]) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: CheckInSubmitData = { ...answers }
    if (!payload.hasNewGrowth) delete payload.newGrowthVigor
    if (!payload.pestsPresent) {
      delete payload.pestType
      delete payload.pestSeverity
    }
    onSubmit(payload)
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/40" onClick={onClose} aria-hidden />
      <div
        className="fixed inset-x-0 bottom-0 z-[90] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        role="dialog"
        aria-modal="true"
        aria-label="Comprehensive plant diagnosis"
      >
        <form
          onSubmit={handleSubmit}
          className="neo-card flex flex-col gap-3 rounded-t-3xl rounded-b-2xl border-2 border-black bg-[#F7F7F7] p-4 w-full max-w-lg mx-auto max-h-[90vh] overflow-hidden"
          style={{ boxShadow: '0 -4px 0 0 #000' }}
        >
          <div className="flex items-center justify-between gap-3 shrink-0">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000', textTransform: 'uppercase' }}>
                Comprehensive Diagnosis
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
                <path d="M4.5 4.5l9 9m0-9l-9 9" stroke="white" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-1 shrink-0">
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 12, color: '#000' }}>
                {progressCount} / {DIAGNOSTIC_QUESTION_COUNT} Answered
              </span>
              <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 11, color: '#888' }}>
                {progressPct}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full border-2 border-black bg-white overflow-hidden">
              <div className="h-full transition-all duration-300" style={{ width: `${progressPct}%`, background: GREEN }} />
            </div>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto flex-1 min-h-0 pb-1">
            <DomainHeader domain="foliage" />

            <QuestionCard title="1. Leaf Vitality" description="Rate overall leaf health">
              <RangeSlider
                min={1}
                max={5}
                value={answers.leafVitality}
                labels={LEAF_VITALITY_LABELS}
                onChange={(v) => patch('leafVitality', v as LeafVitalityLevel)}
                onTouch={() => touch('leafVitality')}
              />
            </QuestionCard>

            <QuestionCard title="2. Leaf Discoloration">
              <ChipSelect
                options={Object.entries(LEAF_DISCOLORATION_LABELS).map(([value, label]) => ({ value: value as LeafDiscoloration, label }))}
                value={answers.leafDiscoloration}
                onChange={(v) => patch('leafDiscoloration', v)}
                onTouch={() => touch('leafDiscoloration')}
              />
            </QuestionCard>

            <QuestionCard title="3. New Growth" description="Visible new shoots or leaves?">
              <BooleanToggle
                value={answers.hasNewGrowth}
                onChange={(v) => patch('hasNewGrowth', v)}
                onTouch={() => touch('hasNewGrowth')}
              />
              <div
                className="grid transition-all duration-300 ease-out"
                style={{ gridTemplateRows: answers.hasNewGrowth ? '1fr' : '0fr', opacity: answers.hasNewGrowth ? 1 : 0 }}
              >
                <div className="overflow-hidden">
                  <div className="pt-2 border-t-2 border-dashed border-black/20 mt-1">
                    <span className="detail-stat-label block mb-2">Growth Vigor</span>
                    <RangeSlider
                      min={1}
                      max={3}
                      value={answers.newGrowthVigor ?? 2}
                      labels={{ 1: 'Weak', 2: 'Moderate', 3: 'Strong' }}
                      onChange={(v) => patch('newGrowthVigor', v as NewGrowthVigor)}
                      onTouch={() => touch('newGrowthVigor')}
                    />
                  </div>
                </div>
              </div>
            </QuestionCard>

            <DomainHeader domain="soil" />

            <QuestionCard title="4. Soil Moisture Level" description="1 = Bone Dry · 3 = Optimal · 5 = Waterlogged">
              <RangeSlider
                min={1}
                max={5}
                value={answers.soilMoistureLevel}
                labels={SOIL_MOISTURE_LABELS}
                onChange={(v) => patch('soilMoistureLevel', v as SoilMoistureLevel)}
                onTouch={() => touch('soilMoistureLevel')}
              />
            </QuestionCard>

            <QuestionCard title="5. Soil Surface Condition">
              <ChipSelect
                options={Object.entries(SOIL_SURFACE_LABELS).map(([value, label]) => ({ value: value as SoilSurfaceCondition, label }))}
                value={answers.soilSurfaceCondition}
                onChange={(v) => patch('soilSurfaceCondition', v)}
                onTouch={() => touch('soilSurfaceCondition')}
              />
            </QuestionCard>

            <QuestionCard title="6. Pot Drainage" description="Are drain holes functioning?">
              <BooleanToggle
                value={answers.potDrainageWorking}
                onChange={(v) => patch('potDrainageWorking', v)}
                onTouch={() => touch('potDrainageWorking')}
              />
            </QuestionCard>

            <DomainHeader domain="pest" />

            <QuestionCard title="7. Pest Presence">
              <BooleanToggle
                value={answers.pestsPresent}
                onChange={(v) => patch('pestsPresent', v)}
                onTouch={() => touch('pestsPresent')}
              />
              <div
                className="grid transition-all duration-300 ease-out"
                style={{ gridTemplateRows: answers.pestsPresent ? '1fr' : '0fr', opacity: answers.pestsPresent ? 1 : 0 }}
              >
                <div className="overflow-hidden flex flex-col gap-3">
                  <div className="pt-2 border-t-2 border-dashed border-black/20">
                    <span className="detail-stat-label block mb-2">Pest Type</span>
                    <ChipSelect
                      options={Object.entries(PEST_TYPE_LABELS).map(([value, label]) => ({ value: value as PestType, label }))}
                      value={answers.pestType ?? 'spider_mites'}
                      onChange={(v) => patch('pestType', v)}
                      onTouch={() => touch('pestType')}
                    />
                  </div>
                  <div>
                    <span className="detail-stat-label block mb-2">Severity</span>
                    <RangeSlider
                      min={1}
                      max={3}
                      value={answers.pestSeverity ?? 2}
                      labels={{ 1: 'Mild', 2: 'Moderate', 3: 'Severe' }}
                      onChange={(v) => patch('pestSeverity', v as PestSeverity)}
                      onTouch={() => touch('pestSeverity')}
                    />
                  </div>
                </div>
              </div>
            </QuestionCard>

            <QuestionCard title="8. Fungal / Rot Signs">
              <BooleanToggle
                value={answers.fungalRotSigns}
                onChange={(v) => patch('fungalRotSigns', v)}
                onTouch={() => touch('fungalRotSigns')}
              />
            </QuestionCard>

            <DomainHeader domain="environment" />

            <QuestionCard title="9. Stem Firmness" description="1 = Mushy · 4 = Firm">
              <RangeSlider
                min={1}
                max={4}
                value={answers.stemFirmness}
                labels={STEM_FIRMNESS_LABELS}
                onChange={(v) => patch('stemFirmness', v as StemFirmnessLevel)}
                onTouch={() => touch('stemFirmness')}
              />
            </QuestionCard>

            <QuestionCard title="10. Light Stress">
              <ChipSelect
                options={Object.entries(LIGHT_STRESS_LABELS).map(([value, label]) => ({ value: value as LightStressLevel, label }))}
                value={answers.lightStress}
                onChange={(v) => patch('lightStress', v)}
                onTouch={() => touch('lightStress')}
              />
            </QuestionCard>

            <QuestionCard title="11. Humidity Reaction">
              <ChipSelect
                options={Object.entries(HUMIDITY_LABELS).map(([value, label]) => ({ value: value as HumidityReactionLevel, label }))}
                value={answers.humidityReaction}
                onChange={(v) => patch('humidityReaction', v)}
                onTouch={() => touch('humidityReaction')}
              />
            </QuestionCard>

            <QuestionCard title="12. Root Stability" description="1 = Loose · 3 = Firmly rooted">
              <RangeSlider
                min={1}
                max={3}
                value={answers.rootStability}
                labels={ROOT_STABILITY_LABELS}
                onChange={(v) => patch('rootStability', v as RootStabilityLevel)}
                onTouch={() => touch('rootStability')}
              />
            </QuestionCard>

            <label className="neo-card rounded-2xl border-2 border-black bg-white p-4 flex flex-col gap-1">
              <span className="detail-stat-label">Note (optional)</span>
              <input
                type="text"
                value={answers.note ?? ''}
                onChange={(e) => patch('note', e.target.value || undefined)}
                placeholder="Additional observations..."
                className="neo-input rounded-xl border-2 border-black px-3 py-2 w-full"
                style={{ fontFamily: 'Geist, sans-serif', fontSize: 14 }}
              />
            </label>
          </div>

          <button
            type="submit"
            className="btn-primary btn-green flex w-full shrink-0 items-center justify-center rounded-full border-2 border-black cursor-pointer"
            style={{ background: GREEN, minHeight: 52, height: 52, boxShadow: '2px 2px 0px 0px rgba(0,0,0,1)' }}
          >
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>
              SAVE COMPREHENSIVE DIAGNOSIS
            </span>
          </button>
        </form>
      </div>
    </>
  )
}
