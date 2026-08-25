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
const { generateGeminiJsonResilient, GeminiOverloadedError, primaryGeminiModel } = await import('../geminiResilience')

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

  it('retries the same model with 1s then 2s backoff on a 503, and succeeds on the 3rd attempt', async () => {
    generateContentMock
      .mockRejectedValueOnce(new GoogleGenerativeAIFetchError('overloaded', 503))
      .mockRejectedValueOnce(new GoogleGenerativeAIFetchError('overloaded', 503))
      .mockResolvedValueOnce(textResult('{"ok":true}'))

    const promise = generateGeminiJsonResilient('key', DUMMY_SCHEMA, 'prompt', DUMMY_IMAGE_PART)
    const settleSpy = vi.fn()
    void promise.then(settleSpy)

    // First failure needs a 1s wait before the retry fires.
    await vi.advanceTimersByTimeAsync(999)
    expect(generateContentMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(generateContentMock).toHaveBeenCalledTimes(2)

    // Second failure needs a 2s wait before the final retry fires.
    await vi.advanceTimersByTimeAsync(1999)
    expect(generateContentMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(generateContentMock).toHaveBeenCalledTimes(3)

    const result = await promise
    expect(result).toBe('{"ok":true}')
    expect(settleSpy).toHaveBeenCalledWith('{"ok":true}')
    // All 3 attempts stayed on the primary model — no fallback needed.
    expect(new Set(calledModels())).toEqual(new Set([primaryGeminiModel()]))
  })

  it('falls back to the next model once the primary exhausts all 3 attempts', async () => {
    generateContentMock
      .mockRejectedValueOnce(new GoogleGenerativeAIFetchError('overloaded', 503))
      .mockRejectedValueOnce(new GoogleGenerativeAIFetchError('overloaded', 503))
      .mockRejectedValueOnce(new GoogleGenerativeAIFetchError('overloaded', 503))
      .mockResolvedValueOnce(textResult('{"ok":true}'))

    const promise = generateGeminiJsonResilient('key', DUMMY_SCHEMA, 'prompt', DUMMY_IMAGE_PART)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toBe('{"ok":true}')
    expect(generateContentMock).toHaveBeenCalledTimes(4)
    const models = calledModels()
    expect(models[0]).toBe(primaryGeminiModel())
    expect(models[3]).not.toBe(primaryGeminiModel())
  })

  it('throws GeminiOverloadedError with a friendly message once every model and retry is exhausted', async () => {
    generateContentMock.mockRejectedValue(new GoogleGenerativeAIFetchError('overloaded', 503))

    const promise = generateGeminiJsonResilient('key', DUMMY_SCHEMA, 'prompt', DUMMY_IMAGE_PART)
    // Swallow the rejection for the fake-timer flush so it doesn't surface as an unhandled rejection.
    promise.catch(() => {})
    await vi.runAllTimersAsync()

    await expect(promise).rejects.toBeInstanceOf(GeminiOverloadedError)
    await expect(promise).rejects.toThrow('AI service is currently busy. Please try again in a few moments.')
  })

  it('does not retry or fall back on a non-retryable 400 error', async () => {
    generateContentMock.mockRejectedValueOnce(new GoogleGenerativeAIFetchError('bad request', 400))

    const promise = generateGeminiJsonResilient('key', DUMMY_SCHEMA, 'prompt', DUMMY_IMAGE_PART)
    promise.catch(() => {})
    await vi.runAllTimersAsync()

    await expect(promise).rejects.toThrow('bad request')
    expect(generateContentMock).toHaveBeenCalledTimes(1)
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
})
