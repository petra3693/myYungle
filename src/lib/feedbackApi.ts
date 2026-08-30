import { apiUrl, appApiHeaders, logUnauthorizedApiError } from '@/lib/apiAuth'

/** Mirrors the server's feedbackPayloadSchema (src/server/feedbackHandler.ts) — kept as a local client-side type instead of importing the server module. */
export interface FeedbackPayload {
  thought?: string
  issue?: string
  contact?: string
}

export async function submitFeedback(payload: FeedbackPayload): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch(apiUrl('/api/feedback'), {
      method: 'POST',
      headers: appApiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    })

    if (response.status === 401) {
      logUnauthorizedApiError('feedback')
      return { ok: false, error: 'Could not send feedback. Please try again later.' }
    }

    const data = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null
    if (!response.ok || !data?.success) {
      return { ok: false, error: data?.error?.trim() || 'Could not send feedback. Please try again later.' }
    }
    return { ok: true }
  } catch (error) {
    console.error('[myJungle] feedback network error:', error)
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' }
  }
}
