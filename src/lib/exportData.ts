import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { AppSettings, HistoryEntry, Plant, PlantHealthLog } from '@/types/plant'

export const EXPORT_PHOTOS_NOTE =
  'Photos are not included in this export to keep the file small — plant details, watering schedules, health logs, and growth history are all included.'

function omitPhoto<T extends { photo: string }>({ photo: _photo, ...rest }: T): Omit<T, 'photo'> {
  return rest
}

export interface ExportPayload {
  app: 'myJungle'
  exportedAt: string
  notePhotos: string
  settings: AppSettings
  plants: (Omit<Plant, 'photo' | 'history' | 'healthLogs'> & {
    history: Omit<HistoryEntry, 'photo'>[]
    healthLogs: Omit<PlantHealthLog, 'photo'>[]
  })[]
}

export function buildExportPayload(plants: Plant[], settings: AppSettings): ExportPayload {
  return {
    app: 'myJungle',
    exportedAt: new Date().toISOString(),
    notePhotos: EXPORT_PHOTOS_NOTE,
    settings,
    plants: plants.map((p) => ({
      ...omitPhoto(p),
      history: p.history.map(omitPhoto),
      healthLogs: p.healthLogs.map(omitPhoto),
    })),
  }
}

export function exportFileName(now: Date = new Date()): string {
  return `myjungle-data-${now.toISOString().replace(/[:.]/g, '-')}.json`
}

export type ExportResult = { ok: true } | { ok: false; error?: string }

/** The OS share sheet rejects its promise when the user dismisses it without picking a target — that's not a failure, just a change of mind. */
function isUserCancellation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /cancel/i.test(message)
}

/**
 * Native: writes the JSON to the Cache directory and opens the OS share sheet
 * (an `<a download>` link is a silent no-op in WKWebView). Web: falls back to
 * the usual blob-download link.
 */
export async function exportUserData(plants: Plant[], settings: AppSettings): Promise<ExportResult> {
  const json = JSON.stringify(buildExportPayload(plants, settings), null, 2)
  const fileName = exportFileName()
  try {
    if (Capacitor.isNativePlatform()) {
      await Filesystem.writeFile({ path: fileName, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 })
      const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache })
      await Share.share({ url: uri })
    } else {
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    }
    return { ok: true }
  } catch (error) {
    if (isUserCancellation(error)) return { ok: true }
    console.error('[myJungle] export failed:', error)
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
