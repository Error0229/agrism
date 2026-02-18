import { describe, expect, it } from "vitest";
import { normalizeCrop } from "@/lib/data/crop-schema";
import { defaultFieldContext } from "@/lib/utils/field-context";
import { evaluateFieldPlanningRules } from "@/lib/utils/rotation-companion-checker";
import { CropCategory, type Field } from "@/lib/types";

describe("evaluateFieldPlanningRules", () => {
  it("ignores rotation warnings when current crop is infrastructure", () => {
    const tomato = normalizeCrop({
      id: "tomato",
      name: "番茄",
      category: CropCategory.茄果類,
      plantingMonths: [1, 2, 3],
      harvestMonths: [4, 5, 6],
    });
    const facility = normalizeCrop({
      id: "facility-water-tank",
      name: "蓄水池",
      category: CropCategory.其它類,
      plantingMonths: [1, 2, 3],
      harvestMonths: [1, 2, 3],
    });

    const field: Field = {
      id: "field-1",
      name: "後院",
      dimensions: { width: 5, height: 4 },
      context: defaultFieldContext,
      plantedCrops: [
        {
          id: "old-1",
          cropId: tomato.id,
          fieldId: "field-1",
          plantedDate: "2026-01-01T00:00:00.000Z",
          harvestedDate: "2026-01-20T00:00:00.000Z",
          status: "harvested",
          position: { x: 0, y: 0 },
          size: { width: 100, height: 100 },
        },
        {
          id: "current-1",
          cropId: facility.id,
          fieldId: "field-1",
          plantedDate: "2026-02-01T00:00:00.000Z",
          status: "growing",
          position: { x: 120, y: 0 },
          size: { width: 100, height: 100 },
        },
      ],
    };

    const warnings = evaluateFieldPlanningRules(field, [tomato, facility]);
    expect(warnings).toHaveLength(0);
  });
});
