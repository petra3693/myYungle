import type { PlantHealthLog } from '@/types/plant'

export type HealthLogSubmitData = Omit<PlantHealthLog, 'id' | 'timestamp'>

export function clampHealthScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

export function getLatestHealthLog(logs: PlantHealthLog[] | undefined): PlantHealthLog | null {
  if (!logs?.length) return null
  return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
}

export function isHealthCheckedToday(log: PlantHealthLog | null): boolean {
  if (!log) return false
  const logDate = new Date(log.timestamp)
  const today = new Date()
  return (
    logDate.getFullYear() === today.getFullYear() &&
    logDate.getMonth() === today.getMonth() &&
    logDate.getDate() === today.getDate()
  )
}

export function healthScoreSummary(score: number | null, diagnosis: string | null): string {
  if (score == null) return 'Scan your plant with AI to get a health score.'
  if (score >= 85) return diagnosis ? `${diagnosis} — looking strong.` : 'Looking strong today.'
  if (score >= 60) return diagnosis ? `${diagnosis} — monitor and follow care tips.` : 'Some signs to watch — check care tips.'
  return diagnosis ? `${diagnosis} — needs attention.` : 'Needs attention — review care tips below.'
}
