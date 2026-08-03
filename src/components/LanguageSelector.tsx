import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getAppLanguage, setAppLanguage } from '@/i18n'
import type { AppLanguage } from '@/i18n/languages'

const LANGUAGE_OPTIONS: { code: AppLanguage; labelKey: string }[] = [
  { code: 'en', labelKey: 'language.en' },
  { code: 'de', labelKey: 'language.de' },
  { code: 'hu', labelKey: 'language.hu' },
]

export default function LanguageSelector({ showSubtitle = false }: { showSubtitle?: boolean }) {
  const { t } = useTranslation()
  const active = getAppLanguage()

  function selectLanguage(code: AppLanguage) {
    setAppLanguage(code)
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-col gap-1">
        <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>
          {t('language.title')}
        </span>
        {showSubtitle && (
          <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 13, color: '#000' }}>
            {t('language.subtitle')}
          </span>
        )}
      </div>
      <div className="relative w-full">
        <select
          value={active}
          onChange={(e) => selectLanguage(e.target.value as AppLanguage)}
          aria-label={t('language.title')}
          className="neo-input w-full appearance-none rounded-[12px] pl-4 pr-10 py-2.5 cursor-pointer outline-none bg-white"
          style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000', height: 44 }}
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {t(option.labelKey)}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none size-4 text-black"
          strokeWidth={2.5}
          aria-hidden
        />
      </div>
    </div>
  )
}
