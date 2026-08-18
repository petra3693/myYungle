import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { History, Lock, Sparkles, Sprout, Stethoscope } from 'lucide-react'

const GREEN = '#00FF66'

type BillingPeriod = 'yearly' | 'monthly'

export interface PaywallModalProps {
  onClose: () => void
  onStartTrial: (period: BillingPeriod) => void
  onRestore?: () => void
  variant?: 'default' | 'aiScan'
}

function BenefitRow({ icon: Icon, label }: { icon: typeof Sprout; label: string }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="flex items-center justify-center rounded-full shrink-0 size-8 border-2 border-black"
        style={{ background: GREEN }}
      >
        <Icon className="size-3.5 text-black" strokeWidth={2.5} aria-hidden />
      </div>
      <p
        className="pt-1"
        style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 13, color: '#000', lineHeight: 1.4 }}
      >
        {label}
      </p>
    </div>
  )
}

export default function PaywallModal({ onClose, onStartTrial, onRestore, variant = 'default' }: PaywallModalProps) {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<BillingPeriod>('yearly')
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const closingRef = useRef(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsOpen(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeWithAnimation(onClose)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function closeWithAnimation(action: () => void) {
    if (closingRef.current) return
    closingRef.current = true
    setIsOpen(false)
    window.setTimeout(action, 220)
  }

  function handleRestore() {
    onRestore?.()
    setRestoreMessage(t('paywall.noPurchase'))
  }

  const modal = (
    <>
      <div
        className={`confirm-modal-backdrop ${isOpen ? 'is-open' : ''}`}
        onClick={() => closeWithAnimation(onClose)}
        aria-hidden
      />
      <div className="confirm-modal-wrap">
        <div
          className={`confirm-modal-panel neo-card rounded-2xl border-2 border-black bg-white px-4 pt-4 pb-5 flex flex-col gap-4 max-h-[min(90vh,640px)] overflow-y-auto ${isOpen ? 'is-open' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="paywall-title"
          aria-describedby="paywall-subtitle"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Lock className="size-5 shrink-0" strokeWidth={2.5} aria-hidden />
              <span
                className="rounded-full border-2 border-black px-2 py-0.5"
                style={{ background: GREEN, fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 9, color: '#000' }}
              >
                {t('common.pro')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => closeWithAnimation(onClose)}
              className="flex items-center justify-center size-8 rounded-full border-2 border-black bg-black cursor-pointer shrink-0"
              aria-label={t('paywall.close')}
            >
              <svg fill="none" height="14" viewBox="0 0 18 18" width="14" aria-hidden>
                <path d="M4 4L14 14M14 4L4 14" stroke="white" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <h2
              id="paywall-title"
              style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 16, color: '#000', lineHeight: 1.25, textTransform: 'uppercase' }}
            >
              {t(variant === 'aiScan' ? 'paywall.scanTitle' : 'paywall.title')}
            </h2>
            <p
              id="paywall-subtitle"
              style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 13, color: '#333', lineHeight: 1.45 }}
            >
              {t(variant === 'aiScan' ? 'paywall.scanSubtitle' : 'paywall.subtitle')}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <BenefitRow icon={Stethoscope} label={t('paywall.benefitUnlimited')} />
            <BenefitRow icon={History} label={t('paywall.benefitTimeline')} />
            <BenefitRow icon={Sprout} label={t('paywall.benefitPlants')} />
            <BenefitRow icon={Sparkles} label={t(variant === 'aiScan' ? 'paywall.benefitScan' : 'paywall.benefitHealth')} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPeriod('yearly')}
              className={`rounded-2xl border-2 border-black px-3 py-3 cursor-pointer ${period === 'yearly' ? '' : 'bg-white'}`}
              style={{ background: period === 'yearly' ? GREEN : '#fff' }}
              aria-pressed={period === 'yearly'}
            >
              <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}>{t('paywall.yearly')}</p>
              <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 11, color: '#333', marginTop: 4 }}>{t('paywall.yearlyPrice')}</p>
            </button>
            <button
              type="button"
              onClick={() => setPeriod('monthly')}
              className={`rounded-2xl border-2 border-black px-3 py-3 cursor-pointer ${period === 'monthly' ? '' : 'bg-white'}`}
              style={{ background: period === 'monthly' ? GREEN : '#fff' }}
              aria-pressed={period === 'monthly'}
            >
              <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000' }}>{t('paywall.monthly')}</p>
              <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 11, color: '#333', marginTop: 4 }}>{t('paywall.monthlyPrice')}</p>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onStartTrial(period)}
            className="btn-primary btn-green flex w-full items-center justify-center rounded-full border-2 border-black cursor-pointer min-h-[54px]"
            style={{ background: GREEN }}
          >
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>
              {t('paywall.cta')}
            </span>
          </button>

          {restoreMessage && (
            <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 12, color: '#888', textAlign: 'center' }} role="status">
              {restoreMessage}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRestore}
              className="flex-1 h-11 rounded-full border-2 border-black bg-white cursor-pointer"
              style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 9 }}
            >
              {t('paywall.restore')}
            </button>
            <button
              type="button"
              onClick={() => closeWithAnimation(onClose)}
              className="flex-1 h-11 rounded-full border-2 border-black bg-white cursor-pointer"
              style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 9 }}
            >
              {t('paywall.close')}
            </button>
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(modal, document.body)
}
