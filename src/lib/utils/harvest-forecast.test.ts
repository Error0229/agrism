import { describe, expect, it } from "vitest";
import { CropCategory, SunlightLevel, WaterLevel, type Crop } from "@/lib/types";
import { forecastHarvestWindow } from "@/lib/utils/harvest-forecast";

const baseCrop: Crop = {
  id: "crop-1",
  name: "番茄",
  emoji: "🍅",
  color: "#f00",
  schemaVersion: 2,
  category: CropCategory.茄果類,
  plantingMonths: [1, 2, 3],
  harvestMonths: [4, 5, 6],
  growthDays: 90,
  spacing: { row: 60, plant: 40 },
  water: WaterLevel.適量,
  sunlight: SunlightLevel.全日照,
  temperatureRange: { min: 18, max: 30 },
  soilPhRange: { min: 6, max: 7 },
  pestSusceptibility: "低",
  yieldEstimateKgPerSqm: 3,
  stageProfiles: {
    seedling: { water: WaterLevel.適量, fertilizerIntervalDays: 12, pestRisk: "低" },
    vegetative: { water: WaterLevel.適量, fertilizerIntervalDays: 12, pestRisk: "低" },
  },
  fertilizerIntervalDays: 14,
  needsPruning: false,
  pestControl: [],
  typhoonResistance: "高",
  hualienNotes: "",
};

describe("forecastHarvestWindow", () => {
  it("keeps tighter range under high weather confidence and low agronomic risk", () => {
    const result = forecastHarvestWindow({
      plantedDate: "2026-02-01T00:00:00.000Z",
      growthDays: 90,
      crop: baseCrop,
      weatherSignal: { confidenceLevel: "high", freshnessLabel: "fresh" },
      now: new Date("2026-02-18T00:00:00.000Z"),
    });

    expect(result.uncertaintyDays).toBeLessThanOrEqual(8);
    expect(result.confidenceLevel).toBe("high");
  });

  it("widens range and drops confidence under adverse weather signal and crop risk", () => {
    const risky = { ...baseCrop, pestSusceptibility: "高" as const, typhoonResistance: "低" as const };
    const result = forecastHarvestWindow({
      plantedDate: "2026-02-01T00:00:00.000Z",
      growthDays: 90,
      crop: risky,
      weatherSignal: { confidenceLevel: "low", freshnessLabel: "expired" },
      now: new Date("2026-02-18T00:00:00.000Z"),
    });

    expect(result.uncertaintyDays).toBeGreaterThanOrEqual(16);
    expect(result.confidenceLevel).toBe("low");
  });

  it("degrades gracefully when weather signal is missing", () => {
    const result = forecastHarvestWindow({
      plantedDate: "2026-02-01T00:00:00.000Z",
      growthDays: 90,
      crop: baseCrop,
      weatherSignal: null,
      now: new Date("2026-02-18T00:00:00.000Z"),
    });

    expect(result.uncertaintyDays).toBeGreaterThanOrEqual(10);
    expect(result.factors.some((factor) => factor.includes("天氣信心資料缺失"))).toBe(true);
  });
});
