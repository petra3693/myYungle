import PlantPhoto from '@/components/PlantPhoto'
import { GREEN } from '@/screens/shared/constants'
import { IconChevronLeft } from '@/screens/shared/icons'
import { IconCircleBtn } from '@/screens/shared/ui'
import { type Plant } from '@/types/plant'
import { useTranslation } from 'react-i18next'

// ─── Screen: Growth history ─────────────────────────────────────────────────

function GrowthHistoryScreen({ plant, onBack, onNewScan }: {
  plant: Plant; onBack: () => void; onNewScan: () => void
}) {
  const { t } = useTranslation()
  const entries = plant.history
  const hasEntries = entries.length > 0
  const oldest = hasEntries ? entries[entries.length - 1] : null
  const newest = hasEntries ? entries[0] : null
  const monthsTracked = oldest ? Math.max(1, Math.round((Date.now() - new Date(oldest.date).getTime()) / (30.44 * 86400000))) : 0
  const growthCm =
    oldest && newest && oldest.heightCm !== undefined && newest.heightCm !== undefined
      ? Math.max(0, newest.heightCm - oldest.heightCm)
      : null
  const currentYear = new Date().getFullYear()

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
        <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft /></IconCircleBtn>
        <span className="font-heading truncate px-2" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>{t('growthHistory.title')}</span>
        <div style={{ width: 44 }} />
      </div>
      <div className="scroll-y flex-1 px-5 pb-28">
        <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: 'var(--color-surface)' }}>
          <PlantPhoto photo={plant.photo} alt={plant.name} className="rounded-2xl object-cover shrink-0 w-14 h-14" />
          <div className="min-w-0">
            <div className="font-heading truncate" style={{ fontSize: 17, color: '#fff' }}>{plant.name}</div>
            <div className="font-body" style={{ fontSize: 13, color: '#8E8E93' }}>
              {oldest ? t('growthHistory.firstLogged', { date: new Date(oldest.date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) }) : t('growthHistory.noEntriesYet')}
            </div>
          </div>
        </div>

        {hasEntries && (
          <div className="rounded-2xl px-4 py-3 mt-3 flex items-center justify-center" style={{ background: '#000' }}>
            <span className="font-heading text-center" style={{ fontSize: 12, color: GREEN, textTransform: 'uppercase' }}>
              {t('growthHistory.stats', { count: entries.length, months: monthsTracked, monthsPlural: monthsTracked === 1 ? '' : 's' })}
              {growthCm !== null && growthCm > 0 ? t('growthHistory.statsGrowth', { cm: growthCm }) : ''}
            </span>
          </div>
        )}

        {hasEntries ? (
          <>
            <span className="caption-eyebrow block mt-6 mb-3">{t('growthHistory.timelineJourney')}</span>
            <div className="flex flex-col">
              {entries.map((entry, i) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center shrink-0" style={{ width: 12 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 9999, background: GREEN, flexShrink: 0, marginTop: 4 }} />
                    {i < entries.length - 1 && <span style={{ width: 1.5, flex: 1, background: '#333', marginTop: 2 }} />}
                  </div>
                  <div className="flex-1 min-w-0 pb-5">
                    <span className="font-heading inline-block shrink-0 mb-2" style={{ fontSize: 11, background: GREEN, color: '#000', borderRadius: 6, padding: '3px 7px' }}>
                      {new Date(entry.date)
                        .toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: new Date(entry.date).getFullYear() !== currentYear ? 'numeric' : undefined,
                        })
                        .toUpperCase()}
                    </span>
                    <div className="flex items-center gap-3">
                      <PlantPhoto photo={entry.photo} alt="" className="rounded-xl object-cover shrink-0 w-12 h-12" />
                      <div className="min-w-0">
                        <div className="font-heading truncate" style={{ fontSize: 15, color: '#fff' }}>
                          {entry.estimatedAge}{entry.heightCm !== undefined && entry.heightCm > 0 ? ` · ${entry.heightCm}cm` : ''}
                        </div>
                        <div className="font-body truncate" style={{ fontSize: 13, color: '#8E8E93' }}>{entry.note}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="font-body text-center mt-10" style={{ fontSize: 14, color: '#8E8E93' }}>{t('growthHistory.noCheckins')}</p>
        )}
      </div>
      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-3 shrink-0">
        <button type="button" onClick={onNewScan} className="btn-fill w-full" style={{ height: 56, fontSize: 15 }}>{t('growthHistory.newScan')}</button>
      </div>
    </div>
  )
}

export default GrowthHistoryScreen
