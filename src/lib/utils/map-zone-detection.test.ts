import { describe, expect, it } from "vitest";
import { detectZonesFromImage } from "@/lib/utils/map-zone-detection";
import { defaultFieldContext } from "@/lib/utils/field-context";
import type { Field } from "@/lib/types";

function makeImageData(width: number, height: number, painter: (x: number, y: number) => [number, number, number, number]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const [r, g, b, a] = painter(x, y);
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a;
    }
  }
  return { width, height, data };
}

describe("detectZonesFromImage", () => {
  const field: Field = {
    id: "field-1",
    name: "測試田區",
    dimensions: { width: 4, height: 4 },
    context: defaultFieldContext,
    plantedCrops: [],
    utilityNodes: [],
    utilityEdges: [],
  };

  it("detects dominant color zones and maps to field coordinates", () => {
    const imageData = makeImageData(4, 4, (x) => (x < 2 ? [200, 0, 0, 255] : [0, 200, 0, 255]));
    const zones = detectZonesFromImage(imageData, field, "crop-1");

    expect(zones.length).toBeGreaterThanOrEqual(2);
    expect(zones.every((zone) => zone.cropId === "crop-1")).toBe(true);
    expect(zones.some((zone) => zone.width >= 180)).toBe(true);
  });

  it("applies two-point calibration to convert pixels into scaled centimeters", () => {
    const imageData = makeImageData(10, 2, (x) => (x < 5 ? [200, 0, 0, 255] : [0, 200, 0, 255]));
    const withoutCalibration = detectZonesFromImage(imageData, field, "crop-1");
    const withCalibration = detectZonesFromImage(imageData, field, "crop-1", {
      calibration: {
        pointA: { x: 0, y: 0 },
        pointB: { x: 10, y: 0 },
        distanceMeters: 2,
      },
    });

    const rawWideZone = withoutCalibration.find((zone) => zone.width >= 190);
    const calibratedZone = withCalibration.find((zone) => zone.width >= 90 && zone.width <= 130);

    expect(rawWideZone).toBeDefined();
    expect(calibratedZone).toBeDefined();
  });
});
