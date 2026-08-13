export const SUPPORTED_LANGUAGES = [
  'hu',
  'en',
  'de',
  'es',
  'fr',
  'it',
  'pt',
  'nl',
  'pl',
  'ja',
  'zh',
] as const

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const LANGUAGE_STORAGE_KEY = 'mj_language'

export const LANGUAGE_OPTIONS: { code: AppLanguage; labelKey: `language.${AppLanguage}` }[] = [
  { code: 'en', labelKey: 'language.en' },
  { code: 'de', labelKey: 'language.de' },
  { code: 'hu', labelKey: 'language.hu' },
  { code: 'es', labelKey: 'language.es' },
  { code: 'fr', labelKey: 'language.fr' },
  { code: 'it', labelKey: 'language.it' },
  { code: 'pt', labelKey: 'language.pt' },
  { code: 'nl', labelKey: 'language.nl' },
  { code: 'pl', labelKey: 'language.pl' },
  { code: 'ja', labelKey: 'language.ja' },
  { code: 'zh', labelKey: 'language.zh' },
]

export function isAppLanguage(value: unknown): value is AppLanguage {
  return (
    value === 'hu' ||
    value === 'en' ||
    value === 'de' ||
    value === 'es' ||
    value === 'fr' ||
    value === 'it' ||
    value === 'pt' ||
    value === 'nl' ||
    value === 'pl' ||
    value === 'ja' ||
    value === 'zh'
  )
}

export function normalizeAppLanguage(value: unknown): AppLanguage {
  return isAppLanguage(value) ? value : 'en'
}

export function languagePromptInstruction(language: AppLanguage): string {
  const map: Record<AppLanguage, string> = {
    en: 'Write all user-facing text fields (careNotes, diagnosis, treatmentNotes, toxicityNotes) in English.',
    de: 'Write all user-facing text fields (careNotes, diagnosis, treatmentNotes, toxicityNotes) in German.',
    hu: 'Write all user-facing text fields (careNotes, diagnosis, treatmentNotes, toxicityNotes) in Hungarian.',
    es: 'Write all user-facing text fields (careNotes, diagnosis, treatmentNotes, toxicityNotes) in Spanish.',
    fr: 'Write all user-facing text fields (careNotes, diagnosis, treatmentNotes, toxicityNotes) in French.',
    it: 'Write all user-facing text fields (careNotes, diagnosis, treatmentNotes, toxicityNotes) in Italian.',
    pt: 'Write all user-facing text fields (careNotes, diagnosis, treatmentNotes, toxicityNotes) in Portuguese.',
    nl: 'Write all user-facing text fields (careNotes, diagnosis, treatmentNotes, toxicityNotes) in Dutch.',
    pl: 'Write all user-facing text fields (careNotes, diagnosis, treatmentNotes, toxicityNotes) in Polish.',
    ja: 'Write all user-facing text fields (careNotes, diagnosis, treatmentNotes, toxicityNotes) in Japanese.',
    zh: 'Write all user-facing text fields (careNotes, diagnosis, treatmentNotes, toxicityNotes) in Simplified Chinese.',
  }
  return map[language]
}
