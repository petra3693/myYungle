import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from '@/i18n/locales/de.json'
import en from '@/i18n/locales/en.json'
import hu from '@/i18n/locales/hu.json'
import {
  LANGUAGE_STORAGE_KEY,
  normalizeAppLanguage,
  type AppLanguage,
} from '@/i18n/languages'

function readStoredLanguage(): AppLanguage {
  try {
    return normalizeAppLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY))
  } catch {
    return 'en'
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    de: { translation: de },
    hu: { translation: hu },
  },
  lng: readStoredLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export function getAppLanguage(): AppLanguage {
  return normalizeAppLanguage(i18n.language)
}

export function setAppLanguage(language: AppLanguage): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // ignore storage errors
  }
  void i18n.changeLanguage(language)
}

export default i18n
