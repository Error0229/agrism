import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireFarmMembership } from "./_helpers";
import { MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveFieldFarmId(ctx: QueryCtx | MutationCtx, fieldId: Id<"fields">) {
  const field = await ctx.db.get(fieldId);
  if (!field) throw new Error("田區不存在");
  return field.farmId;
}

async function resolvePlannedPlantingFarmId(
  ctx: QueryCtx | MutationCtx,
  plannedPlantingId: Id<"plannedPlantings">,
) {
  const pp = await ctx.db.get(plannedPlantingId);
  if (!pp) throw new Error("找不到規劃種植紀錄");
  return { farmId: pp.farmId, pp };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getByField = query({
  args: { fieldId: v.id("fields") },
  handler: async (ctx, { fieldId }) => {
    const farmId = await resolveFieldFarmId(ctx, fieldId);
    await requireFarmMembership(ctx, farmId);
    const rows = await ctx.db
      .query("plannedPlantings")
      .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
      .collect();
    // Filter out cancelled
    return rows.filter((r) => r.planningState !== "cancelled");
  },
});

export const getByFarm = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    await requireFarmMembership(ctx, farmId);
    const rows = await ctx.db
      .query("plannedPlantings")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .collect();
    return rows.filter((r) => r.planningState !== "cancelled");
  },
});

