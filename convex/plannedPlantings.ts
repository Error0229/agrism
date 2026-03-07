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

type OccupancyEntry = {
  regionId: string | undefined;
  type: "current" | "planned";
  sourceId: string;
  cropId: string | undefined;
  cropName: string | undefined;
  startWindow: { earliest: number | undefined; latest: number | undefined };
  endWindow: { earliest: number | undefined; latest: number | undefined };
  isPerennial: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_GROWTH_DAYS = 90;

async function buildFieldOccupancy(
  ctx: QueryCtx | MutationCtx,
  fieldId: Id<"fields">,
): Promise<OccupancyEntry[]> {
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

  // Batch-fetch all unique crop IDs to avoid N+1 queries
  const cropIdSet = new Set<Id<"crops">>();
  for (const pc of plantedCrops) {
    if (pc.cropId && pc.status !== "removed") cropIdSet.add(pc.cropId);
  }
  for (const pp of activePlans) {
    if (pp.cropId && !pp.cropName) cropIdSet.add(pp.cropId);
  }
  const cropMap = new Map<string, { name: string; growthDays?: number; lifecycleType?: string }>();
  await Promise.all(
    [...cropIdSet].map(async (cropId) => {
      const crop = await ctx.db.get(cropId);
      if (crop) cropMap.set(cropId, {
        name: crop.name,
        growthDays: crop.growthDays,
        lifecycleType: crop.lifecycleType,
      });
    }),
  );

  const occupancy: OccupancyEntry[] = [];

  // Build occupancy from current planted crops
  for (const pc of plantedCrops) {
    if (pc.status === "removed") continue;

    const crop = pc.cropId ? cropMap.get(pc.cropId) : undefined;
    const lifecycleType = crop?.lifecycleType ?? pc.lifecycleType;
    const isPerennial =
      lifecycleType === "perennial" || lifecycleType === "orchard";

    const cropName = crop?.name;

    // Calculate estimated end dates if not explicitly set and not perennial
    let endEarliest = pc.endWindowEarliest;
    let endLatest = pc.endWindowLatest;
    if (!isPerennial && !endEarliest && !endLatest) {
      const growthDays = pc.customGrowthDays ?? crop?.growthDays ?? DEFAULT_GROWTH_DAYS;
      const growthMs = growthDays * DAY_MS;
      const plantedTs = pc.plantedDate
        ? new Date(pc.plantedDate).getTime()
        : undefined;
      const startTs = plantedTs ?? pc.plantStartEarliest;
      if (startTs) {
        endEarliest = startTs + growthMs;
        endLatest = startTs + growthMs;
      }
      if (pc.plantStartLatest) {
        endLatest = pc.plantStartLatest + growthMs;
      }
    }

    occupancy.push({
      regionId: undefined,
      type: "current",
      sourceId: pc._id,
      cropId: pc.cropId ?? undefined,
      cropName,
      startWindow: {
        earliest: pc.plantStartEarliest ?? (pc.plantedDate ? new Date(pc.plantedDate).getTime() : undefined),
        latest: pc.plantStartLatest,
      },
      endWindow: {
        earliest: isPerennial ? undefined : endEarliest,
        latest: isPerennial ? undefined : endLatest,
      },
      isPerennial,
    });
  }

  // Build occupancy from planned plantings
  for (const pp of activePlans) {
    const cropName = pp.cropName ?? (pp.cropId ? cropMap.get(pp.cropId)?.name : undefined);

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
      isPerennial: false,
    });
  }

  return occupancy;
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
    return buildFieldOccupancy(ctx, fieldId);
  },
});

export const checkOverlap = query({
  args: {
    fieldId: v.id("fields"),
    startEarliest: v.optional(v.number()),
    endLatest: v.optional(v.number()),
    excludePlanId: v.optional(v.id("plannedPlantings")),
  },
  handler: async (ctx, { fieldId, startEarliest, endLatest, excludePlanId }) => {
    const farmId = await resolveFieldFarmId(ctx, fieldId);
    await requireFarmMembership(ctx, farmId);

    const occupancy = await buildFieldOccupancy(ctx, fieldId);

    // Filter entries that overlap with the given time window
    // Overlap condition: entry.start < proposed.end AND entry.end > proposed.start
    return occupancy.filter((entry) => {
      // Exclude the entry matching excludePlanId
      if (excludePlanId && entry.sourceId === excludePlanId) return false;

      // Perennial entries always overlap (they never end)
      if (entry.isPerennial) {
        // A perennial occupies from its start onward indefinitely
        const entryStart = entry.startWindow.earliest;
        if (entryStart !== undefined && endLatest !== undefined && entryStart >= endLatest) {
          return false; // perennial starts after our proposed window ends
        }
        return true;
      }

      // Use earliest known start and latest known end for overlap check
      const entryStart = entry.startWindow.earliest;
      const entryEnd = entry.endWindow.latest ?? entry.endWindow.earliest;

      // If either entry has no timing info, we can't determine overlap — skip
      if (entryStart === undefined && entryEnd === undefined) return false;

      // Check overlap: entry.start < proposed.end AND entry.end > proposed.start
      const startsBeforeEnd =
        entryStart === undefined || endLatest === undefined || entryStart < endLatest;
      const endsAfterStart =
        entryEnd === undefined || startEarliest === undefined || entryEnd > startEarliest;

      return startsBeforeEnd && endsAfterStart;
    });
  },
});

