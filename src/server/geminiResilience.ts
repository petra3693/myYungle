import { GoogleGenerativeAI, GoogleGenerativeAIFetchError, type Schema } from '@google/generative-ai'
import type { GeminiInlineImagePart } from './geminiImagePart.js'

/**
 * Tried after the primary model, if it's overloaded/unavailable/rate-limited.
 * Deliberately just one entry — one generation older than the primary but
 * still a currently-supported model, not a long tail of models that may
 * themselves have been retired. Never add a model here without confirming
 * it's still served by the API; an unavailable fallback just burns budget
 * with guaranteed 404s instead of providing real resilience.
 */
const FALLBACK_GEMINI_MODELS = ['gemini-2.0-flash']

/** Attempts per model, including the first — "up to 2 attempts" before moving to the next model. */
const MAX_ATTEMPTS_PER_MODEL = 2

/** Base delay for the backoff between retries on the same model: 500ms after the 1st failure. */
const RETRY_BASE_DELAY_MS = 500

/**
 * Hard ceiling on the whole resilient-generate operation (all models, all
 * attempts, all backoff waits combined), checked before every attempt.
 * Exists because the model-fallback × per-model-retry loop can otherwise
 * comfortably outlast a Vercel serverless function's own timeout — in which
 * case the function is killed mid-retry and GeminiOverloadedError never
 * makes it back to the client as a clean 503; the caller just sees a hung
 * request. 8s leaves headroom under a typical 10s function timeout for the
 * rest of the handler (request parsing, response serialization).
 */
export const GEMINI_TOTAL_BUDGET_MS = 8000

export function primaryGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash'
}

function geminiModelChain(): string[] {
  const primary = primaryGeminiModel()
  return [primary, ...FALLBACK_GEMINI_MODELS.filter((model) => model !== primary)]
}

/** Thrown once every model in the chain and all of its retries are exhausted — callers should turn this into a clean 503. */
export class GeminiOverloadedError extends Error {
  constructor() {
    super('AI service is currently busy. Please try again in a few moments.')
    this.name = 'GeminiOverloadedError'
  }
}

/** Marks a failure as worth retrying when it has no HTTP status of its own (network hiccup, empty candidate). */
class GeminiRetryableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeminiRetryableError'
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err ?? 'Unknown error')
}

/**
 * 4xx other than 429 means the request itself was invalid (bad payload, bad
 * API key) — retrying identical input won't help. Everything else — 5xx,
 * 429, a network failure, or an empty candidate with no status at all — is
 * transient and worth retrying / falling back to another model.
 */
function isRetryableError(err: unknown): boolean {
  if (err instanceof GoogleGenerativeAIFetchError) {
    const status = err.status
    if (status === undefined) return true
    if (status >= 400 && status < 500 && status !== 429) return false
    return true
  }
  return true
}

async function callGeminiModel(
  genAI: GoogleGenerativeAI,
  model: string,
  prompt: string,
  imagePart: GeminiInlineImagePart,
  responseSchema: Schema,
): Promise<string> {
  const generativeModel = genAI.getGenerativeModel({
    model,
    generationConfig: { responseMimeType: 'application/json', responseSchema },
  })
  const result = await generativeModel.generateContent([prompt, imagePart])
  const text = result.response.text()
  if (!text || !text.trim()) {
    // An empty candidate on an otherwise-successful call is usually transient flakiness — worth a retry.
    throw new GeminiRetryableError('Gemini returned an empty response.')
  }
  return text
}

/**
 * Generates JSON text from Gemini with a model fallback chain and per-model
 * retries: tries the primary model up to MAX_ATTEMPTS_PER_MODEL times total,
 * waiting a short backoff between attempts on transient errors (overload,
 * 429/5xx, network failure, empty response). If a model is still failing
 * once its attempts are exhausted, moves on to the next fallback model and
 * repeats. A non-retryable error (bad request, invalid API key, unknown
 * model, safety block) is thrown immediately without burning retries or
 * fallbacks, and logged distinctly from transient failures since it's a
 * configuration problem, not load.
 *
 * The whole operation — every model, every attempt, every backoff wait — is
 * bounded by GEMINI_TOTAL_BUDGET_MS, checked before every single attempt
 * (both a same-model retry and a switch to the next model). Once the
 * deadline has passed, it gives up immediately rather than starting another
 * attempt, throwing GeminiOverloadedError so the caller can return a clean
 * 503 instead of the serverless function itself timing out mid-retry.
 */
export async function generateGeminiJsonResilient(
  apiKey: string,
  responseSchema: Schema,
  prompt: string,
  imagePart: GeminiInlineImagePart,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const models = geminiModelChain()
  const deadline = Date.now() + GEMINI_TOTAL_BUDGET_MS

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
      if (Date.now() >= deadline) {
        console.warn(
          `[myJungle] Gemini retry budget (${GEMINI_TOTAL_BUDGET_MS}ms) exhausted before attempting model "${model}" (attempt ${attempt}/${MAX_ATTEMPTS_PER_MODEL}) — giving up.`,
        )
        throw new GeminiOverloadedError()
      }

      try {
        return await callGeminiModel(genAI, model, prompt, imagePart, responseSchema)
      } catch (err) {
        if (!isRetryableError(err)) {
          // Distinct from the transient-failure warning below: a 404/401/403 here means a
          // bad model id or API key — retrying identical input will never fix it.
          console.error(
            `[myJungle] Gemini CONFIGURATION ERROR on model "${model}" — not a load issue, check the model id / API key: ${errorMessage(err)}`,
          )
          throw err
        }

        const attemptsLeft = MAX_ATTEMPTS_PER_MODEL - attempt
        console.warn(
          `[myJungle] Gemini model "${model}" failed (attempt ${attempt}/${MAX_ATTEMPTS_PER_MODEL}): ${errorMessage(err)}`,
        )
        if (attemptsLeft > 0) {
          const remainingMs = deadline - Date.now()
          if (remainingMs <= 0) {
            console.warn(
              `[myJungle] Gemini retry budget exhausted right after model "${model}" attempt ${attempt} — giving up without another attempt.`,
            )
            throw new GeminiOverloadedError()
          }
          await sleep(Math.min(RETRY_BASE_DELAY_MS * attempt, remainingMs))
        }
      }
    }
    console.warn(
      `[myJungle] Exhausted retries for Gemini model "${model}"${
        model !== models[models.length - 1] ? ', falling back to the next model.' : '.'
      }`,
    )
  }

  throw new GeminiOverloadedError()
}
