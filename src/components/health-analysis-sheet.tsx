import { useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import PhotoActionSheet from '@/components/photo-action-sheet'
import { analyzePlantHealthImage } from '@/lib/analyzePlantHealth'
import { readAndCompressPhotoFile } from '@/lib/plantStorage'
import type { PlantHealthLog } from '@/types/plant'
import svgAdd from '@/imports/MyjungleAddPlant/svg-fer892chf7'

const GREEN = '#00FF66'
const RED = '#FF2D55'

export type HealthLogSubmitData = Omit<PlantHealthLog, 'id' | 'timestamp'>

interface HealthAnalysisSheetProps {
  plantName: string
  onClose: () => void
  onSubmit: (data: HealthLogSubmitData) => void
}

export default function HealthAnalysisSheet({ plantName, onClose, onSubmit }: HealthAnalysisSheetProps) {
  const [photo, setPhoto] = useState<string | null>(null)
  const [diagnosis, setDiagnosis] = useState('')
  const [treatmentNotes, setTreatmentNotes] = useState('')
  const [severity, setSeverity] = useState<PlantHealthLog['severity']>('low')
  const [isHealthy, setIsHealthy] = useState(true)
  const [analyzedByAI, setAnalyzedByAI] = useState(false)
  const [showPhotoPicker, setShowPhotoPicker] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)

  async function handlePhotoFile(file: File) {
    try {
      const compressed = await readAndCompressPhotoFile(file)
      setPhoto(compressed)
      setAnalyzeError(null)
      setAnalyzedByAI(false)
    } catch (error) {
      console.error('[myJungle] Health photo processing failed:', error)
    }
  }

  function handlePhotoInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handlePhotoFile(file)
    e.target.value = ''
  }

  async function handleAnalyzeHealth() {
    if (!photo || analyzing) return
    setAnalyzeError(null)
    setAnalyzing(true)
    try {
      const result = await analyzePlantHealthImage(photo)
      if (!result.ok) {
        setAnalyzeError(result.error)
        return
      }
      setDiagnosis(result.data.diagnosis)
      setTreatmentNotes(result.data.treatmentNotes.slice(0, 400))
      setSeverity(result.data.severity)
      setIsHealthy(result.data.isHealthy)
      setAnalyzedByAI(true)
    } catch (error) {
      console.error('[myJungle] Health analysis error:', error)
      setAnalyzeError(
        error instanceof Error ? error.message : 'Could not analyze this photo. Please try again.',
      )
    } finally {
      setAnalyzing(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!photo || !diagnosis.trim()) return
    onSubmit({
      photo,
      diagnosis: diagnosis.trim(),
      treatmentNotes: treatmentNotes.trim().slice(0, 400),
      severity,
      isHealthy,
      analyzedByAI,
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/40" onClick={onClose} aria-hidden />
      <div
        className="fixed inset-x-0 bottom-0 z-[90] px-4 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px)+0.5rem)]"
        role="dialog"
        aria-modal="true"
        aria-label="Health analysis"
      >
        <form
          onSubmit={handleSubmit}
          className="neo-card flex flex-col gap-3 rounded-t-3xl rounded-b-2xl border-2 border-black bg-[#F7F7F7] p-4 w-full max-w-lg mx-auto max-h-[90vh] overflow-hidden"
          style={{ boxShadow: '0 -4px 0 0 #000' }}
        >
          <div className="flex items-center justify-between gap-3 shrink-0">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000', textTransform: 'uppercase' }}>
                Health Analysis
              </span>
              <span style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 12, color: '#666' }}>
                {plantName}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center size-8 rounded-full border-2 border-black bg-black cursor-pointer shrink-0"
              aria-label="Close"
            >
              <svg fill="none" height="14" viewBox="0 0 18 18" width="14">
                <path d="M4.5 4.5l9 9m0-9l-9 9" stroke="white" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto flex-1 min-h-0 pb-1">
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoInputChange} />
            <input ref={libraryInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoInputChange} />

            <div className="neo-card relative rounded-3xl w-full bg-white">
              <div className="flex flex-col items-center gap-[16px] p-[16px]">
                <div className="bg-[#F7F7F7] relative rounded-full shrink-0 size-[80px] overflow-hidden border-2 border-black flex items-center justify-center">
                  {photo ? (
                    <img src={photo} alt="Plant health check" className="w-full h-full object-cover" />
                  ) : (
                    <svg fill="none" height="28" viewBox="0 0 24 24" width="28" aria-hidden>
                      <path d={svgAdd.p22b7c700} fill="black" />
                    </svg>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowPhotoPicker(true)}
                  className="btn-primary btn-green inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-black cursor-pointer px-4 py-2"
                  style={{ background: GREEN, minHeight: 36 }}
                >
                  <svg fill="none" height="14" viewBox="0 0 20 20" width="14" aria-hidden className="shrink-0">
                    <path d={svgAdd.p3e11a380} stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                  <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', lineHeight: 1 }}>
                    TAKE PHOTO
                  </span>
                </button>
              </div>
            </div>

            <div className="w-full flex flex-col items-center gap-[8px]">
              <button
                type="button"
                onClick={() => { void handleAnalyzeHealth() }}
                disabled={!photo || analyzing}
                className="gemini-analyze-btn relative w-full max-w-[340px] flex items-center justify-center gap-2 px-6 py-4"
              >
                <span className="gemini-analyze-btn__shine" aria-hidden />
                <Sparkles size={18} strokeWidth={2.5} aria-hidden className="shrink-0 relative z-10 text-white drop-shadow-sm" />
                <span
                  className="relative z-10"
                  style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 13, color: '#fff', lineHeight: 1, textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}
                >
                  {analyzing ? 'ANALYZING HEALTH…' : 'ANALYZE HEALTH WITH AI'}
                </span>
                <Sparkles size={18} strokeWidth={2.5} aria-hidden className="shrink-0 relative z-10 text-white drop-shadow-sm" />
              </button>
              {!photo && (
                <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 12, color: '#888' }}>
                  Add a photo first to analyze plant health with Gemini
                </p>
              )}
              {analyzeError && (
                <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 12, color: RED }} role="alert">
                  {analyzeError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-[6px] w-full">
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>DIAGNOSIS *</span>
              <div className={`neo-input relative rounded-[12px] w-full bg-white ${diagnosis.trim() ? 'filled-field' : ''}`}>
                <input
                  value={diagnosis}
                  onChange={(e) => {
                    setDiagnosis(e.target.value)
                    setAnalyzedByAI(false)
                  }}
                  placeholder="e.g. Root rot, Spider mites, Healthy"
                  className="w-full p-[14px] outline-none bg-transparent rounded-[12px]"
                  style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000' }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-[6px] w-full">
              <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000', textTransform: 'uppercase' }}>
                Treatment / Care Notes (max 400)
              </span>
              <div className={`neo-input relative rounded-[12px] w-full bg-white ${treatmentNotes.trim() ? 'filled-field' : ''}`} style={{ height: 96 }}>
                <textarea
                  value={treatmentNotes}
                  onChange={(e) => {
                    setTreatmentNotes(e.target.value)
                    setAnalyzedByAI(false)
                  }}
                  placeholder="Steps to treat or care for this issue"
                  className="w-full h-full p-[14px] outline-none bg-transparent rounded-[12px] resize-none"
                  style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: treatmentNotes.trim() ? '#000' : '#888' }}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!photo || !diagnosis.trim()}
            className="btn-primary btn-green flex w-full shrink-0 items-center justify-center rounded-full border-2 border-black cursor-pointer disabled:opacity-50"
            style={{ background: GREEN, minHeight: 52, height: 52, boxShadow: '2px 2px 0px 0px rgba(0,0,0,1)' }}
          >
            <span style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 11, color: '#000' }}>
              SAVE HEALTH CHECK
            </span>
          </button>
        </form>
      </div>

      {showPhotoPicker && (
        <PhotoActionSheet
          onClose={() => setShowPhotoPicker(false)}
          onTakePhoto={() => {
            setShowPhotoPicker(false)
            cameraInputRef.current?.click()
          }}
          onChooseLibrary={() => {
            setShowPhotoPicker(false)
            libraryInputRef.current?.click()
          }}
        />
      )}
    </>
  )
}
