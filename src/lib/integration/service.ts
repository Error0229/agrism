import { mockClimateProvider } from "@/lib/integration/providers/mock-climate-provider";
import { mockMarketPriceProvider } from "@/lib/integration/providers/mock-market-price-provider";
import { mockSensorProvider } from "@/lib/integration/providers/mock-sensor-provider";
import type { AdapterEnvelope, ClimatePayload, MarketPricePayload, SensorSnapshotPayload } from "@/lib/integration/types";

export interface IntegrationOverview {
  fetchedAt: string;
  climate: AdapterEnvelope<ClimatePayload> | null;
  market: AdapterEnvelope<MarketPricePayload> | null;
  sensor: AdapterEnvelope<SensorSnapshotPayload> | null;
  errors: string[];
}

export async function getIntegrationOverview(): Promise<IntegrationOverview> {
  const errors: string[] = [];

  const [climate, market, sensor] = await Promise.all([
    mockClimateProvider.fetchClimate().catch((error) => {
      errors.push(`climate:${error instanceof Error ? error.message : "unknown"}`);
      return null;
    }),
    mockMarketPriceProvider.fetchPrice().catch((error) => {
      errors.push(`market:${error instanceof Error ? error.message : "unknown"}`);
      return null;
    }),
    mockSensorProvider.fetchSensorSnapshot().catch((error) => {
      errors.push(`sensor:${error instanceof Error ? error.message : "unknown"}`);
      return null;
    }),
  ]);

  return {
    fetchedAt: new Date().toISOString(),
    climate,
    market,
    sensor,
    errors,
  };
}
