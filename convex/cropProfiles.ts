import { query, mutation, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireFarmMembership } from "./_helpers";
import {
  buildGeographyKeys,
  granularityFromKey,
  resolveFactsFromProfiles,
} from "./cropProfileResolver";

// === Validators ===

const factValidator = v.object({
  key: v.string(),
  value: v.string(),
  unit: v.optional(v.string()),
  confidence: v.optional(v.string()),
  origin: v.optional(v.string()),
  sourceRefs: v.optional(v.array(v.string())),
  updatedAt: v.optional(v.number()),
});

// === Queries ===

/** Get all profiles for a crop, ordered by scope (base, location, farm). */
export const getCropProfiles = query({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const crop = await ctx.db.get(cropId);
    if (!crop) return [];
    await requireFarmMembership(ctx, crop.farmId);
    const profiles = await ctx.db
      .query("cropProfiles")
      .withIndex("by_cropId", (q) => q.eq("cropId", cropId))
      .collect();
    const scopeOrder: Record<string, number> = { base: 0, location: 1, farm: 2 };
    return profiles.sort(
      (a, b) => (scopeOrder[a.scope] ?? 0) - (scopeOrder[b.scope] ?? 0),
    );
  },
});

/** Get all localized profiles for a crop across all geographies. */
export const getLocalizedProfiles = query({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const crop = await ctx.db.get(cropId);
    if (!crop) return [];
    await requireFarmMembership(ctx, crop.farmId);
    const profiles = await ctx.db
      .query("cropProfiles")
      .withIndex("by_cropId_scope", (q) =>
        q.eq("cropId", cropId).eq("scope", "location"),
      )
      .collect();
    return profiles.filter((p) => p.status === "active");
  },
});

/**
 * Return merged/resolved facts for a crop.
 * Walks base -> country -> county -> district -> farm hierarchy.
 * Uses farm location to build geography keys for proper fallback.
 */
export const resolvedCropFacts = query({
  args: {
    cropId: v.id("crops"),
    farmId: v.optional(v.id("farms")),
  },
  handler: async (ctx, { cropId, farmId }) => {
    const crop = await ctx.db.get(cropId);
    if (!crop) return [];
    await requireFarmMembership(ctx, crop.farmId);

    const allProfiles = await ctx.db
      .query("cropProfiles")
      .withIndex("by_cropId", (q) => q.eq("cropId", cropId))
      .collect();

    // Build geography keys from farm location
    let geographyKeys: string[] = [];
    let resolvedFarmId: string | undefined;
    const legacyKeys = new Set<string>();

    if (farmId) {
      const farm = await ctx.db.get(farmId);
      if (farm) {
        geographyKeys = buildGeographyKeys({
          country: farm.country,
          countyCity: farm.countyCity,
          districtTownship: farm.districtTownship,
        });
        resolvedFarmId = farmId;

        // Also support legacy scopeKey format ("花蓮縣") for backward compatibility
        if (farm.countyCity) {
          legacyKeys.add(farm.countyCity);
          if (farm.districtTownship) {
            legacyKeys.add(`${farm.countyCity}/${farm.districtTownship}`);
          }
        }
      }
    }

    // Extend profiles to also match legacy scopeKeys
    const profilesWithLegacyCompat = allProfiles.map((p) => {
      if (p.scope === "location" && p.scopeKey && legacyKeys.has(p.scopeKey) && !p.geographyGranularity) {
        // Assign a granularity based on the legacy key format
        const isDistrict = p.scopeKey.includes("/");
        return {
          ...p,
          _id: p._id as string,
          geographyGranularity: isDistrict ? "district" as const : "county" as const,
        };
      }
      return { ...p, _id: p._id as string };
    });

    // For legacy profiles, add their scopeKeys to the geographyKeys set
    const allGeoKeys = [...geographyKeys];
    for (const p of profilesWithLegacyCompat) {
      if (p.scope === "location" && p.scopeKey && legacyKeys.has(p.scopeKey)) {
        if (!allGeoKeys.includes(p.scopeKey)) {
          allGeoKeys.push(p.scopeKey);
        }
      }
    }

    return resolveFactsFromProfiles(profilesWithLegacyCompat, allGeoKeys, resolvedFarmId);
  },
});

