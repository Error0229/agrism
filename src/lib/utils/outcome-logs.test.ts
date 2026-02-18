import { describe, expect, it } from "vitest";
import { normalizeHarvestLog, summarizeOutcomeLogs } from "@/lib/utils/outcome-logs";

describe("normalizeHarvestLog", () => {
  it("fills defaults for legacy harvest logs without enriched fields", () => {
    const normalized = normalizeHarvestLog({
      id: "h1",
      fieldId: "field-1",
      cropId: "crop-1",
      date: "2026-02-20T00:00:00.000Z",
      quantity: 3,
      unit: "公斤",
    });

    expect(normalized.qualityGrade).toBe("B");
    expect(normalized.pestIncidentLevel).toBe("none");
    expect(normalized.weatherImpact).toBe("none");
  });
});

describe("summarizeOutcomeLogs", () => {
  it("aggregates quality, pest incidents and weather impact counts", () => {
    const summary = summarizeOutcomeLogs([
      {
        id: "h1",
        fieldId: "field-1",
        cropId: "crop-1",
        date: "2026-02-20T00:00:00.000Z",
        quantity: 3,
        unit: "公斤",
        qualityGrade: "A",
        pestIncidentLevel: "minor",
        weatherImpact: "rain",
      },
      {
        id: "h2",
        fieldId: "field-1",
        cropId: "crop-1",
        date: "2026-02-21T00:00:00.000Z",
        quantity: 2,
        unit: "公斤",
      },
    ]);

    expect(summary.qualityCounts.A).toBe(1);
    expect(summary.qualityCounts.B).toBe(1);
    expect(summary.pestCounts.minor).toBe(1);
    expect(summary.pestCounts.none).toBe(1);
    expect(summary.weatherImpactCounts.rain).toBe(1);
    expect(summary.weatherImpactCounts.none).toBe(1);
  });
});
