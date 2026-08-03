import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import { z } from 'zod'

export const analyzePlantHealthPayloadSchema = z.object({
  imageBase64: z.string().min(1, 'No image provided'),
  mimeType: z.string().default('image/jpeg'),
})

export interface AnalyzePlantHealthResult {
  diagnosis: string
  severity: 'low' | 'medium' | 'high'
  treatmentNotes: string
  isHealthy: boolean
}

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-flash-latest'] as const

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    diagnosis: { type: SchemaType.STRING, description: 'Short name of the issue or Healthy' },
    severity: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: ['low', 'medium', 'high'],
      description: 'Severity level',
    },
    treatmentNotes: { type: SchemaType.STRING, description: 'Treatment steps' },
    isHealthy: { type: SchemaType.BOOLEAN, description: 'Whether plant is healthy' },
  },
  required: ['diagnosis', 'severity', 'treatmentNotes', 'isHealthy'],
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
      'Analyze this plant photo for diseases, pests, nutrient deficiencies, or other health issues. ' +
      'If healthy, set diagnosis to "Healthy", isHealthy to true, severity to "low", and treatmentNotes to brief maintenance tips. ' +
      'Keep treatmentNotes under 400 characters.'

    const text = await generateHealthAnalysis(genAI, prompt, imagePart)
    const healthData = JSON.parse(text) as AnalyzePlantHealthResult

    if (!healthData.diagnosis || !healthData.treatmentNotes || healthData.isHealthy === undefined) {
      return { status: 500, body: { error: 'Incomplete health analysis result from AI.' } }
    }

    const severity = String(healthData.severity).toLowerCase()
    if (severity !== 'low' && severity !== 'medium' && severity !== 'high') {
      return { status: 500, body: { error: 'Invalid severity in AI response.' } }
    }

    return {
      status: 200,
      body: {
        diagnosis: healthData.diagnosis.trim(),
        severity: severity as AnalyzePlantHealthResult['severity'],
        treatmentNotes: healthData.treatmentNotes.trim().slice(0, 400),
        isHealthy: Boolean(healthData.isHealthy),
      },
    }
  } catch (error) {
    console.error('Gemini Health API Error:', error)
    return { status: 500, body: { error: 'Failed to analyze plant health' } }
  }
}
