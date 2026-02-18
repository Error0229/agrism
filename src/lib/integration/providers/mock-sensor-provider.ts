import { normalizeAdapterEnvelope } from "@/lib/integration/normalize";
import type { SensorSnapshotProvider } from "@/lib/integration/types";

export const mockSensorProvider: SensorSnapshotProvider = {
  source: "mock-sensor-adapter",
  async fetchSensorSnapshot() {
    return normalizeAdapterEnvelope({
      source: "mock-sensor-adapter",
      fetchedAt: new Date().toISOString(),
      confidenceScore: 72,
      payload: {
        deviceId: "sensor-demo-1",
        soilMoisturePct: 41,
        soilTemperatureC: 24.6,
        batteryPct: 86,
        connectivity: "online",
      },
    });
  },
};
