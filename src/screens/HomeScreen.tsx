import PlantPhoto from '@/components/PlantPhoto'
import { localDateString } from '@/lib/dailyRollover'
import { dueStatusForDay } from '@/lib/wateringDue'
import { GREEN } from '@/screens/shared/constants'
import { computeHealthStatus, nextWaterStatus } from '@/screens/shared/helpers'
import { IconAlert, IconBell, IconBellOff, IconLeaf, IconSparkles, IconX } from '@/screens/shared/icons'
import { isLowConfidence } from '@/screens/shared/storage'
import { type Plant } from '@/types/plant'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

function HomeScreen({
  plants, todayIdx, onOpenPlant, onEditPlant, onMarkAllWateredToday, onGoToDays,
  showHabitCard, onDismissHabitCard, onShowHabitPro,
  showProPreviewBanner, onDismissProPreviewBanner, onTryProPreview,
  notificationsEnabled, onOpenNotificationSettings,
}: {
  plants: Plant[]; todayIdx: number; onOpenPlant: (p: Plant) => void; onEditPlant: (p: Plant) => void
  onMarkAllWateredToday: () => void; onGoToDays: () => void
  showHabitCard: boolean; onDismissHabitCard: () => void; onShowHabitPro: () => void
  showProPreviewBanner: boolean; onDismissProPreviewBanner: () => void
  onTryProPreview: () => Promise<{ ok: boolean; error?: string }>
  notificationsEnabled: boolean; onOpenNotificationSettings: () => void
}) {
  const { t } = useTranslation()
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [previewError, setPreviewError] = useState<string | null>(null)
  const { duePlants: dueToday, doneCount: doneToday } = dueStatusForDay(plants, todayIdx, new Date(), localDateString(new Date()))
  const needsWaterToday = dueToday.length - doneToday
  const healthScores = plants.map((p) => computeHealthStatus(p, todayIdx, t).score)
  const avgHealth = healthScores.length > 0 ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length) : 0

  async function handleTryPreview() {
    setPreviewState('loading')
    setPreviewError(null)
    const result = await onTryProPreview()
    if (result.ok) {
      setPreviewState('success')
    } else {
      setPreviewState('error')
      setPreviewError(result.error ?? t('analysisResult.proPreviewError'))
    }
  }

  return (
    <div className="app-shell-light scroll-y h-full px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-28">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-heading" style={{ fontSize: 22, color: '#000' }}>{t('home.title')}</h1>
        <button
          type="button"
          onClick={onOpenNotificationSettings}
          className="icon-circle"
          style={{ background: notificationsEnabled ? '#000' : '#e5e5e0' }}
          aria-label={t('notificationSettings.title')}
        >
          <div style={{ color: notificationsEnabled ? '#fff' : 'var(--color-ink-dim)' }}>
            {notificationsEnabled ? <IconBell size={18} /> : <IconBellOff size={18} />}
          </div>
        </button>
      </div>
      {needsWaterToday > 0 ? (
        <div className="stat-hero mb-3">
          <span className="stat-hero__value">{needsWaterToday}</span>
          <span className="stat-hero__label">{t('home.wateringToday', { count: needsWaterToday })}</span>
        </div>
      ) : (
        <div className="stat-hero mb-3" style={{ justifyContent: 'center' }}>
          <span className="stat-hero__label" style={{ fontSize: 18, fontWeight: 700 }}>{t('home.allWateredToday')}</span>
        </div>
      )}
      {needsWaterToday > 0 && (
        <button type="button" onClick={onMarkAllWateredToday} className="btn-fill w-full mb-6" style={{ height: 52, fontSize: 15 }}>
          {t('home.markAllWateredToday', { count: needsWaterToday })}
        </button>
      )}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="stat-pill" style={{ background: '#E6E6E6' }}>
          <span className="stat-pill__value" style={{ color: '#000' }}>{plants.length}</span>
          <span className="stat-pill__label">{t('home.totalPlants')}</span>
        </div>
        <div className="stat-pill" style={{ background: '#000' }}>
          <span className="stat-pill__value" style={{ color: GREEN }}>{plants.length === 0 ? '—' : `${avgHealth}%`}</span>
          <span className="stat-pill__label" style={{ color: 'var(--color-text-dim)' }}>{t('home.avgHealth')}</span>
        </div>
      </div>
      {showProPreviewBanner && previewState !== 'success' && (
        <div className="rounded-2xl p-4 mb-6 relative" style={{ background: '#000' }}>
          <button
            type="button"
            aria-label={t('common.dismiss')}
            onClick={onDismissProPreviewBanner}
            className="absolute flex items-center justify-center rounded-full"
            style={{ top: 2, right: 2, width: 44, height: 44, color: 'rgba(255,255,255,0.5)' }}
          >
            <IconX size={14} />
          </button>
          <div className="flex items-center gap-2 mb-1 pr-6">
            <div style={{ color: GREEN }}><IconSparkles size={16} /></div>
            <span className="font-heading" style={{ fontSize: 14, color: '#fff', textTransform: 'uppercase' }}>{t('analysisResult.proPreviewTitle')}</span>
          </div>
          <p className="font-body" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>
            {t('analysisResult.proPreviewBody')}
          </p>
          <button
            type="button"
            onClick={() => void handleTryPreview()}
            disabled={previewState === 'loading'}
            className="btn-fill w-full"
            style={{ height: 44, fontSize: 13 }}
          >
            {previewState === 'loading' ? t('analysisResult.proPreviewActivating') : t('analysisResult.proPreviewTryFree')}
          </button>
          {previewState === 'error' && previewError && (
            <p className="font-body text-center mt-2" style={{ fontSize: 13, color: '#ff8a8a' }}>{previewError}</p>
          )}
        </div>
      )}
      {previewState === 'success' && (
        <div className="rounded-2xl p-4 mb-6 flex items-center gap-2 justify-center" style={{ background: '#000' }}>
          <div style={{ color: GREEN }}><IconSparkles size={16} /></div>
          <span className="font-heading" style={{ fontSize: 13, color: GREEN, textTransform: 'uppercase' }}>{t('analysisResult.proPreviewActivated')}</span>
        </div>
      )}
      {showHabitCard && (
        <div className="card-white p-4 flex items-center gap-3 w-full mb-6 relative">
          <button type="button" onClick={onShowHabitPro} className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <div className="flex items-center justify-center rounded-full shrink-0" style={{ width: 44, height: 44, background: '#111', color: GREEN }}>
              <IconLeaf size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-heading" style={{ fontSize: 15 }}>{t('home.habitCardTitle')}</div>
              <div className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>{t('home.habitCardBody')}</div>
            </div>
          </button>
          <button
            type="button"
            aria-label={t('common.dismiss')}
            onClick={onDismissHabitCard}
            className="tap-target flex items-center justify-center rounded-full shrink-0"
            style={{ width: 24, height: 24, color: 'var(--color-ink-dim)' }}
          >
            <IconX size={14} />
          </button>
        </div>
      )}
      {plants.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div style={{ color: '#c7c7cc' }}><IconLeaf size={40} /></div>
          <p className="font-body" style={{ fontSize: 14, color: '#666' }}>{t('home.emptyState')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {plants.map((p) => {
            const status = nextWaterStatus(p, todayIdx, t)
            const lowConfidenceId = isLowConfidence(p.confidence)
            return (
              <div key={p.id} className="relative">
                <button type="button" onClick={() => onOpenPlant(p)} className="plant-tile text-left w-full">
                  <div className="plant-tile__photo">
                    <PlantPhoto photo={p.photo} alt={p.name} className="w-full h-full object-cover block" />
                  </div>
                  <div className="plant-tile__label">
                    <div className="font-heading truncate" style={{ fontSize: 15, color: '#111' }}>{p.name}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span style={{ width: 6, height: 6, borderRadius: 9999, background: status.dotColor, flexShrink: 0 }} />
                      <span className="font-body truncate" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>{status.label}</span>
                    </div>
                  </div>
                </button>
                {lowConfidenceId && (
                  <button
                    type="button"
                    aria-label={t('plantDetail.lowConfidenceHint')}
                    title={t('plantDetail.lowConfidenceHint')}
                    onClick={(e) => { e.stopPropagation(); onEditPlant(p) }}
                    className="plant-tile__badge tap-target flex items-center gap-1"
                  >
                    <IconAlert size={11} />
                    {t('plantDetail.verifyName')}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
      <button
        type="button"
        onClick={onGoToDays}
        className="font-body w-full text-center mt-6"
        style={{ fontSize: 13, color: 'var(--color-ink-dim)', textDecoration: 'underline' }}
      >
        {t('home.viewInDays')}
      </button>
    </div>
  )
}

export default HomeScreen
