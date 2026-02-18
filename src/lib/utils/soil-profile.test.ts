import { describe, expect, it } from "vitest";
import { normalizeSoilAmendment, normalizeSoilProfile, summarizeSoilRiskFlags } from "@/lib/utils/soil-profile";

describe("soil profile normalization", () => {
  it("clamps invalid numeric values and applies defaults", () => {
    const profile = normalizeSoilProfile({
      fieldId: "field-1",
      texture: "invalid" as never,
      ph: 20,
      ec: -5,
      organicMatterPct: 500,
      updatedAt: "invalid-date",
    });

    expect(profile.texture).toBe("loam");
    expect(profile.ph).toBe(14);
    expect(profile.ec).toBe(0);
    expect(profile.organicMatterPct).toBe(100);
    expect(new Date(profile.updatedAt).toString()).not.toBe("Invalid Date");
  });

  it("normalizes amendment payload fallback values", () => {
    const amendment = normalizeSoilAmendment({
      id: "a1",
      fieldId: "field-1",
      amendmentType: "",
      quantity: Number.NaN,
      unit: "",
      date: "",
    });

    expect(amendment.amendmentType).toBe("未命名改良資材");
    expect(amendment.quantity).toBe(0);
    expect(amendment.unit).toBe("kg");
  });
});

describe("soil risk flags", () => {
  it("returns risk warnings for acidic/high-ec/low-organic profile", () => {
    const flags = summarizeSoilRiskFlags({
      fieldId: "field-1",
      texture: "loam",
      ph: 5,
      ec: 2.5,
      organicMatterPct: 1.2,
      updatedAt: "2026-02-01T00:00:00.000Z",
    });

    expect(flags).toHaveLength(3);
  });
});
