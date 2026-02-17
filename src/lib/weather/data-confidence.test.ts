import { describe, expect, it } from "vitest";
import { calculateDataConfidence } from "@/lib/weather/data-confidence";

describe("calculateDataConfidence", () => {
  it("returns high confidence for fresh primary data", () => {
    const now = new Date("2026-02-17T12:00:00.000Z");
    const result = calculateDataConfidence(
      {
        fetchedAt: "2026-02-17T11:30:00.000Z",
        source: "open-meteo",
        fallbackUsed: false,
        providerErrors: [],
        forecastPoints: 7,
      },
      now
    );

    expect(result.freshnessLabel).toBe("fresh");
    expect(result.confidenceLevel).toBe("high");
  });

  it("degrades confidence with fallback and stale data", () => {
    const now = new Date("2026-02-17T12:00:00.000Z");
    const result = calculateDataConfidence(
      {
        fetchedAt: "2026-02-17T06:00:00.000Z",
        source: "mock-weather",
        fallbackUsed: true,
        providerErrors: ["open-meteo: timeout"],
        forecastPoints: 2,
      },
      now
    );

    expect(result.freshnessLabel).toBe("expired");
    expect(result.confidenceLevel).toBe("low");
    expect(result.confidenceScore).toBeLessThan(45);
  });
});

