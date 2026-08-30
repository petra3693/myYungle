import { LEGAL_BLOCKS, LEGAL_TITLE_KEYS, type LegalDoc } from '@/legal/legalContent'
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '@/screens/shared/constants'
import { IconChevronLeft } from '@/screens/shared/icons'
import { IconCircleBtn } from '@/screens/shared/ui'
import { useTranslation } from 'react-i18next'

// Impressum already lists the website URL inline in its own content — only privacy/terms get the extra footer link.
const EXTERNAL_LEGAL_URLS: Partial<Record<LegalDoc, string>> = {
  privacy: PRIVACY_POLICY_URL,
  terms: TERMS_OF_SERVICE_URL,
}

function LegalScreen({ doc, onBack }: { doc: LegalDoc; onBack: () => void }) {
  const { t } = useTranslation()
  const blocks = LEGAL_BLOCKS[doc]
  const externalUrl = EXTERNAL_LEGAL_URLS[doc]
  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
        <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft /></IconCircleBtn>
        <span className="font-heading" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>{t(LEGAL_TITLE_KEYS[doc])}</span>
        <div style={{ width: 44 }} />
      </div>
      <div className="scroll-y flex-1 px-5 pb-6 flex flex-col gap-3">
        {blocks.map((block, i) =>
          block.type === 'heading' ? (
            <span key={i} className="font-heading" style={{ fontSize: 13, color: '#8E8E93', textTransform: 'uppercase', marginTop: i === 0 ? 0 : 8 }}>
              {t(`legal.${doc}.${block.key}`)}
            </span>
          ) : (
            <p key={i} className="font-body" style={{ fontSize: 14, color: '#ccc', lineHeight: 1.7 }}>
              {t(`legal.${doc}.${block.key}`)}
            </p>
          ),
        )}
        {externalUrl && (
          <button
            type="button"
            onClick={() => window.open(externalUrl, '_blank')}
            className="font-body text-left"
            style={{ fontSize: 13, color: '#8E8E93', textDecoration: 'underline', marginTop: 8 }}
          >
            {t('legal.viewOnWebsite')}
          </button>
        )}
      </div>
    </div>
  )
}

export default LegalScreen
