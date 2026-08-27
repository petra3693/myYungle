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
import { isNativeStorage, readNativePlants, writeNativePlants } from '@/lib/nativeStorage'
import type { HistoryEntry, Plant } from '@/types/plant'

const PLANTS_KEY = 'mj_plants'

export type StorageResult = { ok: true } | { ok: false; error: string }

function isQuotaError(error: unknown): boolean {
  if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22 || error.code === 1014)) {
    return true
  }
  // Capacitor's Filesystem plugin has no dedicated "disk full" error type —
  // fall back to a message check so the same lite-storage retry below still
  // applies natively, not just in a browser.
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  return message.includes('quota') || (message.includes('disk') && message.includes('space'))
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

function parsePlantsPayload(raw: string | null, normalize: (raw: Plant & Record<string, unknown>) => Plant): Plant[] {
  if (!raw) return []
  const parsed = JSON.parse(raw) as unknown
  if (!Array.isArray(parsed)) return []
  return parsed.map((item) => normalize(item as Plant & Record<string, unknown>))
}

/**
 * Web-only synchronous load, used as the initial React state so the first
 * render already has real data — @capacitor/filesystem has no sync read API,
 * so native plants arrive later via loadPlantsFromStorageAsync instead.
 */
export function loadPlantsFromStorage(
  normalize: (raw: Plant & Record<string, unknown>) => Plant,
): Plant[] {
  try {
    return parsePlantsPayload(localStorage.getItem(PLANTS_KEY), normalize)
  } catch (error) {
    console.error('[myJungle] Failed to load plants:', error)
    return []
  }
}

/** Native reads the file store; web just wraps the same sync localStorage read in a promise. */
export async function loadPlantsFromStorageAsync(
  normalize: (raw: Plant & Record<string, unknown>) => Plant,
): Promise<Plant[]> {
  try {
    const raw = isNativeStorage() ? await readNativePlants() : localStorage.getItem(PLANTS_KEY)
    return parsePlantsPayload(raw, normalize)
  } catch (error) {
    console.error('[myJungle] Failed to load plants:', error)
    return []
  }
}

async function writePlantsPayload(json: string): Promise<void> {
  if (isNativeStorage()) {
    await writeNativePlants(json)
  } else {
    localStorage.setItem(PLANTS_KEY, json)
  }
}

export async function savePlantsToStorage(plants: Plant[]): Promise<StorageResult> {
  try {
    const prepared = await preparePlantsForStorage(plants)
    await writePlantsPayload(JSON.stringify(prepared))
    return { ok: true }
  } catch (error) {
    console.error('[myJungle] Failed to save plants:', error)
    if (!isQuotaError(error)) {
      return { ok: false, error: 'Could not save your plants. Storage may be unavailable.' }
    }

    try {
      const prepared = await preparePlantsForStorage(plants)
      await writePlantsPayload(JSON.stringify(plantsForLiteStorage(prepared)))
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
