// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VercelRequest = {
  method?: string
  body?: unknown
}

type VercelResponse = {
  status: (code: number) => VercelResponse
  json: (body: unknown) => void
}

type AppLanguage = 'hu' | 'en' | 'de' | 'es' | 'fr' | 'it' | 'pt' | 'nl' | 'pl' | 'ja' | 'zh'
type AnalyzePlantConfidence = 'low' | 'medium' | 'high'
type GeminiSupportedMime = 'image/jpeg' | 'image/png'

interface AnalyzePlantResult {
  success: true
  name: string
  waterNeed: 'light' | 'moderate' | 'heavy'
  lightNeed: 'low' | 'medium' | 'high'
  careNotes: string
  recommendedDays: string[]
  frequency: 'weekly' | 'biweekly' | 'monthly'
  confidence: AnalyzePlantConfidence
  isToxicToPets: boolean | null
  toxicityNotes: string
}

interface AnalyzePlantPayload {
  imageBase64: string
  mimeType: string
  preferredDays?: string[]
  language?: AppLanguage
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash'
const GEMINI_GENERATE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const MAX_INLINE_BASE64_CHARS = 5_500_000
const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/

const FULL_DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const responseSchema = {
  type: 'OBJECT',
  properties: {
    name: {
      type: 'STRING',
      description: 'Common plant name. Use "Unknown Plant" if uncertain.',
    },
    waterNeed: {
      type: 'STRING',
      format: 'enum',
      enum: ['light', 'moderate', 'heavy'],
      description: 'Water requirement: light, moderate, or heavy',
    },
    lightNeed: {
      type: 'STRING',
      format: 'enum',
      enum: ['low', 'medium', 'high'],
      description: 'Light requirement: low, medium, or high',
    },
    careNotes: {
      type: 'STRING',
      description: 'Short care instructions and tips',
    },
    recommendedDays: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Watering days as full English day names from the preferred list',
    },
    frequency: {
      type: 'STRING',
      format: 'enum',
      enum: ['weekly', 'biweekly', 'monthly'],
      description: 'How often to water: weekly, biweekly, or monthly',
    },
    confidence: {
      type: 'STRING',
      format: 'enum',
      enum: ['low', 'medium', 'high'],
      description: 'Identification confidence. Use low for blurry/dark/uncertain photos.',
    },
    isToxicToPets: {
      type: 'BOOLEAN',
      description:
        'True if toxic to cats or dogs when ingested; false if generally pet-safe; omit or null if uncertain.',
    },
    toxicityNotes: {
      type: 'STRING',
      description:
        'Brief pet toxicity note for cats/dogs (max 200 chars). Empty when safe or unknown.',
    },
  },
  required: ['name', 'waterNeed', 'lightNeed', 'careNotes', 'recommendedDays', 'frequency', 'confidence'],
}

// ---------------------------------------------------------------------------
// Request parsing
// ---------------------------------------------------------------------------

function parseRequestBody(body: unknown): unknown {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as unknown
    } catch {
      return body
    }
  }
  return body
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err ?? 'Unknown error')
}

function parsePayload(body: unknown): { ok: true; data: AnalyzePlantPayload } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid request payload.' }
  }

  const record = body as Record<string, unknown>
  const imageBase64 = typeof record.imageBase64 === 'string' ? record.imageBase64.trim() : ''
  if (!imageBase64) {
    return { ok: false, error: 'No image provided' }
  }

  const mimeType =
    typeof record.mimeType === 'string' && record.mimeType.trim()
      ? record.mimeType.trim()
      : 'image/jpeg'

  const preferredDays = Array.isArray(record.preferredDays)
    ? record.preferredDays.filter((d): d is string => typeof d === 'string')
    : undefined

  const rawLanguage = typeof record.language === 'string' ? record.language.toLowerCase() : 'en'
  const language: AppLanguage =
    rawLanguage === 'de' || rawLanguage === 'hu' ? rawLanguage : 'en'

  return {
    ok: true,
    data: { imageBase64, mimeType, preferredDays, language },
  }
}

