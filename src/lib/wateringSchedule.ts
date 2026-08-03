import type { WaterNeed } from '@/types/plant'

const ALL_DAY_INDICES = [0, 1, 2, 3, 4, 5, 6] as const

export function getDayCountForWaterNeed(waterNeed: string | WaterNeed): number {
  const normalized = String(waterNeed).toLowerCase()
  if (normalized === 'light') return 1
  if (normalized === 'moderate') return 2
  return 3
}

function pickEvenlySpacedFromPool(pool: number[], count: number): number[] {
  if (count <= 0 || pool.length === 0) return []
  if (count >= pool.length) return [...pool]
  if (count === 1) return [pool[Math.floor(pool.length / 2)]]

  const selected: number[] = []
  for (let i = 0; i < count; i++) {
    const poolIndex = Math.round((i * (pool.length - 1)) / (count - 1))
    selected.push(pool[poolIndex])
  }
  return [...new Set(selected)].sort((a, b) => a - b)
}

export function pickWateringDaysForNeed(
  waterNeed: string | WaterNeed,
  globalIndices: number[],
): { days: number[]; isCustomSchedule: boolean } {
  const count = getDayCountForWaterNeed(waterNeed)
  const preferred = globalIndices.length > 0
    ? [...globalIndices].sort((a, b) => a - b)
    : [...ALL_DAY_INDICES]

  if (count <= preferred.length) {
    const days = pickEvenlySpacedFromPool(preferred, count)
    const usesOnlyGlobal = globalIndices.length === 0 || days.every((d) => globalIndices.includes(d))
    return { days, isCustomSchedule: !usesOnlyGlobal }
  }

  const remaining = ALL_DAY_INDICES.filter((d) => !preferred.includes(d))
  const extraNeeded = count - preferred.length
  const extras = pickEvenlySpacedFromPool(remaining, extraNeeded)
  const days = [...preferred, ...extras].sort((a, b) => a - b)
  return { days, isCustomSchedule: true }
}
