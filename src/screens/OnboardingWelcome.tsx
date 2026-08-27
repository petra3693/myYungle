import { type AppLanguage } from '@/i18n/languages'
import { GREEN } from '@/screens/shared/constants'
import { IconCalendar, IconCamera, IconChevronDown, IconChevronRight, IconDroplet, IconGlobe, IconLeaf, IconSparkles } from '@/screens/shared/icons'
import { useTranslation } from 'react-i18next'

const ONBOARDING_STEPS = [
  { icon: IconCamera, key: 'onboarding.step1' },
  { icon: IconSparkles, key: 'onboarding.step2' },
  { icon: IconCalendar, key: 'onboarding.step3' },
  { icon: IconDroplet, key: 'onboarding.step4' },
  { icon: IconLeaf, key: 'onboarding.step5', pro: true },
]

function OnboardingWelcome({ onNext, language, onPickLanguage }: { onNext: () => void; language: AppLanguage; onPickLanguage: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="app-shell-light fixed inset-0 flex flex-col px-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
      <div style={{ height: 40 }} />
      <h1
        className="font-heading"
        style={{ fontSize: 34, lineHeight: 1.08, color: '#000', textTransform: 'uppercase' }}
        dangerouslySetInnerHTML={{ __html: t('onboarding.welcomeTitle') }}
      />
      <div className="flex flex-col gap-4 mt-8 flex-1">
        {ONBOARDING_STEPS.map((step, i) => (
          <div key={i} className="flex items-center gap-3 rounded-full px-5" style={{ background: '#000', height: 64 }}>
            <div style={{ color: GREEN }}>
              <step.icon size={20} />
            </div>
            <span className="font-body flex-1" style={{ fontSize: 16, color: '#fff', fontWeight: 500 }}>
              {t(step.key)}
            </span>
            {step.pro && (
              <span className="badge-pro-solid shrink-0" style={{ fontSize: 11, padding: '3px 10px' }}>PRO</span>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onPickLanguage}
        className="flex items-center gap-3 rounded-full px-5 mb-4"
        style={{ background: '#E6E6E6', height: 56 }}
      >
        <IconGlobe size={18} />
        <span className="font-body flex-1 text-left" style={{ fontSize: 15, color: '#111' }}>{t(`language.${language}`)}</span>
        <IconChevronDown size={18} />
      </button>
      <button type="button" onClick={onNext} className="btn-fill btn-forward w-full" style={{ height: 56, fontSize: 16 }}>
        {t('onboarding.getStarted')}
        <span className="btn-forward__arrow"><IconChevronRight size={20} /></span>
      </button>
    </div>
  )
}

// ─── Screen: Onboarding — Batch capture (shared with Bulk Add) ────────────────

export default OnboardingWelcome
