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

    const { handleProPreviewRequest } = await import('../src/server/revenueCatPreviewHandler.js')
    const result = await handleProPreviewRequest(parseRequestBody(req.body))
    return res.status(result.status).json(result.body)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ success: false, error: errorMessage(err) })
  }
}
