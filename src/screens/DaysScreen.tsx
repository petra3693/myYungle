import PlantPhoto from '@/components/PlantPhoto'
import { localDateString } from '@/lib/dailyRollover'
import { dueStatusForDay, getDateForDayIndex, markPlantsWatered } from '@/lib/wateringDue'
import { DAYS } from '@/screens/shared/constants'
import { fullDayName, shortDayName } from '@/screens/shared/helpers'
import { IconCheck, IconChevronLeft, IconMenu } from '@/screens/shared/icons'
import { DayPill, IconCircleBtn } from '@/screens/shared/ui'
import { type Plant } from '@/types/plant'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

// ─── Screen: Days ─────────────────────────────────────────────────────────────

function DaysScreen({ plants, todayIdx, onToggleWatered, onBack, onOpenScheduleSettings }: {
  plants: Plant[]; todayIdx: number; onToggleWatered: (id: string, dateStr: string) => void; onBack: () => void
  onOpenScheduleSettings: () => void
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(todayIdx)
  const groupedDays = useMemo(() => {
    const set = new Set<number>()
    plants.forEach((p) => p.wateringDays.forEach((d) => set.add(d)))
    return set
  }, [plants])
  const todayName = fullDayName(t, selected)
  const selectedDate = getDateForDayIndex(selected)
  const selectedDateStr = localDateString(selectedDate)
  const isFutureDay = selectedDateStr > localDateString(new Date())
  const { duePlants, doneCount, allDone } = dueStatusForDay(plants, selected, selectedDate, selectedDateStr)
  const isWateredOnSelected = (p: Plant) => p.wateredDates.includes(selectedDateStr)

  function handleMarkAll() {
    if (isFutureDay) return
    if (allDone) {
      duePlants.forEach((p) => onToggleWatered(p.id, selectedDateStr))
    } else {
      markPlantsWatered(duePlants, selectedDateStr, onToggleWatered)
    }
  }

  return (
    <div className="app-shell-light scroll-y h-full px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-28">
      <div className="flex items-center justify-between mb-5">
        <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft size={20} /></IconCircleBtn>
        <IconCircleBtn onClick={onOpenScheduleSettings} label={t('scheduleSettings.title')}><IconMenu size={20} /></IconCircleBtn>
      </div>
      <p className="font-body" style={{ fontSize: 15, color: '#666', marginBottom: 20 }}>
        {t('days.groupedSummary', { count: plants.length, days: groupedDays.size, daysPlural: groupedDays.size === 1 ? '' : 's' })}
      </p>
      <div className="flex justify-between mb-6">
        {DAYS.map((d, i) => (
          <div key={d} className="flex flex-col items-center gap-1.5">
            <DayPill label={shortDayName(t, i)[0]} active={i === selected} onClick={() => setSelected(i)} />
            <span style={{ width: 5, height: 5, borderRadius: 9999, background: groupedDays.has(i) ? '#000' : 'transparent' }} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className="font-heading" style={{ fontSize: 18, color: '#000' }}>
          {selected === todayIdx ? t('days.today', { day: todayName }) : todayName}
        </span>
        <span className="font-heading" style={{ fontSize: 18, color: '#000' }}>
          {t('days.duePlants', { count: duePlants.length })}
        </span>
      </div>
      {isFutureDay && duePlants.length > 0 && (
        <p className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)', marginBottom: 10 }}>{t('days.futureDayHint')}</p>
      )}
      <div className="flex flex-col gap-3">
        {duePlants.length === 0 && (
          <p className="font-body" style={{ fontSize: 14, color: 'var(--color-ink-dim)' }}>{t('days.noPlantsScheduled')}</p>
        )}
        {duePlants.map((p) => {
          const watered = isWateredOnSelected(p)
          return (
            <button
              key={p.id}
              type="button"
              disabled={isFutureDay}
              onClick={() => onToggleWatered(p.id, selectedDateStr)}
              className="check-row text-left"
              style={isFutureDay ? { opacity: 0.5, cursor: 'default' } : undefined}
            >
              <PlantPhoto photo={p.photo} alt="" className="rounded-full object-cover shrink-0 w-12 h-12" />
              <span className="font-heading flex-1 min-w-0 truncate" style={{ fontSize: 18, color: '#111' }}>{p.name}</span>
              <div className={`check-circle ${watered ? 'is-checked' : ''}`}>
                {watered && <IconCheck size={14} />}
              </div>
            </button>
          )
        })}
      </div>
      {duePlants.length > 0 && !isFutureDay && (
        <button type="button" onClick={handleMarkAll} className="btn-fill w-full mt-4" style={{ height: 56, fontSize: 15 }}>
          {allDone ? t('days.undo') : t('days.markAllWatered', { done: doneCount, total: duePlants.length })}
        </button>
      )}
    </div>
  )
}

export default DaysScreen