// ---------------------------------------------------------------------------
// Image / base64 helpers
// ---------------------------------------------------------------------------

function stripDataUrlPrefix(value: string): string {
  const compact = String(value ?? '').trim().replace(/\s/g, '')
  const dataImageMatch = compact.match(/^data:image\/[a-z0-9.+-]+;base64,(.+)$/i)
  if (dataImageMatch?.[1]) return dataImageMatch[1]
  if (compact.startsWith('data:')) {
    const commaIndex = compact.indexOf(',')
    if (commaIndex !== -1) return compact.slice(commaIndex + 1)
  }
  return compact
}

function normalizeGeminiMimeType(mimeType: string | undefined | null): GeminiSupportedMime {
  const normalized = (mimeType ?? '').toLowerCase().split(';')[0]?.trim() ?? ''
  if (normalized === 'image/png') return 'image/png'
  return 'image/jpeg'
}

function decodeBase64Prefix(data: string, byteCount: number): Buffer {
  const sliceLen = Math.ceil((byteCount * 4) / 3)
  return Buffer.from(data.slice(0, sliceLen), 'base64')
}

function detectSupportedImageMime(data: string): GeminiSupportedMime | null {
  if (data.length < 16) return null
  try {
    const header = decodeBase64Prefix(data, 16)
    if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return 'image/jpeg'
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
      return 'image/png'
    }
    if (header.length >= 12 && header.slice(4, 8).toString('ascii') === 'ftyp') {
      const brand = header.slice(8, 12).toString('ascii').toLowerCase()
      if (/hei|mif|msf|avif/.test(brand)) return null
    }
    if (header.slice(0, 4).toString('ascii') === 'RIFF' && header.slice(8, 12).toString('ascii') === 'WEBP') {
      return null
    }
    return null
  } catch {
    return null
  }
}

function validateGeminiBase64(data: string): void {
  if (!data) throw new Error('No image data provided.')
  if (data.startsWith('data:')) throw new Error('Invalid image payload.')
  if (data.length > MAX_INLINE_BASE64_CHARS) {
    throw new Error('Image is too large. Please use a smaller photo.')
  }
  if (!BASE64_RE.test(data)) throw new Error('Invalid image data.')
  if (!detectSupportedImageMime(data)) {
    throw new Error('Unsupported image format. Please use a JPEG or PNG photo.')
  }
}

function toGeminiInlineDataPart(
  imageBase64: string,
  mimeType?: string | null,
): { inlineData: { data: string; mimeType: GeminiSupportedMime } } {
  const data = stripDataUrlPrefix(imageBase64)
  validateGeminiBase64(data)
  const detectedMime = detectSupportedImageMime(data)!
  const declaredMime = normalizeGeminiMimeType(mimeType)
  return {
    inlineData: {
      data,
      mimeType: declaredMime === 'image/png' && detectedMime === 'image/png' ? 'image/png' : detectedMime,
    },
  }
}

function isImagePayloadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const lower = message.toLowerCase()
  return (
    lower.includes('no image') ||
    lower.includes('invalid image') ||
    lower.includes('unsupported image') ||
    lower.includes('too large') ||
    lower.includes('image format') ||
    lower.includes('image data')
  )
}

function friendlyGeminiError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const trimmed = message.trim()
  if (!trimmed) return fallback
  if (isImagePayloadError(error)) return trimmed

  const lower = trimmed.toLowerCase()
  if (
    lower.includes('invalid argument') ||
    lower.includes('bad request') ||
    lower.includes('[400') ||
    lower.includes('inline_data') ||
    lower.includes('inline data') ||
    lower.includes('google.rpc') ||
    lower.includes('generativelanguage') ||
    trimmed.length > 180
  ) {
    return fallback
  }
  return trimmed
}

// ---------------------------------------------------------------------------
// AI JSON parsing
// ---------------------------------------------------------------------------

