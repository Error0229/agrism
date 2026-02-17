import { describe, expect, it } from "vitest";
import { CropCategory } from "@/lib/types";
import { normalizeCrop } from "@/lib/data/crop-schema";

describe("normalizeCrop", () => {
  it("applies schema v2 defaults for missing fields", () => {
    const crop = normalizeCrop({
      id: "test-crop",
      name: "測試作物",
      category: CropCategory.葉菜類,
    });

    expect(crop.schemaVersion).toBe(2);
    expect(crop.soilPhRange).toEqual({ min: 5.8, max: 6.8 });
    expect(crop.pestSusceptibility).toBe("中");
    expect(crop.yieldEstimateKgPerSqm).toBe(2.5);
    expect(crop.stageProfiles.seedling).toBeDefined();
  });

  it("keeps valid v2 fields when provided", () => {
    const crop = normalizeCrop({
      id: "tomato",
      name: "番茄",
      category: CropCategory.茄果類,
      soilPhRange: { min: 6.2, max: 6.9 },
      pestSusceptibility: "高",
      yieldEstimateKgPerSqm: 4.2,
    });

    expect(crop.soilPhRange).toEqual({ min: 6.2, max: 6.9 });
    expect(crop.pestSusceptibility).toBe("高");
    expect(crop.yieldEstimateKgPerSqm).toBe(4.2);
  });
});

