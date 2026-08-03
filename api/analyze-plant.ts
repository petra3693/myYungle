import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'

interface VercelRequest {
  method?: string
  body?: unknown
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
}

interface AnalyzePlantResult {
  name: string
  waterNeed: 'light' | 'moderate' | 'heavy'
  lightNeed: 'low' | 'medium' | 'high'
  careNotes: string
  recommendedDays: string[]
  frequency: 'weekly' | 'biweekly' | 'monthly'
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

function getRequestBody(req: VercelRequest): {
  imageBase64?: string
  mimeType?: string
  preferredDays?: string[]
} {
  if (req.body && typeof req.body === 'object') {
    return req.body as {
      imageBase64?: string
      mimeType?: string
      preferredDays?: string[]
    }
  }
  return {}
}

function normalizePreferredDays(preferredDays: unknown): string[] {
  if (!Array.isArray(preferredDays)) return [...FULL_DAY_NAMES]
  const valid = preferredDays
    .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
    .map((d) => {
      const match = FULL_DAY_NAMES.find((name) => name.toLowerCase() === d.trim().toLowerCase())
      return match ?? d.trim()
    })
  return valid.length > 0 ? valid : [...FULL_DAY_NAMES]
}

function buildAnalyzePrompt(preferredDays: string[]): string {
  const dayList = preferredDays.join(', ')
  return [
    'Identify the plant in this image, determine its water requirement (light, moderate, or heavy), light requirement, and provide care instructions.',
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing on Vercel' })
  }

  const { imageBase64, mimeType = 'image/jpeg', preferredDays: rawPreferredDays } = getRequestBody(req)
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'No image provided' })
  }

  const preferredDays = normalizePreferredDays(rawPreferredDays)

  try {
    const genAI = new GoogleGenerativeAI(apiKey)

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType: typeof mimeType === 'string' && mimeType ? mimeType : 'image/jpeg',
      },
    }

    const prompt = buildAnalyzePrompt(preferredDays)
    const text = await generatePlantAnalysis(genAI, prompt, imagePart)

    let plantData: AnalyzePlantResult
    try {
      plantData = JSON.parse(text) as AnalyzePlantResult
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI analysis response.' })
    }

    if (!plantData.name || !plantData.waterNeed || !plantData.lightNeed || !plantData.careNotes) {
      return res.status(500).json({ error: 'Incomplete analysis result from AI.' })
    }

    const waterNeed = String(plantData.waterNeed).toLowerCase()
    if (waterNeed !== 'light' && waterNeed !== 'moderate' && waterNeed !== 'heavy') {
      return res.status(500).json({ error: 'Invalid water need in AI response.' })
    }

    const lightNeed = normalizeLightNeed(plantData.lightNeed)

    const recommendedDays = Array.isArray(plantData.recommendedDays)
      ? plantData.recommendedDays.filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
      : []

    return res.status(200).json({
      name: plantData.name.trim(),
      waterNeed,
      lightNeed,
      careNotes: plantData.careNotes.trim(),
      recommendedDays,
      frequency: normalizeFrequency(plantData.frequency),
    })
  } catch (error) {
    console.error('Gemini API Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to analyze plant image'
    return res.status(500).json({ error: message })
  }
}
