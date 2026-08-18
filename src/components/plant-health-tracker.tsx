import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import PhotoActionSheet from '@/components/photo-action-sheet'
import ProFeatureGate from '@/components/ProFeatureGate'
import { getAppLanguage } from '@/i18n'
import { analyzePlantHealthImage } from '@/lib/analyzePlantHealth'
import {
  getLatestHealthLog,
  healthScoreSummary,
  type HealthLogSubmitData,
} from '@/lib/health-log'
import { readAndCompressPhotoFile } from '@/lib/plantStorage'
import type { Plant, PlantHealthLog } from '@/types/plant'

const GREEN = '#00FF66'

const PREVIEW_HEALTH_LOG: PlantHealthLog = {
  id: 'preview-health-log',
  timestamp: new Date().toISOString(),
  photo: '',
  healthScore: 92,
  diagnosis: 'Leaf Vitality: Lush & Vibrant',
  treatmentNotes: 'Thriving in current conditions.',
  analyzedByAI: true,
}

const PREVIEW_OBSERVATIONS: PlantHealthLog[] = [
  PREVIEW_HEALTH_LOG,
  {
    id: 'preview-health-log-2',
    timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
    photo: '',
    healthScore: 88,
    diagnosis: 'Soil Condition: Moist & Balanced',
    treatmentNotes: '',
    analyzedByAI: true,
  },
  {
    id: 'preview-health-log-3',
    timestamp: new Date(Date.now() - 7 * 86400000).toISOString(),
    photo: '',
    healthScore: 72,
    diagnosis: 'Minor Dust on Leaves — Cleaned',
    treatmentNotes: '',
    analyzedByAI: false,
  },
]

function HealthGauge({ score }: { score: number | null }) {
  const r = 36
  const c = 2 * Math.PI * r
  const displayScore = score ?? 0
  const offset = c - (displayScore / 100) * c
  return (
    <svg height="88" viewBox="0 0 88 88" width="88" aria-hidden className="shrink-0">
      <circle className="health-gauge-track" cx="44" cy="44" r={r} />
      {score != null && (
        <circle className="health-gauge-fill" cx="44" cy="44" r={r} strokeDasharray={c} strokeDashoffset={offset} />
      )}
      <text fill="#000" fontFamily="Unbounded, sans-serif" fontSize="16" fontWeight="900" textAnchor="middle" x="44" y="48">
        {score != null ? `${score}%` : '—'}
      </text>
    </svg>
  )
}

function observationDotClass(score: number): string {
  if (score >= 80) return 'health-observation-dot--green'
  if (score >= 60) return 'health-observation-dot--yellow'
  return 'health-observation-dot--red'
}

function relativeObservationTime(iso: string, translate: (key: string, options?: { count?: number }) => string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (diff <= 0) return translate('health.observationToday')
  if (diff === 1) return translate('health.observationDaysAgo_one', { count: 1 })
  if (diff < 7) return translate('health.observationDaysAgo', { count: diff })
  return translate('health.observationWeekAgo')
}

function HealthObservationsList({ logs }: { logs: PlantHealthLog[] }) {
  const { t } = useTranslation()

  if (logs.length === 0) {
    return (
      <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 13, color: '#888', lineHeight: 1.4 }}>
        {t('health.noLogs')}
      </p>
    )
  }

  const sorted = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="flex flex-col w-full">
      {sorted.slice(0, 5).map((log) => (
        <div key={log.id} className="health-observation-row">
          <span className={`health-observation-dot ${observationDotClass(log.healthScore)}`} aria-hidden />
          <p
            className="flex-1 min-w-0"
            style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 13, color: '#000', lineHeight: 1.4 }}
          >
            {log.diagnosis}
          </p>
          <span
            className="shrink-0"
            style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 12, color: '#888' }}
          >
            {relativeObservationTime(log.timestamp, t)}
          </span>
        </div>
      ))}
    </div>
  )
}

interface PlantHealthTrackerProps {
  plant: Plant
  hasAccess: boolean
  canActivateSlot: boolean
  onActivateSlot: () => void
  onUpgrade: () => void
  onSaveHealthLog: (data: HealthLogSubmitData) => void
  onPhotoClick?: (photo: string) => void
}

