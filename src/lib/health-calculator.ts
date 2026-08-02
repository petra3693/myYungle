import type { CheckInLog, LeafStatus, PestStatus, SoilStatus } from '@/types/plant'

export type HealthStatusText = 'Thriving' | 'Needs Attention' | 'Out of Date'

export interface HealthScoreResult {
  score: number
  statusText: HealthStatusText
  checkInLabel: string
  summary: string
  isOutOfDate: boolean
}

const LEAF_SCORES: Record<LeafStatus, number> = {
  lush: 100,
  brown_tips: 70,
  yellowing: 40,
  drooping: 20,
}

const SOIL_SCORES: Record<SoilStatus, number> = {
  moist: 100,
  dry: 40,
  saturated: 20,
}

const PEST_SCORES: Record<PestStatus, number> = {
  clean: 100,
  pests_detected: 0,
}

export const LEAF_LABELS: Record<LeafStatus, string> = {
  lush: 'Lush & Vibrant',
  brown_tips: 'Brown Tips',
  yellowing: 'Yellowing',
  drooping: 'Drooping',
}

export const SOIL_LABELS: Record<SoilStatus, string> = {
  moist: 'Moist & Balanced',
  dry: 'Dry',
  saturated: 'Saturated',
}

export const PEST_LABELS: Record<PestStatus, string> = {
  clean: 'Clean & Clear',
  pests_detected: 'Pests Detected',
}

export function daysSinceTimestamp(timestamp: string): number {
  const diff = Date.now() - new Date(timestamp).getTime()
  return Math.max(0, Math.floor(diff / 86400000))
}

export function calculateBaseScore(checkIn: CheckInLog): number {
  const leaf = LEAF_SCORES[checkIn.leafStatus]
  const soil = SOIL_SCORES[checkIn.soilStatus]
  const pest = PEST_SCORES[checkIn.pestStatus]
  return leaf * 0.4 + soil * 0.3 + pest * 0.3
}

export function calculateHealthScore(lastCheckIn: CheckInLog | null): HealthScoreResult {
  if (!lastCheckIn) {
    return {
      score: 0,
      statusText: 'Needs Attention',
      checkInLabel: '⚠️ Checkup Due',
      summary: 'Log your first health check to track vitality.',
      isOutOfDate: true,
    }
  }

  const days = daysSinceTimestamp(lastCheckIn.timestamp)
  const baseScore = calculateBaseScore(lastCheckIn)

  let score = baseScore
  let isOutOfDate = false

  if (days >= 14) {
    isOutOfDate = true
    score = Math.min(baseScore, 20)
  } else if (days >= 8) {
    const decay = (days - 7) * 3
    score = Math.max(0, baseScore - decay)
  }

  score = Math.round(Math.min(100, Math.max(0, score)))

  let statusText: HealthStatusText
  if (isOutOfDate) {
    statusText = 'Out of Date'
  } else if (score >= 75 && days <= 7) {
    statusText = 'Thriving'
  } else {
    statusText = 'Needs Attention'
  }

  const checkInLabel = formatCheckInBadge(lastCheckIn)
  const summary = getHealthSummary(statusText)

  return { score, statusText, checkInLabel, summary, isOutOfDate }
}

export function formatCheckInBadge(lastCheckIn: CheckInLog | null): string {
  if (!lastCheckIn) return '⚠️ Checkup Due'
  const days = daysSinceTimestamp(lastCheckIn.timestamp)
  if (days >= 14) return '⚠️ Checkup Due'
  if (days <= 0) return 'Checked Today'
  return `Checked ${days}d ago`
}

export function formatRelativeCheckInTime(timestamp: string): string {
  const days = daysSinceTimestamp(timestamp)
  if (days <= 0) return 'Today'
  if (days === 1) return '1d ago'
  return `${days}d ago`
}

function getHealthSummary(statusText: HealthStatusText): string {
  switch (statusText) {
    case 'Thriving':
      return 'Thriving in current conditions'
    case 'Out of Date':
      return 'Health check overdue — log a check-in'
    default:
      return 'Some areas need your attention'
  }
}

export function getLatestCheckIn(checkIns: CheckInLog[]): CheckInLog | null {
  if (!checkIns.length) return null
  return [...checkIns].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )[0]
}

export interface HealthMetricRow {
  id: string
  emoji: string
  label: string
  value: string
  timeAgo: string
  isWarning: boolean
}

export function getHealthMetricRows(lastCheckIn: CheckInLog | null): HealthMetricRow[] {
  if (!lastCheckIn) {
    return [
      { id: 'leaf', emoji: '🍃', label: 'Leaf Vitality', value: 'Not checked yet', timeAgo: '—', isWarning: true },
      { id: 'soil', emoji: '💧', label: 'Soil Condition', value: 'Not checked yet', timeAgo: '—', isWarning: true },
      { id: 'pest', emoji: '🐛', label: 'Pest Status', value: 'Not checked yet', timeAgo: '—', isWarning: true },
    ]
  }

  const timeAgo = formatRelativeCheckInTime(lastCheckIn.timestamp)

  return [
    {
      id: 'leaf',
      emoji: '🍃',
      label: 'Leaf Vitality',
      value: LEAF_LABELS[lastCheckIn.leafStatus],
      timeAgo,
      isWarning: lastCheckIn.leafStatus === 'yellowing' || lastCheckIn.leafStatus === 'drooping',
    },
    {
      id: 'soil',
      emoji: '💧',
      label: 'Soil Condition',
      value: SOIL_LABELS[lastCheckIn.soilStatus],
      timeAgo,
      isWarning: lastCheckIn.soilStatus === 'dry' || lastCheckIn.soilStatus === 'saturated',
    },
    {
      id: 'pest',
      emoji: '🐛',
      label: 'Pest Status',
      value: PEST_LABELS[lastCheckIn.pestStatus],
      timeAgo,
      isWarning: lastCheckIn.pestStatus === 'pests_detected',
    },
  ]
}