export const getFieldOccupancy = query({
  args: { fieldId: v.id("fields") },
  handler: async (ctx, { fieldId }) => {
    const farmId = await resolveFieldFarmId(ctx, fieldId);
    await requireFarmMembership(ctx, farmId);

    // Fetch current planted crops
    const plantedCrops = await ctx.db
      .query("plantedCrops")
      .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
      .collect();

    // Fetch planned plantings (non-cancelled)
    const plannedPlantings = await ctx.db
      .query("plannedPlantings")
      .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
      .collect();
    const activePlans = plannedPlantings.filter(
      (p) => p.planningState !== "cancelled",
    );

    type OccupancyEntry = {
      regionId: string | undefined;
      type: "current" | "planned";
      sourceId: string;
      cropId: string | undefined;
      cropName: string | undefined;
      startWindow: { earliest: number | undefined; latest: number | undefined };
      endWindow: { earliest: number | undefined; latest: number | undefined };
      confidence: "high" | "medium" | "low";
      isPerennial: boolean;
    };

    const occupancy: OccupancyEntry[] = [];

    // Build occupancy from current planted crops
    for (const pc of plantedCrops) {
      if (pc.status === "removed") continue;

      const isPerennial =
        pc.lifecycleType === "perennial" || pc.lifecycleType === "orchard";

      let cropName: string | undefined;
      if (pc.cropId) {
        const crop = await ctx.db.get(pc.cropId);
        cropName = crop?.name;
      }

      occupancy.push({
        regionId: undefined,
        type: "current",
        sourceId: pc._id,
        cropId: pc.cropId ?? undefined,
        cropName,
        startWindow: {
          earliest: pc.plantStartEarliest,
          latest: pc.plantStartLatest,
        },
        endWindow: {
          earliest: isPerennial ? undefined : pc.endWindowEarliest,
          latest: isPerennial ? undefined : pc.endWindowLatest,
        },
        confidence: pc.timelineConfidence ?? "low",
        isPerennial,
      });
    }

    // Build occupancy from planned plantings
    for (const pp of activePlans) {
      let cropName = pp.cropName;
      if (!cropName && pp.cropId) {
        const crop = await ctx.db.get(pp.cropId);
        cropName = crop?.name;
      }

      occupancy.push({
        regionId: pp.regionId,
        type: "planned",
        sourceId: pp._id,
        cropId: pp.cropId ?? undefined,
        cropName,
        startWindow: {
          earliest: pp.startWindowEarliest
            ? new Date(pp.startWindowEarliest).getTime()
            : undefined,
          latest: pp.startWindowLatest
            ? new Date(pp.startWindowLatest).getTime()
            : undefined,
        },
        endWindow: {
          earliest: pp.endWindowEarliest
            ? new Date(pp.endWindowEarliest).getTime()
            : undefined,
          latest: pp.endWindowLatest
            ? new Date(pp.endWindowLatest).getTime()
            : undefined,
        },
        confidence: pp.confidence,
        isPerennial: false,
      });
    }

    return occupancy;
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

const confidenceValidator = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
);

export const create = mutation({
  args: {
    farmId: v.id("farms"),
    fieldId: v.id("fields"),
    regionId: v.optional(v.string()),
    cropId: v.optional(v.id("crops")),
    cropName: v.optional(v.string()),
    startWindowEarliest: v.optional(v.string()),
    startWindowLatest: v.optional(v.string()),
    endWindowEarliest: v.optional(v.string()),
    endWindowLatest: v.optional(v.string()),
    predecessorPlantedCropId: v.optional(v.id("plantedCrops")),
    predecessorPlanId: v.optional(v.id("plannedPlantings")),
    notes: v.optional(v.string()),
    confidence: v.optional(confidenceValidator),
  },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);
    // Verify the field belongs to this farm
    const field = await ctx.db.get(args.fieldId);
    if (!field || field.farmId !== args.farmId) {
      throw new Error("田區不屬於此農場");
    }
    const now = Date.now();
    const id = await ctx.db.insert("plannedPlantings", {
      farmId: args.farmId,
      fieldId: args.fieldId,
      regionId: args.regionId,
      cropId: args.cropId,
      cropName: args.cropName,
      planningState: "draft",
      startWindowEarliest: args.startWindowEarliest,
      startWindowLatest: args.startWindowLatest,
      endWindowEarliest: args.endWindowEarliest,
      endWindowLatest: args.endWindowLatest,
      predecessorPlantedCropId: args.predecessorPlantedCropId,
      predecessorPlanId: args.predecessorPlanId,
      notes: args.notes,
      confidence: args.confidence ?? "medium",
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const update = mutation({
  args: {
    plannedPlantingId: v.id("plannedPlantings"),
    regionId: v.optional(v.string()),
    cropId: v.optional(v.id("crops")),
    cropName: v.optional(v.string()),
    startWindowEarliest: v.optional(v.string()),
    startWindowLatest: v.optional(v.string()),
    endWindowEarliest: v.optional(v.string()),
    endWindowLatest: v.optional(v.string()),
    predecessorPlantedCropId: v.optional(v.id("plantedCrops")),
    predecessorPlanId: v.optional(v.id("plannedPlantings")),
    notes: v.optional(v.string()),
    confidence: v.optional(confidenceValidator),
  },
  handler: async (ctx, { plannedPlantingId, ...patch }) => {
    const { farmId } = await resolvePlannedPlantingFarmId(ctx, plannedPlantingId);
    await requireFarmMembership(ctx, farmId);
    const updates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(patch)) {
      if (val !== undefined) updates[key] = val;
    }
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = Date.now();
      await ctx.db.patch(plannedPlantingId, updates);
    }
  },
});

export const remove = mutation({
  args: { plannedPlantingId: v.id("plannedPlantings") },
  handler: async (ctx, { plannedPlantingId }) => {
    const { farmId, pp } = await resolvePlannedPlantingFarmId(ctx, plannedPlantingId);
    await requireFarmMembership(ctx, farmId);
    if (pp.planningState !== "draft" && pp.planningState !== "cancelled") {
      throw new Error("只能刪除草稿或已取消的規劃");
    }
    await ctx.db.delete(plannedPlantingId);
  },
});

export const confirm = mutation({
  args: { plannedPlantingId: v.id("plannedPlantings") },
  handler: async (ctx, { plannedPlantingId }) => {
    const { farmId } = await resolvePlannedPlantingFarmId(ctx, plannedPlantingId);
    await requireFarmMembership(ctx, farmId);
    await ctx.db.patch(plannedPlantingId, {
      planningState: "confirmed",
      updatedAt: Date.now(),
    });
  },
});

export const complete = mutation({
  args: { plannedPlantingId: v.id("plannedPlantings") },
  handler: async (ctx, { plannedPlantingId }) => {
    const { farmId } = await resolvePlannedPlantingFarmId(ctx, plannedPlantingId);
    await requireFarmMembership(ctx, farmId);
    await ctx.db.patch(plannedPlantingId, {
      planningState: "completed",
      updatedAt: Date.now(),
    });
  },
});

export const cancel = mutation({
  args: { plannedPlantingId: v.id("plannedPlantings") },
  handler: async (ctx, { plannedPlantingId }) => {
    const { farmId } = await resolvePlannedPlantingFarmId(ctx, plannedPlantingId);
    await requireFarmMembership(ctx, farmId);
    await ctx.db.patch(plannedPlantingId, {
      planningState: "cancelled",
      updatedAt: Date.now(),
    });
  },
});
