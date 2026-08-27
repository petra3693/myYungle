import { type LightNeed, type WaterNeed, type WateringFrequency } from '@/types/plant'

type Screen =
  | 'splash'
  | 'onboardingWelcome'
  | 'onboardingCapture'
  | 'main'
  | 'plantDetail'
  | 'manualAdd'
  | 'proUnlock'
  | 'lifetimeOffer'
  | 'bulkAdd'
  | 'batchReview'
  | 'healthFlow'
  | 'legal'
  | 'editPlant'
  | 'growthFlow'
  | 'growthHistory'
type Tab = 'home' | 'days' | 'health' | 'profile'
interface CapturedPhoto { id: string; dataUrl: string }
interface DraftPlant {
  photo: string
  name: string
  room: string
  category: string
  waterNeed: WaterNeed
  lightNeed: LightNeed
  humidityNeed: 'low' | 'normal' | 'high'
  temperatureRangeC: string
  careNote: string
  wateringDays: number[]
  wateringFrequency: WateringFrequency
  wateringCycleAnchor: string | null
  isToxicToPets: boolean | null
  toxicityNotes: string
  confidence: number
  /** false when the AI call failed or errored and this is just a placeholder the user must confirm/rename. */
  identified: boolean
  error?: string
}
interface BatchReviewRow { id: string; draft: DraftPlant }
type OfferingsStatus = 'loading' | 'ready' | 'unavailable'
type SelectablePlan = 'monthly' | 'annual' | 'lifetime'

export type { Screen, Tab, CapturedPhoto, DraftPlant, BatchReviewRow, OfferingsStatus, SelectablePlan }
