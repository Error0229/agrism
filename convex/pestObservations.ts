import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { requireFarmMembership } from "./_helpers";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const list = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);
    const results = await ctx.db
      .query("pestObservations")
      .withIndex("by_farmId", (q) => q.eq("farmId", args.farmId))
      .collect();
    return results.sort((a, b) => b.observedAt - a.observedAt);
  },
});

export const listByCrop = query({
  args: { cropId: v.id("crops") },
  handler: async (ctx, args) => {
    const crop = await ctx.db.get(args.cropId);
    if (!crop) return [];
    await requireFarmMembership(ctx, crop.farmId);
    const results = await ctx.db
      .query("pestObservations")
      .withIndex("by_cropId", (q) => q.eq("cropId", args.cropId))
      .collect();
    return results.sort((a, b) => b.observedAt - a.observedAt);
  },
});

export const getById = query({
  args: { observationId: v.id("pestObservations") },
  handler: async (ctx, args) => {
    const obs = await ctx.db.get(args.observationId);
    if (!obs) return null;
    await requireFarmMembership(ctx, obs.farmId);
    return obs;
  },
});

// Internal query — used by actions that bypass auth
export const getByIdInternal = internalQuery({
  args: { observationId: v.id("pestObservations") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.observationId);
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const create = mutation({
  args: {
    farmId: v.id("farms"),
    fieldId: v.optional(v.id("fields")),
    plantedCropId: v.optional(v.id("plantedCrops")),
    cropId: v.optional(v.id("crops")),
    symptoms: v.string(),
    affectedParts: v.optional(v.array(v.string())),
    severity: v.union(v.literal("mild"), v.literal("moderate"), v.literal("severe")),
    spreadRate: v.optional(v.string()),
    environmentNotes: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);
    return ctx.db.insert("pestObservations", {
      ...args,
      observedAt: Date.now(),
      triageStatus: "pending",
    });
  },
});

export const resolve = mutation({
  args: {
    observationId: v.id("pestObservations"),
    resolution: v.string(),
  },
  handler: async (ctx, args) => {
    const obs = await ctx.db.get(args.observationId);
    if (!obs) throw new Error("找不到觀察紀錄");
    await requireFarmMembership(ctx, obs.farmId);
    await ctx.db.patch(args.observationId, {
      triageStatus: "resolved",
      resolution: args.resolution,
    });
  },
});

export const update = mutation({
  args: {
    observationId: v.id("pestObservations"),
    notes: v.optional(v.string()),
    resolution: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const obs = await ctx.db.get(args.observationId);
    if (!obs) throw new Error("找不到觀察紀錄");
    await requireFarmMembership(ctx, obs.farmId);
    const { observationId, ...patch } = args;
    await ctx.db.patch(observationId, patch);
  },
});

// Internal mutation used by triage action
export const updateTriageResults = internalMutation({
  args: {
    observationId: v.id("pestObservations"),
    triageResults: v.array(v.object({
      possibleCause: v.string(),
      likelihood: v.string(),
      reasoning: v.string(),
      nextChecks: v.string(),
      treatment: v.string(),
      eppoCode: v.optional(v.string()),
      referenceImageId: v.optional(v.id("pestReferenceImages")),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.observationId, {
      triageResults: args.triageResults,
      triageStatus: "triaged",
    });
  },
});

// Internal mutation used to link reference image IDs to an observation
export const linkReferenceImages = internalMutation({
  args: {
    observationId: v.id("pestObservations"),
    referenceImageIds: v.array(v.id("pestReferenceImages")),
    triageResults: v.optional(v.array(v.object({
      possibleCause: v.string(),
      likelihood: v.string(),
      reasoning: v.string(),
      nextChecks: v.string(),
      treatment: v.string(),
      eppoCode: v.optional(v.string()),
      referenceImageId: v.optional(v.id("pestReferenceImages")),
    }))),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      referenceImageIds: args.referenceImageIds,
    };
    if (args.triageResults) {
      patch.triageResults = args.triageResults;
    }
    await ctx.db.patch(args.observationId, patch);
  },
});
