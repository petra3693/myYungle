import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Schema } from '@google/generative-ai'

const generateContentMock = vi.fn()
const getGenerativeModelMock = vi.fn((_opts: { model: string }) => ({ generateContent: generateContentMock }))

vi.mock('@google/generative-ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google/generative-ai')>()
  return {
    ...actual,
    // A regular function (not an arrow function) so it can be invoked with `new`.
    GoogleGenerativeAI: vi.fn().mockImplementation(function () {
      return { getGenerativeModel: getGenerativeModelMock }
    }),
  }
})

const { GoogleGenerativeAIFetchError } = await import('@google/generative-ai')
const { generateGeminiJsonResilient, GeminiOverloadedError, primaryGeminiModel, GEMINI_TOTAL_BUDGET_MS } = await import(
  '../geminiResilience'
)

function textResult(text: string) {
  return { response: { text: () => text } }
}

function calledModels(): string[] {
  return getGenerativeModelMock.mock.calls.map((call) => (call[0] as { model: string }).model)
}

const DUMMY_SCHEMA = {} as Schema
const DUMMY_IMAGE_PART = { inlineData: { data: 'abc', mimeType: 'image/jpeg' as const } }

describe('generateGeminiJsonResilient', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    generateContentMock.mockReset()
    getGenerativeModelMock.mockClear()
    delete process.env.GEMINI_MODEL
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the text immediately when the first attempt succeeds', async () => {
    generateContentMock.mockResolvedValueOnce(textResult('{"ok":true}'))

    const result = await generateGeminiJsonResilient('key', DUMMY_SCHEMA, 'prompt', DUMMY_IMAGE_PART)

    expect(result).toBe('{"ok":true}')
    expect(generateContentMock).toHaveBeenCalledTimes(1)
    expect(calledModels()).toEqual([primaryGeminiModel()])
  })

  it('retries the same model with a 500ms backoff on a 503, and succeeds on the 2nd attempt', async () => {
    generateContentMock
      .mockRejectedValueOnce(new GoogleGenerativeAIFetchError('overloaded', 503))
      .mockResolvedValueOnce(textResult('{"ok":true}'))

    const promise = generateGeminiJsonResilient('key', DUMMY_SCHEMA, 'prompt', DUMMY_IMAGE_PART)
    const settleSpy = vi.fn()
    void promise.then(settleSpy)

    // The single retry needs a 500ms wait before it fires.
    await vi.advanceTimersByTimeAsync(499)
    expect(generateContentMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(generateContentMock).toHaveBeenCalledTimes(2)

    const result = await promise
    expect(result).toBe('{"ok":true}')
    expect(settleSpy).toHaveBeenCalledWith('{"ok":true}')
    // Both attempts stayed on the primary model — no fallback needed.
    expect(new Set(calledModels())).toEqual(new Set([primaryGeminiModel()]))
  })

  it('falls back to the next model once the primary exhausts both attempts', async () => {
    generateContentMock
      .mockRejectedValueOnce(new GoogleGenerativeAIFetchError('overloaded', 503))
      .mockRejectedValueOnce(new GoogleGenerativeAIFetchError('overloaded', 503))
      .mockResolvedValueOnce(textResult('{"ok":true}'))

    const promise = generateGeminiJsonResilient('key', DUMMY_SCHEMA, 'prompt', DUMMY_IMAGE_PART)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toBe('{"ok":true}')
    expect(generateContentMock).toHaveBeenCalledTimes(3)
    const models = calledModels()
    expect(models[0]).toBe(primaryGeminiModel())
    expect(models[2]).not.toBe(primaryGeminiModel())
  })

  it('throws GeminiOverloadedError with a friendly message once every model and retry is exhausted', async () => {
    generateContentMock.mockRejectedValue(new GoogleGenerativeAIFetchError('overloaded', 503))

    const promise = generateGeminiJsonResilient('key', DUMMY_SCHEMA, 'prompt', DUMMY_IMAGE_PART)
    // Swallow the rejection for the fake-timer flush so it doesn't surface as an unhandled rejection.
    promise.catch(() => {})
    await vi.runAllTimersAsync()

    await expect(promise).rejects.toBeInstanceOf(GeminiOverloadedError)
    await expect(promise).rejects.toThrow('AI service is currently busy. Please try again in a few moments.')
    // 2 models x 2 attempts each, all exhausted via normal retry/fallback — not a budget cutoff
    // (the whole chain's backoff time is nowhere near GEMINI_TOTAL_BUDGET_MS).
    expect(generateContentMock).toHaveBeenCalledTimes(4)
  })

  it('does not retry or fall back on a non-retryable 400 error, and logs it as a configuration error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    generateContentMock.mockRejectedValueOnce(new GoogleGenerativeAIFetchError('bad request', 400))

    const promise = generateGeminiJsonResilient('key', DUMMY_SCHEMA, 'prompt', DUMMY_IMAGE_PART)
    promise.catch(() => {})
    await vi.runAllTimersAsync()

    await expect(promise).rejects.toThrow('bad request')
    expect(generateContentMock).toHaveBeenCalledTimes(1)
    // Distinctly recognizable from the transient-retry console.warn messages, and on the
    // console.error channel, since this is a config problem (bad model/API key) not load.
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy.mock.calls[0]?.[0]).toContain('CONFIGURATION ERROR')
  })

  it('retries a 429 rate-limit error like any other transient failure', async () => {
    generateContentMock
      .mockRejectedValueOnce(new GoogleGenerativeAIFetchError('rate limited', 429))
      .mockResolvedValueOnce(textResult('{"ok":true}'))

    const promise = generateGeminiJsonResilient('key', DUMMY_SCHEMA, 'prompt', DUMMY_IMAGE_PART)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toBe('{"ok":true}')
    expect(generateContentMock).toHaveBeenCalledTimes(2)
  })

  it('retries an empty candidate response as transient flakiness', async () => {
    generateContentMock
      .mockResolvedValueOnce(textResult(''))
      .mockResolvedValueOnce(textResult('{"ok":true}'))

    const promise = generateGeminiJsonResilient('key', DUMMY_SCHEMA, 'prompt', DUMMY_IMAGE_PART)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toBe('{"ok":true}')
    expect(generateContentMock).toHaveBeenCalledTimes(2)
  })

  it('treats a plain network error (no HTTP status) as retryable', async () => {
    generateContentMock
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce(textResult('{"ok":true}'))

    const promise = generateGeminiJsonResilient('key', DUMMY_SCHEMA, 'prompt', DUMMY_IMAGE_PART)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toBe('{"ok":true}')
    expect(generateContentMock).toHaveBeenCalledTimes(2)
  })

  it('uses GEMINI_MODEL as the primary model when set', async () => {
    process.env.GEMINI_MODEL = 'gemini-custom-model'
    generateContentMock.mockResolvedValueOnce(textResult('{"ok":true}'))

    await generateGeminiJsonResilient('key', DUMMY_SCHEMA, 'prompt', DUMMY_IMAGE_PART)

    expect(calledModels()).toEqual(['gemini-custom-model'])
  })

  it('stops once the total retry budget is exhausted, without starting another attempt', async () => {
    // Simulate the first Gemini call alone taking longer than the entire retry budget — a
    // real hung/overloaded upstream, not just backoff between calls. By the time it finally
    // fails, the deadline has already passed.
    generateContentMock.mockImplementation(async () => {
      await vi.advanceTimersByTimeAsync(GEMINI_TOTAL_BUDGET_MS + 500)
      throw new GoogleGenerativeAIFetchError('overloaded', 503)
    })

    const promise = generateGeminiJsonResilient('key', DUMMY_SCHEMA, 'prompt', DUMMY_IMAGE_PART)
    promise.catch(() => {})
    await vi.runAllTimersAsync()

    await expect(promise).rejects.toBeInstanceOf(GeminiOverloadedError)
    // The retry that would normally follow this failure — and the fallback model after that —
    // never starts, because the deadline check before the next attempt catches it first.
    expect(generateContentMock).toHaveBeenCalledTimes(1)
  })

  it('never lets a single attempt schedule a backoff longer than the remaining budget', async () => {
    // First attempt fails almost immediately, leaving ~500ms of budget — far less than the
    // nominal 500ms*attempt backoff would need for a later attempt if it weren't capped.
    generateContentMock.mockImplementation(async () => {
      await vi.advanceTimersByTimeAsync(GEMINI_TOTAL_BUDGET_MS - 500)
      throw new GoogleGenerativeAIFetchError('overloaded', 503)
    })

    const promise = generateGeminiJsonResilient('key', DUMMY_SCHEMA, 'prompt', DUMMY_IMAGE_PART)
    promise.catch(() => {})
    await vi.runAllTimersAsync()

    await expect(promise).rejects.toBeInstanceOf(GeminiOverloadedError)
    // Only the first attempt ran; the capped backoff (<=500ms remaining) still lands exactly
    // on/after the deadline, so the retry that would follow it never starts either.
    expect(generateContentMock).toHaveBeenCalledTimes(1)
  })
})
