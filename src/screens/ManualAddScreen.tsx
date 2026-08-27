import { type AppLanguage } from '@/i18n/languages'
import { CameraSource, CaptureCancelledError, captureNativePhoto } from '@/lib/cameraCapture'
import { FREE_PLANT_LIMIT } from '@/lib/monetization'
import { requestCameraPermission } from '@/lib/permissions'
import { readAndCompressPhotoFile } from '@/lib/plantStorage'
import { frequencyLabel } from '@/lib/wateringBatch'
import { GREEN, PLANT_CATEGORIES } from '@/screens/shared/constants'
import { identifyPhoto, withMinDelay } from '@/screens/shared/helpers'
import { IconCalendarSmall, IconCamera, IconChevronDown, IconChevronLeft } from '@/screens/shared/icons'
import { PrivacyDetailsSheet } from '@/screens/shared/sheets'
import { isLowConfidence } from '@/screens/shared/storage'
import { AiDisclaimerLine, AiThinkingLoader, IconCircleBtn, PrivacyHintLine, Toggle } from '@/screens/shared/ui'
import { type DraftPlant } from '@/types/screens'
import { Capacitor } from '@capacitor/core'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

// ─── Screen: Manual add (single, AI-assisted) ──────────────────────────────────

function ManualAddScreen({ onBack, onAdd, remainingFreeSlots, isPro, language, primaryDay }: {
  onBack: () => void; onAdd: (draft: DraftPlant) => void; remainingFreeSlots: number; isPro: boolean; language: AppLanguage; primaryDay: number
}) {
  const { t } = useTranslation()
  const [photo, setPhoto] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftPlant | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [remindersOn, setRemindersOn] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  async function processPhotoDataUrl(compressed: string) {
    try {
      setPhoto(compressed)
      setDraft(null)
      setAnalyzing(true)
      console.log('[myJungle] ManualAdd: sending photo for identification...')
      const result = await withMinDelay(identifyPhoto(compressed, language, primaryDay), 700)
      setDraft(result)
      if (result.error) {
        console.warn('[myJungle] ManualAdd: identification failed, showing fallback draft:', result.error)
        showToast(result.error)
      }
    } catch (error) {
      console.error('[myJungle] manual add analyze failed:', error)
      showToast(error instanceof Error ? error.message : t('common.couldNotAnalyzePhoto'))
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleFile(file: File) {
    console.log(`[myJungle] ManualAdd: handling picked file "${file.name}"...`)
    try {
      const compressed = await readAndCompressPhotoFile(file)
      await processPhotoDataUrl(compressed)
    } catch (error) {
      console.error('[myJungle] manual add compression failed:', error)
      showToast(error instanceof Error ? error.message : t('common.couldNotAnalyzePhoto'))
    }
  }

  async function handleNativeCapture(source: CameraSource) {
    const granted = await requestCameraPermission()
    if (!granted) return
    try {
      const dataUrl = await captureNativePhoto(source)
      await processPhotoDataUrl(dataUrl)
    } catch (error) {
      if (error instanceof CaptureCancelledError) return
      console.error('[myJungle] ManualAdd: native capture failed:', error)
      showToast(error instanceof Error ? error.message : t('common.couldNotAnalyzePhoto'))
    }
  }

  async function openCamera() {
    if (Capacitor.isNativePlatform()) { await handleNativeCapture(CameraSource.Camera); return }
    const granted = await requestCameraPermission()
    if (granted) cameraInputRef.current?.click()
  }

  function openGallery() {
    if (Capacitor.isNativePlatform()) { void handleNativeCapture(CameraSource.Photos); return }
    galleryInputRef.current?.click()
  }

  const wateringFrequencyLabel = draft ? frequencyLabel(draft.wateringFrequency, draft.wateringDays.length) : ''
  const usedSlots = Math.max(0, FREE_PLANT_LIMIT - remainingFreeSlots)

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = '' }} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = '' }} />
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
        <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft /></IconCircleBtn>
        <span className="font-body" style={{ fontSize: 13, color: '#8E8E93' }}>
          {isPro ? t('manualAdd.unlimitedPlants') : t('manualAdd.slotsLeft', { remaining: remainingFreeSlots, total: FREE_PLANT_LIMIT })}
        </span>
      </div>
      <div className="px-5 pb-4 shrink-0" style={{ height: 220 }}>
        {!photo ? (
          <div className="dash-picker w-full h-full flex flex-col items-center justify-center gap-2">
            <IconCamera size={28} />
            <span className="font-body" style={{ fontSize: 14, color: '#fff' }}>{t('manualAdd.uploadPhoto')}</span>
          </div>
        ) : (
          <img src={photo} alt="" className="w-full h-full rounded-[1.5rem] object-cover" />
        )}
      </div>
      <div className="flex-1 min-h-0 flex flex-col" style={{ background: '#fff', borderRadius: '1.75rem 1.75rem 0 0' }}>
        <div className="scroll-y flex-1 px-5 pt-5">
          <button type="button" onClick={() => void openCamera()} className="btn-fill w-full" style={{ height: 52, fontSize: 15 }}>{t('manualAdd.takePhoto')}</button>
          <button
            type="button"
            onClick={openGallery}
            className="btn-outline-ink w-full mt-3"
            style={{ height: 52, fontSize: 15 }}
          >
            {t('manualAdd.fromGallery')}
          </button>
          <div className="mt-3">
            <PrivacyHintLine onShowDetails={() => setShowPrivacyDetails(true)} color="var(--color-ink-dim)" />
          </div>

          {analyzing && (
            <div className="flex flex-col items-center gap-2 mt-4">
              <AiThinkingLoader size={120} />
              <p className="font-body text-center" style={{ fontSize: 14, color: 'var(--color-ink-dim)' }}>{t('manualAdd.identifying')}</p>
            </div>
          )}

          {draft && (
            <>
              <div style={{ height: 1, background: '#eee', margin: '20px 0' }} />
              <span className="caption-eyebrow" style={{ color: 'var(--color-ink-dim)' }}>{t('manualAdd.enterManually')}</span>

              <label className="flex flex-col gap-1.5 mt-4">
                <span className="font-body" style={{ fontSize: 12, color: 'var(--color-ink-dim)', textTransform: 'uppercase' }}>{t('manualAdd.plantName')}</span>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="font-heading px-4"
                  style={{ height: 48, fontSize: 16, color: '#111', background: '#E6E6E6', borderRadius: 14 }}
                />
                {isLowConfidence(draft.confidence) && (
                  <span className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>{t('plantDetail.lowConfidenceHint')}</span>
                )}
              </label>

              <label className="flex flex-col gap-1.5 mt-4">
                <span className="font-body" style={{ fontSize: 12, color: 'var(--color-ink-dim)', textTransform: 'uppercase' }}>{t('manualAdd.category')}</span>
                <div className="relative">
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                    className="font-body px-4 w-full appearance-none"
                    style={{ height: 48, fontSize: 15, color: '#111', background: '#E6E6E6', borderRadius: 14 }}
                  >
                    {PLANT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="absolute pointer-events-none" style={{ right: 16, top: '50%', transform: 'translateY(-50%)', color: '#666' }}>
                    <IconChevronDown size={18} />
                  </div>
                </div>
              </label>

              <div className="mt-4 rounded-2xl p-4 flex items-center justify-between" style={{ background: '#E6E6E6' }}>
                <span className="font-body" style={{ fontSize: 14, color: 'var(--color-ink-dim)' }}>{t('manualAdd.lightRequirement')}</span>
                <span className="font-heading" style={{ fontSize: 14, color: '#111' }}>{draft.lightNeed.toLowerCase()}</span>
              </div>
              <div className="mt-3 rounded-2xl p-4 flex items-center justify-between" style={{ background: '#E6E6E6' }}>
                <span className="font-body" style={{ fontSize: 14, color: 'var(--color-ink-dim)' }}>{t('manualAdd.humidity')}</span>
                <span className="font-heading" style={{ fontSize: 14, color: '#111' }}>{draft.humidityNeed}</span>
              </div>

              <div className="mt-3 rounded-2xl px-4 py-3 flex items-center gap-2" style={{ border: `1.5px solid ${GREEN}`, background: '#e6fbee' }}>
                <div style={{ color: '#0a8f3f' }}><IconCalendarSmall size={16} /></div>
                <span className="font-body" style={{ fontSize: 13, color: '#0a8f3f' }}>
                  {t('manualAdd.wateringDaysHint', { frequency: wateringFrequencyLabel })}
                </span>
              </div>

              <div className="mt-3 rounded-2xl p-4 flex items-center justify-between" style={{ background: '#E6E6E6' }}>
                <div>
                  <div className="font-heading" style={{ fontSize: 14, color: '#111' }}>{t('manualAdd.setReminders')}</div>
                  <div className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>{t('manualAdd.receiveNotifications')}</div>
                </div>
                <Toggle on={remindersOn} onChange={setRemindersOn} />
              </div>

              <div className="mt-3">
                <AiDisclaimerLine color="var(--color-ink-dim)" />
              </div>

              {!isPro && (
                <p className="font-body text-center mt-4" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>
                  {t('manualAdd.slotsUsed', { used: usedSlots, total: FREE_PLANT_LIMIT })}
                </p>
              )}
            </>
          )}
        </div>
        <div className="px-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-3 shrink-0">
          <button type="button" disabled={!draft} onClick={() => draft && onAdd(draft)} className="btn-fill w-full" style={{ height: 52 }}>{t('manualAdd.addToJungle')}</button>
        </div>
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

export default ManualAddScreen
