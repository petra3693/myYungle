# Deploy — environment variables

Covers every environment variable the Vercel deployment needs, including the
app-token + rate-limit protection added to all five `/api/*` endpoints
(`api/analyze-plant.ts`, `api/analyze-plant-health.ts`,
`api/analyze-plant-growth.ts`, `api/grant-pro-preview.ts`, `api/feedback.ts`).

## Existing variables

| Variable | Where | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Server | Calls to Google Gemini from the three `analyze-plant*` handlers. |
| `REVENUECAT_SECRET_API_KEY` | Server | Grants the promotional Pro Preview entitlement via the RevenueCat REST API. |
| `DISCORD_WEBHOOK_URL` / `RESEND_API_KEY` / `FEEDBACK_TO_EMAIL` / `FEEDBACK_FROM_EMAIL` | Server | `api/feedback.ts` delivery — at least one method must be configured. |
| `VITE_RC_KEY_IOS` / `VITE_RC_KEY_ANDROID` | Client (bundled) | Per-platform RevenueCat public SDK keys — see `AGENTS.md`. |

## New: API app-token + rate limiting

Every request to the five endpoints above must now carry an `X-App-Token`
header, and is additionally rate-limited by client IP.

| Variable | Where | Purpose |
|---|---|---|
| `APP_API_TOKEN` | Server | The value every request's `X-App-Token` header is compared against (`api/_auth.ts`, constant-time comparison). |
| `VITE_APP_API_TOKEN` | Client (bundled) | Same value as `APP_API_TOKEN` — the client reads it via `src/lib/apiAuth.ts` and attaches it as `X-App-Token` on every `/api/*` call. |

Set both to **the same value** — a long random string (e.g.
`openssl rand -hex 32`). Configure them in the Vercel project's Environment
Variables for every environment you deploy (Production, Preview, and any
local `.env` used for `vercel dev`).

**Important limitation, stated plainly**: `VITE_APP_API_TOKEN` is a
`VITE_`-prefixed variable, so Vite bundles its value directly into the shipped
client JavaScript — anyone who inspects network requests from the app or
decompiles the web/mobile bundle can read it. This is **not** real
authentication and never will be with a purely client-embedded token; its
job is to filter out casual scanning and naive scripted abuse (a bot hitting
`/api/analyze-plant` directly, with no app context at all), not to stop a
determined attacker who extracts the token from the app itself. If a
released token needs to be treated as compromised, rotate `APP_API_TOKEN`
server-side and ship a new client build with the matching
`VITE_APP_API_TOKEN`.

If `APP_API_TOKEN` is unset or empty on the server, `api/_auth.ts` **fails
open**: every request is let through rather than rejected, so forgetting to
set the variable doesn't take the whole API down. A warning is logged once
per server process (`console.warn`, not sent to the client) so the missing
configuration doesn't go unnoticed — but until `APP_API_TOKEN` is set, the
token check provides no protection at all. Set it before relying on it.
Requests that do carry a token but fail the comparison get a generic
`401 Unauthorized`; nothing about *why* is disclosed to the client.

### Rate limits (per client IP, one shared in-memory module: `api/_rateLimit.ts`)

| Endpoint | Limit |
|---|---|
| `analyze-plant`, `analyze-plant-health`, `analyze-plant-growth`, `feedback` | 20 requests / 10 minutes, each endpoint tracked independently |
| `grant-pro-preview` | 3 requests / 24 hours |

A request over the limit gets `429 Too Many Requests` with a generic message.

This limiter is **in-memory per serverless instance**, not a distributed
guarantee — Vercel can run several concurrent instances of the same function,
each with its own copy of the counters, and a cold start resets them. It
still meaningfully raises the cost of abuse and caps any single hot instance.
If a hard, cross-instance guarantee is ever needed, swap `api/_rateLimit.ts`'s
in-memory `Map` for a durable store (Vercel KV / Upstash Redis) behind the
same `checkRateLimit()` signature — every endpoint calls through that one
function, so the endpoints themselves would need no changes.

### `grant-pro-preview` — extra validation

