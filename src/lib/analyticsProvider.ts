import posthog from 'posthog-js'

/**
 * Thin adapter around PostHog so analytics.ts never imports the SDK
 * directly — logEvent's call sites don't need to know a real provider
 * exists at all.
 *
 * Silently does nothing when VITE_POSTHOG_KEY isn't set (local dev, CI,
 * anyone who hasn't configured a project yet) — analytics.ts's existing
 * console + localStorage logging is untouched either way, this only adds
 * a forward on top of it.
 */

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined)?.trim() || 'https://us.i.posthog.com'

let initialized = false

function ensureInitialized(): boolean {
  if (!POSTHOG_KEY?.trim()) return false
  if (!initialized) {
    posthog.init(POSTHOG_KEY.trim(), {
      api_host: POSTHOG_HOST,
      // This app has no accounts — every user is anonymous by design, and
      // logEvent only ever sends the small set of named events below, never
      // raw UI interaction or form contents. Keep the SDK's footprint to
      // exactly that: no autocapture, no session replay, no page-view noise
      // from what is a single-page app with no real navigations.
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      respect_dnt: true,
    })
    initialized = true
  }
  return true
}

export function sendToAnalyticsProvider(name: string, props: Record<string, unknown>): void {
  if (!ensureInitialized()) return
  try {
    posthog.capture(name, props)
  } catch (error) {
    // Best-effort only — never let a provider failure break the app.
    console.error('[myJungle] PostHog capture failed:', error)
  }
}
