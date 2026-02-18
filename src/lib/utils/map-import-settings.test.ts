import { describe, expect, it } from "vitest";
import {
  defaultCalibrationDistance,
  normalizeCalibrationDistanceStored,
  parseCalibrationDistanceMeters,
} from "@/lib/utils/map-import-settings";

describe("map import calibration distance settings", () => {
  it("parses positive number strings", () => {
    expect(parseCalibrationDistanceMeters("5")).toBe(5);
    expect(parseCalibrationDistanceMeters("2.5")).toBe(2.5);
  });

  it("returns null for invalid calibration strings", () => {
    expect(parseCalibrationDistanceMeters("0")).toBeNull();
    expect(parseCalibrationDistanceMeters("-3")).toBeNull();
    expect(parseCalibrationDistanceMeters("abc")).toBeNull();
  });

  it("normalizes invalid stored values to default", () => {
    expect(normalizeCalibrationDistanceStored("abc")).toBe(defaultCalibrationDistance);
    expect(normalizeCalibrationDistanceStored("-1")).toBe(defaultCalibrationDistance);
  });
});