function sanitizeAiJsonText(text: string): string {
  let cleaned = String(text ?? '').trim().replace(/^\uFEFF/, '')
  if (!cleaned) return ''

  cleaned = cleaned.replace(/^```(?:json|JSON)?\s*/i, '')
  cleaned = cleaned.replace(/\s*```$/i, '')
  cleaned = cleaned.replace(/```(?:json|JSON)?/gi, '').replace(/```/g, '').trim()

  const objectStart = cleaned.indexOf('{')
  const arrayStart = cleaned.indexOf('[')
  let start = -1
  if (objectStart === -1) start = arrayStart
  else if (arrayStart === -1) start = objectStart
  else start = Math.min(objectStart, arrayStart)

  if (start === -1) return cleaned

  const isArray = cleaned[start] === '['
  const end = isArray ? cleaned.lastIndexOf(']') : cleaned.lastIndexOf('}')
  if (end > start) cleaned = cleaned.slice(start, end + 1)
  return cleaned.trim()
}

function tryParseJson(cleaned: string): unknown | null {
  try {
    return JSON.parse(cleaned) as unknown
  } catch {
    return null
  }
}

function parseAiJson(text: string): unknown | null {
  const cleaned = sanitizeAiJsonText(text)
  if (!cleaned) return null

  const parsed = tryParseJson(cleaned)
  if (parsed === null) return null

  if (typeof parsed === 'string') {
    const inner = sanitizeAiJsonText(parsed)
    if (inner && (inner.startsWith('{') || inner.startsWith('['))) {
      const nested = tryParseJson(inner)
      if (nested !== null) return nested
    }
  }

  return parsed
}

function asJsonObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

// ---------------------------------------------------------------------------
// Plant result normalization
// ---------------------------------------------------------------------------

function normalizeAppLanguage(value: unknown): AppLanguage {
  const lang = String(value ?? 'en').toLowerCase()
  const supported: AppLanguage[] = ['hu', 'en', 'de', 'es', 'fr', 'it', 'pt', 'nl', 'pl', 'ja', 'zh']
  return supported.includes(lang as AppLanguage) ? (lang as AppLanguage) : 'en'
}

const LOW_CONFIDENCE_CARE_NOTES: Record<AppLanguage, string> = {
  en: 'Could not identify this plant with high confidence. Check light and soil moisture, and water moderately when the top soil feels dry.',
  de: 'Die Pflanze konnte nicht sicher erkannt werden. Prüfe Licht und Feuchtigkeit und gieße mäßig, wenn die Erde trocken ist.',
  hu: 'A növényt nem lehetett biztosan felismerni. Ellenőrizd a fényt és a talajnedvességet, és öntözz mértékkel, ha a föld száraz.',
  es: 'No se pudo identificar esta planta con alta confianza. Revisa la luz y la humedad del suelo, y riega con moderación cuando la capa superior esté seca.',
  fr: "Cette plante n'a pas pu être identifiée avec certitude. Vérifiez la lumière et l'humidité du sol, et arrosez modérément lorsque la surface est sèche.",
  it: 'Impossibile identificare questa pianta con alta certezza. Controlla luce e umidità del terriccio e annaffia con moderazione quando la superficie è asciutta.',
  pt: 'Não foi possível identificar esta planta com alta confiança. Verifique a luz e a umidade do solo e regue com moderação quando a superfície estiver seca.',
  nl: 'Deze plant kon niet met hoge zekerheid worden herkend. Controleer licht en bodemvocht en geef matig water wanneer de bovenlaag droog aanvoelt.',
  pl: 'Nie udało się zidentyfikować tej rośliny z dużą pewnością. Sprawdź światło i wilgotność gleby i podlewaj umiarkowanie, gdy wierzchnia warstwa jest sucha.',
  ja: 'この植物を高い確度では特定できませんでした。光と土の乾き具合を確認し、表面が乾いたら適度に水やりしてください。',
  zh: '无法高置信度识别此植物。请检查光照和土壤湿度，在表层土壤干燥时适度浇水。',
}

