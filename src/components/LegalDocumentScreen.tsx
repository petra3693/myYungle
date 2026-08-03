import { useTranslation } from 'react-i18next'
import svgSettings from '@/imports/MyjungleSettings/svg-doomn8mxv7'

const BG = '#F7F7F7'

export type LegalDocument = 'privacy' | 'impressum'

export default function LegalDocumentScreen({
  document,
  onClose,
  onOpenDocument,
}: {
  document: LegalDocument
  onClose: () => void
  onOpenDocument: (doc: LegalDocument) => void
}) {
  const { t } = useTranslation()
  const title =
    document === 'privacy' ? t('settings.privacyPolicy') : t('settings.legalNotice')

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col"
      style={{ background: BG }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header
        className="sticky top-0 z-10 shrink-0 border-b-2 border-black bg-white"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 min-h-[56px]">
          <h1
            className="min-w-0 flex-1"
            style={{
              fontFamily: 'Unbounded, sans-serif',
              fontWeight: 900,
              fontSize: 16,
              color: '#000',
              textTransform: 'uppercase',
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
          <button
            type="button"
            onClick={onClose}
            className="relative bg-black flex items-center justify-center rounded-full shrink-0 cursor-pointer border-2 border-black active:scale-95"
            style={{ width: 38, height: 38 }}
            aria-label={t('settings.closeLegal')}
          >
            <svg fill="none" height="18" viewBox="0 0 18 18" width="18" aria-hidden>
              <path clipRule="evenodd" d={svgSettings.p3b43000} fill="white" fillRule="evenodd" />
            </svg>
          </button>
        </div>
      </header>

      <div
        className="flex-1 overflow-y-auto px-5 pt-4"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto w-full max-w-lg flex flex-col gap-3">
          {document === 'privacy' ? (
            <PrivacyBody onOpenImpressum={() => onOpenDocument('impressum')} />
          ) : (
            <ImpressumBody onOpenPrivacy={() => onOpenDocument('privacy')} />
          )}
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: 'Unbounded, sans-serif',
        fontWeight: 900,
        fontSize: 12,
        color: '#000',
        textTransform: 'uppercase',
        marginTop: 8,
      }}
    >
      {children}
    </h2>
  )
}

function BodyText({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 14, color: '#000', lineHeight: 1.55 }}>
      {children}
    </p>
  )
}

function PrivacyBody({ onOpenImpressum }: { onOpenImpressum: () => void }) {
  const { t } = useTranslation()
  return (
    <>
      <BodyText>{t('legal.privacy.updated')}</BodyText>
      <BodyText>{t('legal.privacy.intro')}</BodyText>
      <SectionTitle>{t('legal.privacy.dataTitle')}</SectionTitle>
      <BodyText>{t('legal.privacy.dataBody')}</BodyText>
      <SectionTitle>{t('legal.privacy.choicesTitle')}</SectionTitle>
      <BodyText>{t('legal.privacy.choicesBody')}</BodyText>
      <SectionTitle>{t('legal.privacy.contactTitle')}</SectionTitle>
      <BodyText>
        {t('legal.privacy.contactBody')}{' '}
        <button
          type="button"
          onClick={onOpenImpressum}
          className="underline cursor-pointer bg-transparent border-0 p-0"
          style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 14, color: '#000' }}
        >
          {t('settings.legalNotice')}
        </button>
        .
      </BodyText>
    </>
  )
}

function ImpressumBody({ onOpenPrivacy }: { onOpenPrivacy: () => void }) {
  const { t } = useTranslation()
  return (
    <>
      <BodyText>{t('legal.impressum.intro')}</BodyText>
      <SectionTitle>{t('legal.impressum.serviceTitle')}</SectionTitle>
      <BodyText>{t('legal.impressum.serviceName')}</BodyText>
      <BodyText>
        {t('legal.impressum.webLabel')}:{' '}
        <a
          href="https://my-yungle.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
          style={{ color: '#000' }}
        >
          https://my-yungle.vercel.app
        </a>
      </BodyText>
      <SectionTitle>{t('legal.impressum.operatorTitle')}</SectionTitle>
      <BodyText>{t('legal.impressum.operatorBody')}</BodyText>
      <SectionTitle>{t('legal.impressum.contactTitle')}</SectionTitle>
      <BodyText>{t('legal.impressum.contactBody')}</BodyText>
      <button
        type="button"
        onClick={onOpenPrivacy}
        className="underline cursor-pointer bg-transparent border-0 p-0 self-start"
        style={{ fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: 14, color: '#000' }}
      >
        {t('settings.privacyPolicy')}
      </button>
    </>
  )
}
