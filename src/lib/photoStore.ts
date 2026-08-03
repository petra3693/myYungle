import { createStore, del, get, keys, set } from 'idb-keyval'
import type { HistoryEntry, PlantHealthLog } from '@/types/plant'

const photoDb = createStore('myjungle-photos-db', 'photos')
const IDB_PREFIX = 'idb://'

export function isIndexedPhotoRef(value: string): boolean {
  return value.startsWith(IDB_PREFIX)
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

export async function storePhotoBlob(key: string, dataUrl: string): Promise<string> {
  await set(key, dataUrl, photoDb)
  return toIndexedPhotoRef(key)
}

export async function getPhotoBlob(refOrUrl: string): Promise<string | null> {
  if (!isIndexedPhotoRef(refOrUrl)) return refOrUrl
  const stored = await get<string>(refToKey(refOrUrl), photoDb)
  return stored ?? null
}

export async function deletePhotoKey(key: string): Promise<void> {
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
  const allKeys = await keys(photoDb)
  await Promise.all(allKeys.map((key) => del(key, photoDb)))
}
