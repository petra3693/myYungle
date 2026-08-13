import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { getAppLanguage, setAppLanguage } from '@/i18n'
import { LANGUAGE_OPTIONS, normalizeAppLanguage, type AppLanguage } from '@/i18n/languages'

export default function LanguageSelector({ showSubtitle = false }: { showSubtitle?: boolean }) {
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const active = normalizeAppLanguage(i18n.resolvedLanguage ?? i18n.language ?? getAppLanguage())
  const activeOption = LANGUAGE_OPTIONS.find((option) => option.code === active) ?? LANGUAGE_OPTIONS[0]

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: globalThis.MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen])

  function toggleOpen(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    setIsOpen((open) => !open)
  }

  function selectLanguage(code: AppLanguage, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    setAppLanguage(code)
    setIsOpen(false)
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-col gap-1">
        <span className="settings-inline-title">{t('language.title')}</span>
        {showSubtitle && (
          <span className="settings-row-subtitle" style={{ color: '#000' }}>
            {t('language.subtitle')}
          </span>
        )}
      </div>

      <div ref={containerRef} className="relative w-full">
        <button
          type="button"
          onClick={toggleOpen}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="language-selector-menu"
          className="settings-language-trigger"
        >
          <span className="break-words text-left">{t(activeOption.labelKey)}</span>
          <ChevronDown
            className={`settings-language-chevron ${isOpen ? 'settings-language-chevron--open' : ''}`}
            strokeWidth={2.5}
            aria-hidden
          />
        </button>

        {isOpen && (
          <div
            id="language-selector-menu"
            role="listbox"
            aria-label={t('language.title')}
            className="settings-language-menu absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto"
          >
            {LANGUAGE_OPTIONS.map((option) => {
              const selected = option.code === active
              return (
                <button
                  key={option.code}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={(event) => selectLanguage(option.code, event)}
                  className={`settings-language-option ${selected ? 'settings-language-option--active' : ''}`}
                >
                  <span className="break-words text-left">{t(option.labelKey)}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
