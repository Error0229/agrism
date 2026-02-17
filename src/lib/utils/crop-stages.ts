import type { Crop, CropStage, CropStageProfile } from "@/lib/types";

const STAGE_ORDER: CropStage[] = ["seedling", "vegetative", "flowering_fruiting", "harvest_ready"];

function getStageThresholds(growthDays: number) {
  const normalized = Math.max(1, growthDays);
  return {
    seedlingEnd: Math.max(3, Math.floor(normalized * 0.2)),
    vegetativeEnd: Math.max(7, Math.floor(normalized * 0.6)),
    floweringEnd: Math.max(10, Math.floor(normalized * 0.9)),
  };
}

export function getCropStageByElapsedDays(growthDays: number, elapsedDays: number): CropStage {
  const thresholds = getStageThresholds(growthDays);
  const day = Math.max(0, elapsedDays);

  if (day <= thresholds.seedlingEnd) return "seedling";
  if (day <= thresholds.vegetativeEnd) return "vegetative";
  if (day <= thresholds.floweringEnd) return "flowering_fruiting";
  return "harvest_ready";
}

export function getCropStageProfile(crop: Crop, elapsedDays: number): { stage: CropStage; profile: CropStageProfile } {
  const stage = getCropStageByElapsedDays(crop.growthDays, elapsedDays);
  const defaultProfile: CropStageProfile = {
    water: crop.water,
    fertilizerIntervalDays: crop.fertilizerIntervalDays,
    pestRisk: crop.pestSusceptibility,
  };

  return {
    stage,
    profile: crop.stageProfiles[stage] ?? defaultProfile,
  };
}

export function getStageDisplayName(stage: CropStage) {
  const map: Record<CropStage, string> = {
    seedling: "苗期",
    vegetative: "營養生長期",
    flowering_fruiting: "開花結果期",
    harvest_ready: "採收期",
  };
  return map[stage];
}

export { STAGE_ORDER };

