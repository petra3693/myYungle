import type { ComponentType } from 'react'
import { History, Sparkles, Sprout, Stethoscope } from 'lucide-react'
import svgPro from '@/imports/MyjungleProPaywall/svg-frfo2l2sh3'

const GREEN = '#00FF66'
const BG = '#F7F7F7'

export interface ProFeature {
  id: string
  title: string
  description: string
  highlights?: string[]
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  isAiFeature?: boolean
}

export const PRO_FEATURES: ProFeature[] = [
  {
    id: 'unlimited-plants',
    title: 'UNLIMITED PLANTS',
    description: 'No caps on your growing jungle',
    icon: Sprout,
  },
  {
    id: 'growth-history',
    title: 'GROWTH HISTORY & TIMELINE',
    description: 'Visual evolution tracking & side-by-side photo comparison (Before vs. Now)',
    highlights: ['Before vs. Now photos', 'Height timeline', 'Snapshot gallery'],
    icon: History,
  },
  {
    id: 'ai-health-diagnostics',
    title: 'UNLIMITED AI HEALTH DIAGNOSTICS',
    description: 'Instant photo-based disease & pest analysis powered by AI',
    highlights: ['Disease detection', 'Pest identification', 'Treatment suggestions'],
    icon: Stethoscope,
    isAiFeature: true,
  },
  {
    id: 'ai-health-timeline',
    title: 'FULL AI HEALTH HISTORY & PROGRESS TIMELINE',
    description: "Complete, unlimited visual health logging to track your plants' recovery over time",
    highlights: ['Health score tracking', 'Photo timeline', 'Recovery progress'],
    icon: Sparkles,
    isAiFeature: true,
  },
]

function ProFeatureCard({ feature }: { feature: ProFeature }) {
  const Icon = feature.icon
  const isAi = feature.isAiFeature === true

  return (
    <div className={`neo-card relative rounded-2xl w-full ${isAi ? 'pro-feature-ai' : ''}`}>
      <div className="flex items-start gap-3 p-3">
        <div
          className={`relative flex items-center justify-center rounded-full shrink-0 size-9 border-2 border-black ${isAi ? 'pro-feature-ai__icon' : ''}`}
          style={isAi ? undefined : { background: GREEN }}
        >
          {isAi && <span className="pro-feature-ai__icon-shine" aria-hidden />}
          <Icon className="relative size-4 text-black" strokeWidth={2.25} aria-hidden />
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 10, color: '#000', lineHeight: 1.3 }}>
              {feature.title}
            </p>
            {isAi && (
              <span className="pro-feature-ai__badge shrink-0">
                <Sparkles className="size-2.5 text-black" strokeWidth={2.5} aria-hidden />
                AI
              </span>
            )}
          </div>
          <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 500, fontSize: 11, color: isAi ? '#333' : '#888', lineHeight: 1.45 }}>
            {feature.description}
          </p>
          {feature.highlights && feature.highlights.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {feature.highlights.map((highlight) => (
                <span
                  key={highlight}
                  className="neo-pill inline-flex items-center px-2 py-0.5"
                  style={{
                    fontFamily: 'Geist, sans-serif',
                    fontWeight: 600,
                    fontSize: 9,
                    color: '#000',
                    background: isAi ? GREEN : '#EFEFEF',
                    lineHeight: 1.2,
                  }}
                >
                  {highlight}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProScreen({ onUnlock, onClose: _onClose }: { onUnlock: () => void; onClose: () => void }) {
  return (
    <div className="flex flex-col h-full" style={{ background: BG }}>
      <div className="flex-1 overflow-y-auto flex flex-col items-start shrink-0 w-full">
        <div className="h-[180px] relative shrink-0 w-full overflow-clip" style={{ background: GREEN }}>
          <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[160px] top-1/2">
            <svg className="absolute block inset-0 size-full" fill="none" height="160" preserveAspectRatio="none" viewBox="0 0 160 160" width="160">
              <path d={svgPro.p1e4fc7f0} fill="black" stroke="black" strokeLinecap="round" strokeWidth="2" />
            </svg>
          </div>
          <div className="absolute border-black border-b-2 inset-0 pointer-events-none" />
        </div>

        <div className="flex flex-col items-center w-full">
          <div className="flex flex-col gap-2 items-center pb-3 pt-5 px-6 w-full text-center">
            <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 20, color: '#000', lineHeight: 1.2 }}>
              NO SUBSCRIPTIONS. UNLIMITED JUNGLE.
            </p>
            <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 13, color: '#888' }}>
              Unlimited plants, growth tracking, and AI-powered plant health care.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 px-6 w-full shrink-0">
          {PRO_FEATURES.map((feature) => (
            <ProFeatureCard key={feature.id} feature={feature} />
          ))}
        </div>

        <div className="flex flex-col items-center w-full">
          <div className="flex flex-col gap-[10px] items-center px-6 py-5 w-full">
            <button
              type="button"
              onClick={onUnlock}
              className="btn-primary btn-green relative flex items-center justify-center rounded-full shrink-0 w-full cursor-pointer border-2 border-black"
              style={{ background: GREEN, height: 58 }}
            >
              <p style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: 12, color: '#000' }}>
                UNLOCK PRO FOREVER — $5.99
              </p>
            </button>
            <p style={{ fontFamily: 'Geist, sans-serif', fontWeight: 600, fontSize: 11, color: '#000', textAlign: 'center' }}>
              One-time payment. No monthly fees. Yours forever.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
