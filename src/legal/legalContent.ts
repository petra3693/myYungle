/**
 * Legal document structure — the actual copy lives in i18n (`legal.terms.*`,
 * `legal.privacy.*`, `legal.impressum.*` in src/i18n/locales/*.json), sourced
 * from docs/legal/*.md. This module only defines which paragraph keys exist,
 * in what order, and which ones render as a section heading vs. body text —
 * LegalScreen (src/App.tsx) renders this list with its existing typography.
 *
 * Non-English locales currently mirror the English copy verbatim pending a
 * professional legal translation review — do not assume they are translated.
 */

export type LegalDoc = 'terms' | 'privacy' | 'impressum'

export const LEGAL_TITLE_KEYS: Record<LegalDoc, string> = {
  terms: 'settings.termsOfUse',
  privacy: 'settings.privacyPolicy',
  impressum: 'settings.impressum',
}

export type LegalBlock =
  | { type: 'heading'; key: string }
  | { type: 'paragraph'; key: string }

function heading(key: string): LegalBlock {
  return { type: 'heading', key }
}
function paragraph(key: string): LegalBlock {
  return { type: 'paragraph', key }
}

export const LEGAL_BLOCKS: Record<LegalDoc, LegalBlock[]> = {
  terms: [
    paragraph('lastUpdated'),
    paragraph('intro'),
    paragraph('aiDisclaimer'),
    heading('subscriptionsHeading'),
    paragraph('subscriptionsIntro'),
    paragraph('subscriptionsBilling'),
    paragraph('subscriptionsAutoRenew'),
    paragraph('subscriptionsManage'),
    paragraph('subscriptionsTrial'),
    paragraph('subscriptionsLifetime'),
    paragraph('subscriptionsLegacy'),
    heading('disclaimerHeading'),
    paragraph('disclaimerBody'),
    heading('changesHeading'),
    paragraph('changesBody'),
    heading('governingLawHeading'),
    paragraph('governingLawBody'),
    heading('contactHeading'),
    paragraph('contactBody'),
  ],
  privacy: [
    paragraph('lastUpdated'),
    paragraph('intro'),
    heading('deviceDataHeading'),
    paragraph('deviceDataBody'),
    heading('sentDataHeading'),
    paragraph('sentDataBody'),
    paragraph('feedbackDataBody'),
    heading('processorsHeading'),
    paragraph('processorsGoogle'),
    paragraph('processorsRevenueCat'),
    paragraph('processorsVercel'),
    paragraph('noSelling'),
    heading('retentionHeading'),
    paragraph('retentionBody'),
    heading('deletionHeading'),
    paragraph('deletionBody'),
    heading('childrenHeading'),
    paragraph('childrenBody'),
    heading('contactHeading'),
    paragraph('contactBody'),
    heading('changesHeading'),
    paragraph('changesBody'),
  ],
  impressum: [
    paragraph('intro'),
    heading('serviceHeading'),
    paragraph('serviceName'),
    paragraph('serviceWeb'),
    heading('operatorHeading'),
    paragraph('operatorCompanyName'),
    paragraph('operatorAddress'),
    paragraph('operatorEmail'),
    heading('responsibleHeading'),
    paragraph('responsibleName'),
    heading('contactHeading'),
    paragraph('contactBody'),
  ],
}
