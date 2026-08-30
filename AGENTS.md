# figma-make-app

React + Vite + Tailwind CSS project running inside Figma Make.

## Operating principles

- Be direct and action-oriented: make the exact code change or run the command rather than describing what you'd do.
- Inspect before writing: read the relevant files, types, and existing helpers before assuming how something works — this repo has non-obvious project-specific helpers (e.g. `describeRevenueCatError()`, `resolvePackage()` in `src/lib/monetization.ts`).
- Make incremental, targeted edits. Don't rewrite a whole file for a small fix, and don't refactor beyond what was asked.
- Before declaring a task done, run the relevant verification command(s) from "Standard workflows" below (typecheck/build/test) and fix any failures yourself rather than reporting them back unresolved.

## Coding standards

- TypeScript strict mode: avoid `any`; use explicit types/interfaces for props, state, and API payloads.
- Keep UI components presentational; put non-trivial logic in custom hooks (`useCamelCase`) rather than inline in components.
- Wrap async operations (network requests, Filesystem/storage I/O) in `try/catch` with a real fallback state — see the RevenueCat `offeringsStatus`/`offeringsErrorDetail` pattern in `src/App.tsx` for the shape this repo already uses.
- Naming: components `PascalCase`, hooks `useCamelCase`, helpers/utils `camelCase`, types/interfaces `PascalCase`.
- See "Code quality" below for repo-specific gotchas (quoting, JSX, exports).

## Standard workflows

This project has no separate lint script — formatting is `oxfmt`, not ESLint/Prettier.

- Development: `npm run dev` (Vite on `$PORT`, default 8443 — usually already running, see below)
- Typecheck: `npm run typecheck` (`tsc --noEmit`)
- Test: `npm run test` (`vitest run`)
- Build verification: `npm run build` (`vite build` — also enforces the RevenueCat key guardrail in `vite.config.ts` for `mode === 'production'`)
- Format: `npm run format` (oxfmt)
- Native sync: `npm run sync:mobile` (build + `cap copy` + `cap sync`) before opening Xcode/Android Studio

## Development Server

A Vite development server is **already running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Primary application component and the usual starting point for UI work
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and Figma Make plugins plus the `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt
- State management: plain React state/hooks — no Zustand/Redux/React Query in this project
- Storage: `localStorage` and `idb-keyval` on web; `@capacitor/filesystem` for native photo storage — no backend database
- Native shell: Capacitor 8 (iOS + Android), bundle id `com.lumenappstudio.myjungle`
- Monetization: `@revenuecat/purchases-capacitor` — see "Environment variables" below

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## Environment variables

- `VITE_RC_KEY_IOS` / `VITE_RC_KEY_ANDROID` — real per-platform RevenueCat public API keys (see `.env.example`). `src/App.tsx` picks the right one via `Capacitor.getPlatform()` when configuring the `Purchases` SDK.
- If the key for the current platform is missing or still starts with `test_`, `Purchases.configure()` is never called — the paywall falls back to its existing "pricing load error" state (`offeringsStatus: 'unavailable'`) with a Retry button instead of crashing. Always set real keys before a release build.
- `Purchases.setLogLevel` is `DEBUG` in local dev (`import.meta.env.DEV`) and `ERROR` in production builds.
- `ENTITLEMENT_PRO` and the product identifiers (`PRODUCT_ANNUAL`, `PRODUCT_MONTHLY`, `PRODUCT_LIFETIME`, `PRODUCT_LEGACY_ONETIME`) live in `src/lib/monetization.ts` and must exactly match the RevenueCat dashboard configuration — they are not environment variables.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
