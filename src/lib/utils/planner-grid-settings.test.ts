import { describe, expect, it } from "vitest";
import {
  defaultPlannerGridSettings,
  normalizePlannerGridSettings,
} from "@/lib/utils/planner-grid-settings";

describe("normalizePlannerGridSettings", () => {
  it("returns defaults for invalid input", () => {
    expect(normalizePlannerGridSettings(null)).toEqual(defaultPlannerGridSettings);
  });

  it("keeps valid values", () => {
    expect(
      normalizePlannerGridSettings({
        showGrid: false,
        gridSizeMeters: 0.5,
        snapToGrid: false,
      })
    ).toEqual({
      showGrid: false,
      gridSizeMeters: 0.5,
      snapToGrid: false,
    });
  });

  it("falls back for invalid grid size", () => {
    expect(
      normalizePlannerGridSettings({
        showGrid: true,
        gridSizeMeters: 3,
        snapToGrid: true,
      })
    ).toEqual(defaultPlannerGridSettings);
  });
});
