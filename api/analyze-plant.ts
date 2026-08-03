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
  careNotes: string
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

function getRequestBody(req: VercelRequest): { imageBase64?: string; mimeType?: string } {
  if (req.body && typeof req.body === 'object') {
    return req.body as { imageBase64?: string; mimeType?: string }
  }
  return {}
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
        mimeType: typeof mimeType === 'string' && mimeType ? mimeType : 'image/jpeg',
      },
    }

    const prompt =
      'Identify the plant in this image, determine its water requirement (light, moderate, heavy), and provide care instructions.'

    const result = await model.generateContent([prompt, imagePart])
    const text = result.response.text()

    let plantData: AnalyzePlantResult
    try {
      plantData = JSON.parse(text) as AnalyzePlantResult
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI analysis response.' })
    }

    if (!plantData.name || !plantData.waterNeed || !plantData.careNotes) {
      return res.status(500).json({ error: 'Incomplete analysis result from AI.' })
    }

    const waterNeed = String(plantData.waterNeed).toLowerCase()
    if (waterNeed !== 'light' && waterNeed !== 'moderate' && waterNeed !== 'heavy') {
      return res.status(500).json({ error: 'Invalid water need in AI response.' })
    }

    return res.status(200).json({
      name: plantData.name.trim(),
      waterNeed,
      careNotes: plantData.careNotes.trim(),
    })
  } catch (error) {
    console.error('Gemini API Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to analyze plant image'
    return res.status(500).json({ error: message })
  }
}