function HealthTrackerBody({
  plant,
  previewMode = false,
  onOpenScan,
  analyzing,
}: {
  plant: Plant
  previewMode?: boolean
  onOpenScan: () => void
  analyzing: boolean
}) {
  const { t } = useTranslation()

  const healthLogs = previewMode ? PREVIEW_OBSERVATIONS : (plant.healthLogs ?? [])
  const latestLog = previewMode ? PREVIEW_HEALTH_LOG : getLatestHealthLog(plant.healthLogs)
  const healthScore = latestLog?.healthScore ?? null
  const summary = healthScoreSummary(healthScore, latestLog?.diagnosis ?? null, t)

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Gradient hero — preserved per design exception */}
      <div className="health-ai-hero flex flex-row items-center gap-4 p-4 w-full text-left">
        <span className="health-ai-hero__shine" aria-hidden />
        <HealthGauge score={healthScore} />
        <div className="relative z-10 flex flex-col gap-1 min-w-0 flex-1">
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#fff', textTransform: 'uppercase', textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}>
            {t('health.overallHealthScore')}
          </span>
          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 13, color: 'rgba(255,255,255,0.92)', lineHeight: 1.45 }}>
            {healthScore != null && healthScore >= 80 ? t('health.thrivingConditions') : summary}
          </p>
        </div>
      </div>

      <HealthObservationsList logs={healthLogs} />

      <button
        type="button"
        onClick={onOpenScan}
        disabled={analyzing || previewMode}
        className="btn-primary btn-green relative flex items-center justify-center rounded-full w-full min-h-[48px] cursor-pointer border-2 border-black disabled:opacity-70 disabled:cursor-not-allowed"
        style={{ background: GREEN }}
      >
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>
          {analyzing ? t('health.analyzing') : t('health.recordHealthCheck')}
        </span>
      </button>
    </div>
  )
}

export default function PlantHealthTracker({
  plant,
  hasAccess,
  canActivateSlot,
  onActivateSlot,
  onUpgrade,
  onSaveHealthLog,
}: PlantHealthTrackerProps) {
  const { t } = useTranslation()
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)

  async function handlePhotoFile(file: File) {
    setAnalyzeError(null)
    setAnalyzing(true)
    try {
      const compressed = await readAndCompressPhotoFile(file)
      const result = await analyzePlantHealthImage(compressed, getAppLanguage())
      if (!result.ok) {
        setAnalyzeError(result.error)
        return
      }
      onSaveHealthLog({
        photo: compressed,
        healthScore: result.data.healthScore,
        diagnosis: result.data.diagnosis,
        treatmentNotes: result.data.treatmentNotes,
        analyzedByAI: true,
      })
    } catch (error) {
      console.error('[myJungle] Health analysis error:', error)
      setAnalyzeError(error instanceof Error ? error.message : t('analyze.failed'))
    } finally {
      setAnalyzing(false)
    }
  }

  function handlePhotoInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handlePhotoFile(file)
    e.target.value = ''
  }

  function openPhotoPicker() {
    if (!hasAccess) {
      if (canActivateSlot) onActivateSlot()
      else onUpgrade()
      return
    }
    if (analyzing) return
    setAnalyzeError(null)
    setShowPhotoPicker(true)
  }

  return (
    <div className="plant-detail-section-card relative shrink-0 w-full overflow-hidden">
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoInputChange} />
      <input ref={libraryInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoInputChange} />

      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-3 w-full min-w-0">
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>
            {t('health.title')}
          </span>
          <button
            type="button"
            onClick={openPhotoPicker}
            disabled={analyzing}
            className="settings-chip-btn shrink-0 max-w-[55%] truncate"
          >
            {t('health.scanToCheck')}
          </button>
        </div>

        <ProFeatureGate
          hasAccess={hasAccess}
          canActivateSlot={canActivateSlot}
          onActivateSlot={onActivateSlot}
          onUpgrade={onUpgrade}
          preview={
            <HealthTrackerBody
              plant={plant}
              previewMode
              onOpenScan={() => {}}
              analyzing={false}
            />
          }
        >
          <HealthTrackerBody
            plant={plant}
            onOpenScan={openPhotoPicker}
            analyzing={analyzing}
          />
        </ProFeatureGate>

        {analyzeError && (
          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 12, color: '#ff2d55' }} role="alert">
            {analyzeError}
          </p>
        )}
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
    </div>
  )
}