const DEFAULT_CARE_NOTES: Record<AppLanguage, string> = {
  en: 'Keep the soil evenly moist and place the plant in bright light away from harsh midday sun.',
  de: 'Halte die Erde gleichmäßig feucht und stelle die Pflanze an einen hellen Ort ohne direkte Mittagssonne.',
  hu: 'Tartsd egyenletesen nedvesen a földet, és helyezd világos helyre, közvetlen déli nap nélkül.',
  es: 'Mantén el suelo uniformemente húmedo y coloca la planta en un lugar luminoso, lejos del sol directo del mediodía.',
  fr: "Gardez le sol uniformément humide et placez la plante dans un endroit lumineux, à l'abri du soleil direct de midi.",
  it: 'Mantieni il terriccio uniformemente umido e colloca la pianta in un luogo luminoso, lontano dal sole diretto di mezzogiorno.',
  pt: 'Mantenha o solo uniformemente úmido e coloque a planta em local claro, longe do sol forte do meio-dia.',
  nl: 'Houd de grond gelijkmatig vochtig en zet de plant op een lichte plek, uit de felle middagzon.',
  pl: 'Utrzymuj glebę równomiernie wilgotną i ustaw roślinę w jasnym miejscu, z dala od ostrego południowego słońca.',
  ja: '土を均一に湿らせ、真昼の強い直射日光を避けた明るい場所に置いてください。',
  zh: '保持土壤均匀湿润，将植物放在明亮处，避免正午强烈直射阳光。',
}

function normalizePreferredDays(preferredDays: string[] | undefined): string[] {
  if (!preferredDays?.length) return [...FULL_DAY_NAMES]
  const valid = preferredDays
    .map((d) => {
      const match = FULL_DAY_NAMES.find((name) => name.toLowerCase() === d.trim().toLowerCase())
      return match ?? d.trim()
    })
    .filter(Boolean)
  return valid.length > 0 ? valid : [...FULL_DAY_NAMES]
}

function normalizeFrequency(value: unknown): AnalyzePlantResult['frequency'] {
  const normalized = String(value ?? '').toLowerCase().trim()
  if (normalized === 'biweekly' || normalized === 'bi-weekly' || normalized === 'every 2 weeks') {
    return 'biweekly'
  }
  if (normalized === 'monthly' || normalized === 'every 4 weeks') return 'monthly'
  return 'weekly'
}

function normalizeLightNeed(value: unknown): AnalyzePlantResult['lightNeed'] {
  const normalized = String(value ?? '').toLowerCase().trim()
  if (normalized === 'low') return 'low'
  if (normalized === 'high') return 'high'
  return 'medium'
}

function normalizeWaterNeed(value: unknown): AnalyzePlantResult['waterNeed'] {
  const normalized = String(value ?? '').toLowerCase().trim()
  if (normalized === 'light') return 'light'
  if (normalized === 'heavy') return 'heavy'
  return 'moderate'
}

function normalizeConfidence(value: unknown): AnalyzePlantConfidence {
  const normalized = String(value ?? '').toLowerCase().trim()
  if (normalized === 'high') return 'high'
  if (normalized === 'medium') return 'medium'
  return 'low'
}

function normalizeIsToxicToPets(value: unknown): boolean | null {
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  return null
}

function normalizeToxicityNotes(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 200) : ''
}

function defaultCareNotes(language: AppLanguage, confidence: AnalyzePlantConfidence): string {
  return confidence === 'low' ? LOW_CONFIDENCE_CARE_NOTES[language] : DEFAULT_CARE_NOTES[language]
}

function normalizeRecommendedDays(
  value: unknown,
  preferredDays: string[],
  waterNeed: AnalyzePlantResult['waterNeed'],
): string[] {
  const preferredLower = new Map(preferredDays.map((d) => [d.toLowerCase(), d]))
  const fromAi = Array.isArray(value)
    ? value
        .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
        .map((d) => preferredLower.get(d.trim().toLowerCase()) ?? null)
        .filter((d): d is string => Boolean(d))
    : []

  const unique = Array.from(new Set(fromAi))
  if (unique.length > 0) {
    const maxDays = waterNeed === 'heavy' ? 2 : 1
    return unique.slice(0, maxDays)
  }

  return preferredDays.slice(0, waterNeed === 'heavy' ? 2 : 1)
}

