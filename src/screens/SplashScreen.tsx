import { CHOSEN_APP_NAME } from '@/appConfig'
import { APP_VERSION, GREEN } from '@/screens/shared/constants'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

// ─── Screen: Splash ───────────────────────────────────────────────────────────

function SplashScreen({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation()
  useEffect(() => {
    const timer = setTimeout(onNext, 1800)
    return () => clearTimeout(timer)
  }, [onNext])
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-6" style={{ background: GREEN }}>
      <div className="drop-animate" style={{ color: '#000' }}>
        <svg width="120" height="140" viewBox="0 0 85 116" fill="currentColor">
          <path d="M42.5 2.9C45.9 16.9 53.7 29.9 63.9 38.2l1.1 0.9C77.4 48.9 83 59.4 83 71.9c0 11-4.4 21.6-12.1 29.4C63.2 109 52.6 113.4 42.5 113.4S21.8 109 14 101.3C6.3 93.5 1.9 82.9 1.9 71.9c0-11.6 5.7-22.7 17.2-32.2l1.1-0.9C29.5 29.9 39.1 16.9 42.5 2.9z" />
        </svg>
      </div>
      <div className="text-animate text-center">
        <div className="font-heading" style={{ fontSize: 26, color: '#000' }}>{CHOSEN_APP_NAME.toUpperCase()}</div>
        <div className="font-body" style={{ fontSize: 13, color: '#000', opacity: 0.6, marginTop: 4 }}>{t('splash.version', { version: APP_VERSION })}</div>
      </div>
    </div>
  )
}

// ─── Screen: Onboarding — Welcome ─────────────────────────────────────────────

export default SplashScreen