Beyond the token + rate limit, `grant-pro-preview` also rejects any
`appUserId` that doesn't look like a RevenueCat id — either the anonymous
format (`$RCAnonymousID:` + 32 lowercase-hex characters) or a bounded,
control-character-free developer-assigned id (`src/server/revenueCatPreviewHandler.ts`,
`isValidRevenueCatAppUserId`). Every attempt — accepted, malformed, or
format-rejected — is logged server-side (`appUserId`, source IP) for abuse
monitoring; none of that detail is echoed back to the client.

## Error responses never leak internals

Every one of the five hardened endpoints now funnels unexpected failures
(missing env vars, upstream API errors, unhandled exceptions) through
`sendServerError()` (`api/_shared.ts`), which logs the real error server-side
and always sends a generic message to the client. Genuine user-facing errors
(a bad photo, an unsupported format) still surface a specific, friendly
message via the existing `friendlyGeminiError()` pattern
(`src/server/geminiImagePart.ts`) — that distinction is unchanged.

## New: PostHog analytics — and the App Privacy declarations it requires

`src/lib/analytics.ts`'s `logEvent()` used to only log to the console and a
capped localStorage ring buffer — no data left the device. It now also
forwards every event to PostHog via `src/lib/analyticsProvider.ts`, but only
when a key is configured:

| Variable | Where | Purpose |
|---|---|---|
| `VITE_POSTHOG_KEY` | Client (bundled) | PostHog project API key. Unset/empty → `logEvent()` behaves exactly as before (console + localStorage only, no network call, no SDK init). |
| `VITE_POSTHOG_HOST` | Client (bundled) | PostHog ingestion host. Defaults to `https://us.i.posthog.com` (PostHog Cloud, US) if unset — set it explicitly if the project is on the EU cloud or self-hosted. |

The integration is deliberately narrow: `autocapture`, `capture_pageview`,
`capture_pageleave`, and session recording are all explicitly disabled in
`analyticsProvider.ts` — the only data PostHog ever receives is the same
named events (`paywall_shown`, `plant_added`, `purchase_completed`, etc. —
see the `AnalyticsEventName` union in `analytics.ts`) that were already being
logged locally, plus PostHog's own anonymous device identifier. No accounts,
no PII fields, no raw UI interaction capture.

**Action required before shipping a build with `VITE_POSTHOG_KEY` set**: this
is the first time the app sends any data off-device, so both stores' privacy
declarations need to be updated to match, *before* that build is submitted:

- **Apple — App Store Connect → App Privacy** (the "nutrition label"): add a
  data type entry for **Product Interaction** / **Usage Data**, linked to
  **Analytics** as the purpose. It's collected but not used for tracking
  across other companies' apps/sites (no ad tracking, no IDFA), so it belongs
  under "Data Used to Track You: No" / "Data Linked to You" or "Data Not
  Linked to You" depending on whether PostHog's anonymous ID is considered
  linked in your setup — confirm against PostHog's current Apple-privacy
  guidance before answering that specific question, since Apple's exact
  categories change over time.
- **Google Play Console → App content → Data safety**: add **App activity**
  (App interactions) collected for **Analytics**, marked as collected (not
  shared with third parties beyond the processor relationship with PostHog),
  encrypted in transit, with a way to request deletion (PostHog supports
  this).
- **The app's own Privacy Policy** (`src/legal/legalContent.ts`,
  `docs/legal/privacy.md`) should name PostHog as an analytics
  sub-processor. This wasn't updated as part of wiring in the adapter — it
  needs a deliberate copy decision (retention period, opt-out mechanism, if
  any) that isn't this change's call to make.

None of the above is enforced by the code — `analyticsProvider.ts` will
happily start sending events the moment `VITE_POSTHOG_KEY` is set in any
environment, App Store/Play declarations or not. Update the declarations
*before* setting the key on a build headed for review, not after.

## Deploying

After setting the env vars above, `npm run deploy:vercel` builds and deploys
as usual. No native (`ios`/`android`) changes are needed for the API
hardening or the PostHog integration — both are server + client-JS only
(PostHog's JS SDK works inside the Capacitor WebView over plain HTTPS, no
native plugin required).
