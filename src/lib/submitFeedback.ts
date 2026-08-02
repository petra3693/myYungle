import type { FeedbackPayload, FeedbackResponse } from '@/server/feedbackHandler'

export type { FeedbackPayload, FeedbackResponse }

export async function submitFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
  const response = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = (await response.json()) as FeedbackResponse
  if (!response.ok) {
    return { success: false, error: data.error ?? 'Failed to send feedback.' }
  }
  return data
}