/**
 * Convenience query: get resolved facts using the crop's own farmId.
 * Fetches the farm from the crop record automatically.
 */
export const getResolvedCropFacts = query({
  args: {
    cropId: v.id("crops"),
    farmId: v.id("farms"),
  },
  handler: async (ctx, { cropId, farmId }) => {
    const crop = await ctx.db.get(cropId);
    if (!crop) return [];
    await requireFarmMembership(ctx, crop.farmId);

    const allProfiles = await ctx.db
      .query("cropProfiles")
      .withIndex("by_cropId", (q) => q.eq("cropId", cropId))
      .collect();

    const farm = await ctx.db.get(farmId);
    const geographyKeys = farm
      ? buildGeographyKeys({
          country: farm.country,
          countyCity: farm.countyCity,
          districtTownship: farm.districtTownship,
        })
      : [];

    // Also support legacy scopeKey format for backward compatibility
    const legacyKeys = new Set<string>();
    if (farm?.countyCity) {
      legacyKeys.add(farm.countyCity);
      if (farm.districtTownship) {
        legacyKeys.add(`${farm.countyCity}/${farm.districtTownship}`);
      }
    }

    const profilesForResolver = allProfiles.map((p) => {
      if (p.scope === "location" && p.scopeKey && legacyKeys.has(p.scopeKey) && !p.geographyGranularity) {
        const isDistrict = p.scopeKey.includes("/");
        return {
          ...p,
          _id: p._id as string,
          geographyGranularity: isDistrict ? "district" as const : "county" as const,
        };
      }
      return { ...p, _id: p._id as string };
    });

    const allGeoKeys = [...geographyKeys];
    for (const p of profilesForResolver) {
      if (p.scope === "location" && p.scopeKey && legacyKeys.has(p.scopeKey)) {
        if (!allGeoKeys.includes(p.scopeKey)) {
          allGeoKeys.push(p.scopeKey);
        }
      }
    }

    return resolveFactsFromProfiles(profilesForResolver, allGeoKeys, farmId);
  },
});

// === Mutations ===

/** Create or update a crop profile. */
export const upsertCropProfile = mutation({
  args: {
    cropId: v.id("crops"),
    scope: v.string(),
    scopeKey: v.optional(v.string()),
    geographyGranularity: v.optional(v.string()),
    status: v.optional(v.string()),
    facts: v.array(factValidator),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { cropId, scope, scopeKey, geographyGranularity, status, facts, notes }) => {
    const crop = await ctx.db.get(cropId);
    if (!crop) throw new Error("找不到此作物");
    await requireFarmMembership(ctx, crop.farmId);

    // Look for existing profile with same cropId + scope + scopeKey
    const existing = await ctx.db
      .query("cropProfiles")
      .withIndex("by_cropId_scope", (q) =>
        q.eq("cropId", cropId).eq("scope", scope),
      )
      .collect();

    const match = existing.find((p) => p.scopeKey === scopeKey);
    const now = Date.now();

    if (match) {
      await ctx.db.patch(match._id, {
        facts,
        status: status ?? match.status,
        notes: notes ?? match.notes,
        geographyGranularity: geographyGranularity ?? match.geographyGranularity,
        updatedAt: now,
      });
      return match._id;
    }

    return ctx.db.insert("cropProfiles", {
      cropId,
      scope,
      scopeKey,
      geographyGranularity,
      status: status ?? "active",
      facts,
      notes,
      updatedAt: now,
    });
  },
});

