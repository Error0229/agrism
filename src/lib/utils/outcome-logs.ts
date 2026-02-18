import type { HarvestLog } from "@/lib/types";

export interface OutcomeSummary {
  qualityCounts: Record<"A" | "B" | "C" | "reject", number>;
  pestCounts: Record<"none" | "minor" | "moderate" | "severe", number>;
  weatherImpactCounts: Record<"none" | "heat" | "rain" | "wind" | "cold" | "mixed", number>;
}

const QUALITY_DEFAULT: NonNullable<HarvestLog["qualityGrade"]> = "B";
const PEST_DEFAULT: NonNullable<HarvestLog["pestIncidentLevel"]> = "none";
const WEATHER_DEFAULT: NonNullable<HarvestLog["weatherImpact"]> = "none";

export function normalizeHarvestLog(log: HarvestLog): HarvestLog {
  return {
    ...log,
    qualityGrade:
      log.qualityGrade === "A" || log.qualityGrade === "B" || log.qualityGrade === "C" || log.qualityGrade === "reject"
        ? log.qualityGrade
        : QUALITY_DEFAULT,
    pestIncidentLevel:
      log.pestIncidentLevel === "none" ||
      log.pestIncidentLevel === "minor" ||
      log.pestIncidentLevel === "moderate" ||
      log.pestIncidentLevel === "severe"
        ? log.pestIncidentLevel
        : PEST_DEFAULT,
    weatherImpact:
      log.weatherImpact === "none" ||
      log.weatherImpact === "heat" ||
      log.weatherImpact === "rain" ||
      log.weatherImpact === "wind" ||
      log.weatherImpact === "cold" ||
      log.weatherImpact === "mixed"
        ? log.weatherImpact
        : WEATHER_DEFAULT,
  };
}

export function summarizeOutcomeLogs(logs: HarvestLog[]): OutcomeSummary {
  const summary: OutcomeSummary = {
    qualityCounts: { A: 0, B: 0, C: 0, reject: 0 },
    pestCounts: { none: 0, minor: 0, moderate: 0, severe: 0 },
    weatherImpactCounts: { none: 0, heat: 0, rain: 0, wind: 0, cold: 0, mixed: 0 },
  };

  for (const raw of logs) {
    const log = normalizeHarvestLog(raw);
    summary.qualityCounts[log.qualityGrade!] += 1;
    summary.pestCounts[log.pestIncidentLevel!] += 1;
    summary.weatherImpactCounts[log.weatherImpact!] += 1;
  }

  return summary;
}
