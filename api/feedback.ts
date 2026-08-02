import { handleFeedbackRequest } from '../src/server/feedbackHandler'

interface VercelRequest {
  method?: string
  body?: unknown
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const result = await handleFeedbackRequest(req.body)
  return res.status(result.status).json(result.body)
}
