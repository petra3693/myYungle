import {
  parseRequestBody,
  sendServerError,
  type VercelRequest,
  type VercelResponse,
} from './_shared.js'
import { getClientIp, isAuthorizedRequest } from './_auth.js'
import { checkRateLimit } from './_rateLimit.js'

const RATE_LIMIT = { limit: 3, windowMs: 24 * 60 * 60 * 1000 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' })
    }

    if (!isAuthorizedRequest(req)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const ip = getClientIp(req)
    const rate = checkRateLimit(`grant-pro-preview:${ip}`, RATE_LIMIT.limit, RATE_LIMIT.windowMs)
    if (!rate.allowed) {
      console.warn(`[myJungle] grant-pro-preview: rate limit exceeded for ${ip}`)
      return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' })
    }

    const { handleProPreviewRequest } = await import('../src/server/revenueCatPreviewHandler.js')
    const result = await handleProPreviewRequest(parseRequestBody(req.body), ip)
    return res.status(result.status).json(result.body)
  } catch (err) {
    return sendServerError(res, err, 'Could not activate Pro Preview. Please try again.')
  }
}
