import { CaptureCancelledError, captureNativePhoto } from '@/lib/cameraCapture'
import { requestCameraPermission } from '@/lib/permissions'
import { readAndCompressPhotoFile } from '@/lib/plantStorage'
import { GREEN } from '@/screens/shared/constants'
import { IconCheck, IconChevronLeft, IconChevronRight, IconLock, IconPlus, IconX } from '@/screens/shared/icons'
import { PrivacyDetailsSheet } from '@/screens/shared/sheets'
import { IconCircleBtn, PrivacyHintLine } from '@/screens/shared/ui'
import { type CapturedPhoto } from '@/types/screens'
import { Capacitor } from '@capacitor/core'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

function BatchCaptureScreen({
  title, subtitle, freeSlots, onBack, onDone, doneLabel, onSkip, showPrivacyIntroCard, onDismissPrivacyIntroCard,
}: {
  title: string
  subtitle: string
  freeSlots: number | null
  onBack?: () => void
  onDone: (photos: CapturedPhoto[]) => void
  doneLabel: string
  /** Only passed for onboarding's own capture step — bulk-add has no "skip", there's nothing to skip past. */
  onSkip?: () => void
  /** Shown once, ever — only the onboarding capture step passes this (not bulk-add). */
  showPrivacyIntroCard?: boolean
  onDismissPrivacyIntroCard?: () => void
}) {
  const { t } = useTranslation()
  const [photos, setPhotos] = useState<CapturedPhoto[]>([])
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false)
  const [busy, setBusy] = useState(false)
  // Set while the picker is open to replace one existing photo rather than append new ones.
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const limit = freeSlots ?? Infinity
  const atLimit = photos.length >= limit

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    console.log(`[myJungle] BatchCapture: reading ${fileList.length} file(s)...`)
    setBusy(true)
    try {
      if (replaceTargetId) {
        const file = fileList[0]
        if (file) {
          try {
            const dataUrl = await readAndCompressPhotoFile(file)
            setPhotos((prev) => prev.map((p) => (p.id === replaceTargetId ? { ...p, dataUrl } : p)))
          } catch (error) {
            console.error('[myJungle] BatchCapture: replace photo failed:', error)
            showToast(error instanceof Error ? error.message : t('common.couldNotAnalyzePhoto'))
          }
        }
      } else {
        const remaining = limit - photos.length
        const files = Array.from(fileList).slice(0, Math.max(0, remaining))
        const results = await Promise.allSettled(files.map((f) => readAndCompressPhotoFile(f)))
        const succeeded = results.filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        if (succeeded.length > 0) {
          setPhotos((prev) => [...prev, ...succeeded.map((r) => ({ id: `${Date.now()}-${Math.random()}`, dataUrl: r.value }))])
        }
        if (failed.length > 0) {
          console.error(`[myJungle] BatchCapture: ${failed.length}/${files.length} photo(s) failed to process:`, failed.map((r) => r.reason))
          const firstError = failed[0]?.reason
          showToast(firstError instanceof Error ? firstError.message : t('common.couldNotAnalyzePhoto'))
        }
      }
    } catch (error) {
      console.error('[myJungle] batch capture failed:', error)
      showToast(error instanceof Error ? error.message : t('common.couldNotAnalyzePhoto'))
    } finally {
      setBusy(false)
      setReplaceTargetId(null)
    }
  }

  /** Opens the picker to append new photos, or (with an id) to replace one existing photo in place. */
  async function openPicker(replaceId?: string) {
    const granted = await requestCameraPermission()
    if (!granted) return

    if (Capacitor.isNativePlatform()) {
      try {
        const dataUrl = await captureNativePhoto()
        if (replaceId) {
          setPhotos((prev) => prev.map((p) => (p.id === replaceId ? { ...p, dataUrl } : p)))
        } else if (photos.length < limit) {
          setPhotos((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, dataUrl }])
        }
      } catch (error) {
        if (!(error instanceof CaptureCancelledError)) {
          console.error('[myJungle] BatchCapture: native capture failed:', error)
          showToast(error instanceof Error ? error.message : t('common.couldNotAnalyzePhoto'))
        }
      }
      return
    }

    setReplaceTargetId(replaceId ?? null)
    const input = fileInputRef.current
    if (!input) return
    // Set `multiple` directly — React's re-render (and thus the JSX-driven
    // attribute) hasn't happened yet by the time click() fires below.
    input.multiple = !replaceId
    input.click()
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="app-shell-light fixed inset-0 flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={!replaceTargetId}
        className="hidden"
        onChange={(e) => { void handleFiles(e.target.files); e.target.value = '' }}
      />
      <div className="flex items-center px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4 shrink-0">
        {onBack ? <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft /></IconCircleBtn> : <div style={{ width: 44 }} />}
      </div>
      {showPrivacyIntroCard && (
        <div className="px-5 shrink-0">
          <div className="rounded-2xl p-4 mb-4 relative" style={{ background: '#E6E6E6' }}>
            <button
              type="button"
              aria-label={t('common.dismiss')}
              onClick={onDismissPrivacyIntroCard}
              className="absolute flex items-center justify-center rounded-full"
              style={{ top: 0, right: 0, width: 44, height: 44, color: 'var(--color-ink-dim)' }}
            >
              <IconX size={14} />
            </button>
            <div className="flex items-center gap-2 mb-1 pr-6">
              <div style={{ color: '#111' }}><IconLock size={16} /></div>
              <span className="font-heading" style={{ fontSize: 13, color: '#111', textTransform: 'uppercase' }}>{t('privacyHint.introTitle')}</span>
            </div>
            <p className="font-body" style={{ fontSize: 13, color: '#666', lineHeight: 1.4 }}>
              {t('privacyHint.captureLine')}{' '}
              <button type="button" onClick={() => setShowPrivacyDetails(true)} className="font-body" style={{ fontSize: 13, color: '#666', textDecoration: 'underline' }}>
                {t('privacyHint.detailsLink')}
              </button>
            </p>
          </div>
        </div>
      )}
      <div className="px-5 shrink-0">
        <p className="font-body" style={{ fontSize: 14, color: '#666' }}>{subtitle}</p>
        {freeSlots !== null && (
          <p className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)', marginTop: 4 }}>
            {t('onboarding.freeSlotsHint', { count: freeSlots })}
          </p>
        )}
      </div>
      <div className="scroll-y flex-1 px-5 pt-4 pb-4 flex flex-col">
        {photos.length === 0 ? (
          <button
            type="button"
            onClick={() => openPicker()}
            disabled={busy}
            className="w-full flex flex-col items-center justify-center gap-3"
            style={{ flex: 1, minHeight: 260, borderRadius: '1.5rem', background: '#E6E6E6', border: '2px dashed #ccc' }}
          >
            <div className="flex items-center justify-center rounded-full" style={{ width: 64, height: 64, background: '#fff', border: '1.5px solid #ccc' }}>
              <IconPlus size={28} />
            </div>
            <span className="font-body" style={{ fontSize: 14, color: 'var(--color-ink-dim)' }}>{t('onboarding.tapToCapture')}</span>
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="font-heading" style={{ fontSize: 13, color: '#111', textTransform: 'uppercase' }}>
                {freeSlots !== null ? t('onboarding.capturedCount', { count: photos.length, total: freeSlots }) : photos.length}
              </span>
              {!atLimit && (
                <button
                  type="button"
                  onClick={() => openPicker()}
                  disabled={busy}
                  className="font-body flex items-center gap-1"
                  style={{ fontSize: 13, color: '#111' }}
                >
                  <IconPlus size={14} /> {t('onboarding.addMore')}
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {photos.map((p, i) => (
                <div key={p.id} className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '1/1' }}>
                  <button type="button" onClick={() => openPicker(p.id)} disabled={busy} className="w-full h-full block">
                    <img src={p.dataUrl} alt="" className="w-full h-full object-cover" />
                  </button>
                  <span
                    className="absolute bottom-1.5 left-1.5 font-heading"
                    style={{ fontSize: 11, background: 'rgba(0,0,0,0.65)', color: '#fff', borderRadius: 6, padding: '2px 6px', pointerEvents: 'none' }}
                  >
                    {freeSlots !== null ? `${i + 1}/${freeSlots}` : i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePhoto(p.id)}
                    className="absolute top-1.5 right-1.5 icon-circle tap-target"
                    style={{ width: 26, height: 26, background: 'rgba(0,0,0,0.75)' }}
                    aria-label={t('common.removePhoto')}
                  >
                    <IconX size={12} />
                  </button>
                </div>
              ))}
              {!atLimit && (
                <button
                  type="button"
                  onClick={() => openPicker()}
                  disabled={busy}
                  className="rounded-2xl flex items-center justify-center"
                  style={{ aspectRatio: '1/1', background: '#E6E6E6', border: '1.5px dashed #ccc' }}
                >
                  <IconPlus size={22} />
                </button>
              )}
              {freeSlots !== null && atLimit && (
                <div className="rounded-2xl flex items-center justify-center" style={{ aspectRatio: '1/1', background: '#E6E6E6' }}>
                  <div style={{ color: 'var(--color-ink-dim)' }}><IconLock size={22} /></div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shrink-0">
        <div className="flex items-center justify-center gap-2" style={{ marginBottom: 12 }}>
          <div style={{ color: GREEN }}><IconCheck size={14} /></div>
          <span className="font-body" style={{ fontSize: 13, color: '#666' }}>{t('onboarding.healthGrowthHint')}</span>
        </div>
        <button
          type="button"
          disabled={photos.length === 0}
          onClick={() => onDone(photos)}
          className="btn-fill btn-forward w-full"
          style={{ height: 56, fontSize: 15 }}
        >
          {doneLabel}
          <span className="btn-forward__arrow"><IconChevronRight size={20} /></span>
        </button>
        <div className="mt-3">
          <PrivacyHintLine onShowDetails={() => setShowPrivacyDetails(true)} color="var(--color-ink-dim)" />
        </div>
        {onSkip && (
          <button type="button" onClick={onSkip} className="font-body w-full text-center mt-3" style={{ fontSize: 13, color: 'var(--color-ink-dim)', textDecoration: 'underline' }}>
            {t('onboarding.skipForNow')}
          </button>
        )}
      </div>
      {toast && (
        <div className="fixed left-5 right-5 z-[80]" style={{ bottom: 'calc(24px + env(safe-area-inset-bottom,0px))' }}>
          <div className="rounded-2xl px-4 py-3 text-center" style={{ background: '#000' }}>
            <span className="font-body" style={{ fontSize: 13, color: '#fff' }}>{toast}</span>
          </div>
        </div>
      )}
      {showPrivacyDetails && <PrivacyDetailsSheet onClose={() => setShowPrivacyDetails(false)} />}
    </div>
  )
}

export default BatchCaptureScreen
