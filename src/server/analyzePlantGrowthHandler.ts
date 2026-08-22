import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import { z } from 'zod'
import { asJsonObject, parseAiJson } from '../lib/aiJson.js'
import { languagePromptInstruction, normalizeAppLanguage, SUPPORTED_LANGUAGES } from '../i18n/languages.js'
import { friendlyGeminiError, isImagePayloadError, toGeminiInlineDataPart } from './geminiImagePart.js'

export const analyzePlantGrowthPayloadSchema = z.object({
  imageBase64: z.string().min(1, 'No image provided'),
  mimeType: z.string().default('image/jpeg'),
  language: z.enum(SUPPORTED_LANGUAGES).optional(),
})

export interface AnalyzePlantGrowthResult {
  heightCm: number
  estimatedAge: string
  condition: string
  summary: string
}

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash'

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    heightCm: { type: SchemaType.NUMBER, description: 'Best-effort estimated plant height in centimeters' },
    estimatedAge: { type: SchemaType.STRING, description: 'Short maturity label, e.g. "Young (3-6 months)" or "Mature"' },
    condition: { type: SchemaType.STRING, description: 'Short overall condition label, e.g. "Thriving", "Growing steadily", "Stressed"' },
    summary: { type: SchemaType.STRING, description: 'One short sentence summarizing the plant\'s current growth stage and condition' },
  },
  required: ['heightCm', 'estimatedAge', 'condition', 'summary'],
}

async function generateGrowthAnalysis(
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

export async function handleAnalyzePlantGrowthRequest(
  body: unknown,
): Promise<{ status: number; body: AnalyzePlantGrowthResult | { error: string } }> {
  const parsed = analyzePlantGrowthPayloadSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request payload.'
    return { status: 400, body: { error: message } }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { status: 500, body: { error: 'Plant growth analysis is not configured.' } }
  }

  try {
    const { imageBase64, mimeType, language: rawLanguage } = parsed.data
    const language = normalizeAppLanguage(rawLanguage)
    const genAI = new GoogleGenerativeAI(apiKey)
    const imagePart = toGeminiInlineDataPart(imageBase64, mimeType)
    const prompt =
      'Look at this plant photo and estimate its growth stage. ' +
      'Respond with RAW JSON only — no markdown code fences and no prose outside the JSON object. ' +
      'Estimate heightCm as a plausible number of centimeters for the visible plant (best effort from visual scale cues). ' +
      'Set estimatedAge to a short maturity label like "Seedling", "Young (3-6 months)", "Established", or "Mature". ' +
      'Set condition to a short overall condition label like "Thriving", "Growing steadily", or "Stressed". ' +
      'Provide a one-sentence summary of its current growth stage and condition. ' +
      'If the photo is unclear, still return a best-effort JSON object. ' +
      languagePromptInstruction(language)

    const text = await generateGrowthAnalysis(genAI, prompt, imagePart)
    const parsedJson = parseAiJson(text)
    const data = asJsonObject(parsedJson)

    if (!data) {
      return {
        status: 200,
        body: {
          heightCm: 0,
          estimatedAge: 'Unknown',
          condition: 'Unclear photo',
          summary: 'Photo quality was too low for a confident growth estimate. Retake in brighter, even light.',
        },
      }
    }

    const heightCm = Math.max(0, Math.round(Number(data.heightCm ?? 0)))
    const estimatedAge =
      typeof data.estimatedAge === 'string' && data.estimatedAge.trim() ? data.estimatedAge.trim().slice(0, 40) : 'Unknown'
    const condition =
      typeof data.condition === 'string' && data.condition.trim() ? data.condition.trim().slice(0, 40) : 'Needs review'
    const summary =
      typeof data.summary === 'string' && data.summary.trim()
        ? data.summary.trim().slice(0, 300)
        : 'Growth stage could not be confidently assessed from this photo.'

    return { status: 200, body: { heightCm, estimatedAge, condition, summary } }
  } catch (error) {
    console.error('Gemini Growth API Error:', error)
    const fallback = 'Failed to analyze plant growth. Please try another photo.'
    return {
      status: isImagePayloadError(error) ? 400 : 500,
      body: { error: friendlyGeminiError(error, fallback) },
    }
  }
}