function coerceAnalyzePlantResult(
  raw: unknown,
  preferredDays: string[],
  language: AppLanguage = 'en',
): Omit<AnalyzePlantResult, 'success'> {
  const obj = asJsonObject(raw) ?? {}
  const waterNeed = normalizeWaterNeed(obj.waterNeed)
  const confidence = normalizeConfidence(obj.confidence ?? (obj.name ? 'medium' : 'low'))
  const name =
    typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : 'Unknown Plant'
  const lightNeed = normalizeLightNeed(obj.lightNeed)
  const frequency = normalizeFrequency(obj.frequency)
  const recommendedDays = normalizeRecommendedDays(obj.recommendedDays, preferredDays, waterNeed)
  const careNotes =
    typeof obj.careNotes === 'string' && obj.careNotes.trim()
      ? obj.careNotes.trim()
      : defaultCareNotes(language, confidence)
  const isToxicToPets = normalizeIsToxicToPets(obj.isToxicToPets)
  const toxicityNotes = normalizeToxicityNotes(obj.toxicityNotes)

  return {
    name,
    waterNeed,
    lightNeed,
    careNotes,
    recommendedDays,
    frequency,
    confidence,
    isToxicToPets,
    toxicityNotes,
  }
}

function createLowConfidencePlantResult(
  preferredDays: string[] | undefined,
  language: AppLanguage = 'en',
): Omit<AnalyzePlantResult, 'success'> {
  const days = normalizePreferredDays(preferredDays)
  return coerceAnalyzePlantResult(
    {
      name: 'Unknown Plant',
      waterNeed: 'moderate',
      lightNeed: 'medium',
      careNotes: defaultCareNotes(language, 'low'),
      recommendedDays: days.slice(0, 1),
      frequency: 'weekly',
      confidence: 'low',
      isToxicToPets: null,
      toxicityNotes: '',
    },
    days,
    language,
  )
}

function parseGeminiPlantAnalysisText(
  text: string,
  preferredDays: string[] | undefined,
  language: AppLanguage = 'en',
): Omit<AnalyzePlantResult, 'success'> {
  const days = normalizePreferredDays(preferredDays)
  const parsed = parseAiJson(text)
  if (!parsed) {
    console.warn('[myJungle] Using low-confidence fallback for unparseable Gemini plant response')
    return createLowConfidencePlantResult(days, language)
  }
  return coerceAnalyzePlantResult(parsed, days, language)
}

// ---------------------------------------------------------------------------
// Gemini prompt & generation
// ---------------------------------------------------------------------------

function languagePromptInstruction(language: AppLanguage): string {
  const map: Record<AppLanguage, string> = {
    en: 'Write all user-facing text fields (careNotes, toxicityNotes) in English.',
    de: 'Write all user-facing text fields (careNotes, toxicityNotes) in German.',
    hu: 'Write all user-facing text fields (careNotes, toxicityNotes) in Hungarian.',
    es: 'Write all user-facing text fields (careNotes, toxicityNotes) in Spanish.',
    fr: 'Write all user-facing text fields (careNotes, toxicityNotes) in French.',
    it: 'Write all user-facing text fields (careNotes, toxicityNotes) in Italian.',
    pt: 'Write all user-facing text fields (careNotes, toxicityNotes) in Portuguese.',
    nl: 'Write all user-facing text fields (careNotes, toxicityNotes) in Dutch.',
    pl: 'Write all user-facing text fields (careNotes, toxicityNotes) in Polish.',
    ja: 'Write all user-facing text fields (careNotes, toxicityNotes) in Japanese.',
    zh: 'Write all user-facing text fields (careNotes, toxicityNotes) in Simplified Chinese.',
  }
  return map[language]
}

