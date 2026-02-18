import { describe, expect, it } from "vitest";
import { getCropPolygon, polygonsOverlap, toTrapezoidPoints } from "@/lib/utils/crop-shape";
import type { PlantedCrop } from "@/lib/types";

function planted(overrides?: Partial<PlantedCrop>): PlantedCrop {
  return {
    id: "pc-1",
    cropId: "crop-1",
    fieldId: "field-1",
    plantedDate: "2026-02-01T00:00:00.000Z",
    status: "growing",
    position: { x: 10, y: 10 },
    size: { width: 40, height: 30 },
    ...overrides,
  };
}

describe("crop-shape helpers", () => {
  it("converts legacy rectangle crop to polygon points", () => {
    const points = getCropPolygon(planted());
    expect(points).toHaveLength(4);
    expect(points[0]).toEqual({ x: 10, y: 10 });
    expect(points[2]).toEqual({ x: 50, y: 40 });
  });

  it("detects overlap between polygon regions", () => {
    const first = getCropPolygon(planted());
    const second = getCropPolygon(planted({ position: { x: 35, y: 25 }, size: { width: 30, height: 25 } }));
    const third = getCropPolygon(planted({ position: { x: 100, y: 100 }, size: { width: 20, height: 20 } }));

    expect(polygonsOverlap(first, second)).toBe(true);
    expect(polygonsOverlap(first, third)).toBe(false);
  });

  it("creates trapezoid points for shape conversion", () => {
    const points = toTrapezoidPoints(planted());
    expect(points).toHaveLength(4);
    expect(points[0].y).toBe(points[1].y);
    expect(points[2].y).toBe(points[3].y);
  });
});
