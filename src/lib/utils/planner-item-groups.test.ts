import { describe, expect, it } from "vitest";
import type { Crop } from "@/lib/types";
import { CropCategory, SunlightLevel, WaterLevel } from "@/lib/types";
import { splitPlannerItemsByUsage } from "@/lib/utils/planner-item-groups";

function makeCrop(id: string, category: CropCategory): Crop {
  return {
    id,
    name: id,
    emoji: "🌱",
    color: "#22c55e",
    schemaVersion: 2,
    category,
    plantingMonths: [1],
    harvestMonths: [2],
    growthDays: 30,
    spacing: { row: 30, plant: 30 },
    water: WaterLevel.適量,
    sunlight: SunlightLevel.全日照,
    temperatureRange: { min: 15, max: 30 },
    soilPhRange: { min: 6, max: 7 },
    pestSusceptibility: "低",
    yieldEstimateKgPerSqm: 1,
    stageProfiles: {},
    fertilizerIntervalDays: 14,
    needsPruning: false,
    pestControl: [],
    typhoonResistance: "中",
    hualienNotes: "",
  };
}

describe("splitPlannerItemsByUsage", () => {
  it("separates crops and facilities by category", () => {
    const { cropItems, facilityItems } = splitPlannerItemsByUsage([
      makeCrop("tomato", CropCategory.茄果類),
      makeCrop("facility-house", CropCategory.其它類),
      makeCrop("flower", CropCategory.花草園藝),
    ]);

    expect(cropItems.map((item) => item.id)).toEqual(["tomato", "flower"]);
    expect(facilityItems.map((item) => item.id)).toEqual(["facility-house"]);
  });
});
