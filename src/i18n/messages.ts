import de from '@/i18n/locales/de.json'
import en from '@/i18n/locales/en.json'
import es from '@/i18n/locales/es.json'
import fr from '@/i18n/locales/fr.json'
import hu from '@/i18n/locales/hu.json'
import it from '@/i18n/locales/it.json'
import ja from '@/i18n/locales/ja.json'
import nl from '@/i18n/locales/nl.json'
import pl from '@/i18n/locales/pl.json'
import pt from '@/i18n/locales/pt.json'
import zh from '@/i18n/locales/zh.json'

/** Canonical message shape — every locale file must match `en` exactly. */
export type TranslationMessages = typeof en

function assertTranslationMessages(messages: TranslationMessages): TranslationMessages {
  return messages
}

export const translationCatalog = {
  en: assertTranslationMessages(en),
  de: assertTranslationMessages(de),
  hu: assertTranslationMessages(hu),
  es: assertTranslationMessages(es),
  fr: assertTranslationMessages(fr),
  it: assertTranslationMessages(it),
  pt: assertTranslationMessages(pt),
  nl: assertTranslationMessages(nl),
  pl: assertTranslationMessages(pl),
  ja: assertTranslationMessages(ja),
  zh: assertTranslationMessages(zh),
} as const
