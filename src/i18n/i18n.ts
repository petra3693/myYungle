import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { LANGUAGE_STORAGE_KEY, normalizeAppLanguage } from './languages'
import en from './locales/en.json'
import de from './locales/de.json'
import hu from './locales/hu.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import it from './locales/it.json'
import pt from './locales/pt.json'
import nl from './locales/nl.json'
import pl from './locales/pl.json'
import ja from './locales/ja.json'
import zh from './locales/zh.json'

function detectStoredLanguage(): string {
  try {
    return normalizeAppLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY))
  } catch {
    return 'en'
  }
}

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
      hu: { translation: hu },
      es: { translation: es },
      fr: { translation: fr },
      it: { translation: it },
      pt: { translation: pt },
      nl: { translation: nl },
      pl: { translation: pl },
      ja: { translation: ja },
      zh: { translation: zh },
    },
    lng: detectStoredLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
    // The app's own local persistence (mj_language, already read by App.tsx)
    // stays the single source of truth for the selected language; i18next's
    // own language detector plugin isn't used, to avoid two competing stores.
  })

export default i18n
