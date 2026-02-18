export type FreshnessLabel = "fresh" | "stale" | "expired";
export type ConfidenceLevel = "low" | "medium" | "high";

export interface AdapterEnvelope<TPayload> {
  source: string;
  fetchedAt: string;
  freshness: FreshnessLabel;
  confidence: {
    score: number;
    level: ConfidenceLevel;
  };
  payload: TPayload;
}

export interface ClimatePayload {
  period: string;
  seasonalRainfallMm: number;
  heatStressIndex: number;
  note: string;
}

export interface MarketPricePayload {
  cropName: string;
  currencyUnit: string;
  latestPrice: number;
  trend: "up" | "down" | "stable";
}

export interface SensorSnapshotPayload {
  deviceId: string;
  soilMoisturePct: number;
  soilTemperatureC: number;
  batteryPct: number;
  connectivity: "online" | "offline";
}

export interface ClimateProvider {
  source: string;
  fetchClimate: () => Promise<AdapterEnvelope<ClimatePayload>>;
}

export interface MarketPriceProvider {
  source: string;
  fetchPrice: () => Promise<AdapterEnvelope<MarketPricePayload>>;
}

export interface SensorSnapshotProvider {
  source: string;
  fetchSensorSnapshot: () => Promise<AdapterEnvelope<SensorSnapshotPayload>>;
}
