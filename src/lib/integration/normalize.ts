import type { AdapterEnvelope, ConfidenceLevel, FreshnessLabel } from "@/lib/integration/types";

function computeFreshness(fetchedAt: string, now = new Date()): FreshnessLabel {
  const parsed = new Date(fetchedAt);
  const minutes = Number.isNaN(parsed.getTime()) ? 9999 : Math.max(0, Math.round((now.getTime() - parsed.getTime()) / 60000));
  if (minutes <= 60) return "fresh";
  if (minutes <= 240) return "stale";
  return "expired";
}

function toConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

export function normalizeAdapterEnvelope<TPayload>(input: {
  source: string;
  fetchedAt: string;
  payload: TPayload;
  confidenceScore: number;
}): AdapterEnvelope<TPayload> {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(input.confidenceScore)));
  const parsed = new Date(input.fetchedAt);
  const fetchedAt = Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  return {
    source: input.source,
    fetchedAt,
    freshness: computeFreshness(input.fetchedAt),
    confidence: {
      score: normalizedScore,
      level: toConfidenceLevel(normalizedScore),
    },
    payload: input.payload,
  };
}
