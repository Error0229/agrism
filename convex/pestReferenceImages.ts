import { query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./_helpers";

// === Shared validator for reference image objects ===

const referenceImageValidator = v.object({
  url: v.string(),
  thumbnailUrl: v.string(),
  category: v.string(),
  description: v.optional(v.string()),
  sourceUrl: v.string(),
  author: v.optional(v.string()),
  license: v.string(),
});

// Auth: login-only check — reference images are global/shared data from MOA/EPPO, not farm-specific.
// Using requireAuth (not requireFarmMembership) is intentional.

// ---------------------------------------------------------------------------
// Public Queries (auth required)
// ---------------------------------------------------------------------------

export const listByPestName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Try Chinese name first
    const byCh = await ctx.db
      .query("pestReferenceImages")
      .withIndex("by_pestNameCh", (q) => q.eq("pestNameCh", args.name))
      .collect();

    if (byCh.length > 0) return byCh;

    // Fall back to scientific name
    const bySci = await ctx.db
      .query("pestReferenceImages")
      .withIndex("by_pestNameScientific", (q) => q.eq("pestNameScientific", args.name))
      .collect();

    return bySci;
  },
});

export const listByCrop = query({
  args: { cropScientificName: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return ctx.db
      .query("pestReferenceImages")
      .withIndex("by_cropScientificName", (q) =>
        q.eq("cropScientificName", args.cropScientificName)
      )
      .collect();
  },
});

export const getByEppoCode = query({
  args: { eppoCode: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return ctx.db
      .query("pestReferenceImages")
      .withIndex("by_eppoCode", (q) => q.eq("eppoCode", args.eppoCode))
      .first();
  },
});

export const listAll = query({
  args: {
    source: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const maxResults = Math.min(args.limit ?? 50, 200);

    if (args.source) {
      const results = await ctx.db
        .query("pestReferenceImages")
        .withIndex("by_source", (q) => q.eq("source", args.source!))
        .take(maxResults);
      return results;
    }

    return ctx.db
      .query("pestReferenceImages")
      .take(maxResults);
  },
});

export const getById = query({
  args: { id: v.id("pestReferenceImages") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return ctx.db.get(args.id);
  },
});

// ---------------------------------------------------------------------------
// Internal Queries (used by actions)
// ---------------------------------------------------------------------------

export const getBySourceId = internalQuery({
  args: { source: v.string(), sourceId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pestReferenceImages")
      .withIndex("by_source_sourceId", (q) =>
        q.eq("source", args.source).eq("sourceId", args.sourceId)
      )
      .first();
  },
});

export const getByEppoCodeInternal = internalQuery({
  args: { eppoCode: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("pestReferenceImages")
      .withIndex("by_eppoCode", (q) => q.eq("eppoCode", args.eppoCode))
      .first();
  },
});

// ---------------------------------------------------------------------------
// Internal Mutations (used by import/lookup actions)
// ---------------------------------------------------------------------------

export const upsert = internalMutation({
  args: {
    source: v.string(),
    sourceId: v.string(),
    pestNameCh: v.string(),
    pestNameEn: v.optional(v.string()),
    pestNameScientific: v.optional(v.string()),
    eppoCode: v.optional(v.string()),
    orderLatin: v.optional(v.string()),
    orderCh: v.optional(v.string()),
    familyLatin: v.optional(v.string()),
    familyCh: v.optional(v.string()),
    feedingMethod: v.optional(v.string()),
    harmParts: v.optional(v.array(v.string())),
    cropName: v.optional(v.string()),
    cropScientificName: v.optional(v.string()),
    cropFamily: v.optional(v.string()),
    images: v.array(referenceImageValidator),
    importedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Check if record already exists
    const match = await ctx.db
      .query("pestReferenceImages")
      .withIndex("by_source_sourceId", (q) =>
        q.eq("source", args.source).eq("sourceId", args.sourceId)
      )
      .first();

    if (match) {
      // Update existing record
      await ctx.db.patch(match._id, {
        ...args,
        lastUpdated: Date.now(),
      });
      return match._id;
    }

    // Insert new record
    return ctx.db.insert("pestReferenceImages", args);
  },
});
