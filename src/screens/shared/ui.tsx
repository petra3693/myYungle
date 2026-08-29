import { type AnalyzePlantHealthResult } from '@/lib/analyzePlantHealth'
import { GREEN } from '@/screens/shared/constants'
import { confidenceColor, healthScoreColor, healthStatusLabel, severityColor } from '@/screens/shared/helpers'
import { IconAlert, IconCheck, IconLeaf, IconNavAdd, IconNavCalendar, IconNavHealth, IconNavHome, IconNavSettings, IconRuler } from '@/screens/shared/icons'
import { type Tab } from '@/types/screens'
import Spline from '@splinetool/react-spline'
import { Component, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

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
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`toggle-switch tap-target ${on ? 'is-on' : ''}`}
    >
      <div className="toggle-switch__knob" />
    </button>
  )
}

function DayPill({ label, active, onClick, disabled }: { label: string; active: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`day-pill ${active ? 'is-active' : ''}`}
      style={{ width: 46, height: 46, fontSize: 16, opacity: disabled ? 0.35 : 1 }}
    >
      {label}
    </button>
  )
}

const AI_THINKING_SCENE_URL = 'https://prod.spline.design/uTHVwstWqr3EZSQv/scene.splinecode'

// The Spline scene's camera frames its subject at a fixed pixel scale, so a
// canvas smaller than this crops the edges. Render it at full native size and
// scale the whole thing down with CSS to fit whatever `size` is requested —
// that keeps the full, uncropped animation visible at any display size.
const AI_THINKING_NATIVE_SIZE = 640

/** Spline scenes load over the network at runtime — on a slow or offline connection this never resolves, so it's given a hard deadline. */
const SPLINE_LOAD_TIMEOUT_MS = 3000

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** Catches synchronous/render-time failures from the Spline scene (e.g. WebGL unavailable) so AiThinkingLoader can fall back locally instead of tripping the app-level ErrorBoundary. */
class SplineErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.hasError ? null : this.props.children
  }
}

/** Brand-matching CSS-only stand-in for the 3D scene: the same droplet mark used on the splash screen, breathing gently while the AI works. */
function StaticThinkingLoader({ size, animate }: { size: number; animate: boolean }) {
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GREEN }}>
      <svg
        className={animate ? 'ai-fallback-pulse' : undefined}
        width={size * 0.5}
        height={size * 0.58}
        viewBox="0 0 85 116"
        fill="currentColor"
      >
        <path d="M42.5 2.9C45.9 16.9 53.7 29.9 63.9 38.2l1.1 0.9C77.4 48.9 83 59.4 83 71.9c0 11-4.4 21.6-12.1 29.4C63.2 109 52.6 113.4 42.5 113.4S21.8 109 14 101.3C6.3 93.5 1.9 82.9 1.9 71.9c0-11.6 5.7-22.7 17.2-32.2l1.1-0.9C29.5 29.9 39.1 16.9 42.5 2.9z" />
      </svg>
    </div>
  )
}

