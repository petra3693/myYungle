import { handleAnalyzePlantRequest } from '../src/server/analyzePlantHandler'

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
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const result = await handleAnalyzePlantRequest(req.body)
  return res.status(result.status).json(result.body)
}