/** Create or update a localized profile using geography key. */
export const upsertLocalizedProfile = mutation({
  args: {
    cropId: v.id("crops"),
    geographyKey: v.string(),
    facts: v.array(factValidator),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { cropId, geographyKey, facts, notes }) => {
    const crop = await ctx.db.get(cropId);
    if (!crop) throw new Error("找不到此作物");
    await requireFarmMembership(ctx, crop.farmId);

    const granularity = granularityFromKey(geographyKey);

    // Look for existing profile with same cropId + scope + scopeKey
    const existing = await ctx.db
      .query("cropProfiles")
      .withIndex("by_cropId_scope", (q) =>
        q.eq("cropId", cropId).eq("scope", "location"),
      )
      .collect();

    const match = existing.find((p) => p.scopeKey === geographyKey);
    const now = Date.now();

    if (match) {
      await ctx.db.patch(match._id, {
        facts,
        notes: notes ?? match.notes,
        geographyGranularity: granularity,
        updatedAt: now,
      });
      return match._id;
    }

    return ctx.db.insert("cropProfiles", {
      cropId,
      scope: "location",
      scopeKey: geographyKey,
      geographyGranularity: granularity,
      status: "active",
      facts,
      notes,
      updatedAt: now,
    });
  },
});

/** Update a single fact in a profile. Creates the fact if it doesn't exist. */
export const updateCropFact = mutation({
  args: {
    profileId: v.id("cropProfiles"),
    factKey: v.string(),
    value: v.string(),
    unit: v.optional(v.string()),
    confidence: v.optional(v.string()),
    origin: v.optional(v.string()),
    sourceRefs: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { profileId, factKey, value, unit, confidence, origin, sourceRefs }) => {
    const profile = await ctx.db.get(profileId);
    if (!profile) throw new Error("找不到此知識檔案");

    // Verify ownership through the crop
    const crop = await ctx.db.get(profile.cropId);
    if (!crop) throw new Error("找不到此作物");
    await requireFarmMembership(ctx, crop.farmId);

    const now = Date.now();
    const facts = [...profile.facts];
    const idx = facts.findIndex((f) => f.key === factKey);

    const updatedFact = {
      key: factKey,
      value,
      unit,
      confidence,
      origin: origin ?? "user",
      sourceRefs,
      updatedAt: now,
    };

    if (idx >= 0) {
      facts[idx] = updatedFact;
    } else {
      facts.push(updatedFact);
    }

    await ctx.db.patch(profileId, { facts, updatedAt: now });
  },
});

/** Update a single fact in a localized profile by geography key. */
export const updateLocalizedFact = mutation({
  args: {
    profileId: v.id("cropProfiles"),
    factKey: v.string(),
    value: v.string(),
    unit: v.optional(v.string()),
    origin: v.optional(v.string()),
  },
  handler: async (ctx, { profileId, factKey, value, unit, origin }) => {
    const profile = await ctx.db.get(profileId);
    if (!profile) throw new Error("找不到此知識檔案");
    if (profile.scope !== "location") throw new Error("此操作僅適用於地區知識檔案");

    const crop = await ctx.db.get(profile.cropId);
    if (!crop) throw new Error("找不到此作物");
    await requireFarmMembership(ctx, crop.farmId);

    const now = Date.now();
    const facts = [...profile.facts];
    const idx = facts.findIndex((f) => f.key === factKey);

    const updatedFact = {
      key: factKey,
      value,
      unit,
      origin: origin ?? "user",
      updatedAt: now,
    };

    if (idx >= 0) {
      facts[idx] = updatedFact;
    } else {
      facts.push(updatedFact);
    }

    await ctx.db.patch(profileId, { facts, updatedAt: now });
  },
});

// === Migration ===

/**
 * Migrate a single crop's flat fields into base + location profiles.
 * Uses geography keys (e.g., "TW-HUA") instead of Chinese names.
 * Internal mutation — not exposed to clients directly.
 */
