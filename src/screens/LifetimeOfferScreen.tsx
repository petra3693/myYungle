import { type LegalDoc } from '@/legal/legalContent'
import { logEvent } from '@/lib/analytics'
import { FALLBACK_PREVIEW_PRICES, PRO_BENEFIT_KEYS } from '@/screens/shared/constants'
import { IconCheck } from '@/screens/shared/icons'
import { type OfferingsStatus } from '@/types/screens'
import { Capacitor } from '@capacitor/core'
import { Purchases, type CustomerInfo, type PurchasesError, type PurchasesOffering } from '@revenuecat/purchases-capacitor'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

function LifetimeOfferScreen({ offering, offeringsStatus, onDismiss, onPurchased, onOpenLegal, onSimulateWebPurchase }: {
  offering: PurchasesOffering | null
  offeringsStatus: OfferingsStatus
  onDismiss: () => void
  onPurchased: (customerInfo: CustomerInfo) => void
  onOpenLegal: (doc: LegalDoc) => void
  onSimulateWebPurchase: () => void
}) {
  const { t } = useTranslation()
  const [purchasing, setPurchasing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const lifetimePkg = offering?.lifetime ?? null
  const isWebPreview = !Capacitor.isNativePlatform()
  const priceLabel = lifetimePkg ? lifetimePkg.product.priceString : isWebPreview ? `$${FALLBACK_PREVIEW_PRICES.lifetime.toFixed(2)}` : '—'
  const ready = offeringsStatus === 'ready' && lifetimePkg !== null

  useEffect(() => {
    logEvent('lifetime_offer_shown', {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  async function handlePurchase() {
    if (!lifetimePkg) return
    setPurchasing(true)
    try {
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: lifetimePkg })
      logEvent('lifetime_purchased', {})
      onPurchased(customerInfo)
    } catch (error) {
      const cancelled = (error as PurchasesError)?.userCancelled === true
      if (!cancelled) {
        console.error('[myJungle] lifetime purchase failed:', error)
        showToast(t('paywall.toastPurchaseFailed'))
      }
    } finally {
      setPurchasing(false)
    }
  }

  async function handleRestore() {
    setRestoring(true)
    logEvent('restore_attempted', { source: 'lifetime_offer' })
    try {
      const { customerInfo } = await Purchases.restorePurchases()
      const restored = Object.keys(customerInfo.entitlements.active).length > 0
      if (restored) {
        logEvent('restore_succeeded', { source: 'lifetime_offer' })
        showToast(t('paywall.toastPurchaseRestored'))
        onPurchased(customerInfo)
      } else {
        showToast(t('paywall.toastNothingToRestore'))
      }
    } catch (error) {
      console.error('[myJungle] restore purchases failed:', error)
      showToast(t('paywall.toastRestoreFailed'))
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <div className="px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-6 shrink-0">
        <span className="badge-pro-solid inline-block" style={{ fontSize: 12, padding: '4px 14px', textTransform: 'uppercase' }}>{t('paywall.oneTimeOffer')}</span>
        <h1 className="font-heading mt-3" style={{ fontSize: 34, color: '#fff', textTransform: 'uppercase', lineHeight: 1 }}>{t('paywall.notIntoSubscriptions')}</h1>
        <p className="font-body mt-3" style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.35 }}>{t('paywall.ownForever')}</p>
      </div>
      <div className="sheet-body scroll-y flex-1 px-5 pt-6 flex flex-col items-center">
        <span className="font-heading" style={{ fontSize: 40, color: '#000' }}>{priceLabel}</span>
        <span className="caption-eyebrow" style={{ color: 'var(--color-ink-dim)' }}>{t('paywall.oneTimePurchaseForever')}</span>

        <span className="caption-eyebrow block w-full mt-6" style={{ color: 'var(--color-ink-dim)' }}>{t('paywall.featuresUnlocked')}</span>
        <div className="flex flex-col gap-3 mt-3 items-start w-full">
          {PRO_BENEFIT_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-3">
              <div className="flex items-center justify-center rounded-full shrink-0" style={{ width: 20, height: 20, border: '1.5px solid #000' }}>
                <IconCheck size={12} />
              </div>
              <span className="font-body" style={{ fontSize: 15, color: '#111' }}>{t(key)}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void handlePurchase()}
          disabled={!ready || purchasing || restoring}
          className="btn-fill w-full mt-6"
          style={{ height: 64, fontSize: 17 }}
        >
          {purchasing ? t('common.processing') : offeringsStatus === 'loading' ? t('paywall.loadingPrices') : !ready ? t('paywall.pricingUnavailable') : t('paywall.getLifetimeAccess')}
        </button>
        <p className="font-body text-center mt-3" style={{ fontSize: 13, color: 'var(--color-ink-dim)', lineHeight: 1.4 }}>
          {t('paywall.lifetimeLegal')}
        </p>
        {import.meta.env.DEV && isWebPreview && (
          <button
            type="button"
            onClick={onSimulateWebPurchase}
            className="font-heading w-full mt-3"
            style={{ height: 44, borderRadius: 9999, background: 'transparent', border: '1.5px dashed #b8860b', color: '#b8860b', textTransform: 'uppercase', fontSize: 12 }}
          >
            {t('paywall.simulatePurchase')}
          </button>
        )}
        <button type="button" onClick={onDismiss} className="font-body mt-4" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>
          {t('paywall.noThanks')}
        </button>

        <div className="flex items-center justify-center gap-3 mt-5 mb-6">
          <button type="button" onClick={() => void handleRestore()} disabled={restoring || purchasing} className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>
            {restoring ? t('common.restoring') : t('paywall.restorePurchase')}
          </button>
          <span style={{ color: '#ccc' }}>·</span>
          <button type="button" onClick={() => onOpenLegal('terms')} className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>{t('paywall.terms')}</button>
          <span style={{ color: '#ccc' }}>·</span>
          <button type="button" onClick={() => onOpenLegal('privacy')} className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>{t('paywall.privacy')}</button>
        </div>
      </div>
      {toast && (
        <div className="fixed left-5 right-5 z-[80]" style={{ bottom: 'calc(24px + env(safe-area-inset-bottom,0px))' }}>
          <div className="rounded-2xl px-4 py-3 text-center" style={{ background: '#000' }}>
            <span className="font-body" style={{ fontSize: 13, color: '#fff' }}>{toast}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default LifetimeOfferScreen
