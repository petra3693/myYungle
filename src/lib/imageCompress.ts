export const PHOTO_MAX_DIMENSION = 800
export const PHOTO_JPEG_QUALITY = 0.7

export function isInlinePhoto(value: string): boolean {
  return value.startsWith('data:image/')
}

export async function compressImageDataUrl(
  dataUrl: string,
  maxSize = PHOTO_MAX_DIMENSION,
  quality = PHOTO_JPEG_QUALITY,
): Promise<string> {
  if (!isInlinePhoto(dataUrl)) return dataUrl

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

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Invalid file read result'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/** Compress immediately after camera/library pick — keeps state small before save. */
export async function readAndCompressPhotoFile(file: File): Promise<string> {
  const raw = await readFileAsDataUrl(file)
  return compressImageDataUrl(raw)
}
