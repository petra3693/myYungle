import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import PhotoActionSheet from '@/components/photo-action-sheet'
import PlantPhoto from '@/components/PlantPhoto'
import { getAppLanguage } from '@/i18n'
import { analyzePlantHealthImage } from '@/lib/analyzePlantHealth'
import {
  getLatestHealthLog,
  healthScoreSummary,
  isHealthCheckedToday,
  type HealthLogSubmitData,
} from '@/lib/health-log'
import { readAndCompressPhotoFile } from '@/lib/plantStorage'
import type { Plant, PlantHealthLog } from '@/types/plant'

const GREEN = '#00FF66'
const DETAIL_MINT_LIGHT = '#D9FFE8'

const PREVIEW_HEALTH_LOG: PlantHealthLog = {
  id: 'preview-health-log',
  timestamp: new Date().toISOString(),
  photo: '',
  healthScore: 88,
  diagnosis: 'Healthy',
  treatmentNotes: 'Keep bright indirect light and maintain even moisture.',
  analyzedByAI: true,
}

function LockIcon({ size = 28 }: { size?: number }) {
  return (
    <svg fill="none" height={size} viewBox="0 0 24 24" width={size} aria-hidden>
      <rect height="10" rx="2" stroke="#000" strokeWidth="2" width="14" x="5" y="11" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#000" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function ProSectionLock({ onUpgrade }: { onUpgrade: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
      <div className="neo-card flex flex-col items-center gap-3 rounded-2xl border-2 border-black bg-white p-5 text-center w-full max-w-[300px]">
        <LockIcon />
        <span
          className="rounded-full border-2 border-black px-3 py-1"
          style={{ background: GREEN, fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}
        >
          {t('health.proFeature')}
        </span>
        <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 14, color: '#000', lineHeight: 1.4 }}>
          {t('health.unlockAiScans')}
        </p>
        <button
          type="button"
          onClick={onUpgrade}
          className="btn-primary btn-green flex w-full items-center justify-center rounded-full border-2 border-black cursor-pointer"
          style={{ background: GREEN, height: 48 }}
        >
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>{t('health.upgradeToPro')}</span>
        </button>
      </div>
    </div>
  )
}

function HealthGauge({ score }: { score: number | null }) {
  const r = 36
  const c = 2 * Math.PI * r
  const displayScore = score ?? 0
  const offset = c - (displayScore / 100) * c
  return (
    <svg height="88" viewBox="0 0 88 88" width="88" aria-hidden>
      <circle className="health-gauge-track" cx="44" cy="44" r={r} />
      {score != null && (
        <circle className="health-gauge-fill" cx="44" cy="44" r={r} strokeDasharray={c} strokeDashoffset={offset} />
      )}
      <text fill="#fff" fontFamily="Unbounded, sans-serif" fontSize="16" fontWeight="900" textAnchor="middle" x="44" y="48">
        {score != null ? `${score}%` : '—'}
      </text>
    </svg>
  )
}

function HealthLogTimelineItem({ log, onPhotoClick }: { log: PlantHealthLog; onPhotoClick?: (photo: string) => void }) {
  const { t } = useTranslation()
  const dateLabel = new Date(log.timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="flex gap-3 w-full min-w-0">
      <button
        type="button"
        onClick={() => onPhotoClick?.(log.photo)}
        className="shrink-0 size-14 rounded-xl border-2 border-black overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
        aria-label={t('health.viewPhoto', { date: dateLabel })}
      >
        <PlantPhoto photo={log.photo} alt="" className="w-full h-full object-cover" />
      </button>
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 12, color: '#666' }}>{dateLabel}</span>
          <span
            className="rounded-full border border-black px-2 py-0.5"
            style={{ background: DETAIL_MINT_LIGHT, fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 9, color: '#047857' }}
          >
            {log.healthScore}%
          </span>
          <span
            className="rounded-full border border-black px-2 py-0.5"
            style={{ background: '#EEF2FF', fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 9, color: '#4338CA' }}
          >
            AI
          </span>
        </div>
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>
          {log.diagnosis}
        </span>
        {log.treatmentNotes && (
          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 12, color: '#444', lineHeight: 1.4 }} className="line-clamp-2">
            {log.treatmentNotes}
          </p>
        )}
      </div>
    </div>
  )
}

function HealthLogTimeline({ logs, onPhotoClick }: { logs: PlantHealthLog[]; onPhotoClick?: (photo: string) => void }) {
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
    <div className="flex flex-col gap-4 w-full">
      {sorted.map((log, index) => (
        <div key={log.id} className="flex flex-col gap-3 w-full">
          <HealthLogTimelineItem log={log} onPhotoClick={onPhotoClick} />
          {index < sorted.length - 1 && <div className="h-px w-full bg-black/10" aria-hidden />}
        </div>
      ))}
    </div>
  )
}

interface PlantHealthTrackerProps {
  plant: Plant
  isPro: boolean
  onUpgrade: () => void
  onSaveHealthLog: (data: HealthLogSubmitData) => void
  onPhotoClick?: (photo: string) => void
}

