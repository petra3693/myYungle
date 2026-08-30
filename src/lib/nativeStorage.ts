import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'

/**
 * Native platforms move plants/settings off localStorage entirely: WKWebView
 * can purge its localStorage under storage pressure, and a handful of plants
 * with health/growth history can push the JSON payload close to the
 * browser-era 5-10MB quota. @capacitor/filesystem has no comparable practical
 * ceiling (limited only by device disk space), so it's the durable store on
 * native. Web keeps using localStorage — it has no such purge risk and
 * changing it would touch the best-tested code path for no benefit.
 */
export function isNativeStorage(): boolean {
  return Capacitor.isNativePlatform()
}

const PLANTS_FILE = 'mj_plants.json'
const SETTINGS_FILE = 'mj_settings.json'
const PLANTS_KEY = 'mj_plants'
const SETTINGS_KEY = 'mj_settings'

/** Null when the file doesn't exist yet — Capacitor throws for that, which is the normal first-launch case, not a real error. */
export async function readNativeFile(fileName: string): Promise<string | null> {
  try {
    const result = await Filesystem.readFile({ path: fileName, directory: Directory.Data, encoding: Encoding.UTF8 })
    return typeof result.data === 'string' ? result.data : null
  } catch {
    return null
  }
}

export async function writeNativeFile(fileName: string, contents: string): Promise<void> {
  await Filesystem.writeFile({ path: fileName, directory: Directory.Data, data: contents, encoding: Encoding.UTF8 })
}

export async function deleteNativeFile(fileName: string): Promise<void> {
  try {
    await Filesystem.deleteFile({ path: fileName, directory: Directory.Data })
  } catch {
    // Already gone — nothing to do.
  }
}

export async function readNativePlants(): Promise<string | null> {
  return readNativeFile(PLANTS_FILE)
}
export async function writeNativePlants(json: string): Promise<void> {
  return writeNativeFile(PLANTS_FILE, json)
}
export async function readNativeSettings(): Promise<string | null> {
  return readNativeFile(SETTINGS_FILE)
}
export async function writeNativeSettings(json: string): Promise<void> {
  return writeNativeFile(SETTINGS_FILE, json)
}

/**
 * One-time move of plants/settings from localStorage to native file storage.
 * Runs only on native, only once: if the native plants file already exists,
 * migration already happened (or this is a native-first install with nothing
 * to migrate) and this is a no-op. Each of plants/settings migrates
 * independently, so a partial localStorage state (e.g. settings only) still
 * migrates whatever is actually there. localStorage is cleared only after
 * its data has been durably written to the native file.
 */
export async function migrateLocalStorageToNative(): Promise<void> {
  if (!isNativeStorage()) return

  // Each block is independently try/caught — a write failure migrating plants
  // (disk space, permissions, whatever) must never prevent the settings block
  // below from running. Before this, an uncaught throw here propagated out of
  // the caller's loadFromNativeStorage() (App.tsx) with nothing to catch it,
  // so setNativeStorageLoaded(true) never ran and the app stayed on the splash
  // screen forever — neither Onboarding nor Main ever appeared.
  try {
    const existingPlants = await readNativeFile(PLANTS_FILE)
    if (existingPlants === null) {
      const legacyPlants = safeLocalStorageGet(PLANTS_KEY)
      if (legacyPlants !== null) {
        await writeNativeFile(PLANTS_FILE, legacyPlants)
        safeLocalStorageRemove(PLANTS_KEY)
      }
    }
  } catch (error) {
    console.error('[myJungle] Failed to migrate plants from localStorage to native storage:', error)
  }

  try {
    const existingSettings = await readNativeFile(SETTINGS_FILE)
    if (existingSettings === null) {
      const legacySettings = safeLocalStorageGet(SETTINGS_KEY)
      if (legacySettings !== null) {
        await writeNativeFile(SETTINGS_FILE, legacySettings)
        safeLocalStorageRemove(SETTINGS_KEY)
      }
    }
  } catch (error) {
    console.error('[myJungle] Failed to migrate settings from localStorage to native storage:', error)
  }
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeLocalStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Nothing we can do if localStorage itself is unavailable — the data is
    // already safely on the native file at this point either way.
  }
}
