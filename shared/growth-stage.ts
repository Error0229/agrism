// shared/growth-stage.ts
// Pure helper functions for growth stage calculation.
// Usable from both Convex backend and frontend (no Convex imports).

/**
 * A single growth stage as stored on the crop record.
 */
export interface GrowthStageEntry {
  stage: string;
  daysFromStart: number;
  careNotes?: string;
  waterFrequencyDays?: number;
  fertilizerFrequencyDays?: number;
}

/**
 * Result of calculating the current growth stage from a planted date + stages array.
 */
export interface GrowthStageResult {
  /** Index into the growthStages array for the current stage */
  currentStageIndex: number;
  /** The current stage entry */
  currentStage: GrowthStageEntry;
  /** Number of days elapsed since planting */
  daysSincePlanting: number;
  /** Number of days remaining in the current stage (0 if in the last stage beyond its start) */
  daysRemainingInStage: number;
  /** Overall progress percentage (0-100) */
  progressPercent: number;
  /** Total growth duration based on the last stage's daysFromStart */
  totalDays: number;
}

/**
 * Calculate the number of whole days between two date strings (YYYY-MM-DD format).
 */
function daysBetween(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr + "T00:00:00");
  const end = new Date(endDateStr + "T00:00:00");
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate which growth stage a crop is currently in based on its planted date
 * and the crop's growthStages array.
 *
 * The growthStages array must be sorted by `daysFromStart` ascending.
 * Each stage begins at its `daysFromStart` and lasts until the next stage's
 * `daysFromStart` (or indefinitely for the last stage).
 *
 * @param plantedDate  The planting date as a YYYY-MM-DD string.
 * @param growthStages The crop's growth stages array (from crop metadata).
 * @param todayStr     Optional: override "today" for testing (YYYY-MM-DD).
 * @returns            The computed stage info, or null if inputs are invalid.
 */
export function calculateGrowthStage(
  plantedDate: string,
  growthStages: GrowthStageEntry[],
  todayStr?: string,
): GrowthStageResult | null {
  if (!plantedDate || !growthStages || growthStages.length === 0) {
    return null;
  }

  const today = todayStr ?? new Date().toISOString().split("T")[0]!;
  const daysSincePlanting = daysBetween(plantedDate, today);

  // If planting is in the future, clamp to 0
  const effectiveDays = Math.max(0, daysSincePlanting);

  // Sort stages by daysFromStart (defensive copy)
  const sorted = [...growthStages].sort((a, b) => a.daysFromStart - b.daysFromStart);

  // Find the current stage: the last stage whose daysFromStart <= effectiveDays
  let currentStageIndex = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i]!.daysFromStart <= effectiveDays) {
      currentStageIndex = i;
      break;
    }
  }

  const currentStage = sorted[currentStageIndex]!;
  const totalDays = sorted[sorted.length - 1]!.daysFromStart;

  // Days remaining in current stage = next stage's daysFromStart - effectiveDays
  // For the last stage, daysRemaining is 0 (or we could show days past it)
  let daysRemainingInStage = 0;
  if (currentStageIndex < sorted.length - 1) {
    const nextStage = sorted[currentStageIndex + 1]!;
    daysRemainingInStage = Math.max(0, nextStage.daysFromStart - effectiveDays);
  }

  // Overall progress: effectiveDays / totalDays * 100, clamped to [0, 100]
  const progressPercent = totalDays > 0
    ? Math.min(100, Math.round((effectiveDays / totalDays) * 100))
    : 100;

  return {
    currentStageIndex,
    currentStage,
    daysSincePlanting: effectiveDays,
    daysRemainingInStage,
    progressPercent,
    totalDays,
  };
}

/**
 * Compute an estimated harvest date from a planted date and growth days.
 *
 * @param plantedDate The planting date as a YYYY-MM-DD string.
 * @param growthDays  Total number of days from planting to harvest.
 * @returns           Estimated harvest date as a YYYY-MM-DD string, or null.
 */
export function estimateHarvestDate(
  plantedDate: string,
  growthDays: number,
): string | null {
  if (!plantedDate || !growthDays || growthDays <= 0) return null;
  const d = new Date(plantedDate + "T00:00:00");
  d.setDate(d.getDate() + growthDays);
  return d.toISOString().split("T")[0]!;
}

/**
 * Alert types for contextual crop alerts.
 */
export interface CropAlert {
  type: "warning" | "critical" | "info" | "positive";
  icon: string;
  message: string;
  detail?: string;
}

