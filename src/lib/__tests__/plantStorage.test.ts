import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Plant } from '@/types/plant'

const mockFilesystem = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  deleteFile: vi.fn(),
}

const mockCapacitor = {
  isNativePlatform: vi.fn(() => false),
}

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: mockFilesystem,
  Directory: { Data: 'DATA' },
  Encoding: { UTF8: 'utf8' },
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: mockCapacitor,
}))

// idb-keyval touches IndexedDB, which this Node test environment doesn't have —
// preparePlantsForStorage only calls it for genuine inline (data:) photos, none
// of which appear in these fixtures, but the module import itself must not blow up.
vi.mock('idb-keyval', () => ({
  createStore: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(() => []),
}))

const { loadPlantsFromStorage, loadPlantsFromStorageAsync, savePlantsToStorage } = await import('@/lib/plantStorage')

function installLocalStorageMock() {
  const store = new Map<string, string>()
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() { return store.size },
  }
}

function identity(raw: Plant & Record<string, unknown>): Plant {
  return raw as Plant
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCapacitor.isNativePlatform.mockReturnValue(false)
  installLocalStorageMock()
})

describe('loadPlantsFromStorage (sync, web-only)', () => {
  it('reads and normalizes plants from localStorage', () => {
    localStorage.setItem('mj_plants', JSON.stringify([{ id: 'p1' }]))
    expect(loadPlantsFromStorage(identity)).toEqual([{ id: 'p1' }])
  })

  it('returns an empty array when nothing is stored', () => {
    expect(loadPlantsFromStorage(identity)).toEqual([])
  })
})

describe('loadPlantsFromStorageAsync', () => {
  it('reads from localStorage on web', async () => {
    localStorage.setItem('mj_plants', JSON.stringify([{ id: 'p1' }]))
    expect(await loadPlantsFromStorageAsync(identity)).toEqual([{ id: 'p1' }])
    expect(mockFilesystem.readFile).not.toHaveBeenCalled()
  })

  it('reads from the native file store on native, ignoring localStorage', async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true)
    mockFilesystem.readFile.mockResolvedValue({ data: JSON.stringify([{ id: 'native-plant' }]) })
    localStorage.setItem('mj_plants', JSON.stringify([{ id: 'stale-web-copy' }]))

    expect(await loadPlantsFromStorageAsync(identity)).toEqual([{ id: 'native-plant' }])
  })

  it('returns an empty array when the native file does not exist yet', async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true)
    mockFilesystem.readFile.mockRejectedValue(new Error('File does not exist'))

    expect(await loadPlantsFromStorageAsync(identity)).toEqual([])
  })
})

describe('savePlantsToStorage', () => {
  it('writes to localStorage on web', async () => {
    const result = await savePlantsToStorage([])
    expect(result).toEqual({ ok: true })
    expect(localStorage.getItem('mj_plants')).toBe('[]')
    expect(mockFilesystem.writeFile).not.toHaveBeenCalled()
  })

  it('writes to the native file store on native', async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true)
    mockFilesystem.writeFile.mockResolvedValue(undefined)

    const result = await savePlantsToStorage([])
    expect(result).toEqual({ ok: true })
    expect(mockFilesystem.writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'mj_plants.json', data: '[]' }))
  })

  it('reports a storage error when the native write fails for a non-quota reason and the fallback also fails', async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true)
    mockFilesystem.writeFile.mockRejectedValue(new Error('Permission denied'))

    const result = await savePlantsToStorage([])
    expect(result.ok).toBe(false)
  })

  it('succeeds via the lite fallback when the first write fails for ANY reason, not just a quota error', async () => {
    // Simulates IndexedDB/localStorage being unavailable in some way that isn't a quota
    // error — the fallback must still be attempted, not just for isQuotaError() cases.
    mockFilesystem.writeFile.mockRejectedValueOnce(new Error('IndexedDB is not available in this context'))
    mockFilesystem.writeFile.mockResolvedValueOnce(undefined)
    mockCapacitor.isNativePlatform.mockReturnValue(true)

    const result = await savePlantsToStorage([{ id: 'p1', photo: 'data:image/jpeg;base64,AAAA' } as unknown as import('@/types/plant').Plant])
    expect(result).toEqual({ ok: true })
    expect(mockFilesystem.writeFile).toHaveBeenCalledTimes(2)
  })

  it('does not crash the whole save when a plant has a malformed (non-string) photo field', async () => {
    // Reproduces a real bug: corrupted/partially-migrated stored data can have
    // photo === undefined despite the Plant type claiming `photo: string`. Before the
    // fix, isIndexedPhotoRef/isInlinePhoto threw a bare TypeError reading .startsWith
    // on undefined, and Promise.all in preparePlantsForStorage propagated that up,
    // failing the ENTIRE save for every plant — not just the one with bad data.
    const malformed = [
      { id: 'p1', photo: undefined, history: [], healthLogs: [] },
      { id: 'p2', photo: 'data:image/jpeg;base64,AAAA', history: [], healthLogs: [] },
    ] as unknown as import('@/types/plant').Plant[]

    const result = await savePlantsToStorage(malformed)
    expect(result).toEqual({ ok: true })
    const saved = JSON.parse(localStorage.getItem('mj_plants')!)
    expect(saved).toHaveLength(2)
    expect(saved[0].photo).toBe('')
  })

  it('does not crash when a history/health-log entry has a malformed photo field', async () => {
    const malformed = [
      {
        id: 'p1',
        photo: 'data:image/jpeg;base64,AAAA',
        history: [{ id: 'h1', date: '2026-01-01', note: '', photo: undefined }],
        healthLogs: [{ id: 'l1', timestamp: '2026-01-01', photo: null, healthScore: 90, diagnosis: '', treatmentNotes: '', recommendedActions: [], analyzedByAI: true }],
      },
    ] as unknown as import('@/types/plant').Plant[]

    const result = await savePlantsToStorage(malformed)
    expect(result).toEqual({ ok: true })
  })
})
