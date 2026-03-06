import { describe, it, expect } from "vitest";
import {
  LIFECYCLE_TYPE_LABELS,
  STAGE_LABELS,
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
