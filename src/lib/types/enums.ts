// v2 enums — English values matching Drizzle pgEnum definitions.
// For Chinese display labels, see ./labels.ts

export const CropCategory = {
  LEAFY_VEGETABLES: 'leafy_vegetables',
  GOURDS_MELONS: 'gourds_melons',
  ROOT_VEGETABLES: 'root_vegetables',
  SOLANACEAE: 'solanaceae',
  AROMATICS: 'aromatics',
  FRUITS: 'fruits',
  LEGUMES: 'legumes',
  ORNAMENTAL: 'ornamental',
  OTHER: 'other',
} as const
export type CropCategory = (typeof CropCategory)[keyof typeof CropCategory]

export const ROTATION_ELIGIBLE_CATEGORIES: CropCategory[] = [
  CropCategory.LEAFY_VEGETABLES,
  CropCategory.GOURDS_MELONS,
  CropCategory.ROOT_VEGETABLES,
  CropCategory.SOLANACEAE,
  CropCategory.AROMATICS,
  CropCategory.FRUITS,
  CropCategory.LEGUMES,
]

export function isRotationEligible(category: CropCategory): boolean {
  return (ROTATION_ELIGIBLE_CATEGORIES as string[]).includes(category)
}

export function isInfrastructureCategory(category: CropCategory): boolean {
  return category === CropCategory.OTHER
}

export const WaterLevel = {
  MINIMAL: 'minimal',
  MODERATE: 'moderate',
  ABUNDANT: 'abundant',
} as const
export type WaterLevel = (typeof WaterLevel)[keyof typeof WaterLevel]

export const SunlightLevel = {
  FULL_SUN: 'full_sun',
  PARTIAL_SHADE: 'partial_shade',
  SHADE_TOLERANT: 'shade_tolerant',
} as const
export type SunlightLevel = (typeof SunlightLevel)[keyof typeof SunlightLevel]

export const PestLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const
export type PestLevel = (typeof PestLevel)[keyof typeof PestLevel]

export const ResistanceLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const
export type ResistanceLevel =
  (typeof ResistanceLevel)[keyof typeof ResistanceLevel]

export const TaskType = {
  SEEDING: 'seeding',
  FERTILIZING: 'fertilizing',
  WATERING: 'watering',
  PRUNING: 'pruning',
  HARVESTING: 'harvesting',
  TYPHOON_PREP: 'typhoon_prep',
  PEST_CONTROL: 'pest_control',
} as const
export type TaskType = (typeof TaskType)[keyof typeof TaskType]

export const TaskDifficulty = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const
export type TaskDifficulty =
  (typeof TaskDifficulty)[keyof typeof TaskDifficulty]

export const PlantedCropStatus = {
  GROWING: 'growing',
  HARVESTED: 'harvested',
  REMOVED: 'removed',
} as const
export type PlantedCropStatus =
  (typeof PlantedCropStatus)[keyof typeof PlantedCropStatus]

export const PlotType = {
  OPEN_FIELD: 'open_field',
  RAISED_BED: 'raised_bed',
  CONTAINER: 'container',
  GREENHOUSE: 'greenhouse',
} as const
export type PlotType = (typeof PlotType)[keyof typeof PlotType]

export const SunHours = {
  LT4: 'lt4',
  H4_6: 'h4_6',
  H6_8: 'h6_8',
  GT8: 'gt8',
} as const
export type SunHours = (typeof SunHours)[keyof typeof SunHours]

export const Drainage = {
  POOR: 'poor',
  MODERATE: 'moderate',
  GOOD: 'good',
} as const
export type Drainage = (typeof Drainage)[keyof typeof Drainage]

export const Slope = {
  FLAT: 'flat',
  GENTLE: 'gentle',
  STEEP: 'steep',
} as const
export type Slope = (typeof Slope)[keyof typeof Slope]

export const WindExposure = {
  SHELTERED: 'sheltered',
  MODERATE: 'moderate',
  EXPOSED: 'exposed',
} as const
export type WindExposure = (typeof WindExposure)[keyof typeof WindExposure]

export const FacilityType = {
  WATER_TANK: 'water_tank',
  MOTOR: 'motor',
  ROAD: 'road',
  TOOL_SHED: 'tool_shed',
  HOUSE: 'house',
  CUSTOM: 'custom',
} as const
export type FacilityType = (typeof FacilityType)[keyof typeof FacilityType]

export const UtilityKind = {
  WATER: 'water',
  ELECTRIC: 'electric',
} as const
export type UtilityKind = (typeof UtilityKind)[keyof typeof UtilityKind]

export const WATER_NODE_TYPES = ['pump', 'tank', 'valve', 'outlet', 'junction'] as const
export type WaterNodeType = (typeof WATER_NODE_TYPES)[number]

export const ELECTRIC_NODE_TYPES = ['panel', 'outlet', 'switch', 'junction'] as const
export type ElectricNodeType = (typeof ELECTRIC_NODE_TYPES)[number]

export type UtilityNodeType = WaterNodeType | ElectricNodeType

export const QualityGrade = {
  A: 'a',
  B: 'b',
  C: 'c',
  REJECT: 'reject',
} as const
export type QualityGrade = (typeof QualityGrade)[keyof typeof QualityGrade]

export const PestIncident = {
  NONE: 'none',
  MINOR: 'minor',
  MODERATE: 'moderate',
  SEVERE: 'severe',
} as const
export type PestIncident = (typeof PestIncident)[keyof typeof PestIncident]

export const WeatherImpact = {
  NONE: 'none',
  HEAT: 'heat',
  RAIN: 'rain',
  WIND: 'wind',
  COLD: 'cold',
  MIXED: 'mixed',
} as const
export type WeatherImpact = (typeof WeatherImpact)[keyof typeof WeatherImpact]

export const FinanceType = {
  INCOME: 'income',
  EXPENSE: 'expense',
} as const
export type FinanceType = (typeof FinanceType)[keyof typeof FinanceType]

export const SoilTexture = {
  SAND: 'sand',
  LOAM: 'loam',
  CLAY: 'clay',
  SILTY: 'silty',
  MIXED: 'mixed',
} as const
export type SoilTexture = (typeof SoilTexture)[keyof typeof SoilTexture]

export const CropStage = {
  SEEDLING: 'seedling',
  VEGETATIVE: 'vegetative',
  FLOWERING_FRUITING: 'flowering_fruiting',
  HARVEST_READY: 'harvest_ready',
} as const
export type CropStage = (typeof CropStage)[keyof typeof CropStage]
