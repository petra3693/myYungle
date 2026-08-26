export const PHOTO_MAX_DIMENSION = 1024
export const PHOTO_JPEG_QUALITY = 0.75

const HEIC_MIME_RE = /^image\/hei[cf]$/i
const HEIC_DATA_URL_RE = /^data:image\/hei[cf]/i

export function isInlinePhoto(value: string): boolean {
  return value.startsWith('data:image/')
}

function scaledSize(width: number, height: number, maxSize: number): { width: number; height: number } {
  const scale = Math.min(1, maxSize / Math.max(width, height, 1))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

function drawToJpegDataUrl(
  source: CanvasImageSource,
  width: number,
  height: number,
  quality: number,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not process this photo. Please try another image.')
  }
  ctx.drawImage(source, 0, 0, width, height)
  console.log(`[myJungle] Encoding canvas to JPEG (${width}x${height}, quality ${quality})...`)
  let dataUrl: string
  try {
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  } catch (error) {
    console.error('[myJungle] canvas.toDataURL threw (likely a memory/security error):', error)
    throw new Error('Could not process this photo. Please try a smaller photo or take a new one.')
  }
  // A failed/empty encode still returns a syntactically valid but useless data URL.
  if (!dataUrl || dataUrl.length < 32 || !/^data:image\/jpeg;base64,/.test(dataUrl)) {
    console.error('[myJungle] canvas.toDataURL returned an empty/invalid result:', dataUrl.slice(0, 40))
    throw new Error('Could not process this photo. Please try a smaller photo or take a new one.')
  }
  console.log(`[myJungle] Encoded JPEG data URL (${dataUrl.length} chars)`)
  return dataUrl
}

function loadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load this photo for compression.'))
    img.src = dataUrl
  })
}

/**
 * Resize and re-encode an inline photo as JPEG for Gemini / storage.
 * Returns a `data:image/jpeg;base64,...` data URL when successful.
 * HEIC/HEIF that cannot be decoded throws (never pass those bytes to Gemini).
 *
 * @param strict When true (Gemini analysis), never return the original URL on failure.
 */
export async function compressImageDataUrl(
  dataUrl: string,
  maxSize = PHOTO_MAX_DIMENSION,
  quality = PHOTO_JPEG_QUALITY,
  strict = false,
): Promise<string> {
  if (!isInlinePhoto(dataUrl)) {
    if (strict) {
      throw new Error('Could not process this photo. Please take or choose a JPEG image.')
    }
    return dataUrl
  }

  try {
    console.log(`[myJungle] compressImageDataUrl: loading image (${dataUrl.length} chars)...`)
    const img = await loadImageElement(dataUrl)
    const { width, height } = scaledSize(img.width, img.height, maxSize)
    console.log(`[myJungle] compressImageDataUrl: loaded (${img.width}x${img.height}) -> resizing to ${width}x${height}`)
    return drawToJpegDataUrl(img, width, height, quality)
  } catch (error) {
    console.error('[myJungle] Image compression failed:', error)
    // Never forward HEIC/HEIF bytes — Gemini rejects them with 400 invalid argument.
    if (HEIC_DATA_URL_RE.test(dataUrl)) {
      throw new Error('This iPhone photo format is not supported. Please choose a JPEG photo or retake the picture.')
    }
    if (strict) {
      throw new Error('Could not process this photo. Please try another image or take a new photo.')
    }
    // Soft fallback for already-stored JPEG/PNG during migrate/save paths.
    return dataUrl
  }
}

/** Strict JPEG re-encode for Gemini — always ≤1024px, never returns HEIC/WebP/large originals. */
export async function compressImageForGemini(dataUrl: string): Promise<string> {
  return compressImageDataUrl(dataUrl, PHOTO_MAX_DIMENSION, PHOTO_JPEG_QUALITY, true)
}

export function readFileAsDataUrl(file: File): Promise<string> {
  console.log(`[myJungle] Reading file "${file.name}" (${file.type || 'unknown type'}, ${file.size} bytes)...`)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.length > 0) {
        console.log(`[myJungle] File read complete (${reader.result.length} chars)`)
        resolve(reader.result)
      } else {
        console.error('[myJungle] FileReader produced an empty/invalid result')
        reject(new Error('Invalid file read result'))
      }
    }
    reader.onerror = () => {
      console.error('[myJungle] FileReader error:', reader.error)
      reject(reader.error ?? new Error('Failed to read file'))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Compress immediately after camera/library pick — keeps state small before save
 * and guarantees Gemini receives JPEG (converts HEIC on supported platforms).
 */
export async function readAndCompressPhotoFile(file: File): Promise<string> {
  console.log(`[myJungle] readAndCompressPhotoFile: starting for "${file.name}" (${file.size} bytes)`)
  const isHeic =
    HEIC_MIME_RE.test(file.type) ||
    /\.hei[cf]$/i.test(file.name)

  // createImageBitmap decodes HEIC more reliably on iOS WKWebView than FileReader + <img>.
  if (typeof createImageBitmap === 'function') {
    try {
      console.log('[myJungle] Decoding via createImageBitmap...')
      const bitmap = await createImageBitmap(file)
      try {
        const { width, height } = scaledSize(bitmap.width, bitmap.height, PHOTO_MAX_DIMENSION)
        console.log(`[myJungle] Bitmap decoded (${bitmap.width}x${bitmap.height}) -> resizing to ${width}x${height}`)
        const result = drawToJpegDataUrl(bitmap, width, height, PHOTO_JPEG_QUALITY)
        console.log('[myJungle] readAndCompressPhotoFile: done (createImageBitmap path)')
        return result
      } finally {
        bitmap.close()
      }
    } catch (error) {
      console.warn('[myJungle] createImageBitmap failed, falling back to FileReader+<img>:', error)
      if (isHeic) {
        // Fall through to data-URL path; some WebViews still decode via <img>.
      }
    }
  }

  const raw = await readFileAsDataUrl(file)
  try {
    const result = await compressImageDataUrl(raw)
    console.log('[myJungle] readAndCompressPhotoFile: done (FileReader+<img> path)')
    return result
  } catch (error) {
    console.error('[myJungle] readAndCompressPhotoFile: compression failed:', error)
    if (isHeic || HEIC_DATA_URL_RE.test(raw)) {
      throw new Error('This iPhone photo format is not supported. Please choose a JPEG photo or retake the picture.')
    }
    throw error
  }
}