export const getSuccessionChain = query({
  args: {
    fieldId: v.id("fields"),
    plantedCropId: v.id("plantedCrops"),
  },
  handler: async (ctx, { fieldId, plantedCropId }) => {
    const farmId = await resolveFieldFarmId(ctx, fieldId);
    await requireFarmMembership(ctx, farmId);

    // Get all planned plantings for this field
    const allPlans = await ctx.db
      .query("plannedPlantings")
      .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
      .collect();
    const activePlans = allPlans.filter((p) => p.planningState !== "cancelled");

    // Build chain: find all plans linked to this plantedCropId via predecessor links
    const chain: typeof activePlans = [];
    const visited = new Set<string>();

    // Find direct successors of the plantedCropId
    const queue: string[] = [plantedCropId];
    const sourceType: Map<string, "plantedCrop" | "plan"> = new Map();
    sourceType.set(plantedCropId, "plantedCrop");

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      for (const plan of activePlans) {
        if (visited.has(plan._id)) continue;

        const isSuccessor =
          (sourceType.get(currentId) === "plantedCrop" && plan.predecessorPlantedCropId === currentId) ||
          (sourceType.get(currentId) === "plan" && plan.predecessorPlanId === currentId);

        if (isSuccessor) {
          chain.push(plan);
          sourceType.set(plan._id, "plan");
          queue.push(plan._id);
        }
      }
    }

    return chain;
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

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
  },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);
    // Verify the field belongs to this farm
    const field = await ctx.db.get(args.fieldId);
    if (!field || field.farmId !== args.farmId) {
      throw new Error("田區不屬於此農場");
    }

    let startWindowEarliest = args.startWindowEarliest;
    let startWindowLatest = args.startWindowLatest;

    // Perennial guard & auto-predecessor timing
    if (args.predecessorPlantedCropId) {
      const predecessor = await ctx.db.get(args.predecessorPlantedCropId);
      if (predecessor) {
        // Check if predecessor crop is perennial/orchard
        let predLifecycleType: string | undefined = predecessor.lifecycleType;
        if (!predLifecycleType && predecessor.cropId) {
          const predCrop = await ctx.db.get(predecessor.cropId);
          if (predCrop) predLifecycleType = predCrop.lifecycleType;
        }
        if (predLifecycleType === "perennial" || predLifecycleType === "orchard") {
          throw new Error("多年生作物區域無法規劃輪作");
        }

        // Auto-fill start window from predecessor's estimated end
        if (!startWindowEarliest && !startWindowLatest) {
          // Build occupancy to find predecessor's end window
          const occupancy = await buildFieldOccupancy(ctx, args.fieldId);
          const predEntry = occupancy.find(
            (e) => e.sourceId === args.predecessorPlantedCropId,
          );
          if (predEntry) {
            if (predEntry.endWindow.earliest !== undefined) {
              startWindowEarliest = new Date(predEntry.endWindow.earliest).toISOString();
            }
            if (predEntry.endWindow.latest !== undefined) {
              startWindowLatest = new Date(predEntry.endWindow.latest).toISOString();
            }
          }
        }
      }
    }

    const now = Date.now();
    const id = await ctx.db.insert("plannedPlantings", {
      farmId: args.farmId,
      fieldId: args.fieldId,
      regionId: args.regionId,
      cropId: args.cropId,
      cropName: args.cropName,
      planningState: "draft",
      startWindowEarliest,
      startWindowLatest,
      endWindowEarliest: args.endWindowEarliest,
      endWindowLatest: args.endWindowLatest,
      predecessorPlantedCropId: args.predecessorPlantedCropId,
      predecessorPlanId: args.predecessorPlanId,
      notes: args.notes,
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
