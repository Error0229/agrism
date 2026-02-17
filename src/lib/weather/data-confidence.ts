export interface ConfidenceInput {
  fetchedAt: string;
  source: string;
  fallbackUsed: boolean;
  providerErrors: string[];
  forecastPoints: number;
}

export interface ConfidenceResult {
  freshnessMinutes: number;
  freshnessLabel: "fresh" | "stale" | "expired";
  confidenceScore: number;
  confidenceLevel: "low" | "medium" | "high";
}

function getFreshnessLabel(minutes: number): ConfidenceResult["freshnessLabel"] {
  if (minutes <= 60) return "fresh";
  if (minutes <= 180) return "stale";
  return "expired";
}

function getConfidenceLevel(score: number): ConfidenceResult["confidenceLevel"] {
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

export function calculateDataConfidence(input: ConfidenceInput, now = new Date()): ConfidenceResult {
  const fetchedAtMs = new Date(input.fetchedAt).getTime();
  const freshnessMinutes = Number.isFinite(fetchedAtMs)
    ? Math.max(0, Math.round((now.getTime() - fetchedAtMs) / (1000 * 60)))
    : 9999;
  const freshnessLabel = getFreshnessLabel(freshnessMinutes);

  let score = 100;

  if (freshnessLabel === "stale") score -= 18;
  if (freshnessLabel === "expired") score -= 40;

  if (input.fallbackUsed) score -= 12;
  if (input.providerErrors.length > 0) score -= Math.min(16, input.providerErrors.length * 8);
  if (input.forecastPoints < 3) score -= 15;

  if (input.source === "mock-weather") score = Math.min(score, 55);

  const normalized = Math.max(0, Math.min(100, score));
  return {
    freshnessMinutes,
    freshnessLabel,
    confidenceScore: normalized,
    confidenceLevel: getConfidenceLevel(normalized),
  };
}

