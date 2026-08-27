import { GoogleGenerativeAI, GoogleGenerativeAIFetchError, type Schema } from '@google/generative-ai'
import type { GeminiInlineImagePart } from './geminiImagePart.js'

/** Tried in order after the primary model, if it's overloaded/unavailable/rate-limited. */
const FALLBACK_GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b']

/** Attempts per model, including the first — "up to 3 attempts" before moving to the next model. */
const MAX_ATTEMPTS_PER_MODEL = 3

/** Base delay for the backoff between retries on the same model: 1s after the 1st failure, 2s after the 2nd. */
const RETRY_BASE_DELAY_MS = 1000

export function primaryGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || 'gemini-1.5-flash'
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
 * waiting a short, increasing delay between attempts (1s, then 2s) on
 * transient errors (overload, 429/5xx, network failure, empty response). If
 * a model is still failing once its attempts are exhausted, moves on to the
 * next fallback model and repeats. A non-retryable error (bad request,
 * invalid API key, safety block) is thrown immediately without burning
 * retries or fallbacks. If every model and every retry is exhausted, throws
 * GeminiOverloadedError so the caller can return a clean 503 instead of
 * crashing with an unhandled 500.
 */
export async function generateGeminiJsonResilient(
  apiKey: string,
  responseSchema: Schema,
  prompt: string,
  imagePart: GeminiInlineImagePart,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const models = geminiModelChain()

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        return await callGeminiModel(genAI, model, prompt, imagePart, responseSchema)
      } catch (err) {
        if (!isRetryableError(err)) throw err

        const attemptsLeft = MAX_ATTEMPTS_PER_MODEL - attempt
        console.warn(
          `[myJungle] Gemini model "${model}" failed (attempt ${attempt}/${MAX_ATTEMPTS_PER_MODEL}): ${errorMessage(err)}`,
        )
        if (attemptsLeft > 0) {
          await sleep(RETRY_BASE_DELAY_MS * attempt)
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
