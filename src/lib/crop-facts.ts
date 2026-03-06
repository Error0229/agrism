// Crop fact keys and resolution logic for the layered profile system (v3).

/** All supported fact keys, grouped by category. */
export const FACT_KEYS = {
  // Timing
  plantingMonths: "plantingMonths",
  harvestMonths: "harvestMonths",
  growthDays: "growthDays",
  germinationDays: "germinationDays",
  harvestPeriodDays: "harvestPeriodDays",
  // Site
  tempMin: "tempMin",
  tempMax: "tempMax",
  sunlight: "sunlight",
  rainfallNotes: "rainfallNotes",
  windSensitivity: "windSensitivity",
  elevationSensitivity: "elevationSensitivity",
  drainageTolerance: "drainageTolerance",
  // Soil
  soilTexture: "soilTexture",
  soilPhMin: "soilPhMin",
  soilPhMax: "soilPhMax",
  fertilityDemand: "fertilityDemand",
  organicMatterPref: "organicMatterPref",
  salinityTolerance: "salinityTolerance",
  // Water / Structure
  water: "water",
  droughtSensitiveStages: "droughtSensitiveStages",
  trellisNeed: "trellisNeed",
  pruningNeed: "pruningNeed",
  spacingRowCm: "spacingRowCm",
  spacingPlantCm: "spacingPlantCm",
  // Pest
  commonPests: "commonPests",
  commonDiseases: "commonDiseases",
  preventionActions: "preventionActions",
  treatmentActions: "treatmentActions",
  // Harvest
  harvestCues: "harvestCues",
  harvestCadence: "harvestCadence",
  storageNotes: "storageNotes",
  companionPlants: "companionPlants",
  incompatiblePlants: "incompatiblePlants",
  rotationFamily: "rotationFamily",
  // Local
  typhoonResistance: "typhoonResistance",
  localNotes: "localNotes",
  localGrowingTips: "localGrowingTips",
} as const;

export type FactKey = (typeof FACT_KEYS)[keyof typeof FACT_KEYS];

/** A single fact entry in a profile. */
export interface CropFact {
  key: string;
  value: string; // JSON-encoded
  unit?: string;
  confidence?: "high" | "medium" | "low";
  origin?: "seeded" | "imported" | "user" | "derived";
  sourceRefs?: string[];
  updatedAt?: number;
}

/** A profile scope with its facts, as returned from queries. */
export interface CropProfile {
  _id: string;
  cropId: string;
  scope: "base" | "location" | "farm";
  scopeKey?: string;
  status: string;
  facts: CropFact[];
  notes?: string;
  updatedAt: number;
}

/** A resolved fact with provenance info. */
export interface ResolvedFact {
  key: string;
  value: string;
  unit?: string;
  confidence?: string;
  origin?: string;
  sourceRefs?: string[];
  /** Which scope the winning value came from. */
  resolvedFrom: "base" | "location" | "farm";
  profileId: string;
}

/** Scope priority: farm > location > base. Higher index wins. */
const SCOPE_PRIORITY: Record<string, number> = {
  base: 0,
  location: 1,
  farm: 2,
};

/**
 * Resolve facts from multiple profiles using base -> location -> farm precedence.
 * Later scopes override earlier scopes for the same key.
 * Only "active" profiles participate unless includeAll is true.
 */
export function resolveFactsFromProfiles(
  profiles: CropProfile[],
  options?: { includeAll?: boolean },
): ResolvedFact[] {
  const active = options?.includeAll
    ? profiles
    : profiles.filter((p) => p.status === "active");

  // Sort by scope priority ascending so that higher-priority scopes overwrite.
  const sorted = [...active].sort(
    (a, b) =>
      (SCOPE_PRIORITY[a.scope] ?? 0) - (SCOPE_PRIORITY[b.scope] ?? 0),
  );

  const factMap = new Map<string, ResolvedFact>();

  for (const profile of sorted) {
    for (const fact of profile.facts) {
      factMap.set(fact.key, {
        key: fact.key,
        value: fact.value,
        unit: fact.unit,
        confidence: fact.confidence,
        origin: fact.origin,
        sourceRefs: fact.sourceRefs,
        resolvedFrom: profile.scope,
        profileId: profile._id,
      });
    }
  }

  return Array.from(factMap.values());
}

/**
 * Build a lookup object from resolved facts for easy access.
 * Returns Record<factKey, ResolvedFact>.
 */
export function resolvedFactsToMap(
  facts: ResolvedFact[],
): Record<string, ResolvedFact> {
  const map: Record<string, ResolvedFact> = {};
  for (const f of facts) {
    map[f.key] = f;
  }
  return map;
}
