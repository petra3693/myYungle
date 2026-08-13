import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import { z } from 'zod'
import { asJsonObject, parseAiJson } from '../lib/aiJson'
import { languagePromptInstruction, normalizeAppLanguage, SUPPORTED_LANGUAGES } from '../i18n/languages'
import { friendlyGeminiError, isImagePayloadError, toGeminiInlineDataPart } from './geminiImagePart'

function clampHealthScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}

export const analyzePlantHealthPayloadSchema = z.object({
  imageBase64: z.string().min(1, 'No image provided'),
  mimeType: z.string().default('image/jpeg'),
  language: z.enum(SUPPORTED_LANGUAGES).optional(),
})

export interface AnalyzePlantHealthResult {
  healthScore: number
  diagnosis: string
  treatmentNotes: string
}

const GEMINI_MODEL = 'gemini-1.5-flash'

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
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { responseMimeType: 'application/json', responseSchema },
  })
  const result = await model.generateContent([prompt, imagePart])
  return result.response.text()
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
    const { imageBase64, mimeType, language: rawLanguage } = parsed.data
    const language = normalizeAppLanguage(rawLanguage)
    const genAI = new GoogleGenerativeAI(apiKey)
    const imagePart = toGeminiInlineDataPart(imageBase64, mimeType)
    const prompt =
      'Analyze this plant photo for diseases, pests, nutrient deficiencies, watering issues, or other health problems. ' +
      'Respond with RAW JSON only — no markdown code fences and no prose outside the JSON object. ' +
      'Return healthScore as an integer from 0 to 100 (100 = perfectly healthy). ' +
      'Set diagnosis to a short label like "Healthy", "Overwatered", "Spider mites", or "Leaf spot". ' +
      'If the photo is unclear, still return JSON with a best-effort diagnosis and lower healthScore. ' +
      'Provide brief, actionable treatmentNotes under 400 characters. ' +
      languagePromptInstruction(language)

    const text = await generateHealthAnalysis(genAI, prompt, imagePart)
    const parsedJson = parseAiJson(text)
    const healthData = asJsonObject(parsedJson)

    if (!healthData) {
      return {
        status: 200,
        body: {
          healthScore: 50,
          diagnosis: 'Unclear photo',
          treatmentNotes: 'Photo quality was too low for a confident diagnosis. Retake in brighter, even light and try again.',
        },
      }
    }

    const diagnosis =
      typeof healthData.diagnosis === 'string' && healthData.diagnosis.trim()
        ? healthData.diagnosis.trim()
        : 'Needs review'
    const treatmentNotes =
      typeof healthData.treatmentNotes === 'string' && healthData.treatmentNotes.trim()
        ? healthData.treatmentNotes.trim().slice(0, 400)
        : 'Check soil moisture, light exposure, and leaf condition. Retake a clearer photo for a more precise diagnosis.'
    const healthScore = clampHealthScore(Number(healthData.healthScore ?? 50))

    return {
      status: 200,
      body: {
        healthScore,
        diagnosis,
        treatmentNotes,
      },
    }
  } catch (error) {
    console.error('Gemini Health API Error:', error)
    const fallback = 'Failed to analyze plant health. Please try another photo.'
    return {
      status: isImagePayloadError(error) ? 400 : 500,
      body: {
        error: friendlyGeminiError(error, fallback),
      },
    }
  }
}
