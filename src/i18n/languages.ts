export const SUPPORTED_LANGUAGES = ['en', 'de', 'hu'] as const
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const LANGUAGE_STORAGE_KEY = 'mj_language'

export function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'en' || value === 'de' || value === 'hu'
}

export function normalizeAppLanguage(value: unknown): AppLanguage {
  return isAppLanguage(value) ? value : 'en'
}

export function languagePromptInstruction(language: AppLanguage): string {
  switch (language) {
    case 'de':
      return 'Write all user-facing text fields (careNotes, diagnosis, treatmentNotes) in German.'
    case 'hu':
      return 'Write all user-facing text fields (careNotes, diagnosis, treatmentNotes) in Hungarian.'
    default:
      return 'Write all user-facing text fields (careNotes, diagnosis, treatmentNotes) in English.'
  }
}
