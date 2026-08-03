import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import { z } from 'zod'

export const analyzePlantPayloadSchema = z.object({
  imageBase64: z.string().min(1, 'No image provided'),
  mimeType: z.string().default('image/jpeg'),
})

export type AnalyzePlantPayload = z.infer<typeof analyzePlantPayloadSchema>

export interface AnalyzePlantResult {
  name: string
  waterNeed: 'light' | 'moderate' | 'heavy'
  careNotes: string
}

export interface AnalyzePlantError {
  error: string
}

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
    careNotes: {
      type: SchemaType.STRING,
      description: 'Short care instructions and tips',
    },
  },
  required: ['name', 'waterNeed', 'careNotes'],
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
    const { imageBase64, mimeType } = parsed.data
    const genAI = new GoogleGenerativeAI(apiKey)

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    })

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType,
      },
    }

    const prompt =
      'Identify the plant in this image, determine its water requirement (light, moderate, heavy), and provide care instructions.'

    const result = await model.generateContent([prompt, imagePart])
    const text = result.response.text()
    const plantData = JSON.parse(text) as AnalyzePlantResult

    if (!plantData.name || !plantData.waterNeed || !plantData.careNotes) {
      return { status: 500, body: { error: 'Incomplete analysis result from AI.' } }
    }

    const waterNeed = plantData.waterNeed.toLowerCase()
    if (waterNeed !== 'light' && waterNeed !== 'moderate' && waterNeed !== 'heavy') {
      return { status: 500, body: { error: 'Invalid water need in AI response.' } }
    }

    return {
      status: 200,
      body: {
        name: plantData.name.trim(),
        waterNeed: waterNeed as AnalyzePlantResult['waterNeed'],
        careNotes: plantData.careNotes.trim(),
      },
    }
  } catch (error) {
    console.error('Gemini API Error:', error)
    return { status: 500, body: { error: 'Failed to analyze plant image' } }
  }
}
