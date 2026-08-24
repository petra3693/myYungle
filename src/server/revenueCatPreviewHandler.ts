import { z } from 'zod'
import { ENTITLEMENT_PRO, PRO_PREVIEW_DURATION } from '../lib/monetization'

export const proPreviewPayloadSchema = z.object({
  appUserId: z.string().trim().min(1, 'Missing app user id.'),
})

export type ProPreviewPayload = z.infer<typeof proPreviewPayloadSchema>

export interface ProPreviewResponse {
  success: boolean
  error?: string
}

const REVENUECAT_API_BASE = 'https://api.revenuecat.com/v1'

interface RevenueCatSubscriber {
  subscriber?: {
    entitlements?: Record<string, unknown>
  }
}

async function fetchSubscriber(appUserId: string, secretKey: string): Promise<RevenueCatSubscriber> {
  const response = await fetch(`${REVENUECAT_API_BASE}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  })
  if (!response.ok) {
    throw new Error(`RevenueCat subscriber lookup failed (${response.status})`)
  }
  return (await response.json()) as RevenueCatSubscriber
}

async function grantPromotionalEntitlement(appUserId: string, secretKey: string): Promise<void> {
  const response = await fetch(
    `${REVENUECAT_API_BASE}/subscribers/${encodeURIComponent(appUserId)}/entitlements/${encodeURIComponent(ENTITLEMENT_PRO)}/promotional`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ duration: PRO_PREVIEW_DURATION }),
    },
  )
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`RevenueCat promotional grant failed (${response.status}): ${text}`)
  }
}

/**
 * Grants the 7-day Pro Preview (reverse trial, no card) exactly once per
 * app_user_id lifetime. The one-time check is authoritative here (server-side,
 * against RevenueCat's own record of this entitlement) — never trust a
 * client-side "already used" flag alone, since it can be cleared or bypassed.
 */
export async function handleProPreviewRequest(body: unknown): Promise<{ status: number; body: ProPreviewResponse }> {
  const parsed = proPreviewPayloadSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request.'
    return { status: 400, body: { success: false, error: message } }
  }

  const secretKey = process.env.REVENUECAT_SECRET_API_KEY?.trim()
  if (!secretKey) {
    return { status: 503, body: { success: false, error: 'Pro Preview is not configured on the server.' } }
  }

  const { appUserId } = parsed.data

  try {
    const subscriber = await fetchSubscriber(appUserId, secretKey)
    const alreadyGranted = Boolean(subscriber.subscriber?.entitlements?.[ENTITLEMENT_PRO])
    if (alreadyGranted) {
      return { status: 409, body: { success: false, error: 'Pro Preview has already been used on this account.' } }
    }

    await grantPromotionalEntitlement(appUserId, secretKey)
    return { status: 200, body: { success: true } }
  } catch (err) {
    console.error('[myJungle] pro preview grant failed:', err)
    return { status: 500, body: { success: false, error: 'Could not activate Pro Preview. Please try again.' } }
  }
}