function AiThinkingLoader({ size = 160 }: { size?: number }) {
  const scale = size / AI_THINKING_NATIVE_SIZE
  const [reducedMotion] = useState(prefersReducedMotion)
  // Reduced-motion skips the 3D scene entirely — never even attempted, so it
  // starts (and stays) in the failed/fallback state.
  const [splineState, setSplineState] = useState<'loading' | 'ready' | 'failed'>(reducedMotion ? 'failed' : 'loading')

  useEffect(() => {
    if (splineState !== 'loading') return
    const timer = setTimeout(() => setSplineState('failed'), SPLINE_LOAD_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [splineState])

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: splineState === 'ready' ? 0 : 1, transition: 'opacity 0.3s ease' }}>
        <StaticThinkingLoader size={size} animate={!reducedMotion} />
      </div>
      {splineState !== 'failed' && (
        <div
          style={{
            width: AI_THINKING_NATIVE_SIZE,
            height: AI_THINKING_NATIVE_SIZE,
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${scale})`,
            opacity: splineState === 'ready' ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }}
        >
          <SplineErrorBoundary onError={() => setSplineState('failed')}>
            <Spline scene={AI_THINKING_SCENE_URL} style={{ width: '100%', height: '100%' }} onLoad={() => setSplineState('ready')} />
          </SplineErrorBoundary>
        </div>
      )}
    </div>
  )
}

function AiThinkingScreen({ label }: { label: string }) {
  const { t } = useTranslation()
  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <div className="px-6 pt-[calc(3rem+env(safe-area-inset-top,0px))] pb-10 shrink-0">
        <h1 className="font-heading" style={{ fontSize: 32, lineHeight: 1.1, color: '#fff', textTransform: 'uppercase' }}>
          {t('splash.plantsAnalysisTitle')}<br />{t('splash.plantsAnalysisSubtitle')}
        </h1>
      </div>
      <div className="sheet-body flex-1 flex flex-col items-center justify-center gap-6">
        <AiThinkingLoader size={220} />
        <span className="font-body text-center px-10" style={{ fontSize: 16, color: '#666' }}>{label}</span>
      </div>
    </div>
  )
}
// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange, onAdd, addActive }: { active: Tab | null; onChange: (t: Tab) => void; onAdd: () => void; addActive?: boolean }) {
  const { t } = useTranslation()
  const items: { id: Tab; labelKey: string; icon: (p: { size?: number }) => React.ReactNode }[] = [
    { id: 'home', labelKey: 'tabBar.home', icon: IconNavHome },
    { id: 'days', labelKey: 'tabBar.days', icon: IconNavCalendar },
  ]
  const items2: { id: Tab; labelKey: string; icon: (p: { size?: number }) => React.ReactNode }[] = [
    { id: 'health', labelKey: 'tabBar.health', icon: IconNavHealth },
    { id: 'profile', labelKey: 'tabBar.settings', icon: IconNavSettings },
  ]
  return (
    <div className="fixed left-4 right-4 z-40" style={{ bottom: 'calc(14px + env(safe-area-inset-bottom,0px))' }}>
      <div className="tab-bar">
        {items.map((item) => (
          <button key={item.id} type="button" onClick={() => onChange(item.id)} className={`tab-bar__item ${active === item.id ? 'is-active' : ''}`} aria-label={t(item.labelKey)}>
            <div className="tab-bar__icon-badge"><item.icon size={20} /></div>
            <span className="tab-bar__label">{t(item.labelKey)}</span>
          </button>
        ))}
        <button type="button" onClick={onAdd} className={`tab-bar__item ${addActive ? 'is-active' : ''}`} aria-label={t('common.addPlant')}>
          <div className="tab-bar__icon-badge"><IconNavAdd size={20} /></div>
          <span className="tab-bar__label">{t('tabBar.add')}</span>
        </button>
        {items2.map((item) => (
          <button key={item.id} type="button" onClick={() => onChange(item.id)} className={`tab-bar__item ${active === item.id ? 'is-active' : ''}`} aria-label={t(item.labelKey)}>
            <div className="tab-bar__icon-badge"><item.icon size={20} /></div>
            <span className="tab-bar__label">{t(item.labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
/**
 * healthScoreColor/confidenceColor/severityColor's "good" tier is the lime
 * brand color — reads fine on a black background (see e.g. HealthHubScreen's
 * use of healthScoreColor as text on --color-surface), but these three icons
 * sit on this card's light #E6E6E6 tiles, where lime is nearly invisible.
 * Only remaps that one tier; amber/red pass through unchanged.
 */
function iconSafeColor(color: string): string {
  return color === GREEN ? '#065f46' : color
}

function HealthReportCard({ photo, plantName, scannedAt, result }: {
  photo: string; plantName: string; scannedAt: string; result: AnalyzePlantHealthResult
}) {
  const { t } = useTranslation()
  const statusColor = iconSafeColor(healthScoreColor(result.healthScore))
  const confColor = iconSafeColor(confidenceColor(result.confidence))
  const isLowConfidence = result.confidence < 50
  return (
    <>
      <img src={photo} alt="" className="w-full rounded-[1.5rem] object-cover mb-4" style={{ height: 220 }} />
      <div className="mb-4">
        <div className="font-heading" style={{ fontSize: 22, color: '#fff' }}>{plantName}</div>
        <div className="font-body" style={{ fontSize: 13, color: '#8E8E93' }}>
          {t('health.scannedOn', { date: new Date(scannedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) })}
        </div>
      </div>
      <span className="caption-eyebrow block mb-2">{t('health.aiAnalysis')}</span>
      <div className="card-white p-5 flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl p-3 flex flex-col gap-1" style={{ background: '#E6E6E6' }}>
            <div style={{ color: statusColor }}><IconLeaf size={16} /></div>
            <span className="font-heading" style={{ fontSize: 13, lineHeight: 1.2 }}>{healthStatusLabel(result.healthScore, t)}</span>
            <span className="font-body" style={{ fontSize: 11, color: 'var(--color-ink-dim)' }}>{t('health.status')}</span>
          </div>
          <div className="rounded-2xl p-3 flex flex-col gap-1" style={{ background: '#E6E6E6' }}>
            <div style={{ color: iconSafeColor(severityColor(result.severity)) }}><IconRuler size={16} /></div>
            <span className="font-heading" style={{ fontSize: 13, lineHeight: 1.2 }}>{t(`health.severity${result.severity}`)}</span>
            <span className="font-body" style={{ fontSize: 11, color: 'var(--color-ink-dim)' }}>{t('health.severity')}</span>
          </div>
          <div className="rounded-2xl p-3 flex flex-col gap-1" style={{ background: '#E6E6E6' }}>
            <div style={{ color: confColor }}>{result.confidence >= 75 ? <IconCheck size={16} /> : <IconAlert size={16} />}</div>
            <span className="font-heading" style={{ fontSize: 13, lineHeight: 1.2 }}>{result.confidence}%</span>
            <span className="font-body" style={{ fontSize: 11, color: 'var(--color-ink-dim)' }}>{t('health.confidence')}</span>
          </div>
        </div>
        {isLowConfidence && (
          <p className="font-body" style={{ fontSize: 12, color: '#a5680f', lineHeight: 1.4 }}>{t('health.lowConfidenceHint')}</p>
        )}
        <div className="rounded-2xl p-4" style={{ background: '#E6E6E6' }}>
          <span className="caption-eyebrow" style={{ color: 'var(--color-ink-dim)' }}>{t('health.diagnosis')}</span>
          <div className="font-heading mt-1" style={{ fontSize: 18 }}>{result.diagnosis}</div>
          <p className="font-body mt-1" style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{result.treatmentNotes}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: '#E6E6E6' }}>
          <span className="caption-eyebrow" style={{ color: 'var(--color-ink-dim)' }}>{t('health.recommendedActions')}</span>
          <div className="flex flex-col gap-2 mt-2">
            {result.recommendedActions.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <div style={{ color: '#0a8f3f', marginTop: 2 }}><IconCheck size={16} /></div>
                <span className="font-body" style={{ fontSize: 14 }}>{a}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <AiDisclaimerLine />
      </div>
    </>
  )
}
/** Quiet, one-line photo-privacy disclosure shown near every capture button, with a link to the full privacy sheet. */
function AiDisclaimerLine({ color = '#8E8E93' }: { color?: string }) {
  const { t } = useTranslation()
  return (
    <p className="font-body text-center" style={{ fontSize: 13, color, lineHeight: 1.4 }}>
      {t('aiDisclaimer.line')}
    </p>
  )
}

function PrivacyHintLine({ onShowDetails, color = '#8E8E93' }: { onShowDetails: () => void; color?: string }) {
  const { t } = useTranslation()
  return (
    <p className="font-body text-center" style={{ fontSize: 13, color, lineHeight: 1.4 }}>
      {t('privacyHint.captureLine')}{' '}
      <button type="button" onClick={onShowDetails} className="font-body" style={{ fontSize: 13, color, textDecoration: 'underline' }}>
        {t('privacyHint.detailsLink')}
      </button>
    </p>
  )
}

export { IconCircleBtn, Toggle, DayPill, AiThinkingLoader, AiThinkingScreen, TabBar, HealthReportCard, AiDisclaimerLine, PrivacyHintLine }
