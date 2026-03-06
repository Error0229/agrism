// convex/cropProfileResolver.ts
// Geography key utilities and profile resolution logic for location-aware agronomy.

/**
 * Taiwan county/city names mapped to ISO 3166-2:TW subdivision codes.
 * Used to build standardized geography keys from farm location fields.
 */
const TAIWAN_COUNTY_CODES: Record<string, string> = {
  "臺北市": "TPE", "台北市": "TPE",
  "新北市": "NWT",
  "桃園市": "TAO",
  "臺中市": "TXG", "台中市": "TXG",
  "臺南市": "TNN", "台南市": "TNN",
  "高雄市": "KHH",
  "基隆市": "KEE",
  "新竹市": "HSZ",
  "新竹縣": "HSQ",
  "苗栗縣": "MIA",
  "彰化縣": "CHA",
  "南投縣": "NAN",
  "雲林縣": "YUN",
  "嘉義市": "CYI",
  "嘉義縣": "CYQ",
  "屏東縣": "PIF",
  "宜蘭縣": "ILA",
  "花蓮縣": "HUA",
  "臺東縣": "TTT", "台東縣": "TTT",
  "澎湖縣": "PEN",
  "金門縣": "KIN",
  "連江縣": "LIE",
};

/**
 * Builds an ordered list of geography keys from farm location fields.
 * Returns from broadest to most specific: ["TW", "TW-HUA", "TW-HUA-JA"]
 */
export function buildGeographyKeys(farm: {
  country?: string;
  countyCity?: string;
  districtTownship?: string;
}): string[] {
  const keys: string[] = [];

  // Country level
  const countryCode = farm.country === "台灣" || farm.country === "臺灣" || farm.country === "TW"
    ? "TW"
    : farm.country ?? null;

  if (!countryCode) return keys;
  keys.push(countryCode);

  // County/city level
  if (!farm.countyCity) return keys;
  const countyCode = TAIWAN_COUNTY_CODES[farm.countyCity] ?? farm.countyCity;
  keys.push(`${countryCode}-${countyCode}`);

  // District/township level
  if (!farm.districtTownship) return keys;
  // Use first 2 chars of township name as short key (Chinese township names are typically 2-3 chars)
  const districtShort = farm.districtTownship.slice(0, 2);
  keys.push(`${countryCode}-${countyCode}-${districtShort}`);

  return keys;
}

/**
 * Determines the geography granularity from a geography key.
 */
export function granularityFromKey(key: string): "country" | "county" | "district" {
  const parts = key.split("-");
  if (parts.length >= 3) return "district";
  if (parts.length === 2) return "county";
  return "country";
}

/** A resolved fact with provenance information. */
export interface ResolvedFact {
  key: string;
  value: string;
  unit?: string;
  confidence?: string;
  origin?: string;
  sourceRefs?: string[];
  resolvedFrom: string; // scope that provided this fact
  scopeKey?: string; // the specific scopeKey (geography key or farmId)
  profileId: string; // the profile _id
}

/**
 * Resolves crop facts by walking the scope hierarchy:
 * base -> country -> county -> district -> farm
 *
 * For each fact key, the most specific available value wins.
 * Returns provenance for each resolved value.
 */
export function resolveFactsFromProfiles(
  profiles: Array<{
    _id: string;
    scope: string;
    scopeKey?: string;
    geographyGranularity?: string;
    status: string;
    facts: Array<{
      key: string;
      value: string;
      unit?: string;
      confidence?: string;
      origin?: string;
      sourceRefs?: string[];
    }>;
  }>,
  geographyKeys: string[],
  farmId?: string,
): ResolvedFact[] {
  // Build a set for O(1) lookup of valid geography keys
  const geoKeySet = new Set(geographyKeys);

  // Sort profiles in resolution order: base → country → county → district → farm
  const granularityOrder: Record<string, number> = {
    country: 1,
    county: 2,
    district: 3,
  };

  const activeProfiles = profiles
    .filter((p) => p.status === "active")
    .filter((p) => {
      if (p.scope === "base") return true;
      if (p.scope === "location") {
        return p.scopeKey ? geoKeySet.has(p.scopeKey) : false;
      }
      if (p.scope === "farm") {
        return farmId ? p.scopeKey === farmId : false;
      }
      return false;
    })
    .sort((a, b) => {
      const scopeOrder: Record<string, number> = { base: 0, location: 1, farm: 10 };
      const aOrder = a.scope === "location"
        ? (granularityOrder[a.geographyGranularity ?? "country"] ?? 1)
        : (scopeOrder[a.scope] ?? 0);
      const bOrder = b.scope === "location"
        ? (granularityOrder[b.geographyGranularity ?? "country"] ?? 1)
        : (scopeOrder[b.scope] ?? 0);
      return aOrder - bOrder;
    });

  // Walk profiles in order; later values override earlier ones for the same key
  const factMap = new Map<string, ResolvedFact>();
  for (const profile of activeProfiles) {
    for (const fact of profile.facts) {
      factMap.set(fact.key, {
        key: fact.key,
        value: fact.value,
        unit: fact.unit,
        confidence: fact.confidence,
        origin: fact.origin,
        sourceRefs: fact.sourceRefs,
        resolvedFrom: profile.scope,
        scopeKey: profile.scopeKey,
        profileId: profile._id,
      });
    }
  }

  return Array.from(factMap.values());
}
