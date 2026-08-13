/** MIME types Gemini accepts for inline image parts. */
export type GeminiSupportedMime = 'image/jpeg' | 'image/png'

/**
 * Strip a Data URL prefix if present and remove whitespace.
 * Gemini `inlineData.data` must be raw base64 only — never `data:image/...;base64,`.
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

/** Normalize to a Gemini-supported image MIME (default JPEG). */
export function normalizeGeminiMimeType(mimeType: string | undefined | null): GeminiSupportedMime {
  const normalized = (mimeType ?? '').toLowerCase().split(';')[0]?.trim() ?? ''
  if (normalized === 'image/png') return 'image/png'
  return 'image/jpeg'
}

/**
 * Parse a data URL or raw base64 string into Gemini-ready fields.
 * Unsupported types (HEIC/WebP/etc.) are reported as JPEG — callers must convert bytes first.
 */
export function parseImageDataUrl(dataUrl: string): { imageBase64: string; mimeType: GeminiSupportedMime } {
  const trimmed = dataUrl.trim()
  const match = trimmed.match(/^data:(image\/[\w.+-]+)(?:;[^,]*)*;base64,(.+)$/i)
  if (match) {
    return {
      mimeType: normalizeGeminiMimeType(match[1]),
      imageBase64: match[2].replace(/\s/g, ''),
    }
  }
  return {
    mimeType: 'image/jpeg',
    imageBase64: stripDataUrlPrefix(trimmed),
  }
}

function isClientImageError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('no image') ||
    lower.includes('invalid image') ||
    lower.includes('unsupported image') ||
    lower.includes('iphone photo') ||
    lower.includes('too large') ||
    lower.includes('could not process this photo') ||
    lower.includes('could not load this photo')
  )
}

/** Hide raw Gemini / Google RPC errors from end users. */
export function toUserFriendlyAnalysisError(message: string, fallback: string): string {
  const trimmed = message.trim()
  if (!trimmed) return fallback
  if (isClientImageError(trimmed)) return trimmed
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
