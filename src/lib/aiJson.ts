/**
 * Shared helpers for sanitizing and parsing Gemini JSON responses.
 * Models sometimes wrap JSON in markdown fences or add prose around the object.
 */

export function sanitizeAiJsonText(text: string): string {
  let cleaned = String(text ?? '').trim().replace(/^\uFEFF/, '')
  if (!cleaned) return ''

  // Strip common markdown code fences.
  cleaned = cleaned.replace(/^```(?:json|JSON)?\s*/i, '')
  cleaned = cleaned.replace(/\s*```$/i, '')
  cleaned = cleaned.replace(/```(?:json|JSON)?/gi, '').replace(/```/g, '').trim()

  // If there is surrounding prose, keep the outermost JSON object/array.
  const objectStart = cleaned.indexOf('{')
  const arrayStart = cleaned.indexOf('[')
  let start = -1
  if (objectStart === -1) start = arrayStart
  else if (arrayStart === -1) start = objectStart
  else start = Math.min(objectStart, arrayStart)

  if (start === -1) return cleaned

  const isArray = cleaned[start] === '['
  const end = isArray ? cleaned.lastIndexOf(']') : cleaned.lastIndexOf('}')
  if (end > start) {
    cleaned = cleaned.slice(start, end + 1)
  }
  return cleaned.trim()
}

function tryParseJson(cleaned: string): unknown | null {
  try {
    return JSON.parse(cleaned) as unknown
  } catch {
    return null
  }
}

export function parseAiJson(text: string): unknown | null {
  const cleaned = sanitizeAiJsonText(text)
  if (!cleaned) return null

  const parsed = tryParseJson(cleaned)
  if (parsed === null) {
    console.error('[myJungle] AI JSON parse failed:', cleaned.slice(0, 400))
    return null
  }

  // Some models/proxies double-encode JSON as a string payload.
  if (typeof parsed === 'string') {
    const inner = sanitizeAiJsonText(parsed)
    if (inner && (inner.startsWith('{') || inner.startsWith('['))) {
      const nested = tryParseJson(inner)
      if (nested !== null) return nested
    }
  }

  return parsed
}

export function asJsonObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}
