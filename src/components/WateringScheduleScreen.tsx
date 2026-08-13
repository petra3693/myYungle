import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import svgBatch from '@/imports/MyjungleBatchChecklist/svg-yfmp6xfqu5'
import PlantPhoto from '@/components/PlantPhoto'
import { fullDayLabel, shortDayLabel } from '@/i18n/labels'
import {
  getDateForDayIndex,
  getTodayDayIndex,
  isPlantDueOnDay,
  isPlantDueToday,
} from '@/lib/wateringDue'
import type { DayCode, Plant, WaterNeed } from '@/types/plant'

const GREEN = '#00FF66'
const BLACK = '#000000'
const DAYS: DayCode[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export interface DateItem {
  dayIdx: number
  label: string
  date: number
  dateObj: Date
  isToday: boolean
}

export interface WateringTaskGroup {
  dayIdx: number
  date: Date
  title: string
  plants: Plant[]
}

export interface WateringScreenProps {
  plants: Plant[]
  globalWaterSchedule: string[]
  todayIdx: number | null
  onMarkWatered: (id: string) => void
  onMarkAll: () => void
}

function scheduleDayIndices(schedule: string[]): number[] {
  return schedule
    .map((day) => DAYS.indexOf(day as DayCode))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)
}

function getWateringDayOrder(globalWaterSchedule: string[], plants: Plant[], todayIdx: number): number[] {
  const fromGlobal = scheduleDayIndices(globalWaterSchedule)
  const fromPlants = [...new Set(plants.flatMap((plant) => plant.wateringDays))]
  const allDays = [...new Set([...fromGlobal, ...fromPlants, todayIdx])].sort((a, b) => a - b)
  return [todayIdx, ...allDays.filter((day) => day !== todayIdx)]
}

function waterNeedFills(need: WaterNeed): number {
  if (need === 'Light') return 1
  if (need === 'Heavy') return 3
  return 2
}

function getPlantsForDay(plants: Plant[], dayIdx: number, referenceDate: Date): Plant[] {
  return plants.filter((plant) => isPlantDueOnDay(plant, dayIdx, referenceDate))
}

function buildWeekDateItems(referenceDate: Date, todayIdx: number | null, t: (key: string) => string): DateItem[] {
  return DAYS.map((_, dayIdx) => {
    const dateObj = getDateForDayIndex(dayIdx, referenceDate)
    return {
      dayIdx,
      label: shortDayLabel(t, dayIdx),
      date: dateObj.getDate(),
      dateObj,
      isToday: todayIdx !== null && dayIdx === todayIdx,
    }
  })
}

function formatGroupTitle(
  dayIdx: number,
  date: Date,
  todayIdx: number | null,
  t: (key: string, options?: Record<string, unknown>) => string,
  locale: string,
): string {
  if (todayIdx !== null && dayIdx === todayIdx) {
    return t('watering.sectionToday')
  }
  const dayName = fullDayLabel(t, dayIdx).toUpperCase()
  const monthDay = date
    .toLocaleDateString(locale, { month: 'short', day: 'numeric' })
    .toUpperCase()
  return `${dayName}, ${monthDay}`
}

function WaterDropIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden className="h-3 w-2.5 shrink-0" fill="none" viewBox="0 0 12 20">
      <path
        d={svgBatch.p35497c00}
        fill={filled ? GREEN : '#D9D9D9'}
        stroke={filled ? GREEN : '#D9D9D9'}
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function WaterNeedDrops({ filledCount }: { filledCount: number }) {
  return (
    <div className="flex items-end gap-1">
      {[0, 1, 2].map((index) => (
        <WaterDropIcon key={index} filled={index < filledCount} />
      ))}
    </div>
  )
}

