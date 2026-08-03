import { useEffect, useState } from 'react'
import CheckInSheet, { type CheckInSubmitData } from '@/components/check-in-sheet'
import HealthAnalysisSheet, { type HealthLogSubmitData } from '@/components/health-analysis-sheet'
import PlantPhoto from '@/components/PlantPhoto'
import {
  calculateHealthScore,
  formatCheckInBadge,
  getDiagnosisSummaryGrid,
  getFullDiagnosisReport,
  getHealthActionCtas,
  getLatestCheckIn,
  isFullyHealthy,
} from '@/lib/health-calculator'
import type { HealthCheckIn, Plant, PlantHealthLog } from '@/types/plant'

const GREEN = '#00FF66'
const DETAIL_MINT_LIGHT = '#D9FFE8'

const PREVIEW_CHECK_IN: HealthCheckIn = {
  id: 'preview-check-in',
  timestamp: new Date().toISOString(),
  leafVitality: 5,
  leafDiscoloration: 'none',
  hasNewGrowth: true,
  newGrowthVigor: 3,
  soilMoistureLevel: 3,
  soilSurfaceCondition: 'clean',
  potDrainageWorking: true,
  pestsPresent: false,
  fungalRotSigns: false,
  stemFirmness: 4,
  lightStress: 'ideal',
  humidityReaction: 'normal',
  rootStability: 3,
}

function useClientCheckInLabel(lastCheckIn: HealthCheckIn | null): string {
  const [label, setLabel] = useState('—')
  useEffect(() => {
    setLabel(formatCheckInBadge(lastCheckIn))
  }, [lastCheckIn?.timestamp, lastCheckIn])
  return label
}

function useClientLogDate(timestamp: string): string {
  const [label, setLabel] = useState('')
  useEffect(() => {
    setLabel(
      new Date(timestamp).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    )
  }, [timestamp])
  return label
}

