import { describe, expect, it } from "vitest";
import { SunlightLevel, type Field } from "@/lib/types";
import { defaultFieldContext, isSunlightCompatible, normalizeField, normalizeFieldContext } from "@/lib/utils/field-context";

describe("field context normalization", () => {
  it("returns defaults when context is missing or invalid", () => {
    expect(normalizeFieldContext()).toEqual(defaultFieldContext);
    expect(normalizeFieldContext({ sunHours: "not-valid" as never })).toEqual(defaultFieldContext);
  });

  it("upgrades legacy field objects by injecting default context", () => {
    const legacy = {
      id: "field-1",
      name: "A 區",
      dimensions: { width: 5, height: 4 },
      plantedCrops: [],
    } as Omit<Field, "context">;

    expect(normalizeField(legacy)).toEqual({
      ...legacy,
      context: defaultFieldContext,
    });
  });
});

describe("sunlight compatibility", () => {
  it("flags full-sun crops as incompatible in low-sun fields", () => {
    expect(isSunlightCompatible(SunlightLevel.全日照, "lt4")).toBe(false);
    expect(isSunlightCompatible(SunlightLevel.全日照, "h6_8")).toBe(true);
  });

  it("allows shade crops in all sun bands", () => {
    expect(isSunlightCompatible(SunlightLevel.耐陰, "lt4")).toBe(true);
    expect(isSunlightCompatible(SunlightLevel.耐陰, "gt8")).toBe(true);
  });
});
