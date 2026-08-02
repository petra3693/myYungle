import type { Plant } from '@/types/plant'

const PLANTS_KEY = 'mj_plants'

export type StorageResult = { ok: true } | { ok: false; error: string }

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.code === 22 || error.code === 1014)
  )
}

/** Strip heavy inline photos from history entries for a lighter localStorage payload. */
function plantsForLiteStorage(plants: Plant[]): Plant[] {
  return plants.map((plant) => ({
    ...plant,
    history: (plant.history ?? []).map((entry) => ({
      ...entry,
      photo: entry.photo?.startsWith('data:') ? plant.photo : entry.photo,
    })),
  }))
}

export function loadPlantsFromStorage(
  normalize: (raw: Plant & Record<string, unknown>) => Plant,
): Plant[] {
  try {
    const raw = localStorage.getItem(PLANTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => normalize(item as Plant & Record<string, unknown>))
  } catch (error) {
    console.error('[myJungle] Failed to load plants:', error)
    return []
  }
}

export function savePlantsToStorage(plants: Plant[]): StorageResult {
  try {
    localStorage.setItem(PLANTS_KEY, JSON.stringify(plants))
    return { ok: true }
  } catch (error) {
    console.error('[myJungle] Failed to save plants:', error)
    if (!isQuotaError(error)) {
      return { ok: false, error: 'Could not save your plants. Storage may be unavailable.' }
    }

    try {
      localStorage.setItem(PLANTS_KEY, JSON.stringify(plantsForLiteStorage(plants)))
      return { ok: true }
    } catch (retryError) {
      console.error('[myJungle] Lite plant save also failed:', retryError)
      return {
        ok: false,
        error: 'Storage is full. Try removing a plant photo or exporting then resetting data.',
      }
    }
  }
}

export async function compressImageDataUrl(
  dataUrl: string,
  maxSize = 960,
  quality = 0.75,
): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) return dataUrl

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height, 1))
        const width = Math.max(1, Math.round(img.width * scale))
        const height = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(dataUrl)
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch (error) {
        console.error('[myJungle] Image compression failed:', error)
        resolve(dataUrl)
      }
    }
    img.onerror = () => {
      console.error('[myJungle] Could not load image for compression')
      resolve(dataUrl)
    }
    img.src = dataUrl
  })
}
