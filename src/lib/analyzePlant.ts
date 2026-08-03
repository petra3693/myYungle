import type { AnalyzePlantResult } from '@/server/analyzePlantHandler'

export interface AnalyzePlantApiResponse extends AnalyzePlantResult {}

export function parseImageDataUrl(dataUrl: string): { imageBase64: string; mimeType: string } {
  const match = dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/)
  if (match) {
    return { mimeType: match[1], imageBase64: match[2] }
  }
  return {
    mimeType: 'image/jpeg',
    imageBase64: dataUrl.replace(/^data:image\/\w+;base64,/, ''),
  }
}

export async function analyzePlantImage(
  imageSource: string,
): Promise<{ ok: true; data: AnalyzePlantApiResponse } | { ok: false; error: string }> {
  const { imageBase64, mimeType } = parseImageDataUrl(imageSource)

  const response = await fetch('/api/analyze-plant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mimeType }),
  })

  const data = (await response.json()) as AnalyzePlantApiResponse | { error?: string }

  if (!response.ok) {
    const errorBody = data as { error?: string }
    return { ok: false, error: errorBody.error ?? 'Failed to analyze plant image.' }
  }

  if (!('name' in data) || !data.name) {
    return { ok: false, error: 'Invalid analysis response.' }
  }

  return { ok: true, data }
}

export function mapWaterNeedToForm(value: string): 'Light' | 'Moderate' | 'Heavy' {
  const normalized = value.toLowerCase()
  if (normalized === 'light') return 'Light'
  if (normalized === 'heavy') return 'Heavy'
  return 'Moderate'
}
