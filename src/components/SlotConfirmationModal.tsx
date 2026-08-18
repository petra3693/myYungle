import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

const GREEN = '#00FF66'

export interface SlotConfirmationModalProps {
  plantName: string
  onCancel: () => void
  onConfirm: () => void
}

export default function SlotConfirmationModal({ plantName, onCancel, onConfirm }: SlotConfirmationModalProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const closingRef = useRef(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsOpen(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeWithAnimation(onCancel)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  function closeWithAnimation(action: () => void) {
    if (closingRef.current) return
    closingRef.current = true
    setIsOpen(false)
    window.setTimeout(action, 220)
  }

  const modal = (
    <>
      <div
        className={`confirm-modal-backdrop ${isOpen ? 'is-open' : ''}`}
        onClick={() => closeWithAnimation(onCancel)}
        aria-hidden
      />
      <div className="confirm-modal-wrap">
        <div
          className={`confirm-modal-panel neo-card rounded-2xl border-2 border-black bg-white px-4 pt-4 pb-6 flex flex-col gap-4 ${isOpen ? 'is-open' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="slot-confirm-title"
          aria-describedby="slot-confirm-desc"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between shrink-0">
            <span
              id="slot-confirm-title"
              style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 14, color: '#000', textTransform: 'uppercase' }}
            >
              {t('slots.activateTitle')}
            </span>
            <button
              type="button"
              onClick={() => closeWithAnimation(onCancel)}
              className="flex items-center justify-center size-8 rounded-full border-2 border-black bg-black cursor-pointer"
              aria-label={t('slots.close')}
            >
              <svg fill="none" height="14" viewBox="0 0 18 18" width="14" aria-hidden>
                <path d="M4 4L14 14M14 4L4 14" stroke="white" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </button>
          </div>
          <p
            id="slot-confirm-desc"
            style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000', lineHeight: 1.5 }}
          >
            {t('slots.activateBody', { name: plantName })}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => closeWithAnimation(onCancel)}
              className="flex-1 h-11 rounded-full border-2 border-black bg-white cursor-pointer"
              style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10 }}
            >
              {t('slots.cancel')}
            </button>
            <button
              type="button"
              onClick={() => closeWithAnimation(onConfirm)}
              className="btn-primary btn-green flex-1 h-11 rounded-full border-2 border-black cursor-pointer"
              style={{ background: GREEN, fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10 }}
            >
              {t('slots.confirm')}
            </button>
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(modal, document.body)
}
