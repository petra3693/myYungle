import type { Plugin } from 'vite'

/** Dev-only API route plugins — kept out of vite.config.ts so production builds never bundle server handlers. */
export function createDevApiPlugins(env: Record<string, string>): Plugin[] {
  return [feedbackApiDevPlugin(env), analyzePlantApiDevPlugin(env)]
}

/** Dev-only POST /api/feedback — mirrors Vercel serverless route in `api/feedback.ts`. */
function feedbackApiDevPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'feedback-api-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url !== '/api/feedback') return next()

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: false, error: 'Method not allowed' }))
          return
        }

        try {
          const chunks: Buffer[] = []
          for await (const chunk of req) {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
          }
          const raw = Buffer.concat(chunks).toString('utf8')
          const body = raw ? JSON.parse(raw) : {}

          process.env.DISCORD_WEBHOOK_URL = env.DISCORD_WEBHOOK_URL ?? process.env.DISCORD_WEBHOOK_URL
          process.env.RESEND_API_KEY = env.RESEND_API_KEY ?? process.env.RESEND_API_KEY
          process.env.FEEDBACK_TO_EMAIL = env.FEEDBACK_TO_EMAIL ?? process.env.FEEDBACK_TO_EMAIL
          process.env.FEEDBACK_FROM_EMAIL = env.FEEDBACK_FROM_EMAIL ?? process.env.FEEDBACK_FROM_EMAIL

          const { handleFeedbackRequest } = await import('./src/server/feedbackHandler')
          const result = await handleFeedbackRequest(body)
          res.statusCode = result.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result.body))
        } catch {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: false, error: 'Failed to send feedback. Please try again later.' }))
        }
      })
    },
  }
}

/**
 * Dev/preview POST /api/analyze-plant — mirrors Vercel serverless route in `api/analyze-plant.ts`.
 *
 * Loads the handler modules via `server.ssrLoadModule()` rather than a plain
 * dynamic `import()`. A raw `import()` of a `.ts` file here falls through to
 * Node's native ESM resolver for that module's own sub-imports, which can't
 * follow this project's TS-style `.js`-suffixed relative imports (they
 * resolve fine in Vite's own transform pipeline and in Vercel's build
 * bundler, just not under plain `node:internal/modules/esm/resolve`).
 * `ssrLoadModule` runs the file through Vite's full transform pipeline
 * instead, so aliases and extensions resolve exactly like the rest of the app.
 */
function analyzePlantApiDevPlugin(env: Record<string, string>): Plugin {
  const registerAnalyzePlantRoute = (
    middlewares: {
      use: (
        fn: (
          req: import('node:http').IncomingMessage,
          res: import('node:http').ServerResponse,
          next: (err?: unknown) => void,
        ) => void,
      ) => void
    },
    loadModule: (path: string) => Promise<Record<string, unknown>>,
  ) => {
    middlewares.use(async (req, res, next) => {
      const url = req.url?.split('?')[0]
      const isPlantRoute = url === '/api/analyze-plant'
      const isHealthRoute = url === '/api/analyze-plant-health'
      const isGrowthRoute = url === '/api/analyze-plant-growth'
      if (!isPlantRoute && !isHealthRoute && !isGrowthRoute) return next()

      if (req.method !== 'POST') {
        res.statusCode = 405
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Method not allowed' }))
        return
      }

      try {
        const chunks: Buffer[] = []
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
        }
        const raw = Buffer.concat(chunks).toString('utf8')

        let body: unknown = {}
        if (raw) {
          try {
            body = JSON.parse(raw)
          } catch {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Invalid JSON request body.' }))
            return
          }
        }

        // Assigning `undefined` to a process.env property stringifies it to
        // the literal text "undefined" instead of leaving it unset — only
        // assign when there's an actual value to assign.
        if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY
        if (env.GEMINI_MODEL) process.env.GEMINI_MODEL = env.GEMINI_MODEL

        if (!process.env.GEMINI_API_KEY) {
          res.statusCode = 503
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error:
                'Plant analysis is not configured. Add GEMINI_API_KEY to .env.local and restart the dev server.',
            }),
          )
          return
        }

        // Only load the handler the matched route actually needs — loading all three
        // unconditionally meant a failure in any one of them broke every route.
        const result = isHealthRoute
          ? await (
              (await loadModule('/src/server/analyzePlantHealthHandler.ts')) as {
                handleAnalyzePlantHealthRequest: (body: unknown) => Promise<{ status: number; body: unknown }>
              }
            ).handleAnalyzePlantHealthRequest(body)
          : isGrowthRoute
            ? await (
                (await loadModule('/src/server/analyzePlantGrowthHandler.ts')) as {
                  handleAnalyzePlantGrowthRequest: (body: unknown) => Promise<{ status: number; body: unknown }>
                }
              ).handleAnalyzePlantGrowthRequest(body)
            : await (
                (await loadModule('/src/server/analyzePlantHandler.ts')) as {
                  handleAnalyzePlantRequest: (body: unknown) => Promise<{ status: number; body: unknown }>
                }
              ).handleAnalyzePlantRequest(body)
        res.statusCode = result.status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(result.body))
      } catch (error) {
        console.error('[myJungle] analyze-plant dev route error:', error)
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: isHealthRoute ? 'Failed to analyze plant health' : isGrowthRoute ? 'Failed to analyze plant growth' : 'Failed to analyze plant image' }))
      }
    })
  }

  return {
    name: 'analyze-plant-api-dev',
    apply: 'serve',
    enforce: 'pre',
    configureServer(server) {
      // Routes through Vite's own module graph so TS-style `.js`-suffixed
      // relative imports and the `@/` alias resolve exactly like they do
      // for the rest of the app.
      registerAnalyzePlantRoute(server.middlewares, (path) => server.ssrLoadModule(path))
    },
    configurePreviewServer(server) {
      // The preview server serves the built `dist/` output and has no module
      // graph to load source `.ts` files through, so this falls back to a
      // plain dynamic import (same as before).
      registerAnalyzePlantRoute(server.middlewares, (path) => import(/* @vite-ignore */ `.${path}`))
    },
  }
}
