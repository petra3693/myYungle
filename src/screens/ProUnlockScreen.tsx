import { type LegalDoc } from '@/legal/legalContent'
import { logEvent } from '@/lib/analytics'
import { FREE_PLANT_LIMIT, PRODUCT_ANNUAL, PRODUCT_LIFETIME, PRODUCT_MONTHLY, TRIAL_DAYS, computeAnnualDiscountLabel, paywallCopyForSource, resolvePackage, trialLengthFromIntroPrice, trialUnitI18nKey, type PaywallSource, type TrialLength } from '@/lib/monetization'
import { FALLBACK_PREVIEW_PRICES, GREEN, PRO_BENEFIT_KEYS } from '@/screens/shared/constants'
import { IconCheck, IconChevronLeft, IconSparkles } from '@/screens/shared/icons'
import { IconCircleBtn } from '@/screens/shared/ui'
import { type OfferingsStatus, type SelectablePlan } from '@/types/screens'
import { Capacitor } from '@capacitor/core'
import { Purchases, type CustomerInfo, type PurchasesError, type PurchasesOffering } from '@revenuecat/purchases-capacitor'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

function ProUnlockScreen({
  source, offering, offeringsStatus, offeringsErrorDetail, onClose, onPurchased, onOpenLegal, onRetryOfferings, onSimulateWebPurchase,
  showProPreview, onTryProPreview, onProPreviewGranted,
}: {
  source: PaywallSource | null
  offering: PurchasesOffering | null
  offeringsStatus: OfferingsStatus
  /** Plain-English detail on the most recent thing that made offeringsStatus go to 'unavailable' — see App.tsx. */
  offeringsErrorDetail: string | null
  onClose: () => void
  onPurchased: (customerInfo: CustomerInfo, plan: SelectablePlan) => void
  onOpenLegal: (doc: LegalDoc) => void
  onRetryOfferings: () => void
  onSimulateWebPurchase: (plan: SelectablePlan) => void
  showProPreview: boolean
  onTryProPreview: () => Promise<{ ok: boolean; error?: string }>
  /** Called after the Pro Preview trial is granted — separate from onClose so it never triggers the lifetime win-back offer. */
  onProPreviewGranted: () => void
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<SelectablePlan>('annual')
  const [purchasing, setPurchasing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'error'>('idle')
  const copy = paywallCopyForSource(source, t)
  // RevenueCat's SDK is native-only — anything outside iOS/Android is web/dev preview.
  const isWebPreview = !Capacitor.isNativePlatform()
  // A real load failure on a real device (not the expected "no SDK on web" case) — offer a retry, not just dashes.
  const offeringsFailed = offeringsStatus === 'unavailable' && !isWebPreview
  // Debug detail for the offeringsFailed banner — same spirit as packageMissing's below:
  // never the full key (just presence + a 5-char prefix, enough to eyeball "is this the iOS
  // key or did I paste the Android one in"), plus whatever actually threw during boot.
  const debugPlatform = Capacitor.getPlatform()
  const debugKey = debugPlatform === 'ios' ? import.meta.env.VITE_RC_KEY_IOS : debugPlatform === 'android' ? import.meta.env.VITE_RC_KEY_ANDROID : undefined
  const debugKeyStatus = debugKey ? `present ("${debugKey.slice(0, 5)}…")` : 'MISSING'
  // Falls back to a product-ID search through availablePackages when the typed
  // .monthly/.annual/.lifetime accessor comes back null — see resolvePackage().
  const monthlyPkg = resolvePackage(offering, offering?.monthly ?? null, PRODUCT_MONTHLY)
  const annualPkg = resolvePackage(offering, offering?.annual ?? null, PRODUCT_ANNUAL)
  const lifetimePkg = resolvePackage(offering, offering?.lifetime ?? null, PRODUCT_LIFETIME)
  const selectedPkg = selected === 'annual' ? annualPkg : selected === 'monthly' ? monthlyPkg : lifetimePkg
  const ready = offeringsStatus === 'ready' && selectedPkg !== null
  // Offerings loaded fine (offeringsFailed above only covers a hard fetch
  // failure), but the selected plan's package still didn't resolve even
  // through resolvePackage()'s product-ID fallback — a distinct case that
  // otherwise silently showed "Pricing unavailable" with no way to tell
  // *why* on a TestFlight build with no debugger attached. Shows exactly
  // what RevenueCat returned instead of a fabricated price, since a
  // fabricated one could show something StoreKit wouldn't actually charge.
  const packageMissing = offeringsStatus === 'ready' && !isWebPreview && selectedPkg === null
  const missingProductId = selected === 'annual' ? PRODUCT_ANNUAL : selected === 'monthly' ? PRODUCT_MONTHLY : PRODUCT_LIFETIME
  const debugAvailablePackages = offering?.availablePackages.map((pkg) => `${pkg.identifier}->${pkg.product.identifier}`).join(', ') || 'none'
  // Trial length always comes from the annual package's real intro offer —
  // when there isn't one, no trial messaging is shown at all. Web/dev preview
  // never has a real product, so it falls back to TRIAL_DAYS purely so the
  // UI can be reviewed end to end; that fallback never reaches a real device.
  const trialLength: TrialLength | null = annualPkg
    ? trialLengthFromIntroPrice(annualPkg.product.introPrice)
    : isWebPreview
      ? { count: TRIAL_DAYS, unit: 'DAY' }
      : null
  const hasTrial = selected === 'annual' && trialLength !== null
  const trialLengthLabel = trialLength ? t(trialUnitI18nKey(trialLength.unit), { count: trialLength.count }) : null
  const discountLabel = annualPkg && monthlyPkg
    ? computeAnnualDiscountLabel(monthlyPkg.product.price, annualPkg.product.price, t)
    : isWebPreview
      ? computeAnnualDiscountLabel(FALLBACK_PREVIEW_PRICES.monthly, FALLBACK_PREVIEW_PRICES.annual, t)
      : null
  const monthlyPriceLabel = monthlyPkg ? `${monthlyPkg.product.priceString}${t('paywall.perMonthSuffix')}` : isWebPreview ? `$${FALLBACK_PREVIEW_PRICES.monthly.toFixed(2)}${t('paywall.perMonthSuffix')}` : '—'
  const annualPriceLabel = annualPkg ? `${annualPkg.product.priceString}${t('paywall.perYearSuffix')}` : isWebPreview ? `$${FALLBACK_PREVIEW_PRICES.annual.toFixed(2)}${t('paywall.perYearSuffix')}` : '—'
  const lifetimePriceLabel = lifetimePkg ? lifetimePkg.product.priceString : isWebPreview ? `$${FALLBACK_PREVIEW_PRICES.lifetime.toFixed(2)}` : '—'
  const annualTrialLabel = hasTrial && trialLengthLabel ? t('paywall.trialThenPrice', { length: trialLengthLabel, price: annualPriceLabel }) : null
  const annualBasePriceLabel = annualPkg ? annualPkg.product.priceString : isWebPreview ? `$${FALLBACK_PREVIEW_PRICES.annual.toFixed(2)}` : t('paywall.thePlanPrice')

  useEffect(() => {
    logEvent('paywall_shown', { source: source ?? undefined, plan_shown: ['monthly', 'annual', 'lifetime'] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  function selectPlan(plan: SelectablePlan) {
    setSelected(plan)
    logEvent('plan_selected', { source: source ?? undefined, plan_selected: plan })
  }

  async function handlePurchase() {
    if (!selectedPkg) return
    setPurchasing(true)
    logEvent('purchase_started', { source: source ?? undefined, plan_selected: selected, is_trial: hasTrial })
    try {
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: selectedPkg })
      logEvent('purchase_completed', { source: source ?? undefined, plan_selected: selected, is_trial: hasTrial })
      if (hasTrial) logEvent('trial_started', { source: source ?? undefined, plan_selected: selected })
      onPurchased(customerInfo, selected)
    } catch (error) {
      const cancelled = (error as PurchasesError)?.userCancelled === true
      if (!cancelled) {
        logEvent('purchase_failed', { source: source ?? undefined, plan_selected: selected, is_trial: hasTrial })
        console.error('[myJungle] purchase failed:', error)
        showToast(t('paywall.toastPurchaseFailed'))
      }
    } finally {
      setPurchasing(false)
    }
  }

  async function handleTryPreview() {
    setPreviewState('loading')
    const result = await onTryProPreview()
    if (result.ok) {
      onProPreviewGranted()
    } else {
      setPreviewState('error')
      showToast(result.error ?? t('analysisResult.proPreviewError'))
    }
  }

  async function handleRestore() {
    setRestoring(true)
    logEvent('restore_attempted', { source: source ?? undefined })
    try {
      const { customerInfo } = await Purchases.restorePurchases()
      const restored = Object.keys(customerInfo.entitlements.active).length > 0
      if (restored) {
        logEvent('restore_succeeded', { source: source ?? undefined })
        showToast(t('paywall.toastPurchaseRestored'))
        onPurchased(customerInfo, selected)
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
        <IconCircleBtn onClick={onClose} label={t('common.back')}><IconChevronLeft /></IconCircleBtn>
        <span className="badge-pro-solid inline-block mt-4" style={{ fontSize: 12, padding: '4px 14px', textTransform: 'uppercase' }}>{t('paywall.pro')}</span>
        <h1 className="font-heading mt-3" style={{ fontSize: 40, color: '#fff', textTransform: 'uppercase', lineHeight: 0.98 }}>{copy.headline}</h1>
        <p className="font-body mt-3" style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.35 }}>{copy.subtitle}</p>
      </div>
      <div className="sheet-body scroll-y flex-1 px-5 pt-6" style={{ borderRadius: '1.75rem 1.75rem 0 0' }}>
        <span className="caption-eyebrow" style={{ color: 'var(--color-ink-dim)' }}>{t('paywall.choosePlan')}</span>

        <div className="flex flex-col gap-3 mt-3">
          <div className="rounded-2xl px-5 flex items-center justify-between" style={{ height: 76, background: '#fff', border: '1.5px solid #e5e5e0' }}>
            <div>
              <div className="font-heading" style={{ fontSize: 17, color: '#111' }}>{t('paywall.free')}</div>
              <div className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>{t('paywall.upToPlants', { limit: FREE_PLANT_LIMIT })}</div>
            </div>
            <span className="font-heading" style={{ fontSize: 17, color: '#111' }}>{t('paywall.included')}</span>
          </div>

          <button
            type="button"
            onClick={() => selectPlan('monthly')}
            className="rounded-2xl px-5 flex items-center justify-between text-left"
            style={{
              height: 76,
              background: selected === 'monthly' ? '#000' : '#fff',
              border: selected === 'monthly' ? `2px solid ${GREEN}` : '1.5px solid #e5e5e0',
            }}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading" style={{ fontSize: 17, color: selected === 'monthly' ? '#fff' : '#111' }}>{t('paywall.monthly')}</span>
              </div>
              <div className="font-body" style={{ fontSize: 13, color: selected === 'monthly' ? 'rgba(255,255,255,0.6)' : 'var(--color-ink-dim)' }}>{t('paywall.monthlyDesc')}</div>
            </div>
            <span className="font-heading" style={{ fontSize: 18, color: selected === 'monthly' ? GREEN : '#111' }}>
              {monthlyPriceLabel}
            </span>
          </button>

          <button
            type="button"
            onClick={() => selectPlan('annual')}
            className="rounded-2xl px-5 flex items-center justify-between text-left"
            style={{
              height: 76,
              background: selected === 'annual' ? '#000' : '#fff',
              border: selected === 'annual' ? `2px solid ${GREEN}` : '1.5px solid #e5e5e0',
            }}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading" style={{ fontSize: 17, color: selected === 'annual' ? '#fff' : '#111' }}>{t('paywall.annual')}</span>
                <span className="badge-pro-solid" style={{ fontSize: 11, padding: '3px 9px', textTransform: 'uppercase' }}>{t('paywall.popular')}</span>
              </div>
              <div className="font-body" style={{ fontSize: 13, color: selected === 'annual' ? 'rgba(255,255,255,0.6)' : 'var(--color-ink-dim)' }}>
                {annualTrialLabel ?? discountLabel ?? t('paywall.bestValue')}
              </div>
            </div>
            <span className="font-heading" style={{ fontSize: 18, color: selected === 'annual' ? GREEN : '#111' }}>
              {annualPriceLabel}
            </span>
          </button>

          <button
            type="button"
            onClick={() => selectPlan('lifetime')}
            className="rounded-2xl px-5 flex items-center justify-between text-left"
            style={{
              height: 76,
              background: selected === 'lifetime' ? '#000' : '#fff',
              border: selected === 'lifetime' ? `2px solid ${GREEN}` : '1.5px solid #e5e5e0',
            }}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading" style={{ fontSize: 17, color: selected === 'lifetime' ? '#fff' : '#111' }}>{t('paywall.lifetime')}</span>
              </div>
              <div className="font-body" style={{ fontSize: 13, color: selected === 'lifetime' ? 'rgba(255,255,255,0.6)' : 'var(--color-ink-dim)' }}>{t('paywall.lifetimeDesc')}</div>
            </div>
            <span className="font-heading" style={{ fontSize: 18, color: selected === 'lifetime' ? GREEN : '#111' }}>
              {lifetimePriceLabel}
            </span>
          </button>
        </div>

        <div style={{ width: '100%', height: 1, background: '#eee', margin: '24px 0 20px' }} />

        <span className="caption-eyebrow" style={{ color: 'var(--color-ink-dim)' }}>{t('paywall.featuresUnlocked')}</span>
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

        {showProPreview && !isWebPreview && (
          <div className="rounded-2xl p-4 mt-5" style={{ background: '#000' }}>
            <div className="flex items-center gap-2 mb-1">
              <div style={{ color: GREEN }}><IconSparkles size={16} /></div>
              <span className="font-heading" style={{ fontSize: 14, color: '#fff', textTransform: 'uppercase' }}>{t('analysisResult.proPreviewTitle')}</span>
            </div>
            <p className="font-body" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>
              {t('analysisResult.proPreviewBody')}
            </p>
            <button
              type="button"
              onClick={() => void handleTryPreview()}
              disabled={previewState === 'loading'}
              className="font-heading w-full"
              style={{ height: 44, borderRadius: 9999, background: 'transparent', border: `1.5px solid ${GREEN}`, color: GREEN, textTransform: 'uppercase', fontSize: 13 }}
            >
              {previewState === 'loading' ? t('analysisResult.proPreviewActivating') : t('analysisResult.proPreviewTryFree')}
            </button>
          </div>
        )}

        {offeringsFailed && (
          <div className="rounded-2xl px-4 py-3 mt-4" style={{ background: '#fdecec' }}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-body" style={{ fontSize: 13, color: '#a33', lineHeight: 1.4 }}>{t('paywall.pricingLoadError')}</span>
              <button type="button" onClick={onRetryOfferings} className="font-heading shrink-0" style={{ fontSize: 13, color: '#a33', textTransform: 'uppercase' }}>{t('paywall.retry')}</button>
            </div>
            {/* Same spirit as packageMissing's debug line below — plain-English, not translated,
                never the full API key. */}
            <p className="font-body mt-1" style={{ fontSize: 11, color: '#a33', opacity: 0.75, lineHeight: 1.4 }}>
              Debug: platform="{debugPlatform}", key={debugKeyStatus}, last error: {offeringsErrorDetail ?? '—'}
            </p>
          </div>
        )}

        {packageMissing && (
          <div className="rounded-2xl px-4 py-3 mt-4" style={{ background: '#fdecec' }}>
            <span className="font-body" style={{ fontSize: 13, color: '#a33', lineHeight: 1.4 }}>{t('paywall.pricingLoadError')}</span>
            {/* Plain-English debug detail, not translated — this is a technical diagnostic for
                a tester/developer to read off a TestFlight build, not end-user copy. Shows what
                RevenueCat actually returned rather than a fabricated price for this plan, since a
                fabricated price could show something StoreKit wouldn't actually charge. */}
            <p className="font-body mt-1" style={{ fontSize: 11, color: '#a33', opacity: 0.75, lineHeight: 1.4 }}>
              Debug: offering "{offering?.identifier ?? '—'}" has no package for product "{missingProductId}". Packages found: {debugAvailablePackages}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => void handlePurchase()}
          disabled={!ready || purchasing || restoring}
          className="btn-fill w-full mt-6"
          style={{ height: 64, fontSize: 17 }}
        >
          {purchasing
            ? t('common.processing')
            : offeringsStatus === 'loading'
              ? t('paywall.loadingPrices')
              : !ready
                ? t('paywall.pricingUnavailable')
                : hasTrial && trialLengthLabel
                  ? t('paywall.startTrial', { length: trialLengthLabel })
                  : selected === 'lifetime'
                    ? t('paywall.getLifetimeAccess')
                    : t('paywall.subscribe')}
        </button>
        <p className="font-body text-center mt-3" style={{ fontSize: 13, color: 'var(--color-ink-dim)', lineHeight: 1.4 }}>
          {hasTrial && trialLengthLabel
            ? t('paywall.trialLegal', { length: trialLengthLabel, price: annualBasePriceLabel })
            : selected === 'lifetime'
              ? t('paywall.lifetimeLegal')
              : selected === 'annual'
                ? t('paywall.annualLegal', { price: annualPkg?.product.priceString ?? t('paywall.thePlanPrice') })
                : t('paywall.monthlyLegal', { price: monthlyPkg?.product.priceString ?? t('paywall.thePlanPrice') })}
        </p>

        {import.meta.env.DEV && isWebPreview && (
          <button
            type="button"
            onClick={() => onSimulateWebPurchase(selected)}
            className="font-heading w-full mt-3"
            style={{ height: 44, borderRadius: 9999, background: 'transparent', border: '1.5px dashed #b8860b', color: '#b8860b', textTransform: 'uppercase', fontSize: 12 }}
          >
            {t('paywall.simulatePurchase')}
          </button>
        )}

        <div className="flex items-center justify-center gap-3 mt-4 mb-6">
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

export default ProUnlockScreen
