import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireFarmMembership } from "./_helpers";

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

/**
 * Return merged/resolved facts for a crop.
 * Merges base -> location -> farm, with later scopes winning per key.
 * Optionally filters location profiles to the farm's location.
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

    // Only include active profiles
    let profiles = allProfiles.filter((p) => p.status === "active");

    // If farmId provided, filter location profiles to the farm's location
    // and farm profiles to this farm.
    if (farmId) {
      const farm = await ctx.db.get(farmId);
      const locationKey = farm?.countyCity
        ? farm.districtTownship
          ? `${farm.countyCity}/${farm.districtTownship}`
          : farm.countyCity
        : null;

      profiles = profiles.filter((p) => {
        if (p.scope === "base") return true;
        if (p.scope === "location") {
          return locationKey ? p.scopeKey === locationKey : false;
        }
        if (p.scope === "farm") {
          return p.scopeKey === farmId;
        }
        return false;
      });
    }

    // Resolve: base -> location -> farm
    const scopeOrder: Record<string, number> = { base: 0, location: 1, farm: 2 };
    const sorted = [...profiles].sort(
      (a, b) => (scopeOrder[a.scope] ?? 0) - (scopeOrder[b.scope] ?? 0),
    );

    const factMap = new Map<
      string,
      {
        key: string;
        value: string;
        unit?: string;
        confidence?: string;
        origin?: string;
        sourceRefs?: string[];
        resolvedFrom: string;
        profileId: string;
      }
    >();

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
  },
});

// === Mutations ===

/** Create or update a crop profile. */
export const upsertCropProfile = mutation({
  args: {
    cropId: v.id("crops"),
    scope: v.string(),
    scopeKey: v.optional(v.string()),
    status: v.optional(v.string()),
    facts: v.array(factValidator),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { cropId, scope, scopeKey, status, facts, notes }) => {
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
        updatedAt: now,
      });
      return match._id;
    }

    return ctx.db.insert("cropProfiles", {
      cropId,
      scope,
      scopeKey,
      status: status ?? "active",
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

// === Migration ===

/**
 * Migrate a single crop's flat fields into base + location profiles.
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

    // Location profile for Hualien-specific content
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
        scopeKey: "花蓮縣",
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
