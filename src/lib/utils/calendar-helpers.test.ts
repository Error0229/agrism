import { describe, expect, it } from "vitest";
import { normalizeCrop } from "@/lib/data/crop-schema";
import { CropCategory } from "@/lib/types";
import { generateTasksForPlantedCrop } from "@/lib/utils/calendar-helpers";

const plantedBase = {
  id: "planted-1",
  cropId: "crop-1",
  fieldId: "field-1",
  plantedDate: "2026-02-01T00:00:00.000Z",
  status: "growing" as const,
  position: { x: 0, y: 0 },
  size: { width: 100, height: 100 },
};

describe("generateTasksForPlantedCrop", () => {
  it("skips task generation for infrastructure category", () => {
    const facility = normalizeCrop({
      id: "facility-road",
      name: "道路",
      category: CropCategory.其它類,
      plantingMonths: [1, 2, 3],
      harvestMonths: [1, 2, 3],
    });

    const tasks = generateTasksForPlantedCrop(facility, {
      ...plantedBase,
      cropId: facility.id,
    });

    expect(tasks).toHaveLength(0);
  });

  it("keeps regular task generation for plant categories", () => {
    const crop = normalizeCrop({
      id: "tomato",
      name: "番茄",
      category: CropCategory.茄果類,
      plantingMonths: [1, 2, 3],
      harvestMonths: [4, 5, 6],
    });

    const tasks = generateTasksForPlantedCrop(crop, {
      ...plantedBase,
      cropId: crop.id,
    });

    expect(tasks.length).toBeGreaterThan(0);
  });
});
