import type { AppLanguage } from '@/i18n/languages'

type Confidence = 'low' | 'medium' | 'high'

/** Fallback care-note copy when Gemini doesn't return one. English-only for now. */
export function defaultCareNotes(_language: AppLanguage, confidence: Confidence): string {
  if (confidence === 'low') {
    return 'Could not confidently identify this plant. Water moderately and keep it in medium light until you can confirm the species.'
  }
  return 'Water when the top inch of soil feels dry, and keep away from direct harsh sun.'
}
