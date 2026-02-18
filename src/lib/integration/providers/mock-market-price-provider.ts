import { normalizeAdapterEnvelope } from "@/lib/integration/normalize";
import type { MarketPriceProvider } from "@/lib/integration/types";

export const mockMarketPriceProvider: MarketPriceProvider = {
  source: "mock-market-feed",
  async fetchPrice() {
    return normalizeAdapterEnvelope({
      source: "mock-market-feed",
      fetchedAt: new Date().toISOString(),
      confidenceScore: 55,
      payload: {
        cropName: "番茄",
        currencyUnit: "TWD/kg",
        latestPrice: 52.4,
        trend: "stable",
      },
    });
  },
};
