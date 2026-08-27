import { LANGUAGE_OPTIONS, type AppLanguage } from '@/i18n/languages'
import { LEGAL_BLOCKS, LEGAL_TITLE_KEYS } from '@/legal/legalContent'
import { FREE_PLANT_LIMIT } from '@/lib/monetization'
import { checkNotificationPermissionStatus, type NotificationPermissionStatus } from '@/lib/permissions'
import { FULL_DAY_NAMES, GREEN } from '@/screens/shared/constants'
import { fullDayName } from '@/screens/shared/helpers'
import { IconAlert, IconCheck, IconChevronRight, IconX } from '@/screens/shared/icons'
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
  return (
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onClose)} />
      <div className="fixed left-0 right-0 bottom-0 z-[70]">
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
    </>
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
      <div className="fixed left-4 right-4 z-[70]" style={{ top: '50%', transform: 'translateY(-50%)' }}>
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
  return (
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onClose)} />
      <div className="fixed left-0 right-0 bottom-0 z-[70]">
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
    </>
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

  return (
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onClose)} />
      <div className="fixed left-0 right-0 bottom-0 z-[70]">
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

          <button
            type="button"
            onClick={() => void handleToggle()}
            disabled={buttonDisabled}
            className="btn-fill w-full"
            style={{ height: 52, fontSize: 15, opacity: buttonDisabled ? 0.5 : 1 }}
          >
            {alreadyEnabled ? t('notificationSettings.enabledLabel') : t('notificationSettings.enableButton')}
          </button>
        </div>
      </div>
    </>
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
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onClose)} />
      <div className="fixed left-0 right-0 bottom-0 z-[70]">
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
  return (
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={close} />
      <div className="fixed left-0 right-0 bottom-0 z-[70]">
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
          </div>
        </div>
      </div>
    </>
  )
}
// ─── Monetization: Limit reached / Pro unlock ─────────────────────────────────

function LimitReachedSheet({ onUnlock, onCancel }: { onUnlock: () => void; onCancel: () => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close(action: () => void) { setOpen(false); setTimeout(action, 180) }
  return (
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onCancel)} />
      <div className="fixed left-4 right-4 z-[70]" style={{ top: '50%', transform: 'translateY(-50%)' }}>
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
    </>
  )
}
/** Our own confirmation modal for the destructive "reset all data" action — never window.confirm(), which shows the raw domain in a native WKWebView. */
function ResetDataSheet({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  useEffect(() => { const f = requestAnimationFrame(() => setOpen(true)); return () => cancelAnimationFrame(f) }, [])
  function close(action: () => void) { setOpen(false); setTimeout(action, 180) }
  return (
    <>
      <div className={`sheet-backdrop ${open ? 'is-open' : ''}`} onClick={() => close(onCancel)} />
      <div className="fixed left-4 right-4 z-[70]" style={{ top: '50%', transform: 'translateY(-50%)' }}>
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
    </>
  )
}

export { DayPickerSheet, ConfirmSheet, LanguagePickerSheet, NotificationSettingsSheet, WateringScheduleSettingsSheet, PrivacyDetailsSheet, LimitReachedSheet, ResetDataSheet }
