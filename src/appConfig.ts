/**
 * Single source of truth for the app's display name. Import this everywhere
 * the running app can (React components, capacitor.config.ts).
 *
 * A few places can't import a TS constant and must be kept in sync by hand
 * whenever this value changes:
 * - package.json "name" (npm requires lowercase — use the lowercase form)
 * - .figma/make/site.json "title" (feeds the built index.html <title>)
 * - public/*.html <title> tags and docs/legal/*.md (static files)
 * - src/i18n/locales/*.json "home.title" and any other literal copies of
 *   the name baked into translated strings
 */
export const CHOSEN_APP_NAME = 'myJungle'
