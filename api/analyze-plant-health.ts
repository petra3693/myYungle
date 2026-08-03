import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'

interface VercelRequest {
  method?: string
  body?: unknown
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
}

interface AnalyzePlantHealthResult {
  healthScore: number
  diagnosis: string
  treatmentNotes: string
}

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-flash-latest'] as const

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    healthScore: {
      type: SchemaType.NUMBER,
      description: 'Overall plant health percentage from 0 to 100',
    },
    diagnosis: {
      type: SchemaType.STRING,
      description: 'Short issue name such as Healthy, Overwatered, or Leaf spot',
    },
    treatmentNotes: {
      type: SchemaType.STRING,
      description: 'Short actionable care advice (max 400 characters)',
    },
  },
  required: ['healthScore', 'diagnosis', 'treatmentNotes'],
}

function getRequestBody(req: VercelRequest): { imageBase64?: string; mimeType?: string; language?: string } {
  if (req.body && typeof req.body === 'object') {
    return req.body as { imageBase64?: string; mimeType?: string; language?: string }
  }
  return {}
}

function normalizeLanguage(value: unknown): 'en' | 'de' | 'hu' {
  const lang = String(value ?? 'en').toLowerCase()
  if (lang === 'de' || lang === 'hu') return lang
  return 'en'
}

function languagePromptInstruction(language: 'en' | 'de' | 'hu'): string {
  switch (language) {
    case 'de':
      return 'Write diagnosis and treatmentNotes in German.'
    case 'hu':
      return 'Write diagnosis and treatmentNotes in Hungarian.'
    default:
      return 'Write diagnosis and treatmentNotes in English.'
  }
}

function clampHealthScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
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
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema,
        },
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing on Vercel' })
  }

  const { imageBase64, mimeType = 'image/jpeg', language: rawLanguage } = getRequestBody(req)
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'No image provided' })
  }

  const language = normalizeLanguage(rawLanguage)

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType: typeof mimeType === 'string' && mimeType ? mimeType : 'image/jpeg',
      },
    }

    const prompt =
      'Analyze this plant photo for diseases, pests, nutrient deficiencies, watering issues, or other health problems. ' +
      'Return healthScore as an integer from 0 to 100 (100 = perfectly healthy). ' +
      'Set diagnosis to a short label like "Healthy", "Overwatered", "Spider mites", or "Leaf spot". ' +
      'Provide brief, actionable treatmentNotes under 400 characters. ' +
      languagePromptInstruction(language)

    const text = await generateHealthAnalysis(genAI, prompt, imagePart)

    let healthData: AnalyzePlantHealthResult
    try {
      healthData = JSON.parse(text) as AnalyzePlantHealthResult
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI health analysis response.' })
    }

    if (!healthData.diagnosis || !healthData.treatmentNotes || healthData.healthScore == null) {
      return res.status(500).json({ error: 'Incomplete health analysis result from AI.' })
    }

    return res.status(200).json({
      healthScore: clampHealthScore(Number(healthData.healthScore)),
      diagnosis: healthData.diagnosis.trim(),
      treatmentNotes: healthData.treatmentNotes.trim().slice(0, 400),
    })
  } catch (error) {
    console.error('Gemini Health API Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to analyze plant health'
    return res.status(500).json({ error: message })
  }
}
