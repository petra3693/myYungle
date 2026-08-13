import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

export default function PhotoActionSheet({
  onClose,
  onTakePhoto,
  onChooseLibrary,
}: {
  onClose: () => void
  onTakePhoto: () => void
  onChooseLibrary: () => void
}) {
  const { t } = useTranslation()

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] bg-black/40" onClick={onClose} aria-hidden />
      <div
        className="fixed inset-x-0 z-[100] px-4 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px)+0.75rem)]"
        role="dialog"
        aria-modal="true"
        aria-label={t('photo.chooseSource')}
      >
        <div className="flex flex-col gap-2 w-full max-w-lg mx-auto pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
          <div className="neo-card flex flex-col overflow-hidden rounded-2xl border-2 border-black bg-white shadow-lg">
            <button
              type="button"
              onClick={onTakePhoto}
              className="flex w-full items-center justify-center border-b-2 border-black px-4 py-4 cursor-pointer active:bg-[#E5E5E5]"
              style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 16, color: '#000' }}
            >
              {t('photo.takePhoto')}
            </button>
            <button
              type="button"
              onClick={onChooseLibrary}
              className="flex w-full items-center justify-center px-4 py-4 cursor-pointer active:bg-[#E5E5E5]"
              style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 16, color: '#000' }}
            >
              {t('photo.chooseLibrary')}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="neo-card flex w-full items-center justify-center rounded-2xl border-2 border-black bg-white px-4 py-4 mb-1 cursor-pointer active:bg-[#E5E5E5] shadow-lg"
            style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 16, color: '#000' }}
          >
            {t('photo.cancel')}
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
