import type { DiagnosticQuestion } from '@/types/plant'

export const DIAGNOSTIC_QUESTION_COUNT = 12

export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: 'leafVitality',
    domain: 'foliage',
    label: 'Leaf Vitality',
    description: '1 = Wilted/Dying · 5 = Lush & Vibrant',
    inputType: 'slider',
    weight: 0.1,
  },
  {
    id: 'leafDiscoloration',
    domain: 'foliage',
    label: 'Leaf Discoloration',
    inputType: 'chips',
    weight: 0.1,
  },
  {
    id: 'hasNewGrowth',
    domain: 'foliage',
    label: 'New Growth',
    description: 'Visible new shoots or leaves?',
    inputType: 'conditional',
    weight: 0.08,
  },
  {
    id: 'soilMoistureLevel',
    domain: 'soil',
    label: 'Soil Moisture Level',
    description: '1 = Bone Dry · 3 = Optimal · 5 = Waterlogged',
    inputType: 'slider',
    weight: 0.1,
  },
  {
    id: 'soilSurfaceCondition',
    domain: 'soil',
    label: 'Soil Surface Condition',
    inputType: 'chips',
    weight: 0.07,
  },
  {
    id: 'potDrainageWorking',
    domain: 'soil',
    label: 'Pot Drainage',
    description: 'Are drain holes functioning?',
    inputType: 'boolean',
    weight: 0.05,
  },
  {
    id: 'pestsPresent',
    domain: 'pest',
    label: 'Pest Presence',
    inputType: 'conditional',
    weight: 0.1,
  },
  {
    id: 'fungalRotSigns',
    domain: 'pest',
    label: 'Fungal / Rot Signs',
    inputType: 'boolean',
    weight: 0.1,
  },
  {
    id: 'stemFirmness',
    domain: 'environment',
    label: 'Stem Firmness',
    description: '1 = Mushy/Soft · 4 = Firm/Sturdy',
    inputType: 'slider',
    weight: 0.08,
  },
  {
    id: 'lightStress',
    domain: 'environment',
    label: 'Light Stress',
    inputType: 'chips',
    weight: 0.08,
  },
  {
    id: 'humidityReaction',
    domain: 'environment',
    label: 'Humidity Reaction',
    inputType: 'chips',
    weight: 0.07,
  },
  {
    id: 'rootStability',
    domain: 'environment',
    label: 'Root Stability',
    description: '1 = Loose in pot · 3 = Firmly rooted',
    inputType: 'slider',
    weight: 0.07,
  },
]

export const DOMAIN_LABELS: Record<DiagnosticQuestion['domain'], string> = {
  foliage: 'Foliage & Leaf Health',
  soil: 'Soil & Root System',
  pest: 'Pest & Disease',
  environment: 'Environment & Stress',
}
