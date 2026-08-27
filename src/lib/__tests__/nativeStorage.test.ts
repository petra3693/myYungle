import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFilesystem = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  deleteFile: vi.fn(),
}

const mockCapacitor = {
  isNativePlatform: vi.fn(() => true),
}

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: mockFilesystem,
  Directory: { Data: 'DATA' },
  Encoding: { UTF8: 'utf8' },
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: mockCapacitor,
}))

const { isNativeStorage, readNativeFile, writeNativeFile, migrateLocalStorageToNative } = await import(
  '@/lib/nativeStorage'
)

/** vitest.config.ts runs in a plain Node environment — no real `localStorage` global — so tests supply an in-memory stand-in. */
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

beforeEach(() => {
  vi.clearAllMocks()
  mockCapacitor.isNativePlatform.mockReturnValue(true)
  installLocalStorageMock()
})

describe('isNativeStorage', () => {
  it('reflects Capacitor.isNativePlatform()', () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true)
    expect(isNativeStorage()).toBe(true)
    mockCapacitor.isNativePlatform.mockReturnValue(false)
    expect(isNativeStorage()).toBe(false)
  })
})

describe('readNativeFile', () => {
  it('returns the file contents on a successful read', async () => {
    mockFilesystem.readFile.mockResolvedValue({ data: '{"a":1}' })
    expect(await readNativeFile('x.json')).toBe('{"a":1}')
  })

  it('returns null when the file does not exist yet — Capacitor throws for that, not a real error', async () => {
    mockFilesystem.readFile.mockRejectedValue(new Error('File does not exist'))
    expect(await readNativeFile('missing.json')).toBeNull()
  })
})

describe('writeNativeFile', () => {
  it('writes to the app-private Data directory as UTF8', async () => {
    mockFilesystem.writeFile.mockResolvedValue(undefined)
    await writeNativeFile('x.json', '{"a":1}')
    expect(mockFilesystem.writeFile).toHaveBeenCalledWith({
      path: 'x.json',
      directory: 'DATA',
      data: '{"a":1}',
      encoding: 'utf8',
    })
  })
})

describe('migrateLocalStorageToNative', () => {
  it('does nothing on web — plants/settings stay in localStorage', async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(false)
    localStorage.setItem('mj_plants', '[{"id":"p1"}]')

    await migrateLocalStorageToNative()

    expect(mockFilesystem.writeFile).not.toHaveBeenCalled()
    expect(localStorage.getItem('mj_plants')).toBe('[{"id":"p1"}]')
  })

  it('copies plants and settings from localStorage to native files, then clears them from localStorage', async () => {
    mockFilesystem.readFile.mockRejectedValue(new Error('File does not exist')) // neither native file exists yet
    mockFilesystem.writeFile.mockResolvedValue(undefined)
    localStorage.setItem('mj_plants', '[{"id":"p1"}]')
    localStorage.setItem('mj_settings', '{"isPro":true}')

    await migrateLocalStorageToNative()

    expect(mockFilesystem.writeFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'mj_plants.json', data: '[{"id":"p1"}]' }),
    )
    expect(mockFilesystem.writeFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'mj_settings.json', data: '{"isPro":true}' }),
    )
    expect(localStorage.getItem('mj_plants')).toBeNull()
    expect(localStorage.getItem('mj_settings')).toBeNull()
  })

  it('migrates only whatever is actually present when localStorage has just one of the two', async () => {
    mockFilesystem.readFile.mockRejectedValue(new Error('File does not exist'))
    mockFilesystem.writeFile.mockResolvedValue(undefined)
    localStorage.setItem('mj_settings', '{"isPro":false}')
    // No 'mj_plants' key at all.

    await migrateLocalStorageToNative()

    expect(mockFilesystem.writeFile).toHaveBeenCalledTimes(1)
    expect(mockFilesystem.writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'mj_settings.json' }))
    expect(localStorage.getItem('mj_settings')).toBeNull()
  })

  it('is idempotent: never overwrites or touches localStorage once native data already exists', async () => {
    mockFilesystem.readFile.mockResolvedValue({ data: '[{"id":"already-migrated"}]' }) // native files already exist
    localStorage.setItem('mj_plants', '[{"id":"stale-legacy-data"}]')

    await migrateLocalStorageToNative()

    expect(mockFilesystem.writeFile).not.toHaveBeenCalled()
    expect(localStorage.getItem('mj_plants')).toBe('[{"id":"stale-legacy-data"}]')
  })

  it('is a no-op when there is nothing in localStorage and no native data either', async () => {
    mockFilesystem.readFile.mockRejectedValue(new Error('File does not exist'))

    await migrateLocalStorageToNative()

    expect(mockFilesystem.writeFile).not.toHaveBeenCalled()
  })
})
