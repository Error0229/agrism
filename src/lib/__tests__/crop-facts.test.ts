import { describe, it, expect } from "vitest";
import {
  resolveFactsFromProfiles,
  resolvedFactsToMap,
  type CropProfile,
  type CropFact,
  FACT_KEYS,
} from "../crop-facts";

function makeFact(key: string, value: string, overrides?: Partial<CropFact>): CropFact {
  return { key, value, confidence: "medium", origin: "seeded", ...overrides };
}

function makeProfile(
  scope: "base" | "location" | "farm",
  facts: CropFact[],
  overrides?: Partial<CropProfile>,
): CropProfile {
  return {
    _id: `profile_${scope}_${Math.random().toString(36).slice(2, 8)}`,
    cropId: "crop_1",
    scope,
    status: "active",
    facts,
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("resolveFactsFromProfiles", () => {
  it("returns empty array for no profiles", () => {
    expect(resolveFactsFromProfiles([])).toEqual([]);
  });

  it("returns all facts from a single base profile", () => {
    const profile = makeProfile("base", [
      makeFact("tempMin", "20"),
      makeFact("tempMax", "30"),
    ]);
    const result = resolveFactsFromProfiles([profile]);
    expect(result).toHaveLength(2);
    expect(result[0].key).toBe("tempMin");
    expect(result[0].resolvedFrom).toBe("base");
    expect(result[1].key).toBe("tempMax");
  });

  it("location scope overrides base for the same key", () => {
    const base = makeProfile("base", [
      makeFact("tempMin", "20"),
      makeFact("water", '"moderate"'),
    ]);
    const location = makeProfile("location", [
      makeFact("tempMin", "22", { confidence: "high", origin: "imported" }),
    ]);
    const result = resolveFactsFromProfiles([base, location]);
    const map = resolvedFactsToMap(result);

    expect(map.tempMin.value).toBe("22");
    expect(map.tempMin.resolvedFrom).toBe("location");
    expect(map.tempMin.confidence).toBe("high");
    // water should still come from base
    expect(map.water.value).toBe('"moderate"');
    expect(map.water.resolvedFrom).toBe("base");
  });

  it("farm scope overrides both base and location", () => {
    const base = makeProfile("base", [
      makeFact("spacingRowCm", "80"),
      makeFact("sunlight", '"full_sun"'),
    ]);
    const location = makeProfile("location", [
      makeFact("spacingRowCm", "70"),
    ]);
    const farm = makeProfile("farm", [
      makeFact("spacingRowCm", "60", { origin: "user", confidence: "high" }),
    ]);
    const result = resolveFactsFromProfiles([farm, base, location]); // intentionally unordered
    const map = resolvedFactsToMap(result);

    expect(map.spacingRowCm.value).toBe("60");
    expect(map.spacingRowCm.resolvedFrom).toBe("farm");
    expect(map.spacingRowCm.origin).toBe("user");
    expect(map.sunlight.resolvedFrom).toBe("base");
  });

  it("skips non-active profiles by default", () => {
    const active = makeProfile("base", [makeFact("tempMin", "20")]);
    const draft = makeProfile("location", [makeFact("tempMin", "25")], {
      status: "draft",
    });
    const result = resolveFactsFromProfiles([active, draft]);
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe("20");
  });

  it("includes non-active profiles when includeAll is true", () => {
    const active = makeProfile("base", [makeFact("tempMin", "20")]);
    const draft = makeProfile("location", [makeFact("tempMin", "25")], {
      status: "draft",
    });
    const result = resolveFactsFromProfiles([active, draft], { includeAll: true });
    expect(result).toHaveLength(1);
    // draft location should override base
    expect(result[0].value).toBe("25");
    expect(result[0].resolvedFrom).toBe("location");
  });

  it("preserves profileId in resolved facts", () => {
    const profile = makeProfile("base", [makeFact("water", '"abundant"')]);
    const result = resolveFactsFromProfiles([profile]);
    expect(result[0].profileId).toBe(profile._id);
  });

  it("handles multiple facts in a single profile", () => {
    const profile = makeProfile("base", [
      makeFact("plantingMonths", "[3,4,5]"),
      makeFact("harvestMonths", "[7,8,9]"),
      makeFact("growthDays", "90"),
      makeFact("tempMin", "20"),
      makeFact("tempMax", "35"),
    ]);
    const result = resolveFactsFromProfiles([profile]);
    expect(result).toHaveLength(5);
  });

  it("each key appears exactly once in output", () => {
    const base = makeProfile("base", [
      makeFact("tempMin", "20"),
      makeFact("tempMax", "30"),
    ]);
    const location = makeProfile("location", [
      makeFact("tempMin", "22"),
      makeFact("tempMax", "32"),
    ]);
    const farm = makeProfile("farm", [
      makeFact("tempMin", "24"),
    ]);
    const result = resolveFactsFromProfiles([base, location, farm]);
    const keys = result.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("tempMin");
    expect(keys).toContain("tempMax");
  });
});

describe("resolvedFactsToMap", () => {
  it("converts array to keyed lookup", () => {
    const base = makeProfile("base", [
      makeFact("tempMin", "20"),
      makeFact("water", '"moderate"'),
    ]);
    const resolved = resolveFactsFromProfiles([base]);
    const map = resolvedFactsToMap(resolved);

    expect(map.tempMin.value).toBe("20");
    expect(map.water.value).toBe('"moderate"');
    expect(map.nonExistent).toBeUndefined();
  });
});

describe("FACT_KEYS", () => {
  it("contains all expected categories", () => {
    // Timing
    expect(FACT_KEYS.plantingMonths).toBe("plantingMonths");
    expect(FACT_KEYS.harvestMonths).toBe("harvestMonths");
    expect(FACT_KEYS.growthDays).toBe("growthDays");
    // Site
    expect(FACT_KEYS.tempMin).toBe("tempMin");
    expect(FACT_KEYS.sunlight).toBe("sunlight");
    // Soil
    expect(FACT_KEYS.soilPhMin).toBe("soilPhMin");
    // Water/Structure
    expect(FACT_KEYS.spacingRowCm).toBe("spacingRowCm");
    // Pest
    expect(FACT_KEYS.commonPests).toBe("commonPests");
    // Harvest
    expect(FACT_KEYS.companionPlants).toBe("companionPlants");
    // Local
    expect(FACT_KEYS.typhoonResistance).toBe("typhoonResistance");
    expect(FACT_KEYS.localNotes).toBe("localNotes");
    expect(FACT_KEYS.localGrowingTips).toBe("localGrowingTips");
  });

  it("has no duplicate values", () => {
    const values = Object.values(FACT_KEYS);
    expect(new Set(values).size).toBe(values.length);
  });
});
