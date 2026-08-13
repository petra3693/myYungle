export type GeminiSupportedMime = 'image/jpeg' | 'image/png'

export type GeminiInlineImagePart = {
  inlineData: {
    data: string
    mimeType: GeminiSupportedMime
  }
}

/** ~4 MB raw image cap — keeps JSON payloads well under Gemini / serverless limits. */
const MAX_INLINE_BASE64_CHARS = 5_500_000

const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/

/**
 * Strip a Data URL prefix if present and remove whitespace.
 * Gemini rejects payloads when `inlineData.data` still contains `data:image/...;base64,`.
 */
export function stripDataUrlPrefix(value: string): string {
  const trimmed = value.trim()
  if (trimmed.startsWith('data:')) {
    const commaIndex = trimmed.indexOf(',')
    if (commaIndex !== -1) {
      return trimmed.slice(commaIndex + 1).replace(/\s/g, '')
    }
  }
  return trimmed.replace(/\s/g, '')
}

/** Only JPEG/PNG are safe for Gemini inline image parts. */
export function normalizeGeminiMimeType(mimeType: string | undefined | null): GeminiSupportedMime {
  const normalized = (mimeType ?? '').toLowerCase().split(';')[0]?.trim() ?? ''
  if (normalized === 'image/png') return 'image/png'
  return 'image/jpeg'
}

function decodeBase64Prefix(data: string, byteCount: number): Buffer {
  const sliceLen = Math.ceil((byteCount * 4) / 3)
  return Buffer.from(data.slice(0, sliceLen), 'base64')
}

/** Detect JPEG/PNG from magic bytes; reject HEIC/WebP and other unsupported formats. */
export function detectSupportedImageMime(data: string): GeminiSupportedMime | null {
  if (data.length < 16) return null
  try {
    const header = decodeBase64Prefix(data, 16)
    if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return 'image/jpeg'
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
      return 'image/png'
    }
    // HEIC/HEIF/AVIF — ISO BMFF "ftyp" box at offset 4
    if (header.length >= 12 && header.slice(4, 8).toString('ascii') === 'ftyp') {
      const brand = header.slice(8, 12).toString('ascii').toLowerCase()
      if (/hei|mif|msf|avif/.test(brand)) return null
    }
    // WebP — RIFF....WEBP
    if (header.slice(0, 4).toString('ascii') === 'RIFF' && header.slice(8, 12).toString('ascii') === 'WEBP') {
      return null
    }
    return null
  } catch {
    return null
  }
}

function validateGeminiBase64(data: string): void {
  if (!data) {
    throw new Error('No image data provided.')
  }
  if (data.startsWith('data:')) {
    throw new Error('Invalid image payload.')
  }
  if (data.length > MAX_INLINE_BASE64_CHARS) {
    throw new Error('Image is too large. Please use a smaller photo.')
  }
  if (!BASE64_RE.test(data)) {
    throw new Error('Invalid image data.')
  }
  const detected = detectSupportedImageMime(data)
  if (!detected) {
    throw new Error('Unsupported image format. Please use a JPEG or PNG photo.')
  }
}

/** Build a Gemini `inlineData` part from a client-uploaded image payload. */
export function toGeminiInlineDataPart(
  imageBase64: string,
  mimeType?: string | null,
): GeminiInlineImagePart {
  const data = stripDataUrlPrefix(imageBase64)
  validateGeminiBase64(data)
  const detectedMime = detectSupportedImageMime(data)!
  const declaredMime = normalizeGeminiMimeType(mimeType)
  return {
    inlineData: {
      data,
      // Prefer magic-byte detection so HEIC labeled as JPEG cannot slip through.
      mimeType: declaredMime === 'image/png' && detectedMime === 'image/png' ? 'image/png' : detectedMime,
    },
  }
}

/** Map Gemini/SDK failures to a short user-facing message. */
export function friendlyGeminiError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const trimmed = message.trim()
  if (!trimmed) return fallback

  // Pass through our own validation messages unchanged.
  if (isImagePayloadError(error)) return trimmed

  const lower = trimmed.toLowerCase()
  if (
    lower.includes('invalid argument') ||
    lower.includes('bad request') ||
    lower.includes('[400') ||
    lower.includes('inline_data') ||
    lower.includes('inline data') ||
    lower.includes('google.rpc') ||
    lower.includes('generativelanguage') ||
    trimmed.length > 180
  ) {
    return fallback
  }
  return trimmed
}

/** True when the error is from our image payload validation (not Gemini). */
export function isImagePayloadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const lower = message.toLowerCase()
  return (
    lower.includes('no image') ||
    lower.includes('invalid image') ||
    lower.includes('unsupported image') ||
    lower.includes('too large') ||
    lower.includes('image format') ||
    lower.includes('image data')
  )
}
