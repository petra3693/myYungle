import { useTranslation } from 'react-i18next'
import { getAppLanguage, setAppLanguage } from '@/i18n'
import type { AppLanguage } from '@/i18n/languages'

const LANGUAGE_OPTIONS: { code: AppLanguage; flag: string; labelKey: string }[] = [
  { code: 'en', flag: '🇬🇧', labelKey: 'language.en' },
  { code: 'de', flag: '🇩🇪', labelKey: 'language.de' },
  { code: 'hu', flag: '🇭🇺', labelKey: 'language.hu' },
]

export default function LanguageSelector({
  variant = 'segmented',
}: {
  variant?: 'segmented' | 'cards'
}) {
  const { t, i18n } = useTranslation()
  const active = getAppLanguage()

  function selectLanguage(code: AppLanguage) {
    setAppLanguage(code)
  }

  if (variant === 'cards') {
    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="text-center flex flex-col gap-1 w-full">
          <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>
            {t('language.title').toUpperCase()}
          </span>
          <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 13, color: '#000' }}>
            {t('language.subtitle')}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 w-full">
          {LANGUAGE_OPTIONS.map((option) => {
            const on = active === option.code
            return (
              <button
                key={option.code}
                type="button"
                onClick={() => selectLanguage(option.code)}
                className={`neo-pill relative flex items-center justify-between w-full cursor-pointer shrink-0 transition-all ${on ? 'filled-day' : ''}`}
                style={{ background: on ? undefined : 'white', paddingLeft: 16, paddingRight: 16, paddingTop: 8, paddingBottom: 8 }}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>{option.flag}</span>
                  <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}>
                    {t(option.labelKey)}
                  </span>
                </span>
                {on ? (
                  <svg fill="none" height="16" viewBox="0 0 18 18" width="16" aria-hidden>
                    <path d="M3 9.5L7 13.5L15 5.5" stroke="#000" strokeLinecap="round" strokeWidth="2" />
                  </svg>
                ) : (
                  <div style={{ width: 16, height: 16 }} aria-hidden />
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>
        {t('language.title')}
      </span>
      <div className="neo-input relative rounded-[12px] w-full filled-field" style={{ height: 37 }}>
        <div className="flex items-center h-full px-[4px]">
          {LANGUAGE_OPTIONS.map((option) => {
            const on = i18n.language.startsWith(option.code)
            return (
              <button
                key={option.code}
                type="button"
                onClick={() => selectLanguage(option.code)}
                className={`flex items-center justify-center gap-1 py-[10px] rounded-full cursor-pointer active:scale-95 transition-all flex-1 ${on ? 'filled-segment' : ''}`}
                style={{
                  height: 37,
                  background: 'transparent',
                  border: on ? '2px solid black' : '2px solid transparent',
                }}
              >
                <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>{option.flag}</span>
                <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 9, color: '#000' }}>
                  {t(option.labelKey)}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
