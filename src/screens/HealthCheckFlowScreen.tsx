import PlantPhoto from '@/components/PlantPhoto'
import { type AppLanguage } from '@/i18n/languages'
import { analyzePlantHealthImage, type AnalyzePlantHealthResult } from '@/lib/analyzePlantHealth'
import { CameraSource, CaptureCancelledError, captureNativePhoto } from '@/lib/cameraCapture'
import { requestCameraPermission } from '@/lib/permissions'
import { readAndCompressPhotoFile } from '@/lib/plantStorage'
import { GREEN } from '@/screens/shared/constants'
import { withMinDelay } from '@/screens/shared/helpers'
import { IconChevronLeft, IconChevronRight, IconNavHealth } from '@/screens/shared/icons'
import { PrivacyDetailsSheet } from '@/screens/shared/sheets'
import { AiThinkingLoader, HealthReportCard, IconCircleBtn, PrivacyHintLine } from '@/screens/shared/ui'
import { type Plant, type PlantHealthLog } from '@/types/plant'
import { Capacitor } from '@capacitor/core'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

function HealthCheckFlowScreen({ plants, mode, presetPlant, onBack, onSaveLog, onDone, language }: {
  plants: Plant[]; mode: 'new' | 'existing'; presetPlant: Plant | null
  onBack: () => void; onSaveLog: (plantId: string, log: PlantHealthLog) => void; onDone: () => void; language: AppLanguage
}) {
  const { t } = useTranslation()
  const [step, setStep] = useState<'picker' | 'capture'>(mode === 'existing' && !presetPlant ? 'picker' : 'capture')
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(presetPlant)
  const [photo, setPhoto] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalyzePlantHealthResult | null>(null)
  const [scannedAt, setScannedAt] = useState<string | null>(null)
  const [showAttachPicker, setShowAttachPicker] = useState(false)
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
      const outcome = await withMinDelay(analyzePlantHealthImage(compressed, language), 700)
      if (outcome.ok) {
        setResult(outcome.data)
        setScannedAt(new Date().toISOString())
      } else {
        setError(outcome.error)
      }
    } catch (err) {
      console.error('[myJungle] health check failed:', err)
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
      console.error('[myJungle] health check compression failed:', error)
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
      console.error('[myJungle] health check native capture failed:', error)
      showToast(error instanceof Error ? error.message : t('common.couldNotAnalyzePhoto'))
    }
  }

  function handleLogToProfile(targetPlant: Plant) {
    if (!photo || !result || !scannedAt) return
    const log: PlantHealthLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: scannedAt,
      photo,
      healthScore: result.healthScore,
      diagnosis: result.diagnosis,
      treatmentNotes: result.treatmentNotes,
      recommendedActions: result.recommendedActions,
      analyzedByAI: true,
      severity: result.severity,
      confidence: result.confidence,
    }
    onSaveLog(targetPlant.id, log)
    setShowAttachPicker(false)
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

  if (step === 'picker') {
    return (
      <div className="app-shell fixed inset-0 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
          <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft /></IconCircleBtn>
          <span className="font-heading" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>{t('health.selectPlant')}</span>
          <div style={{ width: 44 }} />
        </div>
        <div className="scroll-y flex-1 px-5 flex flex-col gap-3">
          {plants.map((p) => (
            <button key={p.id} type="button" onClick={() => { setSelectedPlant(p); setStep('capture') }} className="check-row text-left">
              <PlantPhoto photo={p.photo} alt={p.name} className="rounded-2xl object-cover shrink-0 w-12 h-12" />
              <span className="font-heading flex-1 min-w-0 truncate" style={{ fontSize: 16, color: '#111' }}>{p.name}</span>
              <div style={{ color: 'var(--color-ink-dim)' }}><IconChevronRight size={18} /></div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = '' }} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = '' }} />
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
        <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft /></IconCircleBtn>
        <span className="font-heading" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>{t('health.reportTitle')}</span>
        <div style={{ width: 44 }} />
      </div>
      <div className="scroll-y flex-1 px-5 pb-6">
        {!photo && (
          <div className="dash-picker w-full flex flex-col items-center justify-center gap-4" style={{ minHeight: 260 }}>
            <div style={{ color: GREEN }}><IconNavHealth size={30} /></div>
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
            <div className="w-full px-6">
              <PrivacyHintLine onShowDetails={() => setShowPrivacyDetails(true)} />
            </div>
          </div>
        )}

        {photo && !result && (
          <img src={photo} alt="" className="w-full rounded-[1.5rem] object-cover" style={{ height: 260 }} />
        )}

        {analyzing && (
          <div className="flex flex-col items-center gap-2 mt-4">
            <AiThinkingLoader size={140} />
            <p className="font-body text-center" style={{ fontSize: 14, color: '#8E8E93' }}>{t('health.diagnosing')}</p>
          </div>
        )}

        {error && !analyzing && (
          <>
            <p className="font-body text-center mt-4" style={{ fontSize: 13, color: '#FF3B30' }}>{error}</p>
            <button type="button" onClick={reset} className="font-heading w-full mt-4" style={{ height: 52, borderRadius: 9999, background: '#1c1c1e', color: '#fff' }}>{t('common.tryAgain')}</button>
          </>
        )}

        {photo && result && !analyzing && (
          <HealthReportCard photo={photo} plantName={selectedPlant?.name ?? t('health.newPlant')} scannedAt={scannedAt ?? new Date().toISOString()} result={result} />
        )}
      </div>
      {photo && result && !analyzing && (
        <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-3 flex flex-col gap-3 shrink-0">
          {saved ? (
            <button type="button" onClick={onDone} className="btn-fill w-full" style={{ height: 52 }}>{t('common.done')}</button>
          ) : (
            <button
              type="button"
              onClick={() => (selectedPlant ? handleLogToProfile(selectedPlant) : setShowAttachPicker(true))}
              className="btn-fill w-full"
              style={{ height: 52 }}
            >
              {t('health.logToProfile')}
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            className="font-heading w-full"
            style={{ height: 52, borderRadius: 9999, background: 'transparent', border: `1.5px solid ${GREEN}`, color: GREEN, textTransform: 'uppercase' }}
          >
            {t('health.scanAgain')}
          </button>
        </div>
      )}
      {showAttachPicker && (
        <>
          <div className="sheet-backdrop is-open" onClick={() => setShowAttachPicker(false)} />
          <div className="fixed left-0 right-0 bottom-0 z-[70]">
            <div className="sheet-panel is-open p-5 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-3">
              <span className="font-heading" style={{ fontSize: 18 }}>{t('health.attachToWhich')}</span>
              {plants.length === 0 ? (
                <p className="font-body" style={{ fontSize: 14, color: '#666' }}>{t('health.addPlantFirst')}</p>
              ) : (
                <div className="scroll-y flex flex-col gap-2" style={{ maxHeight: 320 }}>
                  {plants.map((p) => (
                    <button key={p.id} type="button" onClick={() => handleLogToProfile(p)} className="flex items-center gap-3 rounded-2xl px-3 py-2" style={{ background: '#E6E6E6' }}>
                      <PlantPhoto photo={p.photo} alt={p.name} className="rounded-xl object-cover shrink-0 w-10 h-10" />
                      <span className="font-heading" style={{ fontSize: 15 }}>{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => setShowAttachPicker(false)} className="font-body text-center mt-1" style={{ fontSize: 14, color: '#888' }}>{t('common.cancel')}</button>
            </div>
          </div>
        </>
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

export default HealthCheckFlowScreen
