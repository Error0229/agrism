import { describe, expect, it } from "vitest";
import { CropCategory, type PlantedCrop } from "@/lib/types";
import {
  getLinkedUtilitySummary,
  getPlantedCropDisplayLabel,
  normalizeFacilityName,
  normalizeFacilityType,
  normalizeLinkedUtilityNodeIds,
  normalizePlantedCropFacilityMetadata,
} from "@/lib/utils/facility-metadata";

function planted(overrides?: Partial<PlantedCrop>): PlantedCrop {
  return {
    id: "pc-1",
    cropId: "crop-1",
    fieldId: "field-1",
    plantedDate: "2026-02-01T00:00:00.000Z",
    status: "growing",
    position: { x: 10, y: 10 },
    size: { width: 50, height: 50 },
    ...overrides,
  };
}

describe("facility metadata normalization", () => {
  it("drops facility fields for non-infrastructure categories", () => {
    const normalized = normalizePlantedCropFacilityMetadata(
      planted({ facilityType: "road", facilityName: "南側道路" }),
      CropCategory.葉菜類
    );
    expect("facilityType" in normalized).toBe(false);
    expect("facilityName" in normalized).toBe(false);
  });

  it("keeps valid facility fields for infrastructure categories", () => {
    const normalized = normalizePlantedCropFacilityMetadata(
      planted({ facilityType: "water_tank", facilityName: "  北側蓄水池  " }),
      CropCategory.其它類
    );
    expect(normalized.facilityType).toBe("water_tank");
    expect(normalized.facilityName).toBe("北側蓄水池");
  });

  it("keeps sanitized facility fields when category is unknown", () => {
    const normalized = normalizePlantedCropFacilityMetadata(
      planted({ facilityType: "custom", facilityName: "  臨時設施  ", linkedUtilityNodeIds: ["n1", "n1", "  ", "n2"] }),
      undefined
    );
    expect(normalized.facilityType).toBe("custom");
    expect(normalized.facilityName).toBe("臨時設施");
    expect(normalized.linkedUtilityNodeIds).toEqual(["n1", "n2"]);
  });

  it("removes invalid facility values", () => {
    expect(normalizeFacilityType("invalid")).toBeUndefined();
    expect(normalizeFacilityName("   ")).toBeUndefined();
  });

  it("filters linked utility ids by validity and node set", () => {
    const valid = new Set(["n1", "n3"]);
    expect(normalizeLinkedUtilityNodeIds(["n1", "n1", "n2", " ", "n3"], valid)).toEqual(["n1", "n3"]);
  });

  it("drops linked utility ids for non-infrastructure categories", () => {
    const normalized = normalizePlantedCropFacilityMetadata(
      planted({ linkedUtilityNodeIds: ["n1", "n2"] }),
      CropCategory.葉菜類,
      new Set(["n1", "n2"])
    );
    expect("linkedUtilityNodeIds" in normalized).toBe(false);
  });
});

describe("facility display label", () => {
  it("prefers custom facility name then facility type label", () => {
    expect(
      getPlantedCropDisplayLabel({ facilityName: "東側馬達區", facilityType: "motor" }, "其它設施", CropCategory.其它類)
    ).toBe("東側馬達區");
    expect(getPlantedCropDisplayLabel({ facilityType: "road" }, "其它設施", CropCategory.其它類)).toBe("道路");
  });

  it("falls back to crop name for non-infrastructure categories", () => {
    expect(getPlantedCropDisplayLabel({ facilityType: "road", facilityName: "A" }, "番茄", CropCategory.茄果類)).toBe("番茄");
  });

  it("formats linked utility summary for infrastructure regions", () => {
    expect(getLinkedUtilitySummary({ linkedUtilityNodeIds: ["n1", "n1", "n2"] }, CropCategory.其它類)).toBe("已連結 2 節點");
    expect(getLinkedUtilitySummary({ linkedUtilityNodeIds: ["n1"] }, CropCategory.茄果類)).toBeNull();
  });
});