/**
 * Compute contextual alerts for a planted crop based on crop metadata and the current date/season.
 *
 * @param crop          The crop metadata object (partial, only relevant fields needed).
 * @param plantedCrop   The planted crop record (partial).
 * @param todayStr      Optional: override "today" for testing (YYYY-MM-DD).
 * @returns             Array of contextual alerts.
 */
export function computeCropAlerts(
  crop: {
    typhoonResistance?: string;
    typhoonPrep?: string;
    criticalDroughtStages?: string[];
    plantingMonths?: number[];
    growthDays?: number;
    growthStages?: GrowthStageEntry[];
  },
  plantedCrop: {
    plantedDate?: string;
    customGrowthDays?: number;
    stage?: string;
  },
  todayStr?: string,
): CropAlert[] {
  const alerts: CropAlert[] = [];
  const today = todayStr ?? new Date().toISOString().split("T")[0]!;
  const currentMonth = new Date(today + "T00:00:00").getMonth() + 1; // 1-12

  // 1. Typhoon season alert (June-October) for crops with low/medium resistance
  if (currentMonth >= 6 && currentMonth <= 10) {
    const resistance = crop.typhoonResistance;
    if (resistance === "low" || resistance === "medium") {
      alerts.push({
        type: resistance === "low" ? "critical" : "warning",
        icon: "wind",
        message: `抗風能力${resistance === "low" ? "低" : "中"}`,
        detail: crop.typhoonPrep || undefined,
      });
    }
  }

  // 2. Current stage is drought-critical
  if (crop.criticalDroughtStages && crop.criticalDroughtStages.length > 0) {
    // Determine current stage name
    let currentStageName = plantedCrop.stage;
    if (!currentStageName && plantedCrop.plantedDate && crop.growthStages) {
      const stageResult = calculateGrowthStage(plantedCrop.plantedDate, crop.growthStages, today);
      if (stageResult) {
        currentStageName = stageResult.currentStage.stage;
      }
    }
    if (currentStageName && crop.criticalDroughtStages.includes(currentStageName)) {
      alerts.push({
        type: "warning",
        icon: "droplets",
        message: "此階段需特別注意水分",
      });
    }
  }

  // 3. Planting month outside optimal range
  if (crop.plantingMonths && crop.plantingMonths.length > 0) {
    if (!crop.plantingMonths.includes(currentMonth)) {
      alerts.push({
        type: "info",
        icon: "calendar-x",
        message: "目前非建議種植月份",
      });
    }
  }

  // 4. Growth stage careNotes
  if (plantedCrop.plantedDate && crop.growthStages) {
    const stageResult = calculateGrowthStage(plantedCrop.plantedDate, crop.growthStages, today);
    if (stageResult?.currentStage.careNotes) {
      alerts.push({
        type: "info",
        icon: "notebook-pen",
        message: stageResult.currentStage.careNotes,
      });
    }
  }

  // 5. Harvest approaching (within 7 days)
  const growthDays = plantedCrop.customGrowthDays ?? crop.growthDays;
  if (plantedCrop.plantedDate && growthDays) {
    const harvestDate = estimateHarvestDate(plantedCrop.plantedDate, growthDays);
    if (harvestDate) {
      const daysToHarvest = daysBetween(today, harvestDate);
      if (daysToHarvest >= 0 && daysToHarvest <= 7) {
        alerts.push({
          type: "positive",
          icon: "target",
          message: daysToHarvest === 0 ? "今天可以採收" : `即將可以採收（${daysToHarvest} 天後）`,
        });
      }
    }
  }

  return alerts;
}

/**
 * Map crop.lifecycleType (string stored on crop) to the plantedCrops lifecycleType union.
 * The crop table stores lifecycleType as a free-form string, while plantedCrops uses
 * a strict union of "seasonal" | "long_cycle" | "perennial" | "orchard".
 * This function maps known values and returns undefined for unknown values.
 */
export function mapCropLifecycleType(
  cropLifecycleType: string | undefined,
): "seasonal" | "long_cycle" | "perennial" | "orchard" | undefined {
  if (!cropLifecycleType) return undefined;

  const VALID_TYPES = ["seasonal", "long_cycle", "perennial", "orchard"] as const;
  type ValidType = (typeof VALID_TYPES)[number];

  // Direct match
  if ((VALID_TYPES as readonly string[]).includes(cropLifecycleType)) {
    return cropLifecycleType as ValidType;
  }

  // Common aliases
  const ALIASES: Record<string, ValidType> = {
    annual: "seasonal",
    biennial: "long_cycle",
  };

  return ALIASES[cropLifecycleType];
}
