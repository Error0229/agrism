import { describe, expect, it } from "vitest";
import {
  applyCropToAllZones,
  applyFacilitySuggestionsToZones,
  detectZonesFromImage,
  inferFacilityNameFromColor,
} from "@/lib/utils/map-zone-detection";
import { defaultFieldContext } from "@/lib/utils/field-context";
import { CropCategory, type Field } from "@/lib/types";

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

describe("map zone assignment helpers", () => {
  it("infers facility names from common colors", () => {
    expect(inferFacilityNameFromColor("#3f77d1")).toBe("蓄水池");
    expect(inferFacilityNameFromColor("#7a7a7a")).toBe("道路");
    expect(inferFacilityNameFromColor("#8f5e45")).toBe("房舍");
    expect(inferFacilityNameFromColor("#2ec95d")).toBeNull();
  });

  it("applies a selected crop to all zones", () => {
    const zones = [
      { id: "z1", color: "#777777", cropId: "a", x: 0, y: 0, width: 10, height: 10 },
      { id: "z2", color: "#3366cc", cropId: "b", x: 10, y: 0, width: 10, height: 10 },
    ];

    const next = applyCropToAllZones(zones, "bulk-id");
    expect(next.every((zone) => zone.cropId === "bulk-id")).toBe(true);
  });

  it("auto-assigns facility crops by zone color when matching crops exist", () => {
    const zones = [
      { id: "z1", color: "#777777", cropId: "keep-1", x: 0, y: 0, width: 10, height: 10 },
      { id: "z2", color: "#3f77d1", cropId: "keep-2", x: 10, y: 0, width: 10, height: 10 },
      { id: "z3", color: "#11cc66", cropId: "keep-3", x: 20, y: 0, width: 10, height: 10 },
    ];
    const crops = [
      { id: "facility-road", name: "道路", category: CropCategory.其它類 },
      { id: "facility-water", name: "蓄水池", category: CropCategory.其它類 },
    ];

    const next = applyFacilitySuggestionsToZones(zones, crops);
    expect(next.find((zone) => zone.id === "z1")?.cropId).toBe("facility-road");
    expect(next.find((zone) => zone.id === "z2")?.cropId).toBe("facility-water");
    expect(next.find((zone) => zone.id === "z3")?.cropId).toBe("keep-3");
  });
});
