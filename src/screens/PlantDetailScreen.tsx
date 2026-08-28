import PlantPhoto from '@/components/PlantPhoto'
import { canAccessProFeatures, type PaywallSource } from '@/lib/monetization'
import { frequencyLabel } from '@/lib/wateringBatch'
import { GREEN } from '@/screens/shared/constants'
import { computeHealthStatus, daysAgoLabel, healthScoreColor, nextWaterStatus } from '@/screens/shared/helpers'
import { IconAlert, IconCheck, IconChevronDown, IconChevronLeft, IconChevronRight, IconDotsHorizontal, IconDroplet, IconDroplets, IconLock, IconPaw, IconSun, IconThermometer } from '@/screens/shared/icons'
import { ConfirmSheet } from '@/screens/shared/sheets'
import { isLowConfidence } from '@/screens/shared/storage'
import { AiDisclaimerLine, IconCircleBtn } from '@/screens/shared/ui'
import { type Plant, type UserState } from '@/types/plant'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

// ─── Screen: Plant detail ─────────────────────────────────────────────────────

function PlantDetailScreen({
  plant, user, todayIdx, canScan, onBack, onDelete, onWater, onShowPaywall, onRunHealthCheck, onEdit, onLogGrowth, onViewTimeline,
}: {
  plant: Plant; user: UserState; todayIdx: number; canScan: boolean; onBack: () => void; onDelete: () => void; onWater: () => void
  onShowPaywall: (source: PaywallSource) => void; onRunHealthCheck: () => void; onEdit: () => void; onLogGrowth: () => void
  onViewTimeline: () => void
}) {
  const { t } = useTranslation()
  const [showActions, setShowActions] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const hasAccess = canAccessProFeatures(user)
  const wateringFrequencyLabel = frequencyLabel(plant.wateringFrequency, plant.wateringDays.length, t)
  const health = computeHealthStatus(plant, todayIdx, t)
  /**
   * healthScoreColor()'s "good" tier is the lime brand color (GREEN) — reads
   * fine as a background fill or a small decorative dot, but as body TEXT on
   * this screen's white card it fails contrast badly. #065f46 (Tailwind
   * emerald-800) keeps the same green association at ~7.9:1 against white,
   * clearing WCAG AAA for normal text. Only overrides the "good" tier —
   * healthScoreColor()'s amber/red tiers are unchanged.
   */
  const healthScoreTextColor = (score: number) => (score >= 70 ? '#065f46' : healthScoreColor(score))
  const lowConfidenceId = isLowConfidence(plant.confidence)
  const toxicityUncertain = plant.isToxicToPets === null || lowConfidenceId

  return (
    <div className="app-shell fixed inset-0 flex flex-col">
      <div className="flex items-center justify-between px-5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-3 shrink-0">
        <IconCircleBtn onClick={onBack} label={t('common.back')}><IconChevronLeft /></IconCircleBtn>
        <span className="font-heading truncate px-2" style={{ fontSize: 16, color: '#fff', textTransform: 'uppercase' }}>{t('plantDetail.title')}</span>
        <IconCircleBtn onClick={() => setShowActions(true)} label={t('common.moreOptions')}><IconDotsHorizontal /></IconCircleBtn>
      </div>
      <div className="scroll-y flex-1 pb-32">
        <div className="px-5" style={{ height: 220 }}>
          <div className="rounded-[1.5rem] overflow-hidden w-full h-full">
            <PlantPhoto photo={plant.photo} alt={plant.name} className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="sheet-body p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-heading" style={{ fontSize: 30 }}>{plant.name}</div>
              {plant.category && (
                <span className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>{plant.category}</span>
              )}
            </div>
            {hasAccess && (
              <span className="badge-pro-dark shrink-0" style={{ fontSize: 11, padding: '3px 10px' }}>PRO</span>
            )}
          </div>
          {lowConfidenceId && (
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 self-start"
              style={{ color: 'var(--color-ink-dim)' }}
            >
              <IconAlert size={13} />
              <span className="font-body" style={{ fontSize: 13, textDecoration: 'underline' }}>{t('plantDetail.verifyName')}</span>
            </button>
          )}
          {toxicityUncertain ? (
            <div className="flex items-center gap-2 rounded-full px-4 py-3" style={{ background: '#f3ecec' }}>
              <IconAlert size={18} />
              <span className="font-body font-medium flex-1 min-w-0" style={{ fontSize: 13 }}>{t('plantDetail.toxicityUnknown')}</span>
              <button
                type="button"
                onClick={onEdit}
                className="font-body font-medium shrink-0"
                style={{ fontSize: 13, textDecoration: 'underline' }}
              >
                {t('plantDetail.verifyName')}
              </button>
            </div>
          ) : plant.isToxicToPets === true ? (
            <div className="flex items-center gap-2 rounded-full px-4 py-3" style={{ background: '#f3ecec' }}>
              <IconAlert size={18} />
              <span className="font-body font-medium" style={{ fontSize: 13 }}>{t('plantDetail.toxicToPets')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-full px-4 py-3" style={{ background: '#e8f9ee' }}>
              <IconPaw size={18} />
              <span className="font-body font-medium" style={{ fontSize: 13 }}>{t('plantDetail.petSafe')}</span>
            </div>
          )}

          <div>
            {plant.healthLogs[0] ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="caption-eyebrow" style={{ color: 'var(--color-ink-dim)' }}>{t('plantDetail.healthScoreAi')}</span>
                  <span className="font-body font-semibold" style={{ fontSize: 13, color: healthScoreTextColor(plant.healthLogs[0].healthScore) }}>
                    {plant.healthLogs[0].healthScore}% {plant.healthLogs[0].diagnosis}
                  </span>
                </div>
                <div style={{ height: 10, borderRadius: 9999, background: '#E6E6E6', overflow: 'hidden' }}>
                  <div style={{ width: `${plant.healthLogs[0].healthScore}%`, height: '100%', background: healthScoreColor(plant.healthLogs[0].healthScore), borderRadius: 9999 }} />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="font-body" style={{ fontSize: 11, color: 'var(--color-ink-dim)' }}>{t('plantDetail.wateringRhythm')}</span>
                  <span className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>{health.score}% {health.label}</span>
                </div>
                <div className="mt-2">
                  <AiDisclaimerLine color="var(--color-ink-dim)" />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="caption-eyebrow" style={{ color: 'var(--color-ink-dim)' }}>{t('plantDetail.wateringRhythm')}</span>
                  <span className="font-body font-bold" style={{ fontSize: 13, color: '#000' }}>{health.score}% {health.label}</span>
                </div>
                <div style={{ height: 10, borderRadius: 9999, background: '#E6E6E6', overflow: 'hidden' }}>
                  <div style={{ width: `${health.score}%`, height: '100%', background: GREEN, borderRadius: 9999 }} />
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-full p-4 flex items-center gap-3" style={{ background: '#E6E6E6' }}>
              <div style={{ color: '#000' }}><IconDroplet size={18} /></div>
              <div className="flex flex-col min-w-0">
                <span className="font-heading" style={{ fontSize: 13, color: '#000', lineHeight: 1.2 }}>{t('plantDetail.waterFrequency', { frequency: wateringFrequencyLabel })}</span>
                <span className="font-body truncate" style={{ fontSize: 11, color: 'var(--color-ink-dim)' }}>{t('plantDetail.soilHydration')}</span>
              </div>
            </div>
            <div className="rounded-full p-4 flex items-center gap-3" style={{ background: '#E6E6E6' }}>
              <div style={{ color: '#000' }}><IconSun size={18} /></div>
              <div className="flex flex-col min-w-0">
                <span className="font-heading" style={{ fontSize: 13, color: '#000', lineHeight: 1.2 }}>{plant.lightNeed === 'High' ? t('plantDetail.lightDirect') : plant.lightNeed === 'Low' ? t('plantDetail.lightShade') : t('plantDetail.lightIndirect')}</span>
                <span className="font-body truncate" style={{ fontSize: 11, color: 'var(--color-ink-dim)' }}>{t('plantDetail.brightFiltered')}</span>
              </div>
            </div>
            <div className="rounded-full p-4 flex items-center gap-3" style={{ background: '#E6E6E6' }}>
              <div style={{ color: '#000' }}><IconThermometer size={18} /></div>
              <div className="flex flex-col min-w-0">
                <span className="font-heading" style={{ fontSize: 13, color: '#000', lineHeight: 1.2 }}>{t('plantDetail.temp', { range: plant.temperatureRangeC ?? '18-27°C' })}</span>
                <span className="font-body truncate" style={{ fontSize: 11, color: 'var(--color-ink-dim)' }}>{t('plantDetail.keepStable')}</span>
              </div>
            </div>
            <div className="rounded-full p-4 flex items-center gap-3" style={{ background: '#E6E6E6' }}>
              <div style={{ color: '#000' }}><IconDroplets size={18} /></div>
              <div className="flex flex-col min-w-0">
                <span className="font-heading" style={{ fontSize: 13, color: '#000', lineHeight: 1.2 }}>{plant.humidityNeed === 'high' ? t('plantDetail.humidityHigh') : plant.humidityNeed === 'low' ? t('plantDetail.humidityLow') : t('plantDetail.humidityNormal')}</span>
                <span className="font-body truncate" style={{ fontSize: 11, color: 'var(--color-ink-dim)' }}>{t('plantDetail.mistRegularly')}</span>
              </div>
            </div>
          </div>

          <div>
            <span className="caption-eyebrow" style={{ color: 'var(--color-ink-dim)' }}>{t('plantDetail.wateringTimeline')}</span>
            <div className="flex items-center gap-2 mt-2">
              <span className="font-heading" style={{ fontSize: 11, background: '#000', color: GREEN, borderRadius: 8, padding: '4px 8px', textTransform: 'uppercase' }}>
                {plant.lastWateredAt ? new Date(plant.lastWateredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}
              </span>
              <div style={{ flex: 1, height: 1, background: '#eee' }} />
              <span className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>
                {plant.lastWateredAt ? t('plantDetail.lastWatered', { when: daysAgoLabel(plant.lastWateredAt, t) }) : nextWaterStatus(plant, todayIdx, t).label}
              </span>
            </div>
          </div>

          <div>
            <span className="caption-eyebrow" style={{ color: 'var(--color-ink-dim)' }}>{t('plantDetail.healthLog')}</span>
            {plant.healthLogs.length === 0 ? (
              <p className="font-body mt-2" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>{t('plantDetail.noHealthChecks')}</p>
            ) : (
              <div className="flex flex-col gap-2 mt-2">
                {plant.healthLogs.map((log) => {
                  const healthy = log.healthScore >= 70
                  const isOpen = expandedLog === log.id
                  return (
                    <div key={log.id} className="rounded-2xl overflow-hidden" style={{ background: '#E6E6E6' }}>
                      <button
                        type="button"
                        onClick={() => setExpandedLog(isOpen ? null : log.id)}
                        className="flex items-center gap-3 w-full p-3 text-left"
                      >
                        <span className="font-heading shrink-0" style={{ fontSize: 11, background: GREEN, color: '#000', borderRadius: 8, padding: '4px 8px' }}>
                          {new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
                        </span>
                        <span style={{ width: 6, height: 6, borderRadius: 9999, background: healthScoreColor(log.healthScore), flexShrink: 0 }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-heading truncate" style={{ fontSize: 14 }}>{log.diagnosis}</div>
                          <div className="font-body truncate" style={{ fontSize: 13, color: healthy ? '#0a8f3f' : 'var(--color-ink-dim)' }}>
                            {healthy ? t('plantDetail.healthy') : log.treatmentNotes}
                          </div>
                        </div>
                        <div style={{ color: 'var(--color-ink-dim)', transform: isOpen ? 'rotate(180deg)' : 'none' }}><IconChevronDown size={16} /></div>
                      </button>
                      {isOpen && (
                        <div className="px-3 pb-3 flex flex-col gap-1.5">
                          {log.recommendedActions.map((a, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <div style={{ color: '#111', marginTop: 2 }}><IconCheck size={14} /></div>
                              <span className="font-body" style={{ fontSize: 13 }}>{a}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <button
              type="button"
              onClick={canScan ? onRunHealthCheck : () => onShowPaywall('health_scan')}
              className="font-heading w-full mt-3 flex items-center justify-center gap-2"
              style={{ height: 48, borderRadius: 9999, background: 'transparent', border: `1.5px solid ${GREEN}`, color: '#0a8f3f', textTransform: 'uppercase', fontSize: 13 }}
            >
              {!canScan && <IconLock size={14} />}
              {t('plantDetail.runNewHealthCheck')}
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="caption-eyebrow" style={{ color: 'var(--color-ink-dim)' }}>{t('plantDetail.growHistory')}</span>
              {!hasAccess && (
                <span className="badge-pro-dark" style={{ fontSize: 11, padding: '3px 10px' }}>PRO</span>
              )}
            </div>
            <div style={{ position: 'relative', minHeight: hasAccess ? undefined : 96 }}>
              <div style={hasAccess ? undefined : { filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' }}>
                {plant.history.length === 0 ? (
                  <p className="font-body mt-2" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>{t('plantDetail.noGrowthCheckins')}</p>
                ) : (
                  <div className="flex flex-col gap-2 mt-2">
                    {plant.history.slice(0, 2).map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: '#E6E6E6' }}>
                        <PlantPhoto photo={entry.photo} alt="" className="rounded-xl object-cover shrink-0 w-12 h-12" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-heading shrink-0" style={{ fontSize: 11, background: GREEN, color: '#000', borderRadius: 8, padding: '3px 7px' }}>
                              {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
                            </span>
                            {entry.heightCm !== undefined && entry.heightCm > 0 && (
                              <span className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>{entry.heightCm} cm</span>
                            )}
                            {entry.estimatedAge && (
                              <span className="font-body" style={{ fontSize: 13, color: 'var(--color-ink-dim)' }}>· {entry.estimatedAge}</span>
                            )}
                          </div>
                          <div className="font-body truncate mt-0.5" style={{ fontSize: 13, color: '#555' }}>{entry.note}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {hasAccess && plant.history.length > 0 && (
                  <button
                    type="button"
                    onClick={onViewTimeline}
                    className="font-heading flex items-center gap-1 mt-3"
                    style={{ fontSize: 13, color: '#111', textTransform: 'uppercase' }}
                  >
                    {t('plantDetail.viewFullTimeline')}
                    <IconChevronRight size={14} />
                  </button>
                )}
                {hasAccess && (
                  <button
                    type="button"
                    onClick={onLogGrowth}
                    className="font-heading w-full mt-3"
                    style={{ height: 48, borderRadius: 9999, background: 'transparent', border: '1.5px solid #111', color: '#111', textTransform: 'uppercase', fontSize: 13 }}
                  >
                    {t('plantDetail.newGrowthScan')}
                  </button>
                )}
              </div>
              {!hasAccess && (
                <button
                  type="button"
                  onClick={() => onShowPaywall('growth_tab')}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                >
                  <div className="flex items-center justify-center rounded-full" style={{ width: 36, height: 36, background: '#111' }}>
                    <div style={{ color: GREEN }}><IconLock size={16} /></div>
                  </div>
                  <span className="font-heading" style={{ fontSize: 13, color: '#111', textTransform: 'uppercase' }}>{t('plantDetail.unlockWithPro')}</span>
                </button>
              )}
            </div>
          </div>

          <button type="button" onClick={onWater} className="btn-fill w-full" style={{ height: 52, fontSize: 15 }}>
            {plant.isWateredToday ? t('plantDetail.watered') : t('plantDetail.waterNow')}
          </button>
        </div>
      </div>
      {showActions && createPortal(
        <>
          <div className="sheet-backdrop is-open" onClick={() => setShowActions(false)} />
          <div className="fixed left-0 right-0 bottom-0 z-[70]">
            <div className="sheet-panel is-open p-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-1">
              <button
                type="button"
                onClick={() => { setShowActions(false); onEdit() }}
                className="font-heading text-left px-4 py-4"
                style={{ fontSize: 16 }}
              >
                {t('plantDetail.editPlant')}
              </button>
              <button
                type="button"
                onClick={() => { setShowActions(false); setShowDelete(true) }}
                className="font-heading text-left px-4 py-4"
                style={{ fontSize: 16, color: '#FF3B30' }}
              >
                {t('plantDetail.deletePlant')}
              </button>
            </div>
          </div>
        </>,
        document.body,
      )}
      {showDelete && (
        <ConfirmSheet
          title={t('plantDetail.deleteTitle')}
          body={t('plantDetail.deleteBody', { name: plant.name })}
          confirmLabel={t('common.delete')}
          danger
          onCancel={() => setShowDelete(false)}
          onConfirm={() => { setShowDelete(false); onDelete() }}
        />
      )}
    </div>
  )
}

export default PlantDetailScreen
