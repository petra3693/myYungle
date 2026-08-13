import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import svgPaths from '@/imports/NewDesign2-1/svg-cm3nd9oy62'

type WateringBannerProps = {
  count: number
}

function BannerDropIcon() {
  return (
    <svg className="block" fill="none" height="88" viewBox="0 0 85 116" width="64" aria-hidden>
      <path d={svgPaths.p1cd02a80} fill="black" stroke="black" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}

function BannerCheckIcon() {
  return (
    <svg className="block" fill="none" height="56" viewBox="0 0 72 56" width="72" aria-hidden>
      <path
        d="M6 28 L26 48 L66 8"
        stroke="#000000"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="7"
      />
    </svg>
  )
}

function BannerAnimatedIcon({ allWatered }: { allWatered: boolean }) {
  const [displayed, setDisplayed] = useState(allWatered)
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle')

  useEffect(() => {
    if (allWatered === displayed) return

    setPhase('exit')
    let enterTimer: number | undefined

    const exitTimer = window.setTimeout(() => {
      setDisplayed(allWatered)
      setPhase('enter')
      enterTimer = window.setTimeout(() => setPhase('idle'), 420)
    }, 220)

    return () => {
      window.clearTimeout(exitTimer)
      if (enterTimer !== undefined) window.clearTimeout(enterTimer)
    }
  }, [allWatered, displayed])

  const animationClass =
    phase === 'exit'
      ? 'watering-banner__icon--exit'
      : phase === 'enter'
        ? 'watering-banner__icon--enter'
        : ''

  return (
    <div className="watering-banner__icon-slot">
      <div className={`watering-banner__icon ${animationClass}`} key={`${displayed}-${phase}`}>
        {displayed ? <BannerCheckIcon /> : <BannerDropIcon />}
      </div>
    </div>
  )
}

function BannerAnimatedText({ count }: { count: number }) {
  const { t } = useTranslation()
  const text =
    count === 0 ? t('home.allPlantsWatered') : t('home.plantsNeedWater', { count })

  return (
    <p key={text} className="watering-banner__text watering-banner__text--enter">
      {text}
    </p>
  )
}

export default function WateringBanner({ count }: WateringBannerProps) {
  const allWatered = count === 0

  return (
    <div className="watering-banner" aria-live="polite" aria-atomic="true" data-state={allWatered ? 'complete' : 'pending'}>
      <BannerAnimatedIcon allWatered={allWatered} />
      <BannerAnimatedText count={count} />
    </div>
  )
}
