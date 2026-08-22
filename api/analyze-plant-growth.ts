import {
  errorMessage,
  parseRequestBody,
  type VercelRequest,
  type VercelResponse,
} from './_shared.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' })
    }

    if (!process.env.GEMINI_API_KEY?.trim()) {
      throw new Error('Missing GEMINI_API_KEY')
    }

    const { handleAnalyzePlantGrowthRequest } = await import('../src/server/analyzePlantGrowthHandler.js')
    const result = await handleAnalyzePlantGrowthRequest(parseRequestBody(req.body))
    return res.status(result.status).json(result.body)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, error: errorMessage(err) })
  }
}
