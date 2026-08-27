import { z } from 'zod'
import { ENTITLEMENT_PRO, PRO_PREVIEW_DURATION } from '../lib/monetization'

export const proPreviewPayloadSchema = z.object({
  appUserId: z.string().trim().min(1, 'Missing app user id.'),
})

export type ProPreviewPayload = z.infer<typeof proPreviewPayloadSchema>

// RevenueCat's anonymous id: "$RCAnonymousID:" + a 32-char lowercase-hex UUID.
const RC_ANONYMOUS_ID_RE = /^\$RCAnonymousID:[0-9a-f]{32}$/
// A developer-assigned app_user_id: bounded length, no whitespace/control chars.
const RC_CUSTOM_ID_RE = /^[A-Za-z0-9_\-.:$]{1,64}$/

/** Rejects garbage (oversized strings, whitespace, injection attempts) before it ever reaches RevenueCat's API. */
export function isValidRevenueCatAppUserId(id: string): boolean {
  return RC_ANONYMOUS_ID_RE.test(id) || RC_CUSTOM_ID_RE.test(id)
}

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
export async function handleProPreviewRequest(
  body: unknown,
  clientIp = 'unknown',
): Promise<{ status: number; body: ProPreviewResponse }> {
  const parsed = proPreviewPayloadSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request.'
    console.warn(`[myJungle] pro preview: rejected malformed request from ${clientIp}: ${message}`)
    return { status: 400, body: { success: false, error: message } }
  }

  const { appUserId } = parsed.data

  if (!isValidRevenueCatAppUserId(appUserId)) {
    console.warn(`[myJungle] pro preview: rejected appUserId "${appUserId}" (bad format) from ${clientIp}`)
    return { status: 400, body: { success: false, error: 'Invalid request.' } }
  }

  console.log(`[myJungle] pro preview: grant attempt for "${appUserId}" from ${clientIp}`)

  const secretKey = process.env.REVENUECAT_SECRET_API_KEY?.trim()
  if (!secretKey) {
    return { status: 503, body: { success: false, error: 'Pro Preview is not configured on the server.' } }
  }

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