function CalendarDayPill({
  label,
  date,
  isActive,
  isToday,
  onSelect,
  pillRef,
}: {
  label: string
  date: number
  isActive: boolean
  isToday: boolean
  onSelect: () => void
  pillRef?: (node: HTMLButtonElement | null) => void
}) {
  return (
    <button
      ref={pillRef}
      type="button"
      onClick={onSelect}
      aria-current={isActive ? 'date' : undefined}
      className={`relative flex min-w-[52px] shrink-0 snap-center flex-col items-center justify-center gap-1 rounded-2xl border-2 px-3 py-2.5 transition-colors ${
        isActive
          ? 'border-black bg-[#00FF66] font-black text-black'
          : 'border-black bg-white font-bold text-black'
      }`}
    >
      <span className="font-[family-name:var(--font-unbounded)] text-[9px] leading-none tracking-wide">
        {label}
      </span>
      <span className="font-[family-name:var(--font-unbounded)] text-sm leading-none">{date}</span>
      {isToday && (
        <span
          aria-hidden
          className={`absolute -bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
            isActive ? 'bg-black' : 'bg-[#888888]'
          }`}
        />
      )}
    </button>
  )
}

function WateringTaskCard({
  plant,
  watered,
  onToggle,
  markWateredLabel,
  wateredLabel,
}: {
  plant: Plant
  watered: boolean
  onToggle: () => void
  markWateredLabel: string
  wateredLabel: string
}) {
  return (
    <article
      className={`flex w-full items-center gap-3 rounded-2xl border-2 border-black p-3 shadow-[4px_4px_0_0_#000000] ${
        watered ? 'bg-[#D9FFE8]' : 'bg-white'
      }`}
    >
      <div className="size-12 shrink-0 overflow-hidden rounded-full border-2 border-black">
        <PlantPhoto photo={plant.photo} alt="" className="size-full object-cover" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-[family-name:var(--font-unbounded)] text-sm font-black uppercase leading-tight text-black">
          {plant.name}
        </p>
        <WaterNeedDrops filledCount={waterNeedFills(plant.waterNeed)} />
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-label={watered ? wateredLabel : markWateredLabel}
        aria-pressed={watered}
        className={`flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-black active:scale-95 ${
          watered ? 'bg-[#00FF66]' : 'bg-white'
        }`}
      >
        {watered ? (
          <svg aria-hidden className="size-[18px]" fill="none" viewBox="0 0 27 27">
            <path
              d={svgBatch.p64f2600}
              fill={GREEN}
              stroke={BLACK}
              strokeLinecap="round"
              strokeWidth="2"
            />
          </svg>
        ) : (
          <svg aria-hidden className="size-[18px]" fill="none" viewBox="0 0 18 18">
            <path
              d={svgBatch.p2afd9fa0}
              stroke="#888888"
              strokeLinecap="round"
              strokeWidth="2"
            />
          </svg>
        )}
      </button>
    </article>
  )
}

