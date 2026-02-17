import { SunlightLevel, WaterLevel, type Crop, type CustomCrop } from "@/lib/types";

type CropInput = Partial<Crop> & {
  id: string;
  name: string;
  category: Crop["category"];
};

function asNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asMonthArray(value: unknown, fallback: number[]) {
  if (!Array.isArray(value)) return fallback;
  const months = value
    .map((month) => Number(month))
    .filter((month) => Number.isInteger(month) && month >= 1 && month <= 12);
  return months.length > 0 ? Array.from(new Set(months)).sort((a, b) => a - b) : fallback;
}

function asStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const values = value.map((item) => String(item).trim()).filter(Boolean);
  return values.length > 0 ? values : fallback;
}

function asWaterLevel(value: unknown) {
  return value === WaterLevel.少量 || value === WaterLevel.適量 || value === WaterLevel.大量
    ? value
    : WaterLevel.適量;
}

function asSunlightLevel(value: unknown) {
  return value === SunlightLevel.全日照 || value === SunlightLevel.半日照 || value === SunlightLevel.耐陰
    ? value
    : SunlightLevel.全日照;
}

function asTyphoonResistance(value: unknown): Crop["typhoonResistance"] {
  return value === "低" || value === "中" || value === "高" ? value : "中";
}

function asPestSusceptibility(value: unknown): Crop["pestSusceptibility"] {
  return value === "低" || value === "中" || value === "高" ? value : "中";
}

export function normalizeCrop(input: CropInput): Crop {
  const raw = input as Record<string, unknown>;
  const spacing = (raw.spacing ?? {}) as Record<string, unknown>;
  const temperatureRange = (raw.temperatureRange ?? {}) as Record<string, unknown>;
  const soilPhRange = (raw.soilPhRange ?? {}) as Record<string, unknown>;

  return {
    id: input.id,
    name: input.name,
    emoji: String(raw.emoji ?? "🌱"),
    color: String(raw.color ?? "#16a34a"),
    schemaVersion: 2,
    category: input.category,
    plantingMonths: asMonthArray(raw.plantingMonths, [3, 4, 5]),
    harvestMonths: asMonthArray(raw.harvestMonths, [6, 7, 8]),
    growthDays: Math.max(1, asNumber(raw.growthDays, 90)),
    spacing: {
      row: Math.max(1, asNumber(spacing.row, 50)),
      plant: Math.max(1, asNumber(spacing.plant, 30)),
    },
    water: asWaterLevel(raw.water),
    sunlight: asSunlightLevel(raw.sunlight),
    temperatureRange: {
      min: asNumber(temperatureRange.min, 18),
      max: asNumber(temperatureRange.max, 30),
    },
    soilPhRange: {
      min: asNumber(soilPhRange.min, 5.8),
      max: asNumber(soilPhRange.max, 6.8),
    },
    pestSusceptibility: asPestSusceptibility(raw.pestSusceptibility),
    yieldEstimateKgPerSqm: Math.max(0, asNumber(raw.yieldEstimateKgPerSqm, 2.5)),
    fertilizerIntervalDays: Math.max(1, asNumber(raw.fertilizerIntervalDays, 14)),
    needsPruning: Boolean(raw.needsPruning),
    pruningMonths: Boolean(raw.needsPruning) ? asMonthArray(raw.pruningMonths, [4, 5, 6]) : undefined,
    pestControl: asStringArray(raw.pestControl, ["注意輪作與通風管理"]),
    typhoonResistance: asTyphoonResistance(raw.typhoonResistance),
    hualienNotes: String(raw.hualienNotes ?? "可依花蓮季節降雨與風勢調整管理。"),
  };
}

export function normalizeCustomCrop(input: Partial<CustomCrop> & { id: string; name: string; category: Crop["category"] }): CustomCrop {
  const raw = input as Record<string, unknown>;
  return {
    ...normalizeCrop(input),
    isCustom: true,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    baseCropId: raw.baseCropId ? String(raw.baseCropId) : undefined,
  };
}

