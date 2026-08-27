import PlantPhoto from '@/components/PlantPhoto'
import { GREEN } from '@/screens/shared/constants'
import { daysAgoLabel, healthScoreColor } from '@/screens/shared/helpers'
import { IconCamera, IconChevronRight, IconLeaf, IconLock } from '@/screens/shared/icons'
import { type Plant } from '@/types/plant'
import { useTranslation } from 'react-i18next'

function HealthHubScreen({ plants, isPro, canScan, onScanNew, onCheckExisting, onOpenPlant, onShowPro }: {
  plants: Plant[]; isPro: boolean; canScan: boolean
  onScanNew: () => void; onCheckExisting: () => void; onOpenPlant: (p: Plant) => void; onShowPro: () => void
}) {
  const { t } = useTranslation()
  const recentChecks = plants
    .flatMap((p) => p.healthLogs.map((log) => ({ plant: p, log })))
    .sort((a, b) => new Date(b.log.timestamp).getTime() - new Date(a.log.timestamp).getTime())
    .slice(0, 6)

  return (
    <div className="scroll-y h-full px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-28">
      {isPro && <span className="btn-outline-pro inline-block" style={{ fontSize: 11, padding: '3px 10px', marginBottom: 12 }}>PRO</span>}
      <h1 className="font-heading" style={{ fontSize: 26, color: '#fff' }}>{t('health.hubTitle')}</h1>
      <p className="font-body" style={{ fontSize: 14, color: '#8E8E93', marginTop: 4, marginBottom: 20 }}>
        {t('health.hubSubtitle')}
      </p>

      <button type="button" onClick={canScan ? onScanNew : onShowPro} className="card-white p-4 flex items-center gap-3 w-full text-left mb-3">
        <div className="flex items-center justify-center rounded-full shrink-0" style={{ width: 44, height: 44, background: '#111', color: GREEN }}>
          <IconCamera size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading" style={{ fontSize: 16 }}>{t('health.scanNewPlant')}</div>
          <div className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>{t('health.scanNewPlantDesc')}</div>
        </div>
        <div style={{ color: 'var(--color-ink-dim)' }}>{canScan ? <IconChevronRight size={18} /> : <IconLock size={18} />}</div>
      </button>

      <button
        type="button"
        onClick={canScan ? onCheckExisting : onShowPro}
        disabled={canScan && plants.length === 0}
        className="card-white p-4 flex items-center gap-3 w-full text-left"
        style={{ opacity: canScan && plants.length === 0 ? 0.5 : 1 }}
      >
        <div className="flex items-center justify-center rounded-full shrink-0" style={{ width: 44, height: 44, background: '#111', color: GREEN }}>
          <IconLeaf size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading" style={{ fontSize: 16 }}>{t('health.checkExisting')}</div>
          <div className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>{t('health.checkExistingDesc')}</div>
        </div>
        <div style={{ color: 'var(--color-ink-dim)' }}>{canScan ? <IconChevronRight size={18} /> : <IconLock size={18} />}</div>
      </button>

      {recentChecks.length > 0 && (
        <>
          <h2 className="font-heading mt-6 mb-3" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>{t('health.recentChecks')}</h2>
          <div className="flex flex-col gap-3">
            {recentChecks.map(({ plant, log }) => {
              const healthy = log.healthScore >= 70
              return (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => onOpenPlant(plant)}
                  className="flex items-center gap-3 w-full p-3 rounded-2xl text-left"
                  style={{ background: 'var(--color-surface)' }}
                >
                  <PlantPhoto photo={plant.photo} alt={plant.name} className="rounded-2xl object-cover shrink-0 w-12 h-12" />
                  <div className="flex-1 min-w-0">
                    <div className="font-heading truncate" style={{ fontSize: 15, color: '#fff' }}>{plant.name}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="font-body" style={{ fontSize: 12, color: '#8E8E93' }}>{daysAgoLabel(log.timestamp, t)}</span>
                      <span style={{ width: 4, height: 4, borderRadius: 9999, background: '#8E8E93' }} />
                      <span className="font-body font-semibold" style={{ fontSize: 13, color: healthScoreColor(log.healthScore) }}>{healthy ? t('health.healthy') : t('health.needsAttention')}</span>
                    </div>
                  </div>
                  <div style={{ color: '#8E8E93' }}><IconChevronRight size={18} /></div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default HealthHubScreen