function buildAnalyzePrompt(preferredDays: string[], language: AppLanguage): string {
  const dayList = preferredDays.join(', ')
  return [
    'Identify the plant in this image, determine its water requirement (light, moderate, or heavy), light requirement, and provide care instructions.',
    languagePromptInstruction(language),
    '',
    'IMPORTANT OUTPUT RULES:',
    '- Respond with RAW JSON only. Do not wrap the JSON in markdown code fences.',
    '- Do not include ```json or any prose before/after the JSON object.',
    '- Always return a complete JSON object even if the photo is blurry, dark, or uncertain.',
    '- If uncertain, set confidence to "low", name to "Unknown Plant", and still provide sensible defaults.',
    '',
    'Determine lightNeed as:',
    '- low: low light / shade-tolerant plants',
    '- medium: medium or bright indirect light',
    '- high: high light / direct sunlight',
    '',
    `The user's globally active preferred watering days are: ${dayList}.`,
    'Select the MINIMUM necessary days from ONLY these preferred days to maximize schedule stacking:',
    '- light or moderate water need: select exactly 1 day',
    '- heavy water need: select exactly 2 days',
    '',
    'For drought-tolerant or sparse-water plants (cacti, succulents, snake plants, ZZ plants, etc.), use frequency "biweekly" or "monthly" instead of "weekly".',
    'When using biweekly or monthly frequency, still select only 1 day from the preferred list.',
    '',
    'Return recommendedDays as full English day names from the preferred list (e.g. ["Tuesday"]).',
    'Return frequency as "weekly", "biweekly", or "monthly".',
    'Return confidence as "low", "medium", or "high".',
    '',
    'Assess pet toxicity for common household cats and dogs:',
    '- Set isToxicToPets to true if the plant is toxic to cats or dogs when chewed or ingested.',
    '- Set isToxicToPets to false if the plant is widely considered pet-safe.',
    '- Omit isToxicToPets or use null when identification confidence is low or toxicity is uncertain.',
    '- Provide toxicityNotes (under 200 characters) when toxic, e.g. which pets and symptoms; otherwise return an empty string.',
  ].join('\n')
}

function extractGeminiCandidateText(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const text = (data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }).candidates?.[0]?.content?.parts?.[0]?.text
  return typeof text === 'string' ? text.trim() : ''
}

async function generatePlantAnalysis(
  apiKey: string,
  prompt: string,
  imagePart: { inlineData: { data: string; mimeType: string } },
): Promise<string> {
  const url = `${GEMINI_GENERATE_URL}?key=${encodeURIComponent(apiKey)}`
  const base64ImageData = stripDataUrlPrefix(imagePart.inlineData.data)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: imagePart.inlineData.mimeType,
                data: base64ImageData,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    }),
  })

  const data: unknown = await response.json()
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error?: { message?: string } }).error?.message ?? '')
        : ''
    throw new Error(message || `Gemini request failed (${response.status}).`)
  }

  const text = extractGeminiCandidateText(data)
  if (!text) {
    throw new Error('Gemini returned an empty response.')
  }
  return text
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' })
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim()
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'Missing GEMINI_API_KEY' })
    }

    const payloadResult = parsePayload(parseRequestBody(req.body))
    if (!payloadResult.ok) {
      return res.status(400).json({ success: false, error: payloadResult.error })
    }

    const { imageBase64, mimeType, preferredDays: rawPreferredDays, language: rawLanguage } =
      payloadResult.data
    const preferredDays = normalizePreferredDays(rawPreferredDays)
    const language = normalizeAppLanguage(rawLanguage)

    const imagePart = toGeminiInlineDataPart(imageBase64, mimeType)
    const prompt = buildAnalyzePrompt(preferredDays, language)
    const text = await generatePlantAnalysis(apiKey, prompt, imagePart)
    const result = parseGeminiPlantAnalysisText(text, preferredDays, language)

    return res.status(200).json({ success: true, ...result })
  } catch (err) {
    console.error('analyze-plant error:', err)
    const fallback = 'Failed to analyze plant image. Please try another photo.'
    const message = friendlyGeminiError(err, fallback)
    const status = isImagePayloadError(err) ? 400 : 500
    return res.status(status).json({ success: false, error: message || errorMessage(err) })
  }
}
