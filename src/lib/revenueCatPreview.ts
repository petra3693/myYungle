import { appApiHeaders } from '@/lib/apiAuth'

/** Client wrapper for the server-side Pro Preview (reverse-trial) grant endpoint. */
export async function requestProPreview(appUserId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch('/api/grant-pro-preview', {
      method: 'POST',
      headers: appApiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ appUserId }),
    })
    const body = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null
    if (!response.ok || !body?.success) {
      return { ok: false, error: body?.error ?? `Pro Preview request failed (${response.status}).` }
    }
    return { ok: true }
  } catch (error) {
    console.error('[myJungle] pro preview network error:', error)
    return { ok: false, error: 'Could not reach the Pro Preview service. Check your connection and try again.' }
  }
}
