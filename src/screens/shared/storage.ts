import { LANGUAGE_STORAGE_KEY, normalizeAppLanguage, type AppLanguage } from '@/i18n/languages'
import { localDateString, migrateWateredDates } from '@/lib/dailyRollover'
import { isNativeStorage, readNativeSettings, writeNativeSettings } from '@/lib/nativeStorage'
import { loadPlantsFromStorage, savePlantsToStorage, type StorageResult } from '@/lib/plantStorage'
import { DAYS, DEFAULT_SETTINGS } from '@/screens/shared/constants'
import { type AppSettings, type DayCode, type HistoryEntry, type LightNeed, type Plant, type WaterNeed, type WateringFrequency } from '@/types/plant'

function normalizePlant(raw: Plant & Record<string, unknown>): Plant {
  const wateringDays = Array.isArray(raw.wateringDays) ? [...raw.wateringDays].sort((a, b) => a - b) : []
  const waterNeed: WaterNeed = raw.waterNeed === 'Light' || raw.waterNeed === 'Heavy' ? raw.waterNeed : 'Moderate'
  const lightNeed: LightNeed = raw.lightNeed === 'Low' || raw.lightNeed === 'High' ? raw.lightNeed : 'Medium'
  const wateredDates = migrateWateredDates(raw)
  return {
    id: String(raw.id ?? Date.now()),
    name: raw.name?.trim() || 'Unnamed plant',
    room: raw.room?.trim() || 'Unknown',
    careNote: raw.careNote ?? '',
    wateringDays,
    scheduleDays: (raw.scheduleDays as DayCode[]) ?? wateringDays.map((i) => DAYS[i]),
    isCustomSchedule: raw.isCustomSchedule ?? false,
    wateringFrequency: (raw.wateringFrequency as WateringFrequency) ?? 'weekly',
    wateringCycleAnchor: raw.wateringCycleAnchor ?? null,
    waterNeed,
    lightNeed,
    humidityNeed: raw.humidityNeed === 'low' || raw.humidityNeed === 'high' ? raw.humidityNeed : 'normal',
    temperatureRangeC: typeof raw.temperatureRangeC === 'string' ? raw.temperatureRangeC : '18-27°C',
    category: typeof raw.category === 'string' ? raw.category : undefined,
    photo: typeof raw.photo === 'string' ? raw.photo : '',
    lastWateredAt: raw.lastWateredAt ?? null,
    previousWateredAt: raw.previousWateredAt ?? null,
    history: Array.isArray(raw.history) ? raw.history : [],
    healthLogs: Array.isArray(raw.healthLogs) ? raw.healthLogs : [],
    wateredDates,
    isWateredToday: wateredDates.includes(localDateString(new Date())),
    isToxicToPets: raw.isToxicToPets === true ? true : raw.isToxicToPets === false ? false : null,
    toxicityNotes: typeof raw.toxicityNotes === 'string' ? raw.toxicityNotes : '',
    confidence: typeof raw.confidence === 'number' ? raw.confidence : undefined,
  }
}

function loadPlants(): Plant[] {
  return loadPlantsFromStorage(normalizePlant)
}

function savePlants(p: Plant[]): Promise<StorageResult> {
  return savePlantsToStorage(p)
}

function parseSettingsPayload(raw: string | null): AppSettings {
  if (!raw) return DEFAULT_SETTINGS
  const parsed = JSON.parse(raw) as Partial<AppSettings>
  return { ...DEFAULT_SETTINGS, ...parsed }
}

/** Web-only synchronous load, used as the initial React state — native settings arrive later via loadSettingsAsync. */
function loadSettings(): AppSettings {
  try {
    return parseSettingsPayload(localStorage.getItem('mj_settings'))
  } catch {
    return DEFAULT_SETTINGS
  }
}

/** Native reads the file store; web just wraps the same sync localStorage read in a promise. */
async function loadSettingsAsync(): Promise<AppSettings> {
  try {
    const raw = isNativeStorage() ? await readNativeSettings() : localStorage.getItem('mj_settings')
    return parseSettingsPayload(raw)
  } catch {
    return DEFAULT_SETTINGS
  }
}

async function saveSettings(s: AppSettings) {
  try {
    const json = JSON.stringify(s)
    if (isNativeStorage()) {
      await writeNativeSettings(json)
    } else {
      localStorage.setItem('mj_settings', json)
    }
  } catch (error) {
    console.error('[myJungle] Failed to save settings:', error)
  }
}

function loadLanguage(): AppLanguage {
  try {
    return normalizeAppLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY))
  } catch {
    return 'en'
  }
}

function saveLanguage(l: AppLanguage) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, l)
  } catch (error) {
    console.error('[myJungle] Failed to save language:', error)
  }
}

function plantHistory(plant: Plant): HistoryEntry[] {
  return Array.isArray(plant.history) ? plant.history : []
}

function confidenceLabel(value: 'low' | 'medium' | 'high'): number {
  if (value === 'high') return 95
  if (value === 'medium') return 80
  return 55
}

/** Below this, an AI species match is uncertain enough to prompt the user to double-check the name. */
const LOW_CONFIDENCE_THRESHOLD = 70
function isLowConfidence(confidence?: number): boolean {
  return typeof confidence === 'number' && confidence < LOW_CONFIDENCE_THRESHOLD
}

export { normalizePlant, loadPlants, savePlants, parseSettingsPayload, loadSettings, loadSettingsAsync, saveSettings, loadLanguage, saveLanguage, plantHistory, confidenceLabel, isLowConfidence }