export const migrateCropToProfiles = internalMutation({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const crop = await ctx.db.get(cropId);
    if (!crop) return;

    // Check if profiles already exist for this crop
    const existing = await ctx.db
      .query("cropProfiles")
      .withIndex("by_cropId", (q) => q.eq("cropId", cropId))
      .first();
    if (existing) return; // Already migrated

    const now = Date.now();
    const baseFacts: Array<{
      key: string;
      value: string;
      unit?: string;
      confidence?: string;
      origin?: string;
      updatedAt?: number;
    }> = [];

    // Helper to add a fact if the value exists
    const addFact = (key: string, val: unknown, unit?: string) => {
      if (val === undefined || val === null) return;
      baseFacts.push({
        key,
        value: JSON.stringify(val),
        unit,
        confidence: "medium",
        origin: "seeded",
        updatedAt: now,
      });
    };

    // Timing
    addFact("plantingMonths", crop.plantingMonths);
    addFact("harvestMonths", crop.harvestMonths);
    addFact("growthDays", crop.growthDays, "days");
    // Site
    addFact("tempMin", crop.tempMin, "°C");
    addFact("tempMax", crop.tempMax, "°C");
    addFact("sunlight", crop.sunlight);
    // Soil
    addFact("soilPhMin", crop.soilPhMin);
    addFact("soilPhMax", crop.soilPhMax);
    // Water / Structure
    addFact("water", crop.water);
    addFact("spacingRowCm", crop.spacingRowCm, "cm");
    addFact("spacingPlantCm", crop.spacingPlantCm, "cm");
    // Pest
    addFact("commonPests", crop.commonPests);
    addFact("commonDiseases", crop.commonDiseases);
    addFact("preventionActions", crop.pestControl);
    // Harvest
    addFact("companionPlants", crop.companionPlants);
    addFact("incompatiblePlants", crop.incompatiblePlants);
    // Local
    addFact("typhoonResistance", crop.typhoonResistance);

    if (baseFacts.length > 0) {
      await ctx.db.insert("cropProfiles", {
        cropId,
        scope: "base",
        status: "active",
        facts: baseFacts,
        updatedAt: now,
      });
    }

    // Location profile for Hualien-specific content (keyed to "TW-HUA")
    const locationFacts: typeof baseFacts = [];
    if (crop.hualienNotes) {
      locationFacts.push({
        key: "localNotes",
        value: JSON.stringify(crop.hualienNotes),
        confidence: "medium",
        origin: "seeded",
        updatedAt: now,
      });
    }
    if (crop.hualienGrowingTips) {
      locationFacts.push({
        key: "localGrowingTips",
        value: JSON.stringify(crop.hualienGrowingTips),
        confidence: "medium",
        origin: "seeded",
        updatedAt: now,
      });
    }

    if (locationFacts.length > 0) {
      await ctx.db.insert("cropProfiles", {
        cropId,
        scope: "location",
        scopeKey: "TW-HUA",
        geographyGranularity: "county",
        status: "active",
        facts: locationFacts,
        updatedAt: now,
      });
    }

    // Mark crop source as seeded if not already set
    if (!crop.source) {
      await ctx.db.patch(cropId, { source: "seeded" });
    }
  },
});

/**
 * Migrate existing legacy location profiles (scopeKey like "花蓮縣")
 * to use geography keys (scopeKey like "TW-HUA").
 */
export const migrateHualienProfiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const legacyProfiles = await ctx.db
      .query("cropProfiles")
      .withIndex("by_scope", (q) => q.eq("scope", "location"))
      .collect();

    const now = Date.now();
    let migrated = 0;

    for (const profile of legacyProfiles) {
      // Skip profiles that already use geography key format
      if (profile.geographyGranularity) continue;

      let newScopeKey: string | undefined;
      let granularity: string | undefined;

      if (profile.scopeKey === "花蓮縣") {
        newScopeKey = "TW-HUA";
        granularity = "county";
      } else if (profile.scopeKey?.startsWith("花蓮縣/")) {
        const district = profile.scopeKey.replace("花蓮縣/", "");
        const districtShort = district.slice(0, 2);
        newScopeKey = `TW-HUA-${districtShort}`;
        granularity = "district";
      }

      if (newScopeKey && granularity) {
        await ctx.db.patch(profile._id, {
          scopeKey: newScopeKey,
          geographyGranularity: granularity,
          updatedAt: now,
        });
        migrated++;
      }
    }

    return { migrated };
  },
});

/** Client-callable action to trigger migration for a single crop. */
export const triggerMigration = action({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    await ctx.runMutation(internal.cropProfiles.migrateCropToProfiles, { cropId });
  },
});

/** Client-callable action to migrate legacy Hualien profiles to geography keys. */
export const triggerHualienMigration = action({
  args: {},
  handler: async (ctx) => {
    return await ctx.runMutation(internal.cropProfiles.migrateHualienProfiles, {});
  },
});
