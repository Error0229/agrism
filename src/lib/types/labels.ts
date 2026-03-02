// Chinese display labels for all v2 enums.
// Import the enum objects from ./enums.ts for type-safe keys.

import type {
  CropCategory,
  CropStage,
  Drainage,
  FacilityType,
  FinanceType,
  PestIncident,
  PestLevel,
  PlantedCropStatus,
  PlotType,
  QualityGrade,
  ResistanceLevel,
  Slope,
  SoilTexture,
  SunHours,
  SunlightLevel,
  TaskDifficulty,
  TaskType,
  UtilityKind,
  WaterLevel,
  WeatherImpact,
  WindExposure,
} from './enums'

export const CROP_CATEGORY_LABELS: Record<CropCategory, string> = {
  leafy_vegetables: '葉菜類',
  gourds_melons: '瓜果類',
  root_vegetables: '根莖類',
  solanaceae: '茄果類',
  aromatics: '辛香料',
  fruits: '水果類',
  legumes: '豆類',
  ornamental: '花草園藝',
  other: '其它類',
}

export const WATER_LEVEL_LABELS: Record<WaterLevel, string> = {
  minimal: '少量',
  moderate: '適量',
  abundant: '大量',
}

export const SUNLIGHT_LEVEL_LABELS: Record<SunlightLevel, string> = {
  full_sun: '全日照',
  partial_shade: '半日照',
  shade_tolerant: '耐陰',
}

export const PEST_LEVEL_LABELS: Record<PestLevel, string> = {
  low: '低',
  medium: '中',
  high: '高',
}

export const RESISTANCE_LEVEL_LABELS: Record<ResistanceLevel, string> = {
  low: '低',
  medium: '中',
  high: '高',
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  seeding: '播種',
  fertilizing: '施肥',
  watering: '澆水',
  pruning: '剪枝',
  harvesting: '收成',
  typhoon_prep: '防颱',
  pest_control: '病蟲害防治',
}

export const TASK_DIFFICULTY_LABELS: Record<TaskDifficulty, string> = {
  low: '簡單',
  medium: '中等',
  high: '困難',
}

export const PLANTED_CROP_STATUS_LABELS: Record<PlantedCropStatus, string> = {
  growing: '生長中',
  harvested: '已收成',
  removed: '已移除',
}

export const PLOT_TYPE_LABELS: Record<PlotType, string> = {
  open_field: '露天田地',
  raised_bed: '高架菜圃',
  container: '容器栽培',
  greenhouse: '溫室',
}

export const SUN_HOURS_LABELS: Record<SunHours, string> = {
  lt4: '少於4小時',
  h4_6: '4-6小時',
  h6_8: '6-8小時',
  gt8: '超過8小時',
}

export const DRAINAGE_LABELS: Record<Drainage, string> = {
  poor: '不良',
  moderate: '普通',
  good: '良好',
}

export const SLOPE_LABELS: Record<Slope, string> = {
  flat: '平坦',
  gentle: '緩坡',
  steep: '陡坡',
}

export const WIND_EXPOSURE_LABELS: Record<WindExposure, string> = {
  sheltered: '避風',
  moderate: '中度',
  exposed: '迎風',
}

export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  water_tank: '水塔',
  motor: '抽水馬達',
  road: '道路',
  tool_shed: '工具間',
  house: '房屋',
  custom: '自訂',
}

export const UTILITY_KIND_LABELS: Record<UtilityKind, string> = {
  water: '水管',
  electric: '電線',
}

export const QUALITY_GRADE_LABELS: Record<QualityGrade, string> = {
  a: 'A級',
  b: 'B級',
  c: 'C級',
  reject: '淘汰',
}

export const PEST_INCIDENT_LABELS: Record<PestIncident, string> = {
  none: '無',
  minor: '輕微',
  moderate: '中度',
  severe: '嚴重',
}

export const WEATHER_IMPACT_LABELS: Record<WeatherImpact, string> = {
  none: '無影響',
  heat: '高溫',
  rain: '降雨',
  wind: '強風',
  cold: '低溫',
  mixed: '混合',
}

export const FINANCE_TYPE_LABELS: Record<FinanceType, string> = {
  income: '收入',
  expense: '支出',
}

export const SOIL_TEXTURE_LABELS: Record<SoilTexture, string> = {
  sand: '砂質',
  loam: '壤土',
  clay: '黏土',
  silty: '粉砂質',
  mixed: '混合',
}

export const CROP_STAGE_LABELS: Record<CropStage, string> = {
  seedling: '幼苗期',
  vegetative: '營養生長期',
  flowering_fruiting: '開花結果期',
  harvest_ready: '採收期',
}
