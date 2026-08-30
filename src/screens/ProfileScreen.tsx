import { type AppLanguage } from '@/i18n/languages'
import { type LegalDoc } from '@/legal/legalContent'
import { type ExportResult } from '@/lib/exportData'
import { checkNotificationPermissionStatus, type NotificationPermissionStatus } from '@/lib/permissions'
import { APP_VERSION, GREEN } from '@/screens/shared/constants'
import { fullDayName } from '@/screens/shared/helpers'
import { IconChevronRight, IconDownload, IconMail, IconMessageCircle, IconSparkles, IconStar, IconTrash } from '@/screens/shared/icons'
import { DayPickerSheet } from '@/screens/shared/sheets'
import { Toggle } from '@/screens/shared/ui'
import { type AppSettings, type UserState } from '@/types/plant'
import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

// ─── Screen: Profile ────────────────────────────────────────────────────────

function ProfileScreen({
  settings, user, onSave, onExport, onReset, onShowPro, onOpenLegal, language, onPickLanguage, onChangePrimaryWateringDay, onToggleNotifications,
  onRateApp, onOpenFeedback,
}: {
  settings: AppSettings; user: UserState; onSave: (s: AppSettings) => void
  onExport: () => Promise<ExportResult>; onReset: () => void; onShowPro: () => void; onOpenLegal: (doc: LegalDoc) => void
  language: AppLanguage; onPickLanguage: () => void; onChangePrimaryWateringDay: (day: number) => void
  onToggleNotifications: () => Promise<void>
  onRateApp: () => void
  onOpenFeedback: (mode: 'bug' | 'feature') => void
}) {
  const { t } = useTranslation()
  const [showNotifSettings, setShowNotifSettings] = useState(false)
  const [showDayPicker, setShowDayPicker] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>(
    () => (Capacitor.isNativePlatform() ? 'prompt' : 'unavailable'),
  )

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleExportClick() {
    setExporting(true)
    const result = await onExport()
    setExporting(false)
    showToast(result.ok ? t('settings.exportSuccess') : (result.error || t('settings.exportError')))
  }

  useEffect(() => {
    void checkNotificationPermissionStatus().then(setPermissionStatus)
  }, [])

  function handleExpandNotifSettings() {
    // Expanding this section is just revealing the reminder-time picker — it
    // shouldn't prompt for OS permission on its own. Only actually turning the
    // "Watering reminders" toggle on does that (see handleToggleWateringReminders).
    setShowNotifSettings((v) => !v)
  }

  async function handleToggleWateringReminders() {
    await onToggleNotifications()
    setPermissionStatus(await checkNotificationPermissionStatus())
  }

  return (
    <div className="scroll-y h-full px-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-28">
      <h1 className="font-heading text-center" style={{ fontSize: 22, color: '#fff', textTransform: 'uppercase' }}>{t('settings.title')}</h1>
      {user.isFoundingMember ? (
        <div className="flex items-center justify-center gap-2 mt-5" style={{ height: 52, borderRadius: 9999, background: 'var(--color-surface)' }}>
          <div style={{ color: GREEN }}><IconSparkles size={16} /></div>
          <span className="font-heading" style={{ fontSize: 14, color: '#fff', textTransform: 'uppercase' }}>{t('settings.foundingMember')}</span>
        </div>
      ) : user.subscriptionPlan === 'lifetime' ? (
        <div className="flex items-center justify-center gap-2 mt-5" style={{ height: 52, borderRadius: 9999, background: 'var(--color-surface)' }}>
          <div style={{ color: GREEN }}><IconSparkles size={16} /></div>
          <span className="font-heading" style={{ fontSize: 14, color: '#fff', textTransform: 'uppercase' }}>{t('settings.proLifetime')}</span>
        </div>
      ) : user.isPro ? (
        <button
          type="button"
          onClick={() => { if (user.subscriptionManagementUrl) window.open(user.subscriptionManagementUrl, '_blank') }}
          className="btn-outline-pro w-full flex items-center justify-between gap-2 mt-5 px-5"
          style={{ height: 52 }}
        >
          <span className="flex items-center gap-2">
            <IconSparkles size={16} />
            <span>{t('settings.manageSubscription')}</span>
          </span>
          {user.subscriptionExpiresAt && (
            <span className="font-body" style={{ fontSize: 13, opacity: 0.8 }}>
              {user.subscriptionWillRenew ? t('settings.renews') : t('settings.ends')} {new Date(user.subscriptionExpiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
        </button>
      ) : (
        <button type="button" onClick={onShowPro} className="btn-outline-pro w-full flex items-center justify-center gap-2 mt-5" style={{ height: 52 }}>
          <IconSparkles size={16} />
          <span>{t('settings.unlockPro')}</span>
        </button>
      )}
      <span className="caption-eyebrow block" style={{ color: 'var(--color-ink-dim)', marginBottom: 8, marginTop: 20 }}>{t('settings.sectionConfig')}</span>
      <div className="card-white overflow-hidden">
        <button type="button" onClick={handleExpandNotifSettings} className="flex items-center justify-between w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>{t('settings.notificationPreferences')}</span>
          <span style={{ color: '#111', transform: showNotifSettings ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}><IconChevronRight size={16} /></span>
        </button>
        {showNotifSettings && (
          <div className="px-5 py-4 flex flex-col gap-4" style={{ borderBottom: '1px solid #eee' }}>
            <div className="flex items-center justify-between">
              <span className="font-body" style={{ fontSize: 14, color: '#111' }}>{t('settings.reminderTime')}</span>
              <input
                type="time"
                value={settings.reminderTime}
                onChange={(e) => onSave({ ...settings, reminderTime: e.target.value })}
                className="font-body"
                style={{ fontSize: 14, border: 'none', borderRadius: 8, padding: '4px 8px', background: '#E6E6E6', color: '#111' }}
              />
            </div>
          </div>
        )}
        <div style={{ borderBottom: '1px solid #eee' }}>
          <div className="flex items-center justify-between px-5 py-4">
            <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>{t('settings.wateringReminders')}</span>
            <Toggle on={settings.pushNotifications} onChange={() => void handleToggleWateringReminders()} />
          </div>
          {!settings.pushNotifications && permissionStatus === 'denied' && (
            <p className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)', padding: '0 20px 16px' }}>
              {t('notificationSettings.deniedHint')}
            </p>
          )}
        </div>
        <button type="button" onClick={() => setShowDayPicker(true)} className="flex items-center justify-between w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>{t('settings.wateringDay')}</span>
          <span className="flex items-center gap-1.5">
            <span className="font-body" style={{ fontSize: 14, color: 'var(--color-ink-dim)' }}>{fullDayName(t, settings.primaryWateringDay)}</span>
            <div style={{ color: '#111' }}><IconChevronRight size={16} /></div>
          </span>
        </button>
        <button type="button" onClick={onPickLanguage} className="flex items-center justify-between w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>{t('settings.language')}</span>
          <span className="flex items-center gap-1.5">
            <span className="font-body" style={{ fontSize: 14, color: 'var(--color-ink-dim)' }}>{t(`language.${language}`)}</span>
            <div style={{ color: '#111' }}><IconChevronRight size={16} /></div>
          </span>
        </button>
        <button type="button" onClick={() => void handleExportClick()} disabled={exporting} className="flex items-center gap-3 w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <div style={{ color: '#111' }}><IconDownload size={18} /></div>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>{exporting ? t('settings.exporting') : t('settings.exportData')}</span>
        </button>
        <p className="font-body px-5" style={{ fontSize: 13, color: 'var(--color-ink-dim)', paddingTop: 6, paddingBottom: 10, borderBottom: '1px solid #eee' }}>
          {t('settings.exportPhotosNote')}
        </p>
        <button type="button" onClick={onReset} className="flex items-center gap-3 w-full px-5 py-4" style={{ color: '#FF3B30', borderBottom: '1px solid #eee' }}>
          <IconTrash size={18} />
          <span className="font-heading" style={{ fontSize: 16, color: '#FF3B30' }}>{t('settings.resetData')}</span>
        </button>

        <span className="caption-eyebrow block px-5" style={{ color: 'var(--color-ink-dim)', paddingBottom: 8, paddingTop: 20 }}>{t('settings.sectionSupport')}</span>
        <button type="button" onClick={onRateApp} className="flex items-center gap-3 w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <div style={{ color: '#F5A623' }}><IconStar size={18} filled /></div>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>{t('settings.rateApp')}</span>
        </button>
        <button type="button" onClick={() => onOpenFeedback('bug')} className="flex items-center gap-3 w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <div style={{ color: '#111' }}><IconMessageCircle size={18} /></div>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>{t('settings.reportBug')}</span>
        </button>
        <button type="button" onClick={() => onOpenFeedback('feature')} className="flex items-center gap-3 w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <div style={{ color: '#111' }}><IconSparkles size={18} /></div>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>{t('settings.suggestFeature')}</span>
        </button>
        <a
          href={`mailto:contact@lumenapp.studio?subject=${encodeURIComponent('[myJungle Feedback]')}`}
          className="flex items-center gap-3 w-full px-5 py-4"
          style={{ borderBottom: '1px solid #eee' }}
        >
          <div style={{ color: '#111' }}><IconMail size={18} /></div>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>{t('settings.emailSupport')}</span>
        </a>

        <span className="caption-eyebrow block px-5" style={{ color: 'var(--color-ink-dim)', paddingBottom: 8, paddingTop: 20 }}>{t('settings.sectionLegal')}</span>
        <button type="button" onClick={() => onOpenLegal('terms')} className="flex items-center justify-between w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>{t('settings.termsOfUse')}</span>
          <div style={{ color: '#111' }}><IconChevronRight size={16} /></div>
        </button>
        <button type="button" onClick={() => onOpenLegal('privacy')} className="flex items-center justify-between w-full px-5 py-4" style={{ borderBottom: '1px solid #eee' }}>
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>{t('settings.privacyPolicy')}</span>
          <div style={{ color: '#111' }}><IconChevronRight size={16} /></div>
        </button>
        <button type="button" onClick={() => onOpenLegal('impressum')} className="flex items-center justify-between w-full px-5 py-4">
          <span className="font-heading" style={{ fontSize: 16, color: '#111' }}>{t('settings.impressum')}</span>
          <div style={{ color: '#111' }}><IconChevronRight size={16} /></div>
        </button>
      </div>

      <p className="font-body text-center mt-6" style={{ fontSize: 12, color: '#5a5a5c' }}>
        {t('settings.footer', { year: new Date().getFullYear(), version: APP_VERSION })}
      </p>
      {showDayPicker && (
        <DayPickerSheet
          selected={settings.primaryWateringDay}
          onClose={() => setShowDayPicker(false)}
          onSelect={onChangePrimaryWateringDay}
        />
      )}
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

export default ProfileScreen
