import { SunlightLevel, WaterLevel, type Crop, type CropStage, type CustomCrop } from "@/lib/types";

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

function buildDefaultStageProfiles(input: {
  water: Crop["water"];
  fertilizerIntervalDays: number;
  pestSusceptibility: Crop["pestSusceptibility"];
}): Crop["stageProfiles"] {
  const baseFertilizer = Math.max(1, input.fertilizerIntervalDays);

  return {
    seedling: {
      water: input.water === WaterLevel.大量 ? WaterLevel.適量 : input.water,
      fertilizerIntervalDays: baseFertilizer + 7,
      pestRisk: "中",
    },
    vegetative: {
      water: input.water,
      fertilizerIntervalDays: baseFertilizer,
      pestRisk: input.pestSusceptibility,
    },
    flowering_fruiting: {
      water: input.water === WaterLevel.少量 ? WaterLevel.適量 : input.water,
      fertilizerIntervalDays: Math.max(7, baseFertilizer - 3),
      pestRisk: input.pestSusceptibility === "低" ? "中" : input.pestSusceptibility,
    },
    harvest_ready: {
      water: input.water === WaterLevel.大量 ? WaterLevel.適量 : input.water,
      fertilizerIntervalDays: baseFertilizer + 10,
      pestRisk: input.pestSusceptibility === "高" ? "中" : "低",
    },
  };
}

function asStageProfiles(value: unknown, fallback: Crop["stageProfiles"]): Crop["stageProfiles"] {
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Record<string, unknown>;
  const output: Crop["stageProfiles"] = {};

  const stages: CropStage[] = ["seedling", "vegetative", "flowering_fruiting", "harvest_ready"];
  for (const stage of stages) {
    const stageValue = raw[stage];
    if (!stageValue || typeof stageValue !== "object") {
      output[stage] = fallback[stage];
      continue;
    }

    const profile = stageValue as Record<string, unknown>;
    output[stage] = {
      water: asWaterLevel(profile.water),
      fertilizerIntervalDays: Math.max(
        1,
        asNumber(profile.fertilizerIntervalDays, fallback[stage]?.fertilizerIntervalDays ?? 14)
      ),
      pestRisk:
        profile.pestRisk === "低" || profile.pestRisk === "中" || profile.pestRisk === "高"
          ? profile.pestRisk
          : fallback[stage]?.pestRisk ?? "中",
    };
  }

  return output;
}

export function normalizeCrop(input: CropInput): Crop {
  const raw = input as Record<string, unknown>;
  const spacing = (raw.spacing ?? {}) as Record<string, unknown>;
  const temperatureRange = (raw.temperatureRange ?? {}) as Record<string, unknown>;
  const soilPhRange = (raw.soilPhRange ?? {}) as Record<string, unknown>;

  const fertilizerIntervalDays = Math.max(1, asNumber(raw.fertilizerIntervalDays, 14));
  const pestSusceptibility = asPestSusceptibility(raw.pestSusceptibility);
  const water = asWaterLevel(raw.water);
  const defaultStageProfiles = buildDefaultStageProfiles({
    water,
    fertilizerIntervalDays,
    pestSusceptibility,
  });

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
    water,
    sunlight: asSunlightLevel(raw.sunlight),
    temperatureRange: {
      min: asNumber(temperatureRange.min, 18),
      max: asNumber(temperatureRange.max, 30),
    },
    soilPhRange: {
      min: asNumber(soilPhRange.min, 5.8),
      max: asNumber(soilPhRange.max, 6.8),
    },
    pestSusceptibility,
    yieldEstimateKgPerSqm: Math.max(0, asNumber(raw.yieldEstimateKgPerSqm, 2.5)),
    stageProfiles: asStageProfiles(raw.stageProfiles, defaultStageProfiles),
    fertilizerIntervalDays,
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
