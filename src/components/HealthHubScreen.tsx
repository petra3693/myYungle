import { useTranslation } from 'react-i18next'
import { Lock, Stethoscope } from 'lucide-react'
import PlantPhoto from '@/components/PlantPhoto'
import { getLatestHealthLog } from '@/lib/health-log'
import { MAX_PRO_SLOTS } from '@/lib/proAccess'
import type { Plant, UserState } from '@/types/plant'

const GREEN = '#00FF66'

function plantHistoryCount(plant: Plant): number {
  return Array.isArray(plant.history) ? plant.history.length : 0
}

function ActivePlantCard({ plant, onOpen }: { plant: Plant; onOpen: () => void }) {
  const { t } = useTranslation()
  const latest = getLatestHealthLog(plant.healthLogs)
  const timelineCount = plantHistoryCount(plant)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="neo-card health-hub-card w-full text-left cursor-pointer overflow-hidden"
    >
      <div className="flex gap-3 p-3">
        <PlantPhoto photo={plant.photo} alt={plant.name} className="size-16 rounded-xl object-cover border-2 border-black shrink-0" />
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className="truncate"
              style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}
            >
              {plant.name}
            </p>
            <span
              className="rounded-full border-2 border-black px-1.5 py-px shrink-0"
              style={{ background: GREEN, fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 7, color: '#000' }}
            >
              {t('common.pro')}
            </span>
          </div>
          <p
            className="truncate"
            style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 12, color: '#000', lineHeight: 1.35 }}
          >
            {latest ? `${latest.healthScore}% · ${latest.diagnosis}` : t('healthHub.noScans')}
          </p>
          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 11, color: '#888' }}>
            {timelineCount > 0
              ? t('healthHub.timelineCount', { count: timelineCount })
              : t('healthHub.noTimeline')}
          </p>
        </div>
      </div>
    </button>
  )
}

function LockedPlantCard({ plant, onUnlock }: { plant: Plant; onUnlock: () => void }) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onUnlock}
      className="neo-card health-hub-card health-hub-card--locked relative w-full text-left cursor-pointer overflow-hidden"
      aria-label={t('healthHub.unlockPlant', { name: plant.name })}
    >
      <div className="flex gap-3 p-3">
        <div className="relative size-16 shrink-0">
          <PlantPhoto photo={plant.photo} alt="" className="health-hub-card__photo size-16 rounded-xl object-cover border-2 border-black" />
          <div className="absolute inset-0 rounded-xl bg-white/40" aria-hidden />
          <div
            className="absolute inset-0 flex items-center justify-center"
            aria-hidden
          >
            <div
              className="flex items-center justify-center size-8 rounded-full border-2 border-black"
              style={{ background: GREEN }}
            >
              <Lock className="size-3.5 text-black" strokeWidth={2.5} />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1 min-w-0 flex-1 justify-center">
          <p
            className="truncate"
            style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}
          >
            {plant.name}
          </p>
          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 11, color: '#888' }}>
            {t('healthHub.lockedPreview')}
          </p>
        </div>
      </div>
    </button>
  )
}

export default function HealthHubScreen({
  plants,
  user,
  onOpenPlant,
  onShowPaywall,
}: {
  plants: Plant[]
  user: UserState
  onOpenPlant: (plant: Plant) => void
  onShowPaywall: () => void
}) {
  const { t } = useTranslation()
  const activePlants = user.isProUser ? plants : plants.filter((p) => p.isProSlotActivated)
  const lockedPlants = user.isProUser ? [] : plants.filter((p) => !p.isProSlotActivated)

  return (
    <div className="flex flex-col h-full" style={{ background: '#F2ECEC' }}>
      <div className="app-header">
        <div className="flex items-center gap-2">
          <Stethoscope className="size-5" strokeWidth={2.5} aria-hidden />
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 20, color: '#000' }}>
            {t('healthHub.title')}
          </span>
        </div>
        {!user.isProUser && (
          <span
            className="rounded-full border-2 border-black px-2 py-1"
            style={{ background: GREEN, fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 8, color: '#000' }}
          >
            {t('common.pro')}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-5">
        <div
          className="neo-card rounded-2xl border-2 border-black px-4 py-3"
          style={{ background: user.isProUser ? GREEN : '#fff' }}
        >
          <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>
            {user.isProUser
              ? t('healthHub.slotsBannerPro')
              : t('healthHub.slotsBanner', { used: user.proSlotsUsed, max: MAX_PRO_SLOTS })}
          </p>
        </div>

        {plants.length === 0 ? (
          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#888' }}>
            {t('healthHub.noPlants')}
          </p>
        ) : (
          <>
            <section className="flex flex-col gap-3">
              <p className="section-header" style={{ fontSize: 13 }}>{t('healthHub.active')}</p>
              {activePlants.length === 0 ? (
                <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 13, color: '#888', lineHeight: 1.45 }}>
                  {t('healthHub.noActive')}
                </p>
              ) : (
                activePlants.map((plant) => (
                  <ActivePlantCard key={plant.id} plant={plant} onOpen={() => onOpenPlant(plant)} />
                ))
              )}
            </section>

            {lockedPlants.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="section-header" style={{ fontSize: 13 }}>{t('healthHub.locked')}</p>
                  <button
                    type="button"
                    onClick={onShowPaywall}
                    className="btn-primary btn-green inline-flex items-center justify-center rounded-full border-2 border-black cursor-pointer px-3 py-1.5"
                    style={{ background: GREEN }}
                  >
                    <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 9, color: '#000' }}>
                      {t('healthHub.unlockAll')}
                    </span>
                  </button>
                </div>
                {lockedPlants.map((plant) => (
                  <LockedPlantCard key={plant.id} plant={plant} onUnlock={onShowPaywall} />
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
