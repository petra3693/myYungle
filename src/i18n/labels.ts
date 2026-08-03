import type { TFunction } from 'i18next'
import type { DayCode } from '@/types/plant'

const DAY_CODES: DayCode[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

const ROOM_ALIASES: Record<string, string> = {
  unknown: 'unknown',
  'n/a': 'unknown',
  na: 'unknown',
  living_room: 'living_room',
  livingroom: 'living_room',
  'living room': 'living_room',
  nappali: 'living_room',
  wohnzimmer: 'living_room',
  bedroom: 'bedroom',
  'bed room': 'bedroom',
  hálószoba: 'bedroom',
  haloszoba: 'bedroom',
  schlafzimmer: 'bedroom',
  kitchen: 'kitchen',
  konyha: 'kitchen',
  küche: 'kitchen',
  kuche: 'kitchen',
  bathroom: 'bathroom',
  fürdőszoba: 'bathroom',
  furdoszoba: 'bathroom',
  badezimmer: 'bathroom',
  office: 'office',
  irodа: 'office',
  iroda: 'office',
  büro: 'office',
  buro: 'office',
  balcony: 'balcony',
  erkély: 'balcony',
  erkely: 'balcony',
  balkon: 'balcony',
  hallway: 'hallway',
  folyosó: 'hallway',
  folyoso: 'hallway',
  flur: 'hallway',
  dining_room: 'dining_room',
  'dining room': 'dining_room',
  étkező: 'dining_room',
  etkezo: 'dining_room',
  esszimmer: 'dining_room',
  garden: 'garden',
  kert: 'garden',
  garten: 'garden',
}

export function dayCodeKey(code: DayCode | string): string {
  return String(code).toLowerCase()
}

export function shortDayLabel(t: TFunction, code: DayCode | string | number): string {
  if (typeof code === 'number') {
    const day = DAY_CODES[code]
    if (!day) return '—'
    return t(`days.short.${dayCodeKey(day)}`)
  }
  return t(`days.short.${dayCodeKey(code)}`)
}

export function fullDayLabel(t: TFunction, code: DayCode | string | number): string {
  if (typeof code === 'number') {
    const day = DAY_CODES[code]
    if (!day) return '—'
    return t(`days.full.${dayCodeKey(day)}`)
  }
  return t(`days.full.${dayCodeKey(code)}`)
}

export function formatWateringDayTags(t: TFunction, dayIndices: number[]): string {
  const labels = dayIndices
    .map((i) => (i >= 0 && i < DAY_CODES.length ? shortDayLabel(t, DAY_CODES[i]) : null))
    .filter(Boolean)
  return labels.length ? labels.join(' & ') : '—'
}

export function translateRoomLabel(t: TFunction, room: string | null | undefined): string {
  const trimmed = (room ?? '').trim()
  if (!trimmed) return t('rooms.unknown')

  const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ').trim()
  const underscored = normalized.replace(/\s+/g, '_')
  const key = ROOM_ALIASES[normalized] ?? ROOM_ALIASES[underscored] ?? underscored
  const translated = t(`rooms.${key}`, { defaultValue: '' })
  if (translated) return translated
  return trimmed
}
