import {
  compressImageDataUrl,
  isInlinePhoto,
  PHOTO_JPEG_QUALITY,
  PHOTO_MAX_DIMENSION,
} from '@/lib/imageCompress'
import {
  healthLogPhotoKey,
  historyPhotoKey,
  isIndexedPhotoRef,
  plantPhotoKey,
  storePhotoBlob,
} from '@/lib/photoStore'
import type { HistoryEntry, Plant } from '@/types/plant'

const PLANTS_KEY = 'mj_plants'

export type StorageResult = { ok: true } | { ok: false; error: string }

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' || error.code === 22 || error.code === 1014)
  )
}

async function offloadInlinePhoto(key: string, value: string): Promise<string> {
  if (isIndexedPhotoRef(value)) return value
  if (!isInlinePhoto(value)) return value
  const compressed = await compressImageDataUrl(value, PHOTO_MAX_DIMENSION, PHOTO_JPEG_QUALITY)
  return storePhotoBlob(key, compressed)
}

/** Move inline base64 photos to IndexedDB; localStorage keeps only tiny idb:// refs. */
export async function preparePlantsForStorage(plants: Plant[]): Promise<Plant[]> {
  return Promise.all(
    plants.map(async (plant) => {
      const photo = await offloadInlinePhoto(plantPhotoKey(plant.id), plant.photo)
      const history = await Promise.all(
        (plant.history ?? []).map(async (entry: HistoryEntry) => ({
          ...entry,
          photo: await offloadInlinePhoto(historyPhotoKey(plant.id, entry.id), entry.photo),
        })),
      )
      const healthLogs = await Promise.all(
        (plant.healthLogs ?? []).map(async (log) => ({
          ...log,
          photo: await offloadInlinePhoto(healthLogPhotoKey(plant.id, log.id), log.photo),
        })),
      )
      return { ...plant, photo, history, healthLogs }
    }),
  )
}

/** Last-resort payload when localStorage is still full — drop any stray inline data. */
function plantsForLiteStorage(plants: Plant[]): Plant[] {
  return plants.map((plant) => ({
    ...plant,
    photo: isIndexedPhotoRef(plant.photo) || !isInlinePhoto(plant.photo) ? plant.photo : '',
    history: (plant.history ?? []).map((entry) => ({
      ...entry,
      photo: isIndexedPhotoRef(entry.photo) || !isInlinePhoto(entry.photo) ? entry.photo : plant.photo,
    })),
    healthLogs: (plant.healthLogs ?? []).map((log) => ({
      ...log,
      photo: isIndexedPhotoRef(log.photo) || !isInlinePhoto(log.photo) ? log.photo : plant.photo,
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

export async function savePlantsToStorage(plants: Plant[]): Promise<StorageResult> {
  try {
    const prepared = await preparePlantsForStorage(plants)
    localStorage.setItem(PLANTS_KEY, JSON.stringify(prepared))
    return { ok: true }
  } catch (error) {
    console.error('[myJungle] Failed to save plants:', error)
    if (!isQuotaError(error)) {
      return { ok: false, error: 'Could not save your plants. Storage may be unavailable.' }
    }

    try {
      const prepared = await preparePlantsForStorage(plants)
      localStorage.setItem(PLANTS_KEY, JSON.stringify(plantsForLiteStorage(prepared)))
      return { ok: true }
    } catch (retryError) {
      console.error('[myJungle] Lite plant save also failed:', retryError)
      return {
        ok: false,
        error: 'Storage is full. Try removing a plant or exporting then resetting data.',
      }
    }
  }
}

export { compressImageDataUrl, compressImageForGemini, readAndCompressPhotoFile } from '@/lib/imageCompress'
