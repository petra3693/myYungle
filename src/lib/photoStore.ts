import { createStore, del, get, keys, set } from 'idb-keyval'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { isNativeStorage } from '@/lib/nativeStorage'
import type { HistoryEntry, PlantHealthLog } from '@/types/plant'

const photoDb = createStore('myjungle-photos-db', 'photos')
const IDB_PREFIX = 'idb://'
// Holds the file's *relative* path under Directory.Data, never a resolved
// absolute file:// URI — iOS's per-install container UUID isn't guaranteed
// stable across app updates/reinstalls (TestFlight included), so an absolute
// URI captured once could point nowhere after the next build. The real,
// current URI is re-resolved via Filesystem.getUri() every time a photo is
// displayed instead (see getPhotoBlob below).
const NATIVE_PREFIX = 'native://'
const PHOTOS_DIR = 'photos'

/** See isInlinePhoto in imageCompress.ts for why this accepts `unknown`, not `string`. */
export function isIndexedPhotoRef(value: unknown): value is string {
  return typeof value === 'string' && (value.startsWith(IDB_PREFIX) || value.startsWith(NATIVE_PREFIX))
}

export function toIndexedPhotoRef(key: string): string {
  return `${IDB_PREFIX}${key}`
}

function refToKey(ref: string): string {
  return ref.slice(IDB_PREFIX.length)
}

export function plantPhotoKey(plantId: string): string {
  return `plant:${plantId}`
}

export function historyPhotoKey(plantId: string, entryId: string): string {
  return `hist:${plantId}:${entryId}`
}

export function healthLogPhotoKey(plantId: string, logId: string): string {
  return `health:${plantId}:${logId}`
}

// Filesystem paths can't contain ":" on some platforms, and idb-keyval keys
// use it as a separator (see the *PhotoKey helpers above) — sanitize instead
// of trying to keep the raw key.
function keyToFileName(key: string): string {
  return `${PHOTOS_DIR}/${key.replace(/[^a-zA-Z0-9._-]/g, '_')}.jpg`
}

function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',')
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1)
}

async function storeNativePhotoBlob(key: string, dataUrl: string): Promise<string> {
  const path = keyToFileName(key)
  await Filesystem.writeFile({ path, data: dataUrlToBase64(dataUrl), directory: Directory.Data, recursive: true })
  return `${NATIVE_PREFIX}${path}`
}

async function getNativePhotoBlob(path: string): Promise<string | null> {
  try {
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Data })
    return Capacitor.convertFileSrc(uri)
  } catch {
    // File doesn't exist (deleted, or never written) — PlantPhoto renders its placeholder for null.
    return null
  }
}

async function deleteNativePhotoFile(key: string): Promise<void> {
  try {
    await Filesystem.deleteFile({ path: keyToFileName(key), directory: Directory.Data })
  } catch {
    // Already gone — nothing to do.
  }
}

/** Writes an inline `data:` photo to durable storage and returns a small ref to save in its place. */
export async function storePhotoBlob(key: string, dataUrl: string): Promise<string> {
  if (isNativeStorage()) return storeNativePhotoBlob(key, dataUrl)
  await set(key, dataUrl, photoDb)
  return toIndexedPhotoRef(key)
}

/** Resolves a ref back to something usable as an `<img src>` — a data URL (web) or a WebView-loadable file URL (native). Returns the input unchanged if it isn't a ref at all. */
export async function getPhotoBlob(refOrUrl: string): Promise<string | null> {
  if (refOrUrl.startsWith(NATIVE_PREFIX)) {
    return getNativePhotoBlob(refOrUrl.slice(NATIVE_PREFIX.length))
  }
  if (!isIndexedPhotoRef(refOrUrl)) return refOrUrl
  const stored = await get<string>(refToKey(refOrUrl), photoDb)
  return stored ?? null
}

export async function deletePhotoKey(key: string): Promise<void> {
  if (isNativeStorage()) {
    await deleteNativePhotoFile(key)
    return
  }
  await del(key, photoDb)
}

export async function deletePlantPhotos(
  plantId: string,
  history: HistoryEntry[],
  healthLogs: PlantHealthLog[] = [],
): Promise<void> {
  await deletePhotoKey(plantPhotoKey(plantId))
  await Promise.all(history.map((entry) => deletePhotoKey(historyPhotoKey(plantId, entry.id))))
  await Promise.all(healthLogs.map((log) => deletePhotoKey(healthLogPhotoKey(plantId, log.id))))
}

export async function clearAllPhotos(): Promise<void> {
  if (isNativeStorage()) {
    try {
      await Filesystem.rmdir({ path: PHOTOS_DIR, directory: Directory.Data, recursive: true })
    } catch {
      // Directory doesn't exist yet (nothing was ever saved) — nothing to clear.
    }
    return
  }
  const allKeys = await keys(photoDb)
  await Promise.all(allKeys.map((key) => del(key, photoDb)))
}
