import { describe, expect, it } from "vitest";
import { mergeCropRegions, splitCropRegion } from "@/lib/utils/region-edit";
import type { PlantedCrop } from "@/lib/types";

function crop(overrides?: Partial<PlantedCrop>): PlantedCrop {
  return {
    id: "pc-1",
    cropId: "crop-1",
    fieldId: "field-1",
    plantedDate: "2026-02-01T00:00:00.000Z",
    status: "growing",
    position: { x: 10, y: 20 },
    size: { width: 80, height: 40 },
    ...overrides,
  };
}

describe("region-edit", () => {
  it("splits region vertically into two halves", () => {
    const split = splitCropRegion(crop(), "vertical");
    expect(split).not.toBeNull();
    expect(split?.[0].width).toBe(40);
    expect(split?.[1].x).toBe(50);
  });

  it("splits region horizontally into two halves", () => {
    const split = splitCropRegion(crop(), "horizontal");
    expect(split).not.toBeNull();
    expect(split?.[0].height).toBe(20);
    expect(split?.[1].y).toBe(40);
  });

  it("merges two regions into union bounding rectangle", () => {
    const merged = mergeCropRegions(crop(), crop({ id: "pc-2", position: { x: 70, y: 30 }, size: { width: 40, height: 30 } }));
    expect(merged).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 40,
    });
  });
});
