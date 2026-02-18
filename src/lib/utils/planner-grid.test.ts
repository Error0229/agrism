import { describe, expect, it } from "vitest";
import { buildPlannerGridLines, snapToGrid } from "@/lib/utils/planner-grid";

describe("buildPlannerGridLines", () => {
  it("builds 1m grid lines with labels", () => {
    const lines = buildPlannerGridLines(3, 2, 100, 1);
    expect(lines.length).toBe(7);
    expect(lines.filter((line) => line.label !== null).length).toBe(7);
  });

  it("builds minor lines for 0.5m grid", () => {
    const lines = buildPlannerGridLines(1, 1, 100, 0.5);
    expect(lines.length).toBe(6);
    expect(lines.filter((line) => line.major).length).toBe(4);
    expect(lines.filter((line) => line.label !== null).length).toBe(4);
  });

  it("includes trailing boundary when size is not divisible", () => {
    const lines = buildPlannerGridLines(2.2, 1.2, 100, 1);
    const verticalMeters = lines.filter((line) => line.orientation === "vertical").map((line) => line.meter);
    const horizontalMeters = lines.filter((line) => line.orientation === "horizontal").map((line) => line.meter);
    expect(verticalMeters).toContain(2.2);
    expect(horizontalMeters).toContain(1.2);
  });
});

describe("snapToGrid", () => {
  it("snaps to nearest step", () => {
    expect(snapToGrid(143, 50, 0)).toBe(150);
  });

  it("clamps at minimum", () => {
    expect(snapToGrid(3, 10, 5)).toBe(5);
  });
});
