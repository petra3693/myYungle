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
  diagnosis: string
  severity: 'low' | 'medium' | 'high'
  treatmentNotes: string
  isHealthy: boolean
}

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-flash-latest'] as const

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    diagnosis: {
      type: SchemaType.STRING,
      description: 'Short name of the issue, disease, pest, or "Healthy" if no issues',
    },
    severity: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: ['low', 'medium', 'high'],
      description: 'Severity of the health issue',
    },
    treatmentNotes: {
      type: SchemaType.STRING,
      description: 'Practical treatment steps (max 400 characters)',
    },
    isHealthy: {
      type: SchemaType.BOOLEAN,
      description: 'True if the plant appears healthy with no significant issues',
    },
  },
  required: ['diagnosis', 'severity', 'treatmentNotes', 'isHealthy'],
}

function getRequestBody(req: VercelRequest): { imageBase64?: string; mimeType?: string } {
  if (req.body && typeof req.body === 'object') {
    return req.body as { imageBase64?: string; mimeType?: string }
  }
  return {}
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

  const { imageBase64, mimeType = 'image/jpeg' } = getRequestBody(req)
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'No image provided' })
  }

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
      'Analyze this plant photo for diseases, pests, nutrient deficiencies, or other health issues. ' +
      'If the plant looks healthy, set diagnosis to "Healthy", isHealthy to true, severity to "low", ' +
      'and treatmentNotes to brief maintenance tips. Keep treatmentNotes under 400 characters.'

    const text = await generateHealthAnalysis(genAI, prompt, imagePart)

    let healthData: AnalyzePlantHealthResult
    try {
      healthData = JSON.parse(text) as AnalyzePlantHealthResult
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI health analysis response.' })
    }

    if (!healthData.diagnosis || !healthData.treatmentNotes || healthData.isHealthy === undefined) {
      return res.status(500).json({ error: 'Incomplete health analysis result from AI.' })
    }

    const severity = String(healthData.severity).toLowerCase()
    if (severity !== 'low' && severity !== 'medium' && severity !== 'high') {
      return res.status(500).json({ error: 'Invalid severity in AI response.' })
    }

    return res.status(200).json({
      diagnosis: healthData.diagnosis.trim(),
      severity,
      treatmentNotes: healthData.treatmentNotes.trim().slice(0, 400),
      isHealthy: Boolean(healthData.isHealthy),
    })
  } catch (error) {
    console.error('Gemini Health API Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to analyze plant health'
    return res.status(500).json({ error: message })
  }
}