export default function WateringScreen({
  plants,
  globalWaterSchedule,
  todayIdx,
  onMarkWatered,
  onMarkAll,
}: WateringScreenProps) {
  const { t, i18n } = useTranslation()
  const referenceDate = useMemo(() => new Date(), [])
  const resolvedTodayIdx = todayIdx ?? getTodayDayIndex(referenceDate)
  const [selectedDayIdx, setSelectedDayIdx] = useState(resolvedTodayIdx)
  const calendarScrollRef = useRef<HTMLDivElement>(null)
  const pillRefs = useRef<Record<number, HTMLButtonElement | null>>({})
  const sectionRefs = useRef<Record<number, HTMLElement | null>>({})

  useEffect(() => {
    setSelectedDayIdx(resolvedTodayIdx)
  }, [resolvedTodayIdx])

  useEffect(() => {
    const activePill = pillRefs.current[selectedDayIdx]
    activePill?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [selectedDayIdx])

  const weekDates = useMemo(
    () => buildWeekDateItems(referenceDate, resolvedTodayIdx, t),
    [referenceDate, resolvedTodayIdx, t],
  )

  const taskGroups = useMemo((): WateringTaskGroup[] => {
    const orderedDays = getWateringDayOrder(globalWaterSchedule, plants, resolvedTodayIdx)
    return orderedDays
      .map((dayIdx) => {
        const date = getDateForDayIndex(dayIdx, referenceDate)
        const dayPlants = getPlantsForDay(plants, dayIdx, referenceDate)
        return {
          dayIdx,
          date,
          title: formatGroupTitle(dayIdx, date, resolvedTodayIdx, t, i18n.language),
          plants: dayPlants,
        }
      })
      .filter((group) => group.plants.length > 0)
  }, [globalWaterSchedule, plants, referenceDate, resolvedTodayIdx, t, i18n.language])

  const todayPendingCount = useMemo(
    () => plants.filter((plant) => isPlantDueToday(plant, resolvedTodayIdx) && !plant.isWateredToday).length,
    [plants, resolvedTodayIdx],
  )

  function handleSelectDay(dayIdx: number) {
    setSelectedDayIdx(dayIdx)
    sectionRefs.current[dayIdx]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function isPlantWateredForDay(plant: Plant, dayIdx: number): boolean {
    if (dayIdx !== resolvedTodayIdx) return false
    return plant.isWateredToday
  }

  const visibleGroups =
    selectedDayIdx === resolvedTodayIdx
      ? taskGroups
      : taskGroups.filter((group) => group.dayIdx === selectedDayIdx)

  return (
    <div className="flex h-full flex-col bg-[#efefef]">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-4">
        <header className="shrink-0 px-5 pb-3 pt-4">
          <h1 className="font-[family-name:var(--font-unbounded)] text-xl font-black uppercase leading-tight text-black">
            {t('watering.scheduleTitle')}
          </h1>
          <p className="mt-1 font-[family-name:var(--font-geist)] text-xs font-medium text-[#888888]">
            {t('watering.needsWaterToday', { count: todayPendingCount })}
          </p>
        </header>

        <div className="shrink-0 px-5 pb-4">
          <div
            ref={calendarScrollRef}
            className="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {weekDates.map((day) => (
              <CalendarDayPill
                key={day.dayIdx}
                label={day.label}
                date={day.date}
                isToday={day.isToday}
                isActive={selectedDayIdx === day.dayIdx}
                onSelect={() => handleSelectDay(day.dayIdx)}
                pillRef={(node) => {
                  pillRefs.current[day.dayIdx] = node
                }}
              />
            ))}
          </div>
        </div>

        {todayPendingCount > 0 && selectedDayIdx === resolvedTodayIdx && (
          <div className="shrink-0 px-5 pb-5">
            <button
              type="button"
              onClick={onMarkAll}
              className="w-full rounded-2xl border-2 border-black bg-[#00FF66] px-4 py-3.5 shadow-[4px_4px_0_0_#000000] active:translate-x-px active:translate-y-px active:shadow-none"
            >
              <span className="font-[family-name:var(--font-unbounded)] text-xs font-black uppercase tracking-wide text-black">
                {t('watering.markAllToday', { count: todayPendingCount })}
              </span>
            </button>
          </div>
        )}

        <div className="flex flex-col gap-6 px-5 pb-6">
          {visibleGroups.length === 0 && (
            <p className="font-[family-name:var(--font-geist)] text-sm font-medium text-black">
              {t('watering.noPlantsAssigned')}
            </p>
          )}

          {visibleGroups.map((group) => (
            <section
              key={group.dayIdx}
              ref={(node) => {
                sectionRefs.current[group.dayIdx] = node
              }}
              className="flex scroll-mt-4 flex-col gap-3"
            >
              <h2 className="font-[family-name:var(--font-unbounded)] text-base font-black uppercase text-black">
                {group.title}
              </h2>
              {group.plants.map((plant) => (
                <WateringTaskCard
                  key={plant.id}
                  plant={plant}
                  watered={isPlantWateredForDay(plant, group.dayIdx)}
                  onToggle={() => onMarkWatered(plant.id)}
                  markWateredLabel={t('watering.markWatered')}
                  wateredLabel={t('watering.watered')}
                />
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
