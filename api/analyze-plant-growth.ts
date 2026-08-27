import {
  parseRequestBody,
  sendServerError,
  type VercelRequest,
  type VercelResponse,
} from './_shared.js'
import { getClientIp, isAuthorizedRequest } from './_auth.js'
import { checkRateLimit } from './_rateLimit.js'

const RATE_LIMIT = { limit: 20, windowMs: 10 * 60 * 1000 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' })
    }

    if (!isAuthorizedRequest(req)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const rate = checkRateLimit(`analyze-plant-growth:${getClientIp(req)}`, RATE_LIMIT.limit, RATE_LIMIT.windowMs)
    if (!rate.allowed) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' })
    }

    if (!process.env.GEMINI_API_KEY?.trim()) {
      console.error('[myJungle] analyze-plant-growth: missing GEMINI_API_KEY')
      return res.status(503).json({ success: false, error: 'Growth analysis is not configured on the server.' })
    }

    const { handleAnalyzePlantGrowthRequest } = await import('../src/server/analyzePlantGrowthHandler.js')
    const result = await handleAnalyzePlantGrowthRequest(parseRequestBody(req.body))
    return res.status(result.status).json(result.body)
  } catch (err) {
    return sendServerError(res, err, 'Could not analyze this photo. Please try again.')
  }
}
