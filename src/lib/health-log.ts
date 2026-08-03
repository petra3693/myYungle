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

export function healthScoreSummary(
  score: number | null,
  diagnosis: string | null,
  translate?: (key: string, options?: Record<string, unknown>) => string,
): string {
  const t = translate ?? ((key: string) => key)
  if (score == null) return t('health.scanPrompt')
  if (score >= 85) {
    return diagnosis
      ? t('health.lookingStrongDiag', { diagnosis })
      : t('health.lookingStrong')
  }
  if (score >= 60) {
    return diagnosis
      ? t('health.monitorDiag', { diagnosis })
      : t('health.monitor')
  }
  return diagnosis
    ? t('health.needsAttentionDiag', { diagnosis })
    : t('health.needsAttention')
}
