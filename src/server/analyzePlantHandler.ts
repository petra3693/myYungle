import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import { z } from 'zod'

type AppLanguage = 'en' | 'de' | 'hu'

function normalizeAppLanguage(value: unknown): AppLanguage {
  const lang = String(value ?? 'en').toLowerCase()
  if (lang === 'de' || lang === 'hu') return lang
  return 'en'
}

function languagePromptInstruction(language: AppLanguage): string {
  switch (language) {
    case 'de':
      return 'Write all user-facing text fields (careNotes, diagnosis, treatmentNotes) in German.'
    case 'hu':
      return 'Write all user-facing text fields (careNotes, diagnosis, treatmentNotes) in Hungarian.'
    default:
      return 'Write all user-facing text fields (careNotes, diagnosis, treatmentNotes) in English.'
  }
}

export const analyzePlantPayloadSchema = z.object({
  imageBase64: z.string().min(1, 'No image provided'),
  mimeType: z.string().default('image/jpeg'),
  preferredDays: z.array(z.string()).optional(),
  language: z.enum(['en', 'de', 'hu']).optional(),
})

export type AnalyzePlantPayload = z.infer<typeof analyzePlantPayloadSchema>

export interface AnalyzePlantResult {
  name: string
  waterNeed: 'light' | 'moderate' | 'heavy'
  lightNeed: 'low' | 'medium' | 'high'
  careNotes: string
  recommendedDays: string[]
  frequency: 'weekly' | 'biweekly' | 'monthly'
}

export interface AnalyzePlantError {
  error: string
}

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-flash-latest'] as const

const FULL_DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    name: {
      type: SchemaType.STRING,
      description: 'The name of the plant',
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
      description: 'Light requirement: low (low light), medium (indirect/medium light), or high (direct sunlight)',
    },
    careNotes: {
      type: SchemaType.STRING,
      description: 'Short care instructions and tips',
    },
    recommendedDays: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description:
        'Minimum necessary watering days selected from the user preferred days (full day names, e.g. "Tuesday")',
    },
    frequency: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: ['weekly', 'biweekly', 'monthly'],
      description: 'How often to water: weekly, biweekly (every 2 weeks), or monthly (every 4 weeks)',
    },
  },
  required: ['name', 'waterNeed', 'lightNeed', 'careNotes', 'recommendedDays', 'frequency'],
}

function normalizePreferredDays(preferredDays: string[] | undefined): string[] {
  if (!preferredDays?.length) return [...FULL_DAY_NAMES]
  const valid = preferredDays
    .map((d) => {
      const match = FULL_DAY_NAMES.find((name) => name.toLowerCase() === d.trim().toLowerCase())
      return match ?? d.trim()
    })
    .filter(Boolean)
  return valid.length > 0 ? valid : [...FULL_DAY_NAMES]
}

function buildAnalyzePrompt(preferredDays: string[], language: ReturnType<typeof normalizeAppLanguage>): string {
  const dayList = preferredDays.join(', ')
  return [
    'Identify the plant in this image, determine its water requirement (light, moderate, or heavy), light requirement, and provide care instructions.',
    languagePromptInstruction(language),
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
  ].join('\n')
}

function normalizeFrequency(value: unknown): AnalyzePlantResult['frequency'] {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'biweekly') return 'biweekly'
  if (normalized === 'monthly') return 'monthly'
  return 'weekly'
}

function normalizeLightNeed(value: unknown): AnalyzePlantResult['lightNeed'] {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'low') return 'low'
  if (normalized === 'high') return 'high'
  return 'medium'
}

async function generatePlantAnalysis(
  genAI: GoogleGenerativeAI,
  prompt: string,
  imagePart: { inlineData: { data: string; mimeType: string } },
): Promise<string> {
  let lastError: unknown

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema,
        },
      })

      const result = await model.generateContent([prompt, imagePart])
      return result.response.text()
    } catch (error) {
      console.error(`Gemini model "${modelName}" failed:`, error)
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error('All Gemini models failed.')
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

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType,
      },
    }

    const prompt = buildAnalyzePrompt(preferredDays, language)
    const text = await generatePlantAnalysis(genAI, prompt, imagePart)
    const plantData = JSON.parse(text) as AnalyzePlantResult

    if (!plantData.name || !plantData.waterNeed || !plantData.lightNeed || !plantData.careNotes) {
      return { status: 500, body: { error: 'Incomplete analysis result from AI.' } }
    }

    const waterNeed = plantData.waterNeed.toLowerCase()
    if (waterNeed !== 'light' && waterNeed !== 'moderate' && waterNeed !== 'heavy') {
      return { status: 500, body: { error: 'Invalid water need in AI response.' } }
    }

    const lightNeed = normalizeLightNeed(plantData.lightNeed)

    const recommendedDays = Array.isArray(plantData.recommendedDays)
      ? plantData.recommendedDays.filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
      : []

    return {
      status: 200,
      body: {
        name: plantData.name.trim(),
        waterNeed: waterNeed as AnalyzePlantResult['waterNeed'],
        lightNeed,
        careNotes: plantData.careNotes.trim(),
        recommendedDays,
        frequency: normalizeFrequency(plantData.frequency),
      },
    }
  } catch (error) {
    console.error('Gemini API Error:', error)
    return { status: 500, body: { error: 'Failed to analyze plant image' } }
  }
}