function severityStyle(severity: PlantHealthLog['severity']): { bg: string; color: string; label: string } {
  if (severity === 'high') return { bg: '#FEE2E2', color: '#991B1B', label: 'High' }
  if (severity === 'medium') return { bg: '#FEF3C7', color: '#92400E', label: 'Medium' }
  return { bg: DETAIL_MINT_LIGHT, color: '#047857', label: 'Low' }
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
          PRO Feature: Unlock 12-Point Diagnostics
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

function HealthGauge({ score }: { score: number }) {
  const r = 36
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  return (
    <svg height="88" viewBox="0 0 88 88" width="88" aria-hidden>
      <circle className="health-gauge-track" cx="44" cy="44" r={r} />
      <circle className="health-gauge-fill" cx="44" cy="44" r={r} strokeDasharray={c} strokeDashoffset={offset} />
      <text fill="#000" fontFamily="Unbounded, sans-serif" fontSize="16" fontWeight="900" textAnchor="middle" x="44" y="48">{score}%</text>
    </svg>
  )
}

function FullReportModal({ checkIn, onClose }: { checkIn: HealthCheckIn; onClose: () => void }) {
  const rows = getFullDiagnosisReport(checkIn)
  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/40" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none">
        <div className="neo-card rounded-2xl border-2 border-black bg-white p-5 w-full max-w-md max-h-[85vh] overflow-y-auto pointer-events-auto flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000', textTransform: 'uppercase' }}>
              Full Diagnosis Report
            </span>
            <button type="button" onClick={onClose} className="size-8 rounded-full border-2 border-black bg-black cursor-pointer flex items-center justify-center" aria-label="Close">
              <svg fill="none" height="14" viewBox="0 0 18 18" width="14"><path d="M4.5 4.5l9 9m0-9l-9 9" stroke="white" strokeLinecap="round" strokeWidth="2" /></svg>
            </button>
          </div>
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-0.5 border-b border-black/10 pb-2 last:border-0">
              <span className="detail-stat-label">{row.label}</span>
              <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 13, color: '#000' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function HealthLogTimelineItem({ log, onPhotoClick }: { log: PlantHealthLog; onPhotoClick?: (photo: string) => void }) {
  const dateLabel = useClientLogDate(log.timestamp)
  const severity = severityStyle(log.severity)

  return (
    <div className="flex gap-3 w-full min-w-0">
      <button
        type="button"
        onClick={() => onPhotoClick?.(log.photo)}
        className="shrink-0 size-14 rounded-xl border-2 border-black overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
        aria-label={`View health photo from ${dateLabel}`}
      >
        <PlantPhoto photo={log.photo} alt="" className="w-full h-full object-cover" />
      </button>
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 12, color: '#666' }}>{dateLabel}</span>
          {log.analyzedByAI && (
            <span
              className="rounded-full border border-black px-2 py-0.5"
              style={{ background: '#EEF2FF', fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 9, color: '#4338CA' }}
            >
              AI
            </span>
          )}
          <span
            className="rounded-full border border-black px-2 py-0.5"
            style={{ background: severity.bg, fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 9, color: severity.color }}
          >
            {severity.label}
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

function HealthLogTimeline({
  logs,
  onPhotoClick,
}: {
  logs: PlantHealthLog[]
  onPhotoClick?: (photo: string) => void
}) {
  if (logs.length === 0) {
    return (
      <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 13, color: '#888', lineHeight: 1.4 }}>
        No health check-ins yet. Log a photo check to track progress over time.
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
  onSaveCheckIn: (data: CheckInSubmitData) => void
  onSaveHealthLog: (data: HealthLogSubmitData) => void
  onRecordWatering?: () => void
  onPhotoClick?: (photo: string) => void
}

function HealthTrackerBody({
  plant,
  previewMode = false,
  onOpenCheckIn,
  onOpenHealthAnalysis,
  onRecordWatering,
  onPhotoClick,
}: {
  plant: Plant
  previewMode?: boolean
  onOpenCheckIn: () => void
  onOpenHealthAnalysis: () => void
  onRecordWatering?: () => void
  onPhotoClick?: (photo: string) => void
}) {
  const [showReport, setShowReport] = useState(false)
  const lastCheckIn = previewMode ? PREVIEW_CHECK_IN : getLatestCheckIn(plant.checkIns)
  const health = calculateHealthScore(lastCheckIn)
  const summaryGrid = getDiagnosisSummaryGrid(lastCheckIn)
  const actionCtas = lastCheckIn ? getHealthActionCtas(lastCheckIn) : []
  const allHealthy = lastCheckIn ? isFullyHealthy(lastCheckIn) : false
  const healthLogs = previewMode ? [] : (plant.healthLogs ?? [])

  function handleCtaClick(id: string) {
    if (id === 'water') {
      onRecordWatering?.()
      return
    }
    onOpenCheckIn()
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="rounded-2xl p-4 flex gap-4 items-center w-full" style={{ background: DETAIL_MINT_LIGHT, border: '2px solid #000' }}>
        <HealthGauge score={health.score} />
        <div className="flex flex-col gap-1 min-w-0">
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>
            Overall Health Score
          </span>
          <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 13, color: '#666' }}>
            {health.summary}
          </span>
          <span
            className="inline-flex self-start rounded-full px-2 py-0.5 border border-black mt-0.5"
            style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 10, color: '#047857', background: '#fff' }}
          >
            {health.statusText}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 9, color: '#888', textTransform: 'uppercase' }}>
            Diagnosis Overview
          </span>
          {lastCheckIn && (
            <button
              type="button"
              onClick={() => setShowReport(true)}
              className="rounded-full border-2 border-black px-2.5 py-1 cursor-pointer text-[9px] uppercase"
              style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, color: '#000', background: '#fff' }}
            >
              Full Report
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 w-full">
          {summaryGrid.map((cell) => (
            <div
              key={cell.id}
              className="neo-card rounded-xl border-2 border-black bg-white p-3 flex flex-col gap-1 min-w-0"
              style={{ boxShadow: cell.isWarning ? 'none' : '2px 2px 0px 0px rgba(0,0,0,1)' }}
            >
              <div className="flex items-center gap-1.5">
                <span aria-hidden>{cell.emoji}</span>
                <span className="detail-stat-label truncate">{cell.label}</span>
              </div>
              <span
                style={{
                  fontFamily: 'Geist, sans-serif',
                  fontWeight: 600,
                  fontSize: 12,
                  color: cell.isWarning ? '#92400E' : '#000',
                  lineHeight: 1.3,
                }}
              >
                {cell.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {!allHealthy && actionCtas.length > 0 && (
        <div className="flex flex-col gap-2 w-full">
          {actionCtas.map((cta) => (
            <button
              key={cta.id}
              type="button"
              onClick={() => handleCtaClick(cta.id)}
              className="flex w-full items-center justify-center rounded-full border-2 border-black cursor-pointer active:scale-[0.98] transition-transform min-h-[44px] px-4 py-2 text-center"
              style={{
                background: cta.variant === 'primary' ? GREEN : '#FFF4E5',
                fontFamily: 'Unbounded, sans-serif',
                fontWeight: 900,
                fontSize: 10,
                color: '#000',
                boxShadow: '2px 2px 0px 0px rgba(0,0,0,1)',
              }}
            >
              {cta.label}
            </button>
          ))}
        </div>
      )}

      <div className="neo-card rounded-2xl border-2 border-black bg-white p-4 flex flex-col gap-2 w-full">
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000', textTransform: 'uppercase' }}>
          Care Guidelines
        </span>
        <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000', lineHeight: 1.5 }}>
          {plant.careNote.trim() || 'Loves indirect light. Keep soil evenly moist and wipe leaves weekly.'}
        </p>
      </div>

      <button
        type="button"
        onClick={onOpenHealthAnalysis}
        className="gemini-analyze-btn relative w-full flex items-center justify-center gap-2 px-6 py-3.5"
      >
        <span className="gemini-analyze-btn__shine" aria-hidden />
        <span
          className="relative z-10"
          style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#fff', lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}
        >
          LOG HEALTH WITH AI PHOTO
        </span>
      </button>

      <button
        type="button"
        onClick={onOpenCheckIn}
        className="btn-primary btn-green flex w-full items-center justify-center rounded-full border-2 border-black cursor-pointer"
        style={{ background: GREEN, height: 52, boxShadow: '2px 2px 0px 0px rgba(0,0,0,1)' }}
      >
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>
          Run Comprehensive Diagnosis
        </span>
      </button>

      <div className="neo-card rounded-2xl border-2 border-black bg-white p-4 flex flex-col gap-3 w-full">
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000', textTransform: 'uppercase' }}>
          Health Timeline
        </span>
        <HealthLogTimeline logs={healthLogs} onPhotoClick={onPhotoClick} />
      </div>

      {showReport && lastCheckIn && (
        <FullReportModal checkIn={lastCheckIn} onClose={() => setShowReport(false)} />
      )}
    </div>
  )
}

export default function PlantHealthTracker({
  plant,
  isPro,
  onUpgrade,
  onSaveCheckIn,
  onSaveHealthLog,
  onRecordWatering,
  onPhotoClick,
}: PlantHealthTrackerProps) {
  const [showCheckIn, setShowCheckIn] = useState(false)
  const [showHealthAnalysis, setShowHealthAnalysis] = useState(false)

  const lastCheckIn = isPro ? getLatestCheckIn(plant.checkIns) : PREVIEW_CHECK_IN
  const health = calculateHealthScore(lastCheckIn)
  const checkInLabel = useClientCheckInLabel(isPro ? lastCheckIn : PREVIEW_CHECK_IN)

  function handleOpenCheckIn() {
    if (!isPro) {
      onUpgrade()
      return
    }
    setShowCheckIn(true)
  }

  function handleOpenHealthAnalysis() {
    if (!isPro) {
      onUpgrade()
      return
    }
    setShowHealthAnalysis(true)
  }

  function handleSubmitCheckIn(data: CheckInSubmitData) {
    onSaveCheckIn(data)
    setShowCheckIn(false)
  }

  function handleSubmitHealthLog(data: HealthLogSubmitData) {
    onSaveHealthLog(data)
    setShowHealthAnalysis(false)
  }

  return (
    <>
      <div className="neo-card relative rounded-3xl shrink-0 w-full overflow-hidden">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3 w-full min-w-0">
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>
              Health Tracker
            </span>
            <span
              className="shrink-0 rounded-full px-3 py-1 border-2 border-black max-w-[55%] truncate"
              style={{
                background: health.isOutOfDate ? '#FFF4E5' : DETAIL_MINT_LIGHT,
                fontFamily: 'Geist, sans-serif',
                fontWeight: 700,
                fontSize: 11,
                color: health.isOutOfDate ? '#92400E' : '#047857',
              }}
            >
              {checkInLabel}
            </span>
          </div>

          {isPro ? (
            <HealthTrackerBody
              plant={plant}
              onOpenCheckIn={handleOpenCheckIn}
              onOpenHealthAnalysis={handleOpenHealthAnalysis}
              onRecordWatering={onRecordWatering}
              onPhotoClick={onPhotoClick}
            />
          ) : (
            <div className="relative min-h-[380px]">
              <div className="pro-section-preview">
                <HealthTrackerBody
                  plant={plant}
                  previewMode
                  onOpenCheckIn={handleOpenCheckIn}
                  onOpenHealthAnalysis={handleOpenHealthAnalysis}
                />
              </div>
              <ProSectionLock onUpgrade={onUpgrade} />
            </div>
          )}
        </div>
      </div>

      {showCheckIn && isPro && (
        <CheckInSheet
          plantName={plant.name}
          lastCheckIn={getLatestCheckIn(plant.checkIns)}
          onClose={() => setShowCheckIn(false)}
          onSubmit={handleSubmitCheckIn}
        />
      )}

      {showHealthAnalysis && isPro && (
        <HealthAnalysisSheet
          plantName={plant.name}
          onClose={() => setShowHealthAnalysis(false)}
          onSubmit={handleSubmitHealthLog}
        />
      )}
    </>
  )
}
