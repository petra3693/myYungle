import { LANGUAGE_OPTIONS, type AppLanguage } from '@/i18n/languages'
import { LEGAL_BLOCKS, LEGAL_TITLE_KEYS } from '@/legal/legalContent'
import { openStoreReviewPage } from '@/lib/appReview'
import { submitFeedback } from '@/lib/feedbackApi'
import { FREE_PLANT_LIMIT } from '@/lib/monetization'
import { checkNotificationPermissionStatus, type NotificationPermissionStatus } from '@/lib/permissions'
import { FULL_DAY_NAMES, GREEN, PRIVACY_POLICY_URL } from '@/screens/shared/constants'
import { fullDayName } from '@/screens/shared/helpers'
import { IconAlert, IconCheck, IconChevronRight, IconStar, IconX } from '@/screens/shared/icons'
import { IconCircleBtn, Toggle } from '@/screens/shared/ui'
import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

function DayPickerSheet({ selected, onSelect, onClose }: { selected: number; onSelect: (day: number) => void; onClose: () => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close(action?: () => void) { setOpen(false); setTimeout(() => action?.(), 180) }
  return createPortal(
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onClose)} />
      <div className="fixed left-0 right-0 bottom-0 z-[100]">
        <div className={`sheet-panel ${open ? 'is-open' : ''} p-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-1`}>
          <span className="caption-eyebrow block px-4 pt-2 pb-1" style={{ color: 'var(--color-ink-dim)' }}>{t('dayPicker.title')}</span>
          {FULL_DAY_NAMES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => close(() => onSelect(i))}
              className="font-heading text-left px-4 py-3 flex items-center justify-between"
              style={{ fontSize: 16 }}
            >
              {fullDayName(t, i)}
              {i === selected && <IconCheck size={18} />}
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body,
  )
}
function ConfirmSheet({ title, body, confirmLabel, danger, onCancel, onConfirm }: {
  title: string; body: string; confirmLabel: string; danger?: boolean; onCancel: () => void; onConfirm: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close(action: () => void) { setOpen(false); setTimeout(action, 180) }
  return createPortal(
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onCancel)} />
      <div className="fixed left-4 right-4 z-[100]" style={{ top: '50%', transform: 'translateY(-50%)' }}>
        <div className={`modal-card ${open ? 'is-open' : ''} p-5 flex flex-col gap-4`}>
          <span className="font-heading" style={{ fontSize: 18 }}>{title}</span>
          <p className="font-body" style={{ fontSize: 14, color: '#444', lineHeight: 1.5 }}>{body}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => close(onCancel)} className="btn-ghost-dark flex-1" style={{ height: 46, background: '#E6E6E6', color: '#111' }}>{t('common.cancel')}</button>
            <button
              type="button"
              onClick={() => close(onConfirm)}
              className="flex-1 font-heading"
              style={{ height: 46, borderRadius: 9999, background: danger ? '#FF3B30' : GREEN, color: danger ? '#fff' : '#05170c' }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
function LanguagePickerSheet({ current, onSelect, onClose }: { current: AppLanguage; onSelect: (l: AppLanguage) => void; onClose: () => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close(action?: () => void) { setOpen(false); setTimeout(() => action?.(), 180) }
  return createPortal(
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onClose)} />
      <div className="fixed left-0 right-0 bottom-0 z-[100]">
        <div className={`sheet-panel ${open ? 'is-open' : ''} p-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-1`} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <span className="caption-eyebrow block px-3 pt-2 pb-1" style={{ color: 'var(--color-ink-dim)' }}>{t('languagePicker.title')}</span>
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.code}
              type="button"
              onClick={() => close(() => onSelect(opt.code))}
              className="font-heading text-left px-4 py-3 flex items-center justify-between"
              style={{ fontSize: 16 }}
            >
              {t(opt.labelKey)}
              {opt.code === current && <IconCheck size={18} />}
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body,
  )
}
function NotificationSettingsSheet({ pushNotifications, reminderTime, onToggle, onChangeReminderTime, onClose }: {
  pushNotifications: boolean
  reminderTime: string
  /** Flips the preference and, when turning on, requests OS permission — resolves once settled. */
  onToggle: () => Promise<void>
  onChangeReminderTime: (time: string) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  // Seeded synchronously (not null) so the status row never pops in after mount —
  // it's refined a moment later by the real async check, without a layout jump.
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>(
    () => (Capacitor.isNativePlatform() ? 'prompt' : 'unavailable'),
  )
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const f = requestAnimationFrame(() => setOpen(true))
    void checkNotificationPermissionStatus().then(setPermissionStatus)
    return () => cancelAnimationFrame(f)
  }, [])

  function close(action?: () => void) { setOpen(false); setTimeout(() => action?.(), 180) }

  async function handleToggle() {
    setBusy(true)
    try {
      await onToggle()
      setPermissionStatus(await checkNotificationPermissionStatus())
    } finally {
      setBusy(false)
    }
  }

  const statusLabel = permissionStatus === 'granted' ? t('notificationSettings.permissionGranted')
    : permissionStatus === 'denied' ? t('notificationSettings.permissionDenied')
    : permissionStatus === 'prompt' ? t('notificationSettings.permissionPrompt')
    : t('notificationSettings.permissionUnavailable')
  const statusColor = permissionStatus === 'granted' ? '#0a8f3f' : permissionStatus === 'denied' ? '#FF3B30' : '#8E8E93'
  const hasValidTime = /^\d{2}:\d{2}$/.test(reminderTime)
  // The button stays mounted at all times (never removed) — only its enabled/label state changes,
  // so the sheet never resizes as permissions or the toggle change.
  const alreadyEnabled = pushNotifications && permissionStatus !== 'denied'
  const buttonDisabled = busy || alreadyEnabled || !hasValidTime

  return createPortal(
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onClose)} />
      <div className="fixed left-0 right-0 bottom-0 z-[100]">
        <div className={`sheet-panel ${open ? 'is-open' : ''} p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-4`}>
          <div className="flex items-center justify-between">
            <span className="font-heading" style={{ fontSize: 18 }}>{t('notificationSettings.title')}</span>
            <IconCircleBtn onClick={() => close(onClose)} label={t('common.close')}><IconX size={16} /></IconCircleBtn>
          </div>
          <p className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>{t('notificationSettings.description')}</p>

          {permissionStatus !== 'unavailable' && (
            <div className="flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: '#E6E6E6' }}>
              <span style={{ width: 8, height: 8, borderRadius: 9999, background: statusColor, flexShrink: 0 }} />
              <span className="font-body" style={{ fontSize: 13, color: '#444' }}>{statusLabel}</span>
            </div>
          )}
          {/* Fixed-height slot reserved regardless of content, so the denied hint appearing/disappearing never shifts the layout. */}
          <div style={{ minHeight: 32 }}>
            {permissionStatus === 'denied' && (
              <p className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>
                {t('notificationSettings.deniedHint')}
              </p>
            )}
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: '#E6E6E6' }}>
            <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid #eee' }}>
              <span className="font-heading" style={{ fontSize: 15, color: '#111' }}>{t('settings.wateringReminders')}</span>
              <Toggle on={pushNotifications} onChange={() => void handleToggle()} />
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="font-body" style={{ fontSize: 14, color: '#111' }}>{t('settings.reminderTime')}</span>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => onChangeReminderTime(e.target.value)}
                className="font-body"
                style={{ fontSize: 14, border: 'none', borderRadius: 8, padding: '4px 8px', background: '#fff', color: '#111' }}
              />
            </div>
          </div>

          {alreadyEnabled ? (
            // Already on — a disabled button restating "Enabled" invites a tap that does
            // nothing. A plain Done just closes the sheet, matching how it got opened.
            <button type="button" onClick={() => close(onClose)} className="btn-fill w-full" style={{ height: 52, fontSize: 15 }}>
              {t('common.done')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleToggle()}
              disabled={buttonDisabled}
              className="btn-fill w-full"
              style={{ height: 52, fontSize: 15, opacity: buttonDisabled ? 0.5 : 1 }}
            >
              {t('notificationSettings.enableButton')}
            </button>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
function WateringScheduleSettingsSheet({
  primaryWateringDay, groupWateringDays, customScheduleCount, onChangePrimaryDay, onChangeGroupingStrategy, onRecalculateAll, onClose,
}: {
  primaryWateringDay: number
  groupWateringDays: boolean
  /** Plants currently on a hand-edited schedule — drives whether "recalculate" has anything left to do. */
  customScheduleCount: number
  onChangePrimaryDay: (day: number) => void
  onChangeGroupingStrategy: (groupIntoFewerDays: boolean) => void
  onRecalculateAll: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [showDayPicker, setShowDayPicker] = useState(false)

  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close(action?: () => void) { setOpen(false); setTimeout(() => action?.(), 180) }

  // Nothing left to reconcile once no plant has a hand-edited schedule diverging
  // from the current global settings — stays mounted either way, just disabled.
  const recalculateDisabled = customScheduleCount === 0

  return (
    <>
      {createPortal(
        <>
          <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onClose)} />
          <div className="fixed left-0 right-0 bottom-0 z-[100]">
            <div className={`sheet-panel ${open ? 'is-open' : ''} p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-4`}>
              <div className="flex items-center justify-between">
                <span className="font-heading" style={{ fontSize: 18 }}>{t('scheduleSettings.title')}</span>
                <IconCircleBtn onClick={() => close(onClose)} label={t('common.close')}><IconX size={16} /></IconCircleBtn>
              </div>
              <p className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>{t('scheduleSettings.description')}</p>

              <div className="rounded-2xl overflow-hidden" style={{ background: '#E6E6E6' }}>
                <button
                  type="button"
                  onClick={() => setShowDayPicker(true)}
                  className="flex items-center justify-between w-full px-4 py-3.5"
                  style={{ borderBottom: '1px solid #d8d8d8' }}
                >
                  <span className="font-heading" style={{ fontSize: 15, color: '#111' }}>{t('scheduleSettings.primaryDay')}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-body" style={{ fontSize: 14, color: '#666' }}>{fullDayName(t, primaryWateringDay)}</span>
                    <IconChevronRight size={16} />
                  </span>
                </button>
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="min-w-0 pr-3">
                    <div className="font-heading" style={{ fontSize: 15, color: '#111' }}>{t('scheduleSettings.groupToggle')}</div>
                    <div className="font-body" style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{t('scheduleSettings.groupToggleHint')}</div>
                  </div>
                  <Toggle on={groupWateringDays} onChange={onChangeGroupingStrategy} />
                </div>
              </div>

              {/* Fixed-height slot reserved regardless of content, so this note appearing/disappearing never shifts the layout. */}
              <div style={{ minHeight: 20 }}>
                {customScheduleCount > 0 && (
                  <p className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>
                    {t('scheduleSettings.customScheduleNote', { count: customScheduleCount })}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onRecalculateAll}
                disabled={recalculateDisabled}
                className="btn-fill w-full"
                style={{ height: 52, fontSize: 15, opacity: recalculateDisabled ? 0.5 : 1 }}
              >
                {recalculateDisabled ? t('scheduleSettings.upToDateLabel') : t('scheduleSettings.recalculateButton')}
              </button>
            </div>
          </div>
        </>,
        document.body,
      )}
      {showDayPicker && (
        <DayPickerSheet
          selected={primaryWateringDay}
          onClose={() => setShowDayPicker(false)}
          onSelect={onChangePrimaryDay}
        />
      )}
    </>
  )
}
/**
 * Bottom-sheet presentation of the same 'privacy' document LegalScreen shows
 * full-screen — used from mid-flow capture screens (batch capture, manual
 * add, health/growth scan) so opening it never unmounts the screen underneath
 * and loses in-progress state (photos already picked, a scan already
 * running). Same content source (LEGAL_BLOCKS.privacy + legal.privacy.* i18n
 * keys) as LegalScreen, just re-themed for the light sheet-panel background
 * instead of LegalScreen's dark app-shell.
 */
function PrivacyDetailsSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close() { setOpen(false); setTimeout(onClose, 180) }
  const blocks = LEGAL_BLOCKS.privacy
  return createPortal(
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={close} />
      <div className="fixed left-0 right-0 bottom-0 z-[100]">
        <div className={`sheet-panel ${open ? 'is-open' : ''} p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-3`} style={{ maxHeight: '80vh' }}>
          <div className="flex items-center justify-between shrink-0">
            <span className="font-heading" style={{ fontSize: 18 }}>{t(LEGAL_TITLE_KEYS.privacy)}</span>
            <IconCircleBtn onClick={close} label={t('common.close')}><IconX size={16} /></IconCircleBtn>
          </div>
          <div className="scroll-y flex flex-col gap-3">
            {blocks.map((block, i) =>
              block.type === 'heading' ? (
                <span key={i} className="font-heading" style={{ fontSize: 13, color: 'var(--color-ink-dim)', textTransform: 'uppercase', marginTop: i === 0 ? 0 : 8 }}>
                  {t(`legal.privacy.${block.key}`)}
                </span>
              ) : (
                <p key={i} className="font-body" style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>
                  {t(`legal.privacy.${block.key}`)}
                </p>
              ),
            )}
            <button
              type="button"
              onClick={() => window.open(PRIVACY_POLICY_URL, '_blank')}
              className="font-body text-left"
              style={{ fontSize: 13, color: 'var(--color-ink-dim)', textDecoration: 'underline' }}
            >
              {t('legal.viewOnWebsite')}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
// ─── Monetization: Limit reached / Pro unlock ─────────────────────────────────

function LimitReachedSheet({ onUnlock, onCancel }: { onUnlock: () => void; onCancel: () => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close(action: () => void) { setOpen(false); setTimeout(action, 180) }
  return createPortal(
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onCancel)} />
      <div className="fixed left-4 right-4 z-[100]" style={{ top: '50%', transform: 'translateY(-50%)' }}>
        <div className={`modal-card ${open ? 'is-open' : ''} p-6 flex flex-col items-center gap-4 text-center`}>
          <div className="flex items-center justify-center rounded-full" style={{ width: 64, height: 64, background: '#f3ecec' }}>
            <IconAlert size={28} />
          </div>
          <h2 className="font-heading" style={{ fontSize: 24, lineHeight: 1.2 }}>{t('limitReached.title', { limit: FREE_PLANT_LIMIT })}</h2>
          <p className="font-body" style={{ fontSize: 14, color: '#666', lineHeight: 1.5 }}>
            {t('limitReached.body')}
          </p>
          <button type="button" onClick={() => close(onUnlock)} className="btn-fill w-full" style={{ height: 52 }}>{t('limitReached.unlockPro')}</button>
          <button type="button" onClick={() => close(onCancel)} className="font-heading w-full" style={{ height: 52, borderRadius: 9999, background: '#E6E6E6', color: '#888' }}>{t('limitReached.cancel')}</button>
        </div>
      </div>
    </>,
    document.body,
  )
}
/** Our own confirmation modal for the destructive "reset all data" action — never window.confirm(), which shows the raw domain in a native WKWebView. */
function ResetDataSheet({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close(action: () => void) { setOpen(false); setTimeout(action, 180) }
  return createPortal(
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onCancel)} />
      <div className="fixed left-4 right-4 z-[100]" style={{ top: '50%', transform: 'translateY(-50%)' }}>
        <div className={`modal-card ${open ? 'is-open' : ''} p-6 flex flex-col items-center gap-4 text-center`}>
          <div className="flex items-center justify-center rounded-full" style={{ width: 64, height: 64, background: '#f3ecec' }}>
            <IconAlert size={28} />
          </div>
          <h2 className="font-heading" style={{ fontSize: 24, lineHeight: 1.2 }}>{t('settings.resetConfirmTitle')}</h2>
          <p className="font-body" style={{ fontSize: 14, color: '#666', lineHeight: 1.5 }}>
            {t('settings.resetConfirmBody')}
          </p>
          <button type="button" onClick={() => close(onConfirm)} className="font-heading w-full" style={{ height: 52, borderRadius: 9999, background: '#FF3B30', color: '#fff' }}>
            {t('settings.resetConfirmButton')}
          </button>
          <button type="button" onClick={() => close(onCancel)} className="font-heading w-full" style={{ height: 52, borderRadius: 9999, background: '#E6E6E6', color: '#888' }}>{t('common.cancel')}</button>
        </div>
      </div>
    </>,
    document.body,
  )
}

// ─── Review / Feedback ─────────────────────────────────────────────────────

/**
 * Two-step satisfaction prompt: a 4-5 star tap goes straight to the store's
 * review page; a 1-3 star tap stays in-app with a short "how can we improve"
 * form instead of sending an unhappy user to leave a public bad review.
 * `onClose` fires for every exit path (backdrop, "not now", after opening the
 * store, after a feedback send) — the caller marks hasSeenReviewPrompt on it
 * unconditionally, since this is a one-time prompt, not a nag-until-rated one.
 */
function ReviewPromptSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'rate' | 'feedback' | 'thanks'>('rate')
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close() { setOpen(false); setTimeout(onClose, 180) }

  function handleRate(stars: number) {
    setRating(stars)
    if (stars >= 4) {
      openStoreReviewPage()
      close()
    } else {
      setStep('feedback')
    }
  }

  async function handleSubmitFeedback() {
    if (!text.trim()) return
    setSending(true)
    setError(null)
    const result = await submitFeedback({ thought: text.trim() })
    setSending(false)
    if (result.ok) {
      setStep('thanks')
      setTimeout(close, 1400)
    } else {
      setError(result.error)
    }
  }

  return createPortal(
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={close} />
      <div className="fixed left-4 right-4 z-[100]" style={{ top: '50%', transform: 'translateY(-50%)' }}>
        <div className={`modal-card ${open ? 'is-open' : ''} p-6 flex flex-col items-center gap-4 text-center`}>
          {step === 'rate' && (
            <>
              <h2 className="font-heading" style={{ fontSize: 20, lineHeight: 1.2 }}>{t('reviewPrompt.title')}</h2>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleRate(n)}
                    aria-label={t('reviewPrompt.starLabel', { count: n })}
                    style={{ color: n <= rating ? '#F5A623' : '#D8D8D8' }}
                  >
                    <IconStar size={32} filled={n <= rating} />
                  </button>
                ))}
              </div>
              <button type="button" onClick={close} className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>{t('reviewPrompt.notNow')}</button>
            </>
          )}
          {step === 'feedback' && (
            <>
              <h2 className="font-heading" style={{ fontSize: 18, lineHeight: 1.3 }}>{t('reviewPrompt.feedbackTitle')}</h2>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder={t('reviewPrompt.feedbackPlaceholder')}
                className="font-body w-full"
                style={{ fontSize: 14, color: '#111', background: '#E6E6E6', borderRadius: 14, border: 'none', padding: 12, resize: 'none' }}
              />
              {error && <p className="font-body" style={{ fontSize: 13, color: '#FF3B30' }}>{error}</p>}
              <button
                type="button"
                onClick={() => void handleSubmitFeedback()}
                disabled={sending || !text.trim()}
                className="btn-fill w-full"
                style={{ height: 52, opacity: sending || !text.trim() ? 0.5 : 1 }}
              >
                {sending ? t('reviewPrompt.sending') : t('reviewPrompt.send')}
              </button>
              <button type="button" onClick={close} className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>{t('common.cancel')}</button>
            </>
          )}
          {step === 'thanks' && (
            <>
              <div className="flex items-center justify-center rounded-full" style={{ width: 64, height: 64, background: '#e8f7ee' }}>
                <div style={{ color: '#0a8f3f' }}><IconCheck size={28} /></div>
              </div>
              <h2 className="font-heading" style={{ fontSize: 18 }}>{t('reviewPrompt.thanksTitle')}</h2>
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}

/** Settings → Contact & Feedback's "Report a bug" / "Suggest a feature" forms — same /api/feedback backend as ReviewPromptSheet, routed into the "issue" (bug) vs. "contact" (feature) field the server already formats separately. */
function FeedbackFormSheet({ mode, onClose }: { mode: 'bug' | 'feature'; onClose: () => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close() { setOpen(false); setTimeout(onClose, 180) }

  async function handleSubmit() {
    if (!text.trim()) return
    setSending(true)
    setError(null)
    const result = await submitFeedback(mode === 'bug' ? { issue: text.trim() } : { contact: text.trim() })
    setSending(false)
    if (result.ok) {
      setSent(true)
      setTimeout(close, 1400)
    } else {
      setError(result.error)
    }
  }

  const title = mode === 'bug' ? t('feedbackForm.bugTitle') : t('feedbackForm.featureTitle')
  const placeholder = mode === 'bug' ? t('feedbackForm.bugPlaceholder') : t('feedbackForm.featurePlaceholder')

  return createPortal(
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={close} />
      <div className="fixed left-0 right-0 bottom-0 z-[100]">
        <div className={`sheet-panel ${open ? 'is-open' : ''} p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-4`}>
          <div className="flex items-center justify-between">
            <span className="font-heading" style={{ fontSize: 18 }}>{title}</span>
            <IconCircleBtn onClick={close} label={t('common.close')}><IconX size={16} /></IconCircleBtn>
          </div>
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex items-center justify-center rounded-full" style={{ width: 56, height: 56, background: '#e8f7ee' }}>
                <div style={{ color: '#0a8f3f' }}><IconCheck size={24} /></div>
              </div>
              <p className="font-body" style={{ fontSize: 14, color: '#444' }}>{t('feedbackForm.sentThanks')}</p>
            </div>
          ) : (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder={placeholder}
                className="font-body w-full"
                style={{ fontSize: 14, color: '#111', background: '#E6E6E6', borderRadius: 14, border: 'none', padding: 12, resize: 'none' }}
              />
              {error && <p className="font-body" style={{ fontSize: 13, color: '#FF3B30' }}>{error}</p>}
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={sending || !text.trim()}
                className="btn-fill w-full"
                style={{ height: 52, opacity: sending || !text.trim() ? 0.5 : 1 }}
              >
                {sending ? t('reviewPrompt.sending') : t('feedbackForm.submit')}
              </button>
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}

export {
  DayPickerSheet,
  ConfirmSheet,
  LanguagePickerSheet,
  NotificationSettingsSheet,
  WateringScheduleSettingsSheet,
  PrivacyDetailsSheet,
  LimitReachedSheet,
  ResetDataSheet,
  ReviewPromptSheet,
  FeedbackFormSheet,
}
