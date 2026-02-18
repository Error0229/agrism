export enum CropCategory {
  葉菜類 = "葉菜類",
  瓜果類 = "瓜果類",
  根莖類 = "根莖類",
  茄果類 = "茄果類",
  辛香料 = "辛香料",
  水果類 = "水果類",
  豆類 = "豆類",
}

export enum WaterLevel {
  少量 = "少量",
  適量 = "適量",
  大量 = "大量",
}

export enum SunlightLevel {
  全日照 = "全日照",
  半日照 = "半日照",
  耐陰 = "耐陰",
}

export enum TaskType {
  播種 = "播種",
  施肥 = "施肥",
  澆水 = "澆水",
  剪枝 = "剪枝",
  收成 = "收成",
  防颱 = "防颱",
  病蟲害防治 = "病蟲害防治",
}

export type TaskDifficulty = "low" | "medium" | "high";

export interface Crop {
  id: string;
  name: string;
  emoji: string;
  color: string;
  schemaVersion: 2;
  category: CropCategory;
  plantingMonths: number[];
  harvestMonths: number[];
  growthDays: number;
  spacing: {
    row: number; // 行距（公分）
    plant: number; // 株距（公分）
  };
  water: WaterLevel;
  sunlight: SunlightLevel;
  temperatureRange: { min: number; max: number };
  soilPhRange: { min: number; max: number };
  pestSusceptibility: "低" | "中" | "高";
  yieldEstimateKgPerSqm: number;
  stageProfiles: Partial<Record<CropStage, CropStageProfile>>;
  fertilizerIntervalDays: number;
  needsPruning: boolean;
  pruningMonths?: number[];
  pestControl: string[];
  typhoonResistance: "低" | "中" | "高";
  hualienNotes: string;
}

export interface CustomCrop extends Crop {
  isCustom: true;
  createdAt: string;
  baseCropId?: string;
}

export interface CropTemplate {
  id: string;
  name: string;
  createdAt: string;
  crops: CustomCrop[];
}

export type CropStage = "seedling" | "vegetative" | "flowering_fruiting" | "harvest_ready";

export interface CropStageProfile {
  water: WaterLevel;
  fertilizerIntervalDays: number;
  pestRisk: "低" | "中" | "高";
}

export interface PlantedCrop {
  id: string;
  cropId: string;
  fieldId: string;
  plantedDate: string; // ISO date string
  harvestedDate?: string; // ISO date string
  status: "growing" | "harvested" | "removed";
  position: { x: number; y: number };
  size: { width: number; height: number };
  customGrowthDays?: number;
  notes?: string;
}

export type FieldPlotType = "open_field" | "raised_bed" | "container" | "greenhouse";
export type FieldSunHours = "lt4" | "h4_6" | "h6_8" | "gt8";
export type FieldDrainage = "poor" | "moderate" | "good";
export type FieldSlope = "flat" | "gentle" | "steep";
export type FieldWindExposure = "sheltered" | "moderate" | "exposed";

export interface FieldContext {
  plotType: FieldPlotType;
  sunHours: FieldSunHours;
  drainage: FieldDrainage;
  slope: FieldSlope;
  windExposure: FieldWindExposure;
}

export interface Field {
  id: string;
  name: string;
  dimensions: { width: number; height: number }; // 公尺
  context: FieldContext;
  plantedCrops: PlantedCrop[];
}

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  cropId: string;
  plantedCropId?: string;
  fieldId?: string;
  dueDate: string; // ISO date string
  completed: boolean;
  effortMinutes?: number;
  difficulty?: TaskDifficulty;
  requiredTools?: string[];
  recurring?: {
    intervalDays: number;
    endDate?: string;
  };
}

export interface HarvestLog {
  id: string;
  plantedCropId?: string;
  fieldId: string;
  cropId: string;
  date: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface FinanceRecord {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  date: string;
  description: string;
  relatedFieldId?: string;
  relatedCropId?: string;
}

export interface SoilNote {
  id: string;
  fieldId: string;
  date: string;
  ph?: number;
  content: string;
}

export type SoilTexture = "sand" | "loam" | "clay" | "silty" | "mixed";

export interface SoilProfile {
  fieldId: string;
  texture: SoilTexture;
  ph: number | null;
  ec: number | null;
  organicMatterPct: number | null;
  updatedAt: string;
}

export interface SoilAmendment {
  id: string;
  fieldId: string;
  date: string;
  amendmentType: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface WeatherLog {
  id: string;
  date: string;
  temperature?: number;
  rainfall?: number;
  condition?: string;
  notes?: string;
}
