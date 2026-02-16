export enum CropCategory {
  葉菜類 = "葉菜類",
  瓜果類 = "瓜果類",
  根莖類 = "根莖類",
  茄果類 = "茄果類",
  辛香料 = "辛香料",
  水果類 = "水果類",
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

export interface Crop {
  id: string;
  name: string;
  emoji: string;
  color: string;
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
  fertilizerIntervalDays: number;
  needsPruning: boolean;
  pruningMonths?: number[];
  pestControl: string[];
  typhoonResistance: "低" | "中" | "高";
  hualienNotes: string;
}

export interface PlantedCrop {
  id: string;
  cropId: string;
  fieldId: string;
  plantedDate: string; // ISO date string
  status: "growing" | "harvested" | "removed";
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface Field {
  id: string;
  name: string;
  dimensions: { width: number; height: number }; // 公尺
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
  recurring?: {
    intervalDays: number;
    endDate?: string;
  };
}
