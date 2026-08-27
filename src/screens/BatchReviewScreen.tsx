import { CaptureCancelledError, captureNativePhoto } from '@/lib/cameraCapture'
import { requestCameraPermission } from '@/lib/permissions'
import { readAndCompressPhotoFile } from '@/lib/plantStorage'
import { frequencyLabel } from '@/lib/wateringBatch'
import { sortBatchReviewRows } from '@/screens/shared/helpers'
import { IconChevronLeft, IconChevronRight } from '@/screens/shared/icons'
import { isLowConfidence } from '@/screens/shared/storage'
import { IconCircleBtn } from '@/screens/shared/ui'
import { type BatchReviewRow } from '@/types/screens'
import { Capacitor } from '@capacitor/core'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

function BatchReviewScreen({
  rows, onBack, onRetakePhoto, onSave,
}: {
  rows: BatchReviewRow[]
  onBack?: () => void
  onRetakePhoto: (rowId: string, dataUrl: string) => void
  onSave: (rows: BatchReviewRow[]) => void
}) {
  const { t } = useTranslation()
  const [discarded, setDiscarded] = useState<Set<string>>(new Set())
  const [names, setNames] = useState<Record<string, string>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [retakeTargetId, setRetakeTargetId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  function nameFor(row: BatchReviewRow): string {
    return names[row.id] ?? row.draft.name
  }

  function toggleDiscard(id: string) {
    setDiscarded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function openRetakePicker(rowId: string) {
    const granted = await requestCameraPermission()
    if (!granted) return
    if (Capacitor.isNativePlatform()) {
      try {
        const dataUrl = await captureNativePhoto()
        onRetakePhoto(rowId, dataUrl)
      } catch (error) {
        if (!(error instanceof CaptureCancelledError)) {
          console.error('[myJungle] BatchReview: retake capture failed:', error)
          showToast(error instanceof Error ? error.message : t('common.couldNotAnalyzePhoto'))
        }
      }
      return
    }
    setRetakeTargetId(rowId)
    fileInputRef.current?.click()
  }

  async function handleRetakeFile(file: File | undefined) {
    if (!file || !retakeTargetId) return
    try {
      const dataUrl = await readAndCompressPhotoFile(file)
      onRetakePhoto(retakeTargetId, dataUrl)
    } catch (error) {
      console.error('[myJungle] BatchReview: retake file read failed:', error)
      showToast(error instanceof Error ? error.message : t('common.couldNotAnalyzePhoto'))
    } finally {
      setRetakeTargetId(null)
    }
  }

  const sortedRows = useMemo(() => sortBatchReviewRows(rows), [rows])
  const keptCount = rows.length - discarded.size

  function handleSave() {
    const finalRows = rows
      .filter((r) => !discarded.has(r.id))
      .map((r) => ({ id: r.id, draft: { ...r.draft, name: nameFor(r).trim() || r.draft.name } }))
    onSave(finalRows)
  }

  return (
    <div className="app-shell-light fixed inset-0 flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { void handleRetakeFile(e.target.files?.[0]); e.target.value = '' }}
      />
      <div className="flex items-center px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-4 shrink-0">
        {onBack ? <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft /></IconCircleBtn> : <div style={{ width: 44 }} />}
      </div>
      <div className="px-5 shrink-0">
        <h1 className="font-heading" style={{ fontSize: 22, color: '#000', textTransform: 'uppercase' }}>{t('batchReview.title')}</h1>
        <p className="font-body" style={{ fontSize: 14, color: '#666', marginTop: 4 }}>{t('batchReview.subtitle', { count: rows.length })}</p>
      </div>
      <div className="scroll-y flex-1 px-5 pt-4 pb-4 flex flex-col gap-3">
        {sortedRows.map((row) => {
          const isDiscarded = discarded.has(row.id)
          const failed = !!row.draft.error
          const lowConf = !failed && isLowConfidence(row.draft.confidence)
          const flagged = failed || lowConf
          return (
            <div
              key={row.id}
              className="rounded-2xl p-3 flex items-center gap-3"
              style={{
                background: flagged ? '#fff2e0' : '#E6E6E6',
                border: flagged ? '1.5px solid #f0ad4e' : '1.5px solid transparent',
                opacity: isDiscarded ? 0.5 : 1,
              }}
            >
              <img src={row.draft.photo} alt="" className="rounded-xl object-cover shrink-0 w-14 h-14" />
              <div className="flex-1 min-w-0">
                {editingId === row.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={nameFor(row)}
                    onChange={(e) => setNames((n) => ({ ...n, [row.id]: e.target.value }))}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setEditingId(null) }}
                    className="font-heading w-full"
                    style={{ fontSize: 15, color: '#111', background: 'transparent', borderBottom: '1.5px solid var(--color-ink-dim)', paddingBottom: 2 }}
                  />
                ) : (
                  <button type="button" onClick={() => setEditingId(row.id)} className="text-left w-full">
                    <span className="font-heading truncate" style={{ fontSize: 15, color: '#111', textDecoration: 'underline', textDecorationColor: '#ccc' }}>
                      {nameFor(row)}
                    </span>
                  </button>
                )}
                <div className="font-body truncate" style={{ fontSize: 13, color: flagged ? '#a5680f' : 'var(--color-ink-dim)', marginTop: 2 }}>
                  {failed
                    ? t('batchReview.couldNotIdentify')
                    : lowConf
                      ? t('batchReview.lowConfidenceHint')
                      : t('batchReview.waters', { frequency: frequencyLabel(row.draft.wateringFrequency, row.draft.wateringDays.length) })}
                </div>
                {failed && !isDiscarded && (
                  <button
                    type="button"
                    onClick={() => void openRetakePicker(row.id)}
                    className="font-body"
                    style={{ fontSize: 13, color: '#111', textDecoration: 'underline', marginTop: 4 }}
                  >
                    {t('batchReview.retakePhoto')}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => toggleDiscard(row.id)}
                className="font-body shrink-0"
                style={{ fontSize: 13, color: isDiscarded ? '#0a8f3f' : 'var(--color-ink-dim)', textDecoration: 'underline' }}
              >
                {isDiscarded ? t('batchReview.keep') : t('batchReview.discard')}
              </button>
            </div>
          )
        })}
      </div>
      <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shrink-0">
        <button type="button" onClick={handleSave} className="btn-fill btn-forward w-full" style={{ height: 56, fontSize: 15 }}>
          {keptCount === 0 ? t('batchReview.nothingToSave') : t('batchReview.saveAll', { count: keptCount })}
          <span className="btn-forward__arrow"><IconChevronRight size={20} /></span>
        </button>
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

export default BatchReviewScreen
