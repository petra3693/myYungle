import {
  parseRequestBody,
  sendServerError,
  type VercelRequest,
  type VercelResponse,
} from './_shared.js'
import { applyCors, handlePreflight } from './_cors.js'
import { getClientIp, isAuthorizedRequest } from './_auth.js'
import { checkRateLimit } from './_rateLimit.js'

const RATE_LIMIT = { limit: 20, windowMs: 10 * 60 * 1000 }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res)
  if (handlePreflight(req, res)) return

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' })
    }

    if (!isAuthorizedRequest(req)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const rate = checkRateLimit(`feedback:${getClientIp(req)}`, RATE_LIMIT.limit, RATE_LIMIT.windowMs)
    if (!rate.allowed) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' })
    }

    const { handleFeedbackRequest } = await import('../src/server/feedbackHandler.js')
    const result = await handleFeedbackRequest(parseRequestBody(req.body))
    return res.status(result.status).json(result.body)
  } catch (err) {
    return sendServerError(res, err, 'Could not send feedback. Please try again.')
  }
}
