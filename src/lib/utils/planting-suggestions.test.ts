import { describe, expect, it } from "vitest";
import { CropCategory, SunlightLevel, type Field } from "@/lib/types";
import { normalizeCrop } from "@/lib/data/crop-schema";
import { defaultFieldContext } from "@/lib/utils/field-context";
import { generatePlantingSuggestions } from "@/lib/utils/planting-suggestions";

const crop = normalizeCrop({
  id: "tomato",
  name: "番茄",
  category: CropCategory.茄果類,
  sunlight: SunlightLevel.全日照,
  plantingMonths: [2, 3, 4],
  growthDays: 90,
});

const facility = normalizeCrop({
  id: "facility-road",
  name: "道路",
  category: CropCategory.其它類,
  plantingMonths: [1, 2, 3],
  harvestMonths: [1, 2, 3],
  growthDays: 3650,
});

function makeField(sunHours: Field["context"]["sunHours"]): Field {
  return {
    id: "field-1",
    name: "後院",
    dimensions: { width: 5, height: 4 },
    context: { ...defaultFieldContext, sunHours },
    plantedCrops: [
      {
        id: "pc-1",
        cropId: crop.id,
        fieldId: "field-1",
        plantedDate: "2026-02-01T00:00:00.000Z",
        status: "growing",
        position: { x: 0, y: 0 },
        size: { width: 10, height: 10 },
      },
    ],
  };
}

describe("generatePlantingSuggestions field context support", () => {
  it("adds field-context suggestion for sunlight mismatch", () => {
    const suggestions = generatePlantingSuggestions([makeField("lt4")], [crop], 2);
    expect(suggestions.some((item) => item.type === "field-context")).toBe(true);
  });

  it("does not add field-context suggestion when sunlight is compatible", () => {
    const suggestions = generatePlantingSuggestions([makeField("gt8")], [crop], 2);
    expect(suggestions.some((item) => item.type === "field-context")).toBe(false);
  });

  it("adds soil-profile suggestion when soil pH is out of crop range", () => {
    const suggestions = generatePlantingSuggestions([makeField("gt8")], [crop], 2, {
      soilProfilesByFieldId: new Map([
        [
          "field-1",
          {
            fieldId: "field-1",
            texture: "loam",
            ph: 4.5,
            ec: null,
            organicMatterPct: null,
            updatedAt: "2026-02-01T00:00:00.000Z",
          },
        ],
      ]),
    });

    expect(suggestions.some((item) => item.type === "soil-profile")).toBe(true);
  });

  it("does not generate planting suggestions for infrastructure categories", () => {
    const field = {
      ...makeField("gt8"),
      plantedCrops: [
        {
          id: "pc-facility",
          cropId: facility.id,
          fieldId: "field-1",
          plantedDate: "2026-02-01T00:00:00.000Z",
          status: "growing" as const,
          position: { x: 0, y: 0 },
          size: { width: 10, height: 10 },
        },
      ],
    };

    const suggestions = generatePlantingSuggestions([field], [facility], 2);
    expect(suggestions).toHaveLength(0);
  });
});
