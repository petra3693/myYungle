import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFilesystem = {
  writeFile: vi.fn(),
  getUri: vi.fn(),
  deleteFile: vi.fn(),
  rmdir: vi.fn(),
}

const mockCapacitor = {
  isNativePlatform: vi.fn(() => false),
  convertFileSrc: vi.fn((uri: string) => `capacitor://localhost/_capacitor_file_${uri}`),
}

const idb = {
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(() => []),
}

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: mockFilesystem,
  Directory: { Data: 'DATA' },
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: mockCapacitor,
}))

vi.mock('idb-keyval', () => ({
  createStore: vi.fn(),
  get: idb.get,
  set: idb.set,
  del: idb.del,
  keys: idb.keys,
}))

const { storePhotoBlob, getPhotoBlob, deletePhotoKey, clearAllPhotos, plantPhotoKey, isIndexedPhotoRef } = await import('@/lib/photoStore')

beforeEach(() => {
  vi.clearAllMocks()
  mockCapacitor.isNativePlatform.mockReturnValue(false)
})

describe('storePhotoBlob', () => {
  it('writes a base64 file (no data: prefix) under Directory.Data on native, and returns a native:// ref', async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true)
    mockFilesystem.writeFile.mockResolvedValue({ uri: 'file:///x/photos/plant_p1.jpg' })

    const ref = await storePhotoBlob(plantPhotoKey('p1'), 'data:image/jpeg;base64,AAAA')

    expect(mockFilesystem.writeFile).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'photos/plant_p1.jpg', data: 'AAAA', directory: 'DATA', recursive: true }),
    )
    expect(ref).toBe('native://photos/plant_p1.jpg')
    expect(isIndexedPhotoRef(ref)).toBe(true)
  })

  it('sanitizes ":" in the key (idb-keyval keys use it as a separator) into a filesystem-safe name', async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true)
    mockFilesystem.writeFile.mockResolvedValue({ uri: 'file:///x' })

    await storePhotoBlob('hist:p1:h1', 'data:image/jpeg;base64,AAAA')

    expect(mockFilesystem.writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'photos/hist_p1_h1.jpg' }))
  })

  it('uses idb-keyval on web, unaffected by the native path', async () => {
    const ref = await storePhotoBlob(plantPhotoKey('p1'), 'data:image/jpeg;base64,AAAA')

    expect(idb.set).toHaveBeenCalledWith('plant:p1', 'data:image/jpeg;base64,AAAA', undefined)
    expect(mockFilesystem.writeFile).not.toHaveBeenCalled()
    expect(ref).toBe('idb://plant:p1')
  })
})

describe('getPhotoBlob', () => {
  it('resolves a native:// ref to a WebView-loadable URL via a fresh getUri() + convertFileSrc(), never a cached absolute URI', async () => {
    mockFilesystem.getUri.mockResolvedValue({ uri: 'file:///current-container/photos/plant_p1.jpg' })

    const src = await getPhotoBlob('native://photos/plant_p1.jpg')

    expect(mockFilesystem.getUri).toHaveBeenCalledWith({ path: 'photos/plant_p1.jpg', directory: 'DATA' })
    expect(mockCapacitor.convertFileSrc).toHaveBeenCalledWith('file:///current-container/photos/plant_p1.jpg')
    expect(src).toBe('capacitor://localhost/_capacitor_file_file:///current-container/photos/plant_p1.jpg')
  })

  it('returns null (not a rejection) when the native file is missing', async () => {
    mockFilesystem.getUri.mockRejectedValue(new Error('File does not exist'))

    expect(await getPhotoBlob('native://photos/missing.jpg')).toBeNull()
  })

  it('resolves an idb:// ref from idb-keyval unchanged', async () => {
    idb.get.mockResolvedValue('data:image/jpeg;base64,AAAA')

    expect(await getPhotoBlob('idb://plant:p1')).toBe('data:image/jpeg;base64,AAAA')
    expect(idb.get).toHaveBeenCalledWith('plant:p1', undefined)
  })

  it('passes a non-ref value straight through (already-inline photo, never offloaded)', async () => {
    expect(await getPhotoBlob('data:image/jpeg;base64,AAAA')).toBe('data:image/jpeg;base64,AAAA')
  })
})

describe('deletePhotoKey', () => {
  it('deletes the matching file on native', async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true)
    await deletePhotoKey(plantPhotoKey('p1'))
    expect(mockFilesystem.deleteFile).toHaveBeenCalledWith({ path: 'photos/plant_p1.jpg', directory: 'DATA' })
  })

  it('does not throw when the native file is already gone', async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true)
    mockFilesystem.deleteFile.mockRejectedValue(new Error('File does not exist'))
    await expect(deletePhotoKey(plantPhotoKey('p1'))).resolves.toBeUndefined()
  })

  it('deletes from idb-keyval on web', async () => {
    await deletePhotoKey(plantPhotoKey('p1'))
    expect(idb.del).toHaveBeenCalledWith('plant:p1', undefined)
    expect(mockFilesystem.deleteFile).not.toHaveBeenCalled()
  })
})

describe('clearAllPhotos', () => {
  it('removes the whole photos directory in one call on native', async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true)
    await clearAllPhotos()
    expect(mockFilesystem.rmdir).toHaveBeenCalledWith({ path: 'photos', directory: 'DATA', recursive: true })
  })

  it('does not throw when the photos directory never existed', async () => {
    mockCapacitor.isNativePlatform.mockReturnValue(true)
    mockFilesystem.rmdir.mockRejectedValue(new Error('Directory does not exist'))
    await expect(clearAllPhotos()).resolves.toBeUndefined()
  })
})
