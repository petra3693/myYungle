import { type AppLanguage } from '@/i18n/languages'
import { analyzePlantGrowthImage, type AnalyzePlantGrowthResult } from '@/lib/analyzePlantGrowth'
import { CameraSource, CaptureCancelledError, captureNativePhoto } from '@/lib/cameraCapture'
import { requestCameraPermission } from '@/lib/permissions'
import { readAndCompressPhotoFile } from '@/lib/plantStorage'
import { withMinDelay } from '@/screens/shared/helpers'
import { IconCamera, IconCheck, IconChevronLeft, IconLeaf, IconRuler } from '@/screens/shared/icons'
import { PrivacyDetailsSheet } from '@/screens/shared/sheets'
import { AiDisclaimerLine, AiThinkingLoader, IconCircleBtn, PrivacyHintLine } from '@/screens/shared/ui'
import { type HistoryEntry, type Plant } from '@/types/plant'
import { Capacitor } from '@capacitor/core'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

function GrowthCheckScreen({ plant, onBack, onSave, language }: {
  plant: Plant; onBack: () => void; onSave: (entry: HistoryEntry) => void; language: AppLanguage
}) {
  const { t } = useTranslation()
  const [photo, setPhoto] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalyzePlantGrowthResult | null>(null)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  async function processPhotoDataUrl(compressed: string) {
    setPhoto(compressed)
    setResult(null)
    setError(null)
    setSaved(false)
    setAnalyzing(true)
    try {
      const outcome = await withMinDelay(analyzePlantGrowthImage(compressed, language), 700)
      if (outcome.ok) {
        setResult(outcome.data)
      } else {
        setError(outcome.error)
      }
    } catch (err) {
      console.error('[myJungle] growth check failed:', err)
      setError(t('common.couldNotAnalyzePhoto'))
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleFile(file: File) {
    try {
      const compressed = await readAndCompressPhotoFile(file)
      await processPhotoDataUrl(compressed)
    } catch (error) {
      console.error('[myJungle] growth check compression failed:', error)
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
      console.error('[myJungle] growth check native capture failed:', error)
      showToast(error instanceof Error ? error.message : t('common.couldNotAnalyzePhoto'))
    }
  }

  function handleSave() {
    if (!photo || !result) return
    onSave({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: new Date().toISOString(),
      note: result.summary,
      photo,
      heightCm: result.heightCm,
      estimatedAge: result.estimatedAge,
      condition: result.condition,
      analyzedByAI: true,
    })
    setSaved(true)
  }

  function reset() {
    setPhoto(null)
    setResult(null)
    setError(null)
    setSaved(false)
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

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = '' }} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = '' }} />
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
        <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft /></IconCircleBtn>
        <span className="font-heading" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>{t('growthScan.title')}</span>
        <div style={{ width: 44 }} />
      </div>
      <div className="scroll-y flex-1 px-5 pb-6">
        {!photo && (
          <div className="dash-picker w-full flex flex-col items-center justify-center gap-4 p-6" style={{ minHeight: 260 }}>
            <IconCamera size={30} />
            <p className="font-body text-center" style={{ fontSize: 13, color: '#8E8E93', lineHeight: 1.4 }}>
              {t('growthScan.helper')}
            </p>
            <div className="flex gap-3 w-full px-6">
              <button type="button" onClick={() => void openCamera()} className="btn-fill flex-1" style={{ height: 48, fontSize: 13 }}>{t('common.takePhoto')}</button>
              <button
                type="button"
                onClick={openGallery}
                className="font-heading flex-1"
                style={{ height: 48, fontSize: 13, textTransform: 'uppercase', borderRadius: 9999, background: 'transparent', border: '1.5px solid #fff', color: '#fff' }}
              >
                {t('common.fromGallery')}
              </button>
            </div>
            <PrivacyHintLine onShowDetails={() => setShowPrivacyDetails(true)} />
          </div>
        )}

        {photo && !result && (
          <img src={photo} alt="" className="w-full rounded-[1.5rem] object-cover" style={{ height: 260 }} />
        )}

        {analyzing && (
          <div className="flex flex-col items-center gap-2 mt-4">
            <AiThinkingLoader size={140} />
            <p className="font-body text-center" style={{ fontSize: 14, color: '#8E8E93' }}>{t('growthScan.assessing')}</p>
          </div>
        )}

        {error && !analyzing && (
          <>
            <p className="font-body text-center mt-4" style={{ fontSize: 13, color: '#FF3B30' }}>{error}</p>
            <button type="button" onClick={reset} className="font-heading w-full mt-4" style={{ height: 52, borderRadius: 9999, background: '#1c1c1e', color: '#fff' }}>{t('common.tryAgain')}</button>
          </>
        )}

        {photo && result && !analyzing && (
          <>
            <img src={photo} alt="" className="w-full rounded-[1.5rem] object-cover mb-4" style={{ height: 220 }} />
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <div className="font-heading" style={{ fontSize: 22, color: '#fff' }}>{plant.name}</div>
                <div className="font-body" style={{ fontSize: 13, color: '#8E8E93' }}>{t('growthScan.matchVerified')}</div>
              </div>
              <span className="badge-pro-dark shrink-0" style={{ fontSize: 11, padding: '3px 10px' }}>PRO</span>
            </div>
            <span className="caption-eyebrow block mb-2">{t('growthScan.aiAnalysis')}</span>
            <div className="card-white p-5 flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl p-3 flex flex-col gap-1" style={{ background: '#E6E6E6' }}>
                  <div style={{ color: '#0a8f3f' }}><IconLeaf size={16} /></div>
                  <span className="font-heading" style={{ fontSize: 13, lineHeight: 1.2 }}>{result.estimatedAge}</span>
                  <span className="font-body" style={{ fontSize: 11, color: 'var(--color-ink-dim)' }}>{t('growthScan.maturity')}</span>
                </div>
                <div className="rounded-2xl p-3 flex flex-col gap-1" style={{ background: '#E6E6E6' }}>
                  <div style={{ color: '#0a8f3f' }}><IconRuler size={16} /></div>
                  <span className="font-heading" style={{ fontSize: 13, lineHeight: 1.2 }}>{result.heightCm} cm</span>
                  <span className="font-body" style={{ fontSize: 11, color: 'var(--color-ink-dim)' }}>{t('growthScan.estSize')}</span>
                </div>
                <div className="rounded-2xl p-3 flex flex-col gap-1" style={{ background: '#E6E6E6' }}>
                  <div style={{ color: '#0a8f3f' }}><IconCheck size={16} /></div>
                  <span className="font-heading" style={{ fontSize: 13, lineHeight: 1.2 }}>{result.condition}</span>
                  <span className="font-body" style={{ fontSize: 11, color: 'var(--color-ink-dim)' }}>{t('growthScan.health')}</span>
                </div>
              </div>
              <div className="rounded-2xl p-4" style={{ background: '#E6E6E6' }}>
                <span className="caption-eyebrow" style={{ color: 'var(--color-ink-dim)' }}>{t('growthScan.aiObservations')}</span>
                <p className="font-body mt-1" style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{result.summary}</p>
              </div>
            </div>
            <div className="mt-3">
              <AiDisclaimerLine />
            </div>
          </>
        )}
      </div>
      {photo && result && !analyzing && (
        <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-3 flex flex-col gap-3 shrink-0">
          {saved ? (
            <button type="button" onClick={onBack} className="btn-fill w-full" style={{ height: 52 }}>{t('common.done')}</button>
          ) : (
            <button type="button" onClick={handleSave} className="btn-fill w-full" style={{ height: 52 }}>{t('growthScan.saveToLog')}</button>
          )}
          <button
            type="button"
            onClick={reset}
            className="font-heading w-full"
            style={{ height: 52, borderRadius: 9999, background: 'transparent', border: '1.5px solid #fff', color: '#fff', textTransform: 'uppercase' }}
          >
            {t('growthScan.retakePhoto')}
          </button>
        </div>
      )}
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

export default GrowthCheckScreen
