import { describe, expect, it } from "vitest";
import { findNextPlannerPlacement } from "@/lib/utils/planner-placement";

describe("findNextPlannerPlacement", () => {
  it("returns origin on empty field", () => {
    expect(
      findNextPlannerPlacement(
        { width: 200, height: 200 },
        { width: 50, height: 50 },
        []
      )
    ).toEqual({ x: 0, y: 0 });
  });

  it("skips occupied areas", () => {
    const placement = findNextPlannerPlacement(
      { width: 200, height: 200 },
      { width: 50, height: 50 },
      [{ x: 0, y: 0, width: 70, height: 70 }],
      { step: 10, padding: 0 }
    );
    expect(placement.x).toBeGreaterThanOrEqual(70);
    expect(placement.y).toBe(0);
  });

  it("returns lower-right fallback when no slot is available", () => {
    expect(
      findNextPlannerPlacement(
        { width: 100, height: 100 },
        { width: 80, height: 80 },
        [{ x: 0, y: 0, width: 100, height: 100 }]
      )
    ).toEqual({ x: 20, y: 20 });
  });
});
