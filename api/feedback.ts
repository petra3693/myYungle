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

    const { handleFeedbackRequest } = await import('../src/server/feedbackHandler.js')
    const result = await handleFeedbackRequest(parseRequestBody(req.body))
    return res.status(result.status).json(result.body)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, error: errorMessage(err) })
  }
}
