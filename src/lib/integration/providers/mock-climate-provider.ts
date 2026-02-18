import { normalizeAdapterEnvelope } from "@/lib/integration/normalize";
import type { ClimateProvider } from "@/lib/integration/types";

export const mockClimateProvider: ClimateProvider = {
  source: "mock-climate-open-data",
  async fetchClimate() {
    return normalizeAdapterEnvelope({
      source: "mock-climate-open-data",
      fetchedAt: new Date().toISOString(),
      confidenceScore: 68,
      payload: {
        period: "2026-Q1",
        seasonalRainfallMm: 420,
        heatStressIndex: 0.58,
        note: "春季降雨偏多，注意排水與病害風險。",
      },
    });
  },
};
