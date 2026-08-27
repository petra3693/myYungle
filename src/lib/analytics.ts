import type { PaywallSource, SubscriptionPlanId } from '@/lib/monetization'
import { sendToAnalyticsProvider } from '@/lib/analyticsProvider'

/**
 * Analytics abstraction — call sites everywhere else in the app just call
 * logEvent() and never know or care whether a real provider is connected.
 *
 * Every event is still logged to the console and kept in a capped
 * localStorage ring buffer (inspectable via
 * `localStorage.getItem('mj_analytics_log')`), same as before — that never
 * changes, key or no key. When VITE_POSTHOG_KEY is set, the same event is
 * also forwarded to PostHog via analyticsProvider.ts; with no key configured
 * (local dev, CI, before a project exists), it's a no-op and behavior is
 * exactly what it was before PostHog was wired in.
 *
 * IMPORTANT: shipping this with a real key means the app now sends event
 * data to a third party. Apple's App Privacy "nutrition label" (App Store
 * Connect) and Google Play's Data Safety form both need to be updated to
 * declare this — see docs/deploy.md for exactly what changed and why.
 */

export type AnalyticsEventName =
  | 'paywall_shown'
  | 'paywall_dismissed'
  | 'plan_selected'
  | 'purchase_started'
  | 'purchase_completed'
  | 'purchase_failed'
  | 'trial_started'
  | 'trial_converted'
  | 'trial_cancelled'
  | 'lifetime_offer_shown'
  | 'lifetime_purchased'
  | 'restore_attempted'
  | 'restore_succeeded'
  | 'plant_added'
  | 'health_scan_attempted'

export interface PaywallEventProps {
  source: PaywallSource
  plan_shown?: SubscriptionPlanId[]
  plan_selected?: SubscriptionPlanId
  is_trial?: boolean
}

export type AnalyticsEventProps = PaywallEventProps | Record<string, unknown>

const LOG_KEY = 'mj_analytics_log'
const MAX_LOG_ENTRIES = 200

export function logEvent(name: AnalyticsEventName, props: AnalyticsEventProps = {}): void {
  const entry = { name, props, at: new Date().toISOString() }
  console.info('[myJungle][analytics]', name, props)
  try {
    const raw = localStorage.getItem(LOG_KEY)
    const log: unknown[] = raw ? JSON.parse(raw) : []
    log.push(entry)
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-MAX_LOG_ENTRIES)))
  } catch {
    // Best-effort only — never let analytics logging break the app.
  }
  sendToAnalyticsProvider(name, props as Record<string, unknown>)
}
