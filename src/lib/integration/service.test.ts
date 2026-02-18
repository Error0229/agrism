import { describe, expect, it } from "vitest";
import { getIntegrationOverview } from "@/lib/integration/service";

describe("getIntegrationOverview", () => {
  it("returns normalized envelopes for all adapter categories", async () => {
    const result = await getIntegrationOverview();

    expect(result.climate?.source).toBeTruthy();
    expect(result.market?.source).toBeTruthy();
    expect(result.sensor?.source).toBeTruthy();
    expect(result.climate?.confidence.score).toBeGreaterThanOrEqual(0);
    expect(result.market?.freshness).toBeTruthy();
    expect(result.errors).toHaveLength(0);
  });
});
