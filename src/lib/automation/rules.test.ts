import { describe, expect, it } from "vitest";
import { buildFieldContextSignature, evaluateReplanTriggers, evaluateWeatherAnomalies } from "@/lib/automation/rules";

describe("evaluateWeatherAnomalies", () => {
  it("creates delay/protection suggestions for heavy rain and strong wind", () => {
    const suggestions = evaluateWeatherAnomalies({
      current: { temperatureC: 31, windSpeedKmh: 45 },
      forecastRainMm: [35, 20, 10, 0, 0],
      alerts: [
        { id: "rain-critical", type: "rain", severity: "critical", title: "", recommendation: "" },
        { id: "wind-warning", type: "wind", severity: "warning", title: "", recommendation: "" },
      ],
      confidenceLevel: "high",
    });

    expect(suggestions.some((item) => item.id === "delay-watering")).toBe(true);
    expect(suggestions.some((item) => item.id === "add-protection-task")).toBe(true);
  });

  it("uses beginner defaults to trigger dry-weather rule earlier", () => {
    const suggestions = evaluateWeatherAnomalies({
      current: { temperatureC: 29, windSpeedKmh: 10 },
      forecastRainMm: [0, 0, 0, 8, 9],
      alerts: [],
      confidenceLevel: "medium",
      beginnerDefaults: true,
    });

    expect(suggestions.some((item) => item.id === "prioritize-irrigation")).toBe(true);
  });

  it("returns no-op for stable weather without beginner profile", () => {
    const suggestions = evaluateWeatherAnomalies({
      current: { temperatureC: 27, windSpeedKmh: 12 },
      forecastRainMm: [5, 6, 4, 3, 4],
      alerts: [],
      confidenceLevel: "high",
    });

    expect(suggestions).toHaveLength(0);
  });
});

describe("evaluateReplanTriggers", () => {
  it("triggers replan for confidence drop and field context change", () => {
    const triggers = evaluateReplanTriggers(
      {
        alertIds: ["stable-info"],
        confidenceLevel: "high",
        fieldContextSignature: "f1:open_field:h6_8:moderate:flat:moderate",
      },
      {
        alertIds: ["rain-critical"],
        confidenceLevel: "low",
        fieldContextSignature: "f1:open_field:h4_6:moderate:flat:moderate",
      }
    );

    expect(triggers.some((item) => item.id === "new-critical-alert")).toBe(true);
    expect(triggers.some((item) => item.id === "confidence-drop")).toBe(true);
    expect(triggers.some((item) => item.id === "field-context-changed")).toBe(true);
  });

  it("does not trigger on first snapshot", () => {
    const triggers = evaluateReplanTriggers(null, {
      alertIds: ["stable-info"],
      confidenceLevel: "high",
      fieldContextSignature: "f1:open_field:h6_8:moderate:flat:moderate",
    });
    expect(triggers).toHaveLength(0);
  });
});

describe("buildFieldContextSignature", () => {
  it("creates stable sorted signature", () => {
    const signature = buildFieldContextSignature([
      {
        id: "b",
        context: { plotType: "open_field", sunHours: "h6_8", drainage: "moderate", slope: "flat", windExposure: "moderate" },
      },
      {
        id: "a",
        context: { plotType: "container", sunHours: "lt4", drainage: "good", slope: "gentle", windExposure: "sheltered" },
      },
    ]);

    expect(signature.startsWith("a:container")).toBe(true);
    expect(signature.includes("|b:open_field")).toBe(true);
  });
});
