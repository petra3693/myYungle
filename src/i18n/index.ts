import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { translationCatalog } from '@/i18n/messages'
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
    en: { translation: translationCatalog.en },
    de: { translation: translationCatalog.de },
    hu: { translation: translationCatalog.hu },
    es: { translation: translationCatalog.es },
    fr: { translation: translationCatalog.fr },
    it: { translation: translationCatalog.it },
    pt: { translation: translationCatalog.pt },
    nl: { translation: translationCatalog.nl },
    pl: { translation: translationCatalog.pl },
    ja: { translation: translationCatalog.ja },
    zh: { translation: translationCatalog.zh },
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
