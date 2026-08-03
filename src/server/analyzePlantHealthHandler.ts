import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import { z } from 'zod'

function clampHealthScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

export const analyzePlantHealthPayloadSchema = z.object({
  imageBase64: z.string().min(1, 'No image provided'),
  mimeType: z.string().default('image/jpeg'),
})

export interface AnalyzePlantHealthResult {
  healthScore: number
  diagnosis: string
  treatmentNotes: string
}

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-flash-latest'] as const

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    healthScore: { type: SchemaType.NUMBER, description: 'Health percentage 0-100' },
    diagnosis: { type: SchemaType.STRING, description: 'Short issue name' },
    treatmentNotes: { type: SchemaType.STRING, description: 'Actionable care advice' },
  },
  required: ['healthScore', 'diagnosis', 'treatmentNotes'],
}

async function generateHealthAnalysis(
  genAI: GoogleGenerativeAI,
  prompt: string,
  imagePart: { inlineData: { data: string; mimeType: string } },
): Promise<string> {
  let lastError: unknown
  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json', responseSchema },
      })
      const result = await model.generateContent([prompt, imagePart])
      return result.response.text()
    } catch (error) {
      console.error(`Gemini health model "${modelName}" failed:`, error)
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('All Gemini models failed.')
}

export async function handleAnalyzePlantHealthRequest(
  body: unknown,
): Promise<{ status: number; body: AnalyzePlantHealthResult | { error: string } }> {
  const parsed = analyzePlantHealthPayloadSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request payload.'
    return { status: 400, body: { error: message } }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { status: 500, body: { error: 'Plant health analysis is not configured.' } }
  }

  try {
    const { imageBase64, mimeType } = parsed.data
    const genAI = new GoogleGenerativeAI(apiKey)
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const imagePart = { inlineData: { data: cleanBase64, mimeType } }
    const prompt =
      'Analyze this plant photo for diseases, pests, nutrient deficiencies, watering issues, or other health problems. ' +
      'Return healthScore as an integer from 0 to 100 (100 = perfectly healthy). ' +
      'Set diagnosis to a short label like "Healthy", "Overwatered", "Spider mites", or "Leaf spot". ' +
      'Provide brief, actionable treatmentNotes under 400 characters.'

    const text = await generateHealthAnalysis(genAI, prompt, imagePart)
    const healthData = JSON.parse(text) as AnalyzePlantHealthResult

    if (!healthData.diagnosis || !healthData.treatmentNotes || healthData.healthScore == null) {
      return { status: 500, body: { error: 'Incomplete health analysis result from AI.' } }
    }

    return {
      status: 200,
      body: {
        healthScore: clampHealthScore(Number(healthData.healthScore)),
        diagnosis: healthData.diagnosis.trim(),
        treatmentNotes: healthData.treatmentNotes.trim().slice(0, 400),
      },
    }
  } catch (error) {
    console.error('Gemini Health API Error:', error)
    return { status: 500, body: { error: 'Failed to analyze plant health' } }
  }
}
