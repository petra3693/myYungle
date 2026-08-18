import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'

const GREEN = '#00FF66'

function LockIcon({ size = 28 }: { size?: number }) {
  return (
    <svg fill="none" height={size} viewBox="0 0 24 24" width={size} aria-hidden>
      <rect height="10" rx="2" stroke="#000" strokeWidth="2" width="14" x="5" y="11" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#000" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

export default function ProFeatureGate({
  hasAccess,
  canActivateSlot,
  onActivateSlot,
  onUpgrade,
  preview,
  children,
}: {
  hasAccess: boolean
  canActivateSlot: boolean
  onActivateSlot: () => void
  onUpgrade: () => void
  preview: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation()

  if (hasAccess) return <>{children}</>

  return (
    <div className="relative min-h-[320px]">
      <div className="pro-section-preview">{preview}</div>
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <div className="neo-card flex flex-col items-center gap-3 rounded-2xl border-2 border-black bg-white p-5 text-center w-full max-w-[300px]">
          <LockIcon />
          <span
            className="rounded-full border-2 border-black px-3 py-1"
            style={{ background: GREEN, fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}
          >
            {t('common.proFeature')}
          </span>
          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 14, color: '#000', lineHeight: 1.4 }}>
            {canActivateSlot ? t('slots.activateHint') : t('slots.unlockHint')}
          </p>
          {canActivateSlot ? (
            <button
              type="button"
              onClick={onActivateSlot}
              className="btn-primary btn-green flex w-full items-center justify-center rounded-full border-2 border-black cursor-pointer"
              style={{ background: GREEN, height: 48 }}
            >
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}>
                {t('slots.activate')}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onUpgrade}
              className="btn-primary btn-green flex w-full items-center justify-center gap-2 rounded-full border-2 border-black cursor-pointer"
              style={{ background: GREEN, height: 48 }}
            >
              <Lock className="size-3.5" strokeWidth={2.5} aria-hidden />
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 9, color: '#000' }}>
                {t('slots.unlockDiagnosis')}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
