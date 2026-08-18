import type { LightNeed, WaterNeed, WateringFrequency } from '@/types/plant'

export interface CatalogPlant {
  id: string
  name: string
  aliases: string[]
  waterNeed: WaterNeed
  lightNeed: LightNeed
  wateringFrequency: WateringFrequency
  isToxicToPets: boolean | null
  toxicityNotes: string
  careNote: string
}

export const PLANT_CATALOG: CatalogPlant[] = [
  {
    id: 'monstera-deliciosa',
    name: 'Monstera Deliciosa',
    aliases: ['swiss cheese plant', 'split leaf philodendron'],
    waterNeed: 'Moderate',
    lightNeed: 'Medium',
    wateringFrequency: 'weekly',
    isToxicToPets: true,
    toxicityNotes: 'Toxic to cats and dogs if ingested.',
    careNote: 'Bright indirect light. Water when the top 2–3 cm of soil is dry. Likes a well-draining mix.',
  },
  {
    id: 'snake-plant',
    name: 'Snake Plant',
    aliases: ['sansevieria', 'mother in law tongue', 'dracaena trifasciata'],
    waterNeed: 'Light',
    lightNeed: 'Low',
    wateringFrequency: 'biweekly',
    isToxicToPets: true,
    toxicityNotes: 'Mildly toxic to pets if chewed.',
    careNote: 'Very drought tolerant. Use a gritty, well-draining soil and avoid soggy roots.',
  },
  {
    id: 'pothos',
    name: 'Golden Pothos',
    "aliases": ["devil's ivy", "epipremnum", "pothos"],
    waterNeed: 'Moderate',
    lightNeed: 'Medium',
    wateringFrequency: 'weekly',
    isToxicToPets: true,
    toxicityNotes: 'Toxic to cats and dogs if ingested.',
    careNote: 'Water when the top soil dries. Thrives in bright indirect light and standard potting mix.',
  },
  {
    id: 'peace-lily',
    name: 'Peace Lily',
    aliases: ['spathiphyllum'],
    waterNeed: 'Heavy',
    lightNeed: 'Low',
    wateringFrequency: 'weekly',
    isToxicToPets: true,
    toxicityNotes: 'Toxic to cats and dogs if ingested.',
    careNote: 'Keep soil evenly moist. Drooping leaves usually mean it needs water. Prefers rich, airy soil.',
  },
  {
    id: 'zz-plant',
    name: 'ZZ Plant',
    aliases: ['zamioculcas', 'zanzibar gem'],
    waterNeed: 'Light',
    lightNeed: 'Low',
    wateringFrequency: 'biweekly',
    isToxicToPets: true,
    toxicityNotes: 'Toxic to pets if ingested.',
    careNote: 'Water sparingly. Well-draining soil is essential — rhizomes rot if left wet.',
  },
  {
    id: 'fiddle-leaf-fig',
    name: 'Fiddle Leaf Fig',
    aliases: ['ficus lyrata'],
    waterNeed: 'Moderate',
    lightNeed: 'High',
    wateringFrequency: 'weekly',
    isToxicToPets: true,
    toxicityNotes: 'Sap is irritating and toxic to pets.',
    careNote: 'Bright, steady light. Water thoroughly, then let the top soil dry. Use a chunky indoor mix.',
  },
  {
    id: 'aloe-vera',
    name: 'Aloe Vera',
    aliases: ['aloe'],
    waterNeed: 'Light',
    lightNeed: 'High',
    wateringFrequency: 'biweekly',
    isToxicToPets: true,
    toxicityNotes: 'Latex in the plant is toxic to pets.',
    careNote: 'Cactus/succulent soil and lots of sun. Water deeply, then let the soil dry completely.',
  },
  {
    id: 'spider-plant',
    name: 'Spider Plant',
    aliases: ['chlorophytum', 'airplane plant'],
    waterNeed: 'Moderate',
    lightNeed: 'Medium',
    wateringFrequency: 'weekly',
    isToxicToPets: false,
    toxicityNotes: 'Generally considered pet-safe.',
    careNote: 'Bright indirect light. Keep soil lightly moist and well draining.',
  },
  {
    id: 'rubber-plant',
    name: 'Rubber Plant',
    aliases: ['ficus elastica'],
    waterNeed: 'Moderate',
    lightNeed: 'Medium',
    wateringFrequency: 'weekly',
    isToxicToPets: true,
    toxicityNotes: 'Sap is toxic to cats and dogs.',
    careNote: 'Bright indirect light. Water when the top soil is dry. Prefers a chunky, airy mix.',
  },
  {
    id: 'philodendron-heartleaf',
    name: 'Heartleaf Philodendron',
    aliases: ['philodendron hederaceum', 'sweetheart plant'],
    waterNeed: 'Moderate',
    lightNeed: 'Medium',
    wateringFrequency: 'weekly',
    isToxicToPets: true,
    toxicityNotes: 'Toxic to cats and dogs if ingested.',
    careNote: 'Water when the top inch of soil dries. Bright indirect light and a well-draining mix.',
  },
  {
    id: 'calathea',
    name: 'Calathea',
    aliases: ['prayer plant', 'goeppertia'],
    waterNeed: 'Heavy',
    lightNeed: 'Medium',
    wateringFrequency: 'weekly',
    isToxicToPets: false,
    toxicityNotes: 'Generally considered pet-safe.',
    careNote: 'Keep soil evenly moist with filtered water if possible. High humidity and airy soil help.',
  },
  {
    id: 'jade-plant',
    name: 'Jade Plant',
    aliases: ['crassula ovata', 'money plant'],
    waterNeed: 'Light',
    lightNeed: 'High',
    wateringFrequency: 'biweekly',
    isToxicToPets: true,
    toxicityNotes: 'Toxic to cats and dogs if ingested.',
    careNote: 'Succulent soil and bright sun. Water thoroughly, then let it dry out fully.',
  },
  {
    id: 'boston-fern',
    name: 'Boston Fern',
    aliases: ['nephrolepis', 'sword fern'],
    waterNeed: 'Heavy',
    lightNeed: 'Medium',
    wateringFrequency: 'weekly',
    isToxicToPets: false,
    toxicityNotes: 'Generally considered pet-safe.',
    careNote: 'Keep soil consistently moist. Loves humidity and a peat-based mix that never dries out hard.',
  },
  {
    id: 'orchid',
    name: 'Phalaenopsis Orchid',
    aliases: ['moth orchid', 'orchid'],
    waterNeed: 'Light',
    lightNeed: 'Medium',
    wateringFrequency: 'weekly',
    isToxicToPets: false,
    toxicityNotes: 'Generally considered pet-safe.',
    careNote: 'Use bark mix, not regular soil. Water when roots look silvery, then drain fully.',
  },
  {
    id: 'english-ivy',
    name: 'English Ivy',
    aliases: ['hedera helix'],
    waterNeed: 'Moderate',
    lightNeed: 'Medium',
    wateringFrequency: 'weekly',
    isToxicToPets: true,
    toxicityNotes: 'Toxic to cats and dogs if ingested.',
    careNote: 'Even moisture and bright indirect light. Standard potting mix with good drainage.',
  },
  {
    id: 'bird-of-paradise',
    name: 'Bird of Paradise',
    aliases: ['strelitzia'],
    waterNeed: 'Moderate',
    lightNeed: 'High',
    wateringFrequency: 'weekly',
    isToxicToPets: true,
    toxicityNotes: 'Mildly toxic to pets if ingested.',
    careNote: 'Bright light and a rich, well-draining mix. Water when the top soil feels dry.',
  },
  {
    id: 'chinese-evergreen',
    name: 'Chinese Evergreen',
    aliases: ['aglaonema'],
    waterNeed: 'Moderate',
    lightNeed: 'Low',
    wateringFrequency: 'weekly',
    isToxicToPets: true,
    toxicityNotes: 'Toxic to cats and dogs if ingested.',
    careNote: 'Let the top soil dry slightly between waterings. Tolerates lower light and standard mix.',
  },
  {
    id: 'string-of-pearls',
    name: 'String of Pearls',
    aliases: ['senecio rowleyanus', 'curio rowleyanus'],
    waterNeed: 'Light',
    lightNeed: 'High',
    wateringFrequency: 'biweekly',
    isToxicToPets: true,
    toxicityNotes: 'Toxic to pets if ingested.',
    careNote: 'Succulent soil and bright light. Water sparingly — pearls wrinkle when thirsty.',
  },
  {
    id: 'anthurium',
    name: 'Anthurium',
    aliases: ['flamingo flower', 'laceleaf'],
    waterNeed: 'Moderate',
    lightNeed: 'Medium',
    wateringFrequency: 'weekly',
    isToxicToPets: true,
    toxicityNotes: 'Toxic to cats and dogs if ingested.',
    careNote: 'Chunky aroid mix. Keep lightly moist and give bright, indirect light.',
  },
  {
    id: 'dracaena',
    name: 'Dracaena',
    aliases: ['corn plant', 'dragon tree'],
    waterNeed: 'Light',
    lightNeed: 'Medium',
    wateringFrequency: 'biweekly',
    isToxicToPets: true,
    toxicityNotes: 'Toxic to cats and dogs if ingested.',
    careNote: 'Allow soil to dry between waterings. Bright indirect light and well-draining mix.',
  },
]

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase()
}

export function searchPlantCatalog(query: string, limit = 8): CatalogPlant[] {
  const needle = normalizeQuery(query)
  if (needle.length < 1) return PLANT_CATALOG.slice(0, limit)

  const scored = PLANT_CATALOG.map((plant) => {
    const haystack = [plant.name, ...plant.aliases].map(normalizeQuery)
    const exact = haystack.some((text) => text === needle)
    const starts = haystack.some((text) => text.startsWith(needle))
    const includes = haystack.some((text) => text.includes(needle))
    const score = exact ? 3 : starts ? 2 : includes ? 1 : 0
    return { plant, score }
  }).filter((row) => row.score > 0)

  scored.sort((a, b) => b.score - a.score || a.plant.name.localeCompare(b.plant.name))
  return scored.slice(0, limit).map((row) => row.plant)
}
