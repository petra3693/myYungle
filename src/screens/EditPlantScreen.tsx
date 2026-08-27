import { secondaryWateringDay } from '@/lib/wateringBatch'
import { DAYS, FULL_DAY_NAMES, PLANT_CATEGORIES } from '@/screens/shared/constants'
import { fullDayName } from '@/screens/shared/helpers'
import { IconChevronLeft } from '@/screens/shared/icons'
import { IconCircleBtn, Toggle } from '@/screens/shared/ui'
import { type Plant } from '@/types/plant'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

// ─── Screen: Edit plant ─────────────────────────────────────────────────────

function EditPlantScreen({ plant, primaryDay, onBack, onSave }: {
  plant: Plant; primaryDay: number; onBack: () => void
  onSave: (updates: Pick<Plant, 'name' | 'category' | 'wateringDays' | 'scheduleDays' | 'isCustomSchedule'>) => void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(plant.name)
  const [category, setCategory] = useState(plant.category ?? 'Houseplant')
  const [day1, setDay1] = useState(plant.wateringDays[0] ?? primaryDay)
  const [needsSecondDay, setNeedsSecondDay] = useState(plant.wateringDays.length >= 2)
  const [day2, setDay2] = useState(plant.wateringDays[1] ?? secondaryWateringDay(primaryDay))

  function handleSave() {
    const days = needsSecondDay ? [day1, day2].filter((d, i, arr) => arr.indexOf(d) === i).sort((a, b) => a - b) : [day1]
    onSave({
      name: name.trim() || plant.name,
      category,
      wateringDays: days,
      scheduleDays: days.map((i) => DAYS[i]),
      isCustomSchedule: true,
    })
  }

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
        <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft /></IconCircleBtn>
        <span className="font-heading" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>{t('editPlantScreen.title')}</span>
        <div style={{ width: 44 }} />
      </div>
      <div className="scroll-y flex-1 px-5 pt-2 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase' }}>{t('editPlantScreen.plantName')}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="font-heading px-4"
            style={{ height: 52, fontSize: 16, color: '#fff', background: 'var(--color-surface)', borderRadius: 14, border: 'none' }}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase' }}>{t('editPlantScreen.category')}</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="font-body px-4"
            style={{ height: 52, fontSize: 15, color: '#fff', background: 'var(--color-surface)', borderRadius: 14, border: 'none' }}
          >
            {PLANT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase' }}>{needsSecondDay ? t('editPlantScreen.wateringDay1') : t('editPlantScreen.wateringDay')}</span>
          <select
            value={day1}
            onChange={(e) => setDay1(Number(e.target.value))}
            className="font-body px-4"
            style={{ height: 52, fontSize: 15, color: '#fff', background: 'var(--color-surface)', borderRadius: 14, border: 'none' }}
          >
            {FULL_DAY_NAMES.map((_, i) => <option key={i} value={i}>{fullDayName(t, i)}</option>)}
          </select>
        </label>

        {needsSecondDay && (
          <label className="flex flex-col gap-1.5">
            <span className="font-body" style={{ fontSize: 12, color: '#8E8E93', textTransform: 'uppercase' }}>{t('editPlantScreen.wateringDay2')}</span>
            <select
              value={day2}
              onChange={(e) => setDay2(Number(e.target.value))}
              className="font-body px-4"
              style={{ height: 52, fontSize: 15, color: '#fff', background: 'var(--color-surface)', borderRadius: 14, border: 'none' }}
            >
              {FULL_DAY_NAMES.map((_, i) => <option key={i} value={i}>{fullDayName(t, i)}</option>)}
            </select>
          </label>
        )}

        <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: 'var(--color-surface)' }}>
          <span className="font-body" style={{ fontSize: 14, color: '#fff' }}>{t('editPlantScreen.waterTwiceWeek')}</span>
          <Toggle on={needsSecondDay} onChange={setNeedsSecondDay} />
        </div>
      </div>
      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-3 shrink-0">
        <button type="button" onClick={handleSave} className="btn-fill w-full" style={{ height: 52, fontSize: 15 }}>{t('editPlantScreen.saveChanges')}</button>
      </div>
    </div>
  )
}

export default EditPlantScreen
