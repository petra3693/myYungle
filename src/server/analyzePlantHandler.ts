import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import { z } from 'zod'
import {
  normalizeAppLanguage,
  normalizePreferredDays,
  parseGeminiPlantAnalysisText,
  type AnalyzePlantResult,
} from '../lib/analyzePlantResult'
import { languagePromptInstruction, SUPPORTED_LANGUAGES } from '../i18n/languages'
import { friendlyGeminiError, isImagePayloadError, toGeminiInlineDataPart } from './geminiImagePart'

export type { AnalyzePlantResult } from '../lib/analyzePlantResult'

export const analyzePlantPayloadSchema = z.object({
  imageBase64: z.string().min(1, 'No image provided'),
  mimeType: z.string().default('image/jpeg'),
  preferredDays: z.array(z.string()).optional(),
  language: z.enum(SUPPORTED_LANGUAGES).optional(),
})

export type AnalyzePlantPayload = z.infer<typeof analyzePlantPayloadSchema>

export interface AnalyzePlantError {
  error: string
}

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash'

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    name: {
      type: SchemaType.STRING,
      description: 'Common plant name. Use "Unknown Plant" if uncertain.',
    },
    waterNeed: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: ['light', 'moderate', 'heavy'],
      description: 'Water requirement: light, moderate, or heavy',
    },
    lightNeed: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: ['low', 'medium', 'high'],
      description: 'Light requirement: low, medium, or high',
    },
    careNotes: {
      type: SchemaType.STRING,
      description: 'Short care instructions and tips',
    },
    recommendedDays: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Watering days as full English day names from the preferred list',
    },
    frequency: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: ['weekly', 'biweekly', 'monthly'],
      description: 'How often to water: weekly, biweekly, or monthly',
    },
    confidence: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: ['low', 'medium', 'high'],
      description: 'Identification confidence. Use low for blurry/dark/uncertain photos.',
    },
    isToxicToPets: {
      type: SchemaType.BOOLEAN,
      description:
        'True if toxic to cats or dogs when ingested; false if generally pet-safe; omit or null if uncertain.',
    },
    toxicityNotes: {
      type: SchemaType.STRING,
      description:
        'Brief pet toxicity note for cats/dogs (max 200 chars). Empty when safe or unknown.',
    },
  },
  required: ['name', 'waterNeed', 'lightNeed', 'careNotes', 'recommendedDays', 'frequency', 'confidence'],
}

function buildAnalyzePrompt(
  preferredDays: string[],
  language: ReturnType<typeof normalizeAppLanguage>,
): string {
  const dayList = preferredDays.join(', ')
  return [
    'Identify the plant in this image, determine its water requirement (light, moderate, or heavy), light requirement, and provide care instructions.',
    languagePromptInstruction(language),
    '',
    'IMPORTANT OUTPUT RULES:',
    '- Respond with RAW JSON only. Do not wrap the JSON in markdown code fences.',
    '- Do not include ```json or any prose before/after the JSON object.',
    '- Always return a complete JSON object even if the photo is blurry, dark, or uncertain.',
    '- If uncertain, set confidence to "low", name to "Unknown Plant", and still provide sensible defaults.',
    '',
    'Determine lightNeed as:',
    '- low: low light / shade-tolerant plants',
    '- medium: medium or bright indirect light',
    '- high: high light / direct sunlight',
    '',
    `The user's globally active preferred watering days are: ${dayList}.`,
    'Select the MINIMUM necessary days from ONLY these preferred days to maximize schedule stacking:',
    '- light or moderate water need: select exactly 1 day',
    '- heavy water need: select exactly 2 days',
    '',
    'For drought-tolerant or sparse-water plants (cacti, succulents, snake plants, ZZ plants, etc.), use frequency "biweekly" or "monthly" instead of "weekly".',
    'When using biweekly or monthly frequency, still select only 1 day from the preferred list.',
    '',
    'Return recommendedDays as full English day names from the preferred list (e.g. ["Tuesday"]).',
    'Return frequency as "weekly", "biweekly", or "monthly".',
    'Return confidence as "low", "medium", or "high".',
    '',
    'Assess pet toxicity for common household cats and dogs:',
    '- Set isToxicToPets to true if the plant is toxic to cats or dogs when chewed or ingested.',
    '- Set isToxicToPets to false if the plant is widely considered pet-safe.',
    '- Omit isToxicToPets or use null when identification confidence is low or toxicity is uncertain.',
    '- Provide toxicityNotes (under 200 characters) when toxic, e.g. which pets and symptoms; otherwise return an empty string.',
  ].join('\n')
}

async function generatePlantAnalysis(
  genAI: GoogleGenerativeAI,
  prompt: string,
  imagePart: { inlineData: { data: string; mimeType: string } },
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  })

  const result = await model.generateContent([prompt, imagePart])
  return result.response.text()
}

export async function handleAnalyzePlantRequest(
  body: unknown,
): Promise<{ status: number; body: AnalyzePlantResult | AnalyzePlantError }> {
  const parsed = analyzePlantPayloadSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request payload.'
    return { status: 400, body: { error: message } }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { status: 500, body: { error: 'Plant analysis is not configured.' } }
  }

  try {
    const { imageBase64, mimeType, preferredDays: rawPreferredDays, language: rawLanguage } = parsed.data
    const preferredDays = normalizePreferredDays(rawPreferredDays)
    const language = normalizeAppLanguage(rawLanguage)
    const genAI = new GoogleGenerativeAI(apiKey)

    const imagePart = toGeminiInlineDataPart(imageBase64, mimeType)
    const prompt = buildAnalyzePrompt(preferredDays, language)
    const text = await generatePlantAnalysis(genAI, prompt, imagePart)
    const result = parseGeminiPlantAnalysisText(text, preferredDays, language)

    return {
      status: 200,
      body: result,
    }
  } catch (error) {
    console.error('Gemini API Error:', error)
    const fallback = 'Failed to analyze plant image. Please try another photo.'
    return {
      status: isImagePayloadError(error) ? 400 : 500,
      body: {
        error: friendlyGeminiError(error, fallback),
      },
    }
  }
}
