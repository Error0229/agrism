import { describe, it, expect } from "vitest";
import {
  LIFECYCLE_TYPE_LABELS,
  STAGE_LABELS,
  CONFIDENCE_LABELS,
  START_DATE_MODE_LABELS,
} from "@/components/field-editor/lifecycle-inspector";

describe("LIFECYCLE_TYPE_LABELS", () => {
  const expectedKeys = ["seasonal", "long_cycle", "perennial", "orchard"];

  it("should have labels for all lifecycle types", () => {
    for (const key of expectedKeys) {
      expect(LIFECYCLE_TYPE_LABELS[key]).toBeDefined();
    }
  });

  it("should have non-empty string labels", () => {
    for (const [key, label] of Object.entries(LIFECYCLE_TYPE_LABELS)) {
      expect(typeof label, `${key} label is not a string`).toBe("string");
      expect(label.length, `${key} label is empty`).toBeGreaterThan(0);
    }
  });
});

describe("STAGE_LABELS", () => {
  const expectedKeys = [
    "seedling",
    "vegetative",
    "flowering",
    "fruiting",
    "harvest_ready",
    "dormant",
    "declining",
  ];

  it("should have labels for all stages", () => {
    for (const key of expectedKeys) {
      expect(STAGE_LABELS[key]).toBeDefined();
    }
  });

  it("should have non-empty string labels", () => {
    for (const [key, label] of Object.entries(STAGE_LABELS)) {
      expect(typeof label, `${key} label is not a string`).toBe("string");
      expect(label.length, `${key} label is empty`).toBeGreaterThan(0);
    }
  });
});

describe("CONFIDENCE_LABELS", () => {
  const expectedKeys = ["high", "medium", "low"];

  it("should have labels for all confidence levels", () => {
    for (const key of expectedKeys) {
      expect(CONFIDENCE_LABELS[key]).toBeDefined();
    }
  });

  it("should have non-empty string labels", () => {
    for (const [key, label] of Object.entries(CONFIDENCE_LABELS)) {
      expect(typeof label, `${key} label is not a string`).toBe("string");
      expect(label.length, `${key} label is empty`).toBeGreaterThan(0);
    }
  });
});

describe("START_DATE_MODE_LABELS", () => {
  const expectedKeys = ["exact", "range", "relative", "unknown"];

  it("should have labels for all date modes", () => {
    for (const key of expectedKeys) {
      expect(START_DATE_MODE_LABELS[key]).toBeDefined();
    }
  });

  it("should have non-empty string labels", () => {
    for (const [key, label] of Object.entries(START_DATE_MODE_LABELS)) {
      expect(typeof label, `${key} label is not a string`).toBe("string");
      expect(label.length, `${key} label is empty`).toBeGreaterThan(0);
    }
  });
});
