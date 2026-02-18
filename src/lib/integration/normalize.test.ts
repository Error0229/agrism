import { describe, expect, it } from "vitest";
import { normalizeAdapterEnvelope } from "@/lib/integration/normalize";

describe("normalizeAdapterEnvelope", () => {
  it("normalizes confidence boundaries and freshness", () => {
    const envelope = normalizeAdapterEnvelope({
      source: "mock",
      fetchedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      confidenceScore: 120,
      payload: { ok: true },
    });

    expect(envelope.confidence.score).toBe(100);
    expect(envelope.confidence.level).toBe("high");
    expect(envelope.freshness).toBe("fresh");
  });

  it("marks expired freshness for old timestamps", () => {
    const envelope = normalizeAdapterEnvelope({
      source: "mock",
      fetchedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      confidenceScore: 30,
      payload: { ok: true },
    });
    expect(envelope.freshness).toBe("expired");
    expect(envelope.confidence.level).toBe("low");
  });
});
