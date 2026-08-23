import type { PaywallSource, SubscriptionPlanId } from '@/lib/monetization'

/**
 * Minimal analytics abstraction — no real backend is wired up yet.
 * Events are logged to the console and kept in a capped localStorage ring
 * buffer (inspectable via `localStorage.getItem('mj_analytics_log')`) so the
 * event shape and call sites can be verified end to end before a real
 * provider (Amplitude/Mixpanel/PostHog/etc.) is connected here.
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
}