function HealthTrackerBody({
  plant,
  previewMode = false,
  onSaveHealthLog,
  onPhotoClick,
}: {
  plant: Plant
  previewMode?: boolean
  onSaveHealthLog: (data: HealthLogSubmitData) => void
  onPhotoClick?: (photo: string) => void
}) {
  const { t } = useTranslation()
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)

  const healthLogs = previewMode ? [PREVIEW_HEALTH_LOG] : (plant.healthLogs ?? [])
  const latestLog = previewMode ? PREVIEW_HEALTH_LOG : getLatestHealthLog(plant.healthLogs)
  const healthScore = latestLog?.healthScore ?? null
  const checkedToday = previewMode ? true : isHealthCheckedToday(latestLog)

  async function handlePhotoFile(file: File) {
    if (previewMode) return
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
      setAnalyzeError(
        error instanceof Error ? error.message : 'Could not analyze this photo. Please try again.',
      )
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
    if (previewMode || analyzing) return
    setAnalyzeError(null)
    setShowPhotoPicker(true)
  }

  return (
    <>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoInputChange} />
      <input ref={libraryInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoInputChange} />

      <div className="health-ai-hero flex flex-col items-center gap-4 p-5 w-full text-center">
        <span className="health-ai-hero__shine" aria-hidden />
        <div className="relative z-10 flex flex-col items-center gap-3 w-full">
          <Sparkles size={22} strokeWidth={2.5} className="text-white drop-shadow-sm" aria-hidden />
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 13, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            AI Plant Health Scan
          </span>
          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 13, color: 'rgba(255,255,255,0.92)', lineHeight: 1.45, maxWidth: 280 }}>
            Snap a photo and Gemini will score your plant&apos;s health, spot issues, and suggest care steps.
          </p>

          <div className="rounded-2xl border-2 border-black bg-white/15 backdrop-blur-sm p-3 flex items-center gap-4 w-full max-w-[320px]">
            <HealthGauge score={healthScore} />
            <div className="flex flex-col gap-1 min-w-0 text-left">
              <span
                className="inline-flex self-start rounded-full px-2.5 py-0.5 border border-black"
                style={{
                  background: checkedToday ? DETAIL_MINT_LIGHT : '#FFF4E5',
                  fontFamily: 'Geist, sans-serif',
                  fontWeight: 700,
                  fontSize: 10,
                  color: checkedToday ? '#047857' : '#92400E',
                }}
              >
                {checkedToday ? 'Checked Today' : 'Not Checked Today'}
              </span>
              <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 12, color: '#fff', lineHeight: 1.4 }}>
                {healthScoreSummary(healthScore, latestLog?.diagnosis ?? null)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={openPhotoPicker}
            disabled={analyzing || previewMode}
            className="relative z-10 w-full max-w-[320px] flex items-center justify-center gap-2 rounded-full border-2 border-black px-6 py-3.5 cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-70 disabled:cursor-not-allowed"
            style={{ background: '#fff', boxShadow: '3px 3px 0px 0px rgba(0,0,0,1)' }}
          >
            <Sparkles size={16} strokeWidth={2.5} aria-hidden className="shrink-0 text-[#4285F4]" />
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>
              {analyzing ? t('health.analyzing') : t('health.checkHealthWithAi')}
            </span>
          </button>

          {analyzeError && (
            <p className="relative z-10" style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 12, color: '#FEE2E2' }} role="alert">
              {analyzeError}
            </p>
          )}
        </div>
      </div>

      {latestLog?.treatmentNotes && (
        <div className="neo-card rounded-2xl border-2 border-black bg-white p-4 flex flex-col gap-2 w-full">
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000', textTransform: 'uppercase' }}>
            Latest Care Advice
          </span>
          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000', lineHeight: 1.5 }}>
            {latestLog.treatmentNotes}
          </p>
        </div>
      )}

      <div className="neo-card rounded-2xl border-2 border-black bg-white p-4 flex flex-col gap-3 w-full">
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000', textTransform: 'uppercase' }}>
          {t('health.timeline')}
        </span>
        <HealthLogTimeline logs={healthLogs} onPhotoClick={onPhotoClick} />
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
    </>
  )
}

export default function PlantHealthTracker({
  plant,
  isPro,
  onUpgrade,
  onSaveHealthLog,
  onPhotoClick,
}: PlantHealthTrackerProps) {
  const { t } = useTranslation()
  const latestLog = isPro ? getLatestHealthLog(plant.healthLogs) : PREVIEW_HEALTH_LOG
  const checkedToday = isPro ? isHealthCheckedToday(latestLog) : true
  const healthScore = latestLog?.healthScore ?? null

  return (
    <div className="neo-card relative rounded-3xl shrink-0 w-full overflow-hidden">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center justify-between gap-3 w-full min-w-0">
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>
            {t('health.title')}
          </span>
          <span
            className="shrink-0 rounded-full px-3 py-1 border-2 border-black max-w-[55%] truncate"
            style={{
              background: checkedToday ? DETAIL_MINT_LIGHT : '#FFF4E5',
              fontFamily: 'Geist, sans-serif',
              fontWeight: 700,
              fontSize: 11,
              color: checkedToday ? '#047857' : '#92400E',
            }}
          >
            {checkedToday && healthScore != null ? t('health.checkedToday', { score: healthScore }) : t('health.scanToCheck')}
          </span>
        </div>

        {isPro ? (
          <HealthTrackerBody plant={plant} onSaveHealthLog={onSaveHealthLog} onPhotoClick={onPhotoClick} />
        ) : (
          <div className="relative min-h-[420px]">
            <div className="pro-section-preview">
              <HealthTrackerBody plant={plant} previewMode onSaveHealthLog={() => {}} />
            </div>
            <ProSectionLock onUpgrade={onUpgrade} />
          </div>
        )}
      </div>
    </div>
  )
}
