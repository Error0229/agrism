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
// Unified Region Plan Query (issue #105)
// Replaces the need for both getFieldOccupancy (for a region) + getSuccessionChain
// ---------------------------------------------------------------------------

type RegionPlanEntry = {
  _id: string;
  type: "current" | "planned";
  cropId: string | undefined;
  cropName: string | undefined;
  planningState: string | undefined;
  startWindow: { earliest: string | undefined; latest: string | undefined };
  endWindow: { earliest: string | undefined; latest: string | undefined };
  predecessorPlantedCropId: string | undefined;
  predecessorPlanId: string | undefined;
  successorPlanIds: string[];
  overlaps: Array<{ planId: string; cropName: string | undefined }>;
  isPerennial: boolean;
  confidence: string | undefined;
  notes: string | undefined;
};

/**
 * Walk the succession chain from a given root (plantedCropId or planId) forward
 * through predecessor links, returning plan IDs in BFS order.
 */
function walkChainForward(
  activePlans: Array<{
    _id: string;
    predecessorPlantedCropId?: string;
    predecessorPlanId?: string;
  }>,
  rootId: string,
  rootType: "plantedCrop" | "plan",
): string[] {
  const chain: string[] = [];
  const visited = new Set<string>();
  const queue: Array<{ id: string; kind: "plantedCrop" | "plan" }> = [
    { id: rootId, kind: rootType },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    for (const plan of activePlans) {
      if (visited.has(plan._id)) continue;
      const isSuccessor =
        (current.kind === "plantedCrop" &&
          plan.predecessorPlantedCropId === current.id) ||
        (current.kind === "plan" && plan.predecessorPlanId === current.id);
      if (isSuccessor) {
        chain.push(plan._id);
        queue.push({ id: plan._id, kind: "plan" });
      }
    }
  }
  return chain;
}

/**
 * Build a successor lookup: for each plan/plantedCrop ID, which plan IDs are its
 * direct successors?
 */
function buildSuccessorMap(
  activePlans: Array<{
    _id: string;
    predecessorPlantedCropId?: string;
    predecessorPlanId?: string;
  }>,
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const plan of activePlans) {
    if (plan.predecessorPlantedCropId) {
      const arr = map.get(plan.predecessorPlantedCropId) ?? [];
      arr.push(plan._id);
      map.set(plan.predecessorPlantedCropId, arr);
    }
    if (plan.predecessorPlanId) {
      const arr = map.get(plan.predecessorPlanId) ?? [];
      arr.push(plan._id);
      map.set(plan.predecessorPlanId, arr);
    }
  }
  return map;
}

export const getRegionPlan = query({
  args: {
    fieldId: v.id("fields"),
    plantedCropId: v.optional(v.id("plantedCrops")),
    regionId: v.optional(v.string()),
  },
  handler: async (ctx, { fieldId, plantedCropId, regionId }) => {
    const farmId = await resolveFieldFarmId(ctx, fieldId);
    await requireFarmMembership(ctx, farmId);

    // Determine effective regionId — regionId is typically the plantedCropId string
    const effectiveRegionId = regionId ?? (plantedCropId as string | undefined);

    // ── Fetch all planted crops for this field ──
    const allPlantedCrops = await ctx.db
      .query("plantedCrops")
      .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
      .collect();

    // ── Fetch all planned plantings for this field ──
    const allPlannedPlantings = await ctx.db
      .query("plannedPlantings")
      .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
      .collect();
    const activePlans = allPlannedPlantings.filter(
      (p) => p.planningState !== "cancelled",
    );

    // ── Batch-fetch crop data ──
    const cropIdSet = new Set<Id<"crops">>();
    for (const pc of allPlantedCrops) {
      if (pc.cropId) cropIdSet.add(pc.cropId);
    }
    for (const pp of activePlans) {
      if (pp.cropId) cropIdSet.add(pp.cropId);
    }
    const cropMap = new Map<
      string,
      { name: string; growthDays?: number; lifecycleType?: string; rotationFamily?: string }
    >();
    await Promise.all(
      [...cropIdSet].map(async (cropId) => {
        const crop = await ctx.db.get(cropId);
        if (crop)
          cropMap.set(cropId, {
            name: crop.name,
            growthDays: crop.growthDays,
            lifecycleType: crop.lifecycleType,
            rotationFamily: crop.rotationFamily,
          });
      }),
    );

    // ── Find the current planted crop (if specified) ──
    let currentCrop: (typeof allPlantedCrops)[number] | undefined;
    if (plantedCropId) {
      currentCrop = allPlantedCrops.find((pc) => pc._id === plantedCropId);
    }

    // ── Build successor map ──
    const successorMap = buildSuccessorMap(
      activePlans.map((p) => ({
        _id: p._id,
        predecessorPlantedCropId: p.predecessorPlantedCropId as
          | string
          | undefined,
        predecessorPlanId: p.predecessorPlanId as string | undefined,
      })),
    );

    // ── Determine which plans belong to the region ──
    // Plans belong to the region if:
    // 1. They are in the succession chain from this plantedCropId, OR
    // 2. Their regionId matches the effectiveRegionId
    const chainPlanIds = new Set<string>();
    if (plantedCropId) {
      const chainIds = walkChainForward(
        activePlans.map((p) => ({
          _id: p._id,
          predecessorPlantedCropId: p.predecessorPlantedCropId as
            | string
            | undefined,
          predecessorPlanId: p.predecessorPlanId as string | undefined,
        })),
        plantedCropId,
        "plantedCrop",
      );
      for (const id of chainIds) chainPlanIds.add(id);
    }

    // Region-matched plans (by regionId)
    const regionPlanIds = new Set<string>();
    if (effectiveRegionId) {
      for (const pp of activePlans) {
        if (pp.regionId === effectiveRegionId) {
          regionPlanIds.add(pp._id);
        }
      }
    }

    // Union of chain + region plans
    const allRegionPlanIds = new Set([...chainPlanIds, ...regionPlanIds]);

    // Separate into successors (in chain) and orphans (region-matched but not in chain)
    const successorPlans = activePlans
      .filter((p) => chainPlanIds.has(p._id))
      .sort((a, b) => {
        // Sort by start window chronologically
        const aStart = a.startWindowEarliest
          ? new Date(a.startWindowEarliest).getTime()
          : Infinity;
        const bStart = b.startWindowEarliest
          ? new Date(b.startWindowEarliest).getTime()
          : Infinity;
        return aStart - bStart;
      });

    const orphanPlans = activePlans
      .filter(
        (p) => regionPlanIds.has(p._id) && !chainPlanIds.has(p._id),
      )
      .sort((a, b) => {
        const aStart = a.startWindowEarliest
          ? new Date(a.startWindowEarliest).getTime()
          : Infinity;
        const bStart = b.startWindowEarliest
          ? new Date(b.startWindowEarliest).getTime()
          : Infinity;
        return aStart - bStart;
      });

    // ── Build overlap detection for plans in this region ──
    // Collect all occupancy entries for this region to detect overlaps
    const regionOccupancy: Array<{
      id: string;
      cropName: string | undefined;
      startTs: number | undefined;
      endTs: number | undefined;
    }> = [];

    // Add current crop occupancy
    if (currentCrop && currentCrop.status !== "removed") {
      const crop = currentCrop.cropId
        ? cropMap.get(currentCrop.cropId)
        : undefined;
      const lifecycleType = crop?.lifecycleType ?? currentCrop.lifecycleType;
      const isPerennial =
        lifecycleType === "perennial" || lifecycleType === "orchard";

      let endTs: number | undefined;
      if (!isPerennial) {
        endTs =
          currentCrop.endWindowLatest ?? currentCrop.endWindowEarliest;
        if (!endTs) {
          const growthDays =
            currentCrop.customGrowthDays ??
            crop?.growthDays ??
            DEFAULT_GROWTH_DAYS;
          const startTs =
            (currentCrop.plantedDate
              ? new Date(currentCrop.plantedDate).getTime()
              : undefined) ?? currentCrop.plantStartEarliest;
          if (startTs) endTs = startTs + growthDays * DAY_MS;
        }
      }

      regionOccupancy.push({
        id: currentCrop._id,
        cropName: crop?.name,
        startTs:
          currentCrop.plantStartEarliest ??
          (currentCrop.plantedDate
            ? new Date(currentCrop.plantedDate).getTime()
            : undefined),
        endTs: isPerennial ? undefined : endTs,
      });
    }

    // Add all region plans to occupancy for overlap checking
    for (const pp of activePlans) {
      if (!allRegionPlanIds.has(pp._id)) continue;
      regionOccupancy.push({
        id: pp._id,
        cropName:
          pp.cropName ??
          (pp.cropId ? cropMap.get(pp.cropId)?.name : undefined),
        startTs: pp.startWindowEarliest
          ? new Date(pp.startWindowEarliest).getTime()
          : undefined,
        endTs: pp.endWindowLatest
          ? new Date(pp.endWindowLatest).getTime()
          : pp.endWindowEarliest
            ? new Date(pp.endWindowEarliest).getTime()
            : undefined,
      });
    }

    // Detect pairwise overlaps
    function findOverlaps(
      entryId: string,
      startTs: number | undefined,
      endTs: number | undefined,
    ): Array<{ planId: string; cropName: string | undefined }> {
      const overlaps: Array<{ planId: string; cropName: string | undefined }> =
        [];
      for (const other of regionOccupancy) {
        if (other.id === entryId) continue;
        // Skip if either has no timing
        if (
          other.startTs === undefined &&
          other.endTs === undefined
        )
          continue;
        if (startTs === undefined && endTs === undefined) continue;

        const startsBeforeEnd =
          other.startTs === undefined ||
          endTs === undefined ||
          other.startTs < endTs;
        const endsAfterStart =
          other.endTs === undefined ||
          startTs === undefined ||
          other.endTs > startTs;

        if (startsBeforeEnd && endsAfterStart) {
          overlaps.push({ planId: other.id, cropName: other.cropName });
        }
      }
      return overlaps;
    }

    // ── Build the current crop entry ──
    let currentEntry: RegionPlanEntry | null = null;
    if (currentCrop && currentCrop.status !== "removed") {
      const crop = currentCrop.cropId
        ? cropMap.get(currentCrop.cropId)
        : undefined;
      const lifecycleType = crop?.lifecycleType ?? currentCrop.lifecycleType;
      const isPerennial =
        lifecycleType === "perennial" || lifecycleType === "orchard";

      let endEarliest = currentCrop.endWindowEarliest;
      let endLatest = currentCrop.endWindowLatest;
      if (!isPerennial && !endEarliest && !endLatest) {
        const growthDays =
          currentCrop.customGrowthDays ??
          crop?.growthDays ??
          DEFAULT_GROWTH_DAYS;
        const growthMs = growthDays * DAY_MS;
        const plantedTs = currentCrop.plantedDate
          ? new Date(currentCrop.plantedDate).getTime()
          : undefined;
        const startTs = plantedTs ?? currentCrop.plantStartEarliest;
        if (startTs) {
          endEarliest = startTs + growthMs;
          endLatest = startTs + growthMs;
        }
        if (currentCrop.plantStartLatest) {
          endLatest = currentCrop.plantStartLatest + growthMs;
        }
      }

      const startEarliestTs =
        currentCrop.plantStartEarliest ??
        (currentCrop.plantedDate
          ? new Date(currentCrop.plantedDate).getTime()
          : undefined);

      currentEntry = {
        _id: currentCrop._id,
        type: "current",
        cropId: currentCrop.cropId ?? undefined,
        cropName: crop?.name,
        planningState: currentCrop.status,
        startWindow: {
          earliest: startEarliestTs
            ? new Date(startEarliestTs).toISOString().slice(0, 10)
            : undefined,
          latest: currentCrop.plantStartLatest
            ? new Date(currentCrop.plantStartLatest)
                .toISOString()
                .slice(0, 10)
            : undefined,
        },
        endWindow: {
          earliest:
            !isPerennial && endEarliest
              ? new Date(endEarliest).toISOString().slice(0, 10)
              : undefined,
          latest:
            !isPerennial && endLatest
              ? new Date(endLatest).toISOString().slice(0, 10)
              : undefined,
        },
        predecessorPlantedCropId: undefined,
        predecessorPlanId: undefined,
        successorPlanIds: successorMap.get(currentCrop._id) ?? [],
        overlaps: findOverlaps(
          currentCrop._id,
          startEarliestTs,
          isPerennial ? undefined : (endLatest ?? endEarliest),
        ),
        isPerennial,
        confidence: currentCrop.timelineConfidence,
        notes: currentCrop.notes,
      };
    }

    // ── Build successor entries ──
    function buildPlanEntry(
      pp: (typeof activePlans)[number],
    ): RegionPlanEntry {
      const cropName =
        pp.cropName ?? (pp.cropId ? cropMap.get(pp.cropId)?.name : undefined);
      const startTs = pp.startWindowEarliest
        ? new Date(pp.startWindowEarliest).getTime()
        : undefined;
      const endTs = pp.endWindowLatest
        ? new Date(pp.endWindowLatest).getTime()
        : pp.endWindowEarliest
          ? new Date(pp.endWindowEarliest).getTime()
          : undefined;

      return {
        _id: pp._id,
        type: "planned",
        cropId: pp.cropId ?? undefined,
        cropName,
        planningState: pp.planningState,
        startWindow: {
          earliest: pp.startWindowEarliest,
          latest: pp.startWindowLatest,
        },
        endWindow: {
          earliest: pp.endWindowEarliest,
          latest: pp.endWindowLatest,
        },
        predecessorPlantedCropId: pp.predecessorPlantedCropId ?? undefined,
        predecessorPlanId: pp.predecessorPlanId ?? undefined,
        successorPlanIds: successorMap.get(pp._id) ?? [],
        overlaps: findOverlaps(pp._id, startTs, endTs),
        isPerennial: false,
        confidence: pp.confidence,
        notes: pp.notes,
      };
    }

    const successors = successorPlans.map(buildPlanEntry);
    const orphans = orphanPlans.map(buildPlanEntry);

    return {
      currentCrop: currentEntry,
      successors,
      orphanPlans: orphans,
    };
  },
});

// ---------------------------------------------------------------------------
// Region History Query (issue #105)
// Returns past plantedCrops (harvested/removed) for a region, ordered desc
// ---------------------------------------------------------------------------

export const getRegionHistory = query({
  args: {
    fieldId: v.id("fields"),
    regionId: v.optional(v.string()),
    plantedCropId: v.optional(v.id("plantedCrops")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { fieldId, regionId, plantedCropId, limit }) => {
    const farmId = await resolveFieldFarmId(ctx, fieldId);
    await requireFarmMembership(ctx, farmId);

    const maxResults = limit ?? 4;

    // Fetch all planted crops for this field
    const allPlantedCrops = await ctx.db
      .query("plantedCrops")
      .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
      .collect();

    // Find the current planted crop for spatial reference
    let currentCrop: (typeof allPlantedCrops)[number] | undefined;
    if (plantedCropId) {
      currentCrop = allPlantedCrops.find((pc) => pc._id === plantedCropId);
    }

    // Filter to harvested/removed crops that were in the same approximate area
    // We match by comparing spatial position — crops at the same (x, y) coordinates
    // within the field were planted in the "same region"
    const pastCrops = allPlantedCrops.filter((pc) => {
      if (pc.status !== "harvested" && pc.status !== "removed") return false;
      // Exclude the current crop itself
      if (plantedCropId && pc._id === plantedCropId) return false;

      // If we have a spatial reference from the current crop, match by position
      if (currentCrop) {
        // Match crops that occupied the same area (same x/y coordinates)
        const samePosition =
          Math.abs(pc.xM - currentCrop.xM) < 0.01 &&
          Math.abs(pc.yM - currentCrop.yM) < 0.01;
        return samePosition;
      }

      // If only regionId provided, check if any past plantedCrop's ID matches
      // the region-based lookup (regionId in planned plantings is typically
      // the plantedCrop._id as string)
      if (regionId) {
        // Look for predecessor chains that reference this region
        // For region history, we accept all past crops at the same position
        // This fallback returns all past crops on the field if no spatial match
        return true;
      }

      return false;
    });

    // Sort by planting date descending (most recent first)
    pastCrops.sort((a, b) => {
      const aDate = a.plantedDate
        ? new Date(a.plantedDate).getTime()
        : a.plantStartEarliest ?? 0;
      const bDate = b.plantedDate
        ? new Date(b.plantedDate).getTime()
        : b.plantStartEarliest ?? 0;
      return bDate - aDate;
    });

    // Limit results
    const limited = pastCrops.slice(0, maxResults);

    // Batch-fetch crop names
    const cropIdSet = new Set<Id<"crops">>();
    for (const pc of limited) {
      if (pc.cropId) cropIdSet.add(pc.cropId);
    }
    const cropMap = new Map<
      string,
      { name: string; rotationFamily?: string }
    >();
    await Promise.all(
      [...cropIdSet].map(async (cropId) => {
        const crop = await ctx.db.get(cropId);
        if (crop)
          cropMap.set(cropId, {
            name: crop.name,
            rotationFamily: crop.rotationFamily,
          });
      }),
    );

    return limited.map((pc) => {
      const crop = pc.cropId ? cropMap.get(pc.cropId) : undefined;
      return {
        _id: pc._id,
        cropId: pc.cropId ?? undefined,
        cropName: crop?.name,
        rotationFamily: crop?.rotationFamily,
        status: pc.status,
        startDate: pc.plantedDate ?? (pc.plantStartEarliest
          ? new Date(pc.plantStartEarliest).toISOString().slice(0, 10)
          : undefined),
        endDate: pc.harvestedDate ?? (pc.endWindowEarliest
          ? new Date(pc.endWindowEarliest).toISOString().slice(0, 10)
          : undefined),
      };
    });
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
    let predecessorPlantedCropId = args.predecessorPlantedCropId;
    let predecessorPlanId = args.predecessorPlanId;

    // Auto-fill cropName from cropId if not provided (issue #105)
    let cropName = args.cropName;
    if (!cropName && args.cropId) {
      const crop = await ctx.db.get(args.cropId);
      if (crop) cropName = crop.name;
    }

    // ── Auto-linking logic (issue #105) ──
    // When no explicit predecessor is provided but a regionId is given,
    // automatically detect the predecessor from:
    // 1. An active plantedCrop whose _id matches regionId
    // 2. The last planned planting in the existing chain for this region
    if (!predecessorPlantedCropId && !predecessorPlanId && args.regionId) {
      // Check if regionId corresponds to an active plantedCrop
      // regionId is typically a plantedCrop _id string — try to look it up
      let plantedCrop: Awaited<ReturnType<typeof ctx.db.get<"plantedCrops">>> | null = null;
      try {
        plantedCrop = await ctx.db.get(
          args.regionId as Id<"plantedCrops">,
        );
      } catch {
        // regionId is not a valid plantedCrops ID — that's OK, skip
        plantedCrop = null;
      }

      if (plantedCrop && plantedCrop.fieldId === args.fieldId) {
        // Found a matching plantedCrop — check if it's not perennial
        const predCrop = plantedCrop.cropId
          ? await ctx.db.get(plantedCrop.cropId)
          : null;
        const predLifecycleType =
          plantedCrop.lifecycleType ?? predCrop?.lifecycleType;
        if (
          predLifecycleType === "perennial" ||
          predLifecycleType === "orchard"
        ) {
          throw new Error("多年生作物區域無法規劃輪作");
        }

        // Check if there are already planned successors in the chain
        const existingPlans = await ctx.db
          .query("plannedPlantings")
          .withIndex("by_fieldId", (q) => q.eq("fieldId", args.fieldId))
          .collect();
        const activePlans = existingPlans.filter(
          (p) => p.planningState !== "cancelled",
        );

        // Walk the chain from this plantedCrop to find the tail
        const chainIds = walkChainForward(
          activePlans.map((p) => ({
            _id: p._id,
            predecessorPlantedCropId: p.predecessorPlantedCropId as
              | string
              | undefined,
            predecessorPlanId: p.predecessorPlanId as string | undefined,
          })),
          plantedCrop._id,
          "plantedCrop",
        );

        if (chainIds.length > 0) {
          // Append to the end of the chain — set predecessor to last plan
          predecessorPlanId = chainIds[chainIds.length - 1] as Id<"plannedPlantings">;
        } else {
          // No chain yet — set predecessor to the plantedCrop itself
          predecessorPlantedCropId = plantedCrop._id;
        }
      } else {
        // regionId does not correspond to a plantedCrop — check for existing
        // planned plantings in this region to find the chain tail
        const existingPlans = await ctx.db
          .query("plannedPlantings")
          .withIndex("by_fieldId", (q) => q.eq("fieldId", args.fieldId))
          .collect();
        const regionPlans = existingPlans.filter(
          (p) =>
            p.planningState !== "cancelled" &&
            p.regionId === args.regionId,
        );

        if (regionPlans.length > 0) {
          // Find the tail — plans with no successors pointing to them
          const hasSuccessor = new Set<string>();
          for (const p of regionPlans) {
            if (p.predecessorPlanId) hasSuccessor.add(p.predecessorPlanId);
            if (p.predecessorPlantedCropId)
              hasSuccessor.add(p.predecessorPlantedCropId);
          }
          // Tail plans are those not referenced as predecessor by any other plan
          const tailPlans = regionPlans.filter(
            (p) =>
              !regionPlans.some(
                (other) =>
                  other.predecessorPlanId === p._id,
              ),
          );
          if (tailPlans.length > 0) {
            // Sort by start window, pick the latest
            tailPlans.sort((a, b) => {
              const aTs = a.startWindowEarliest
                ? new Date(a.startWindowEarliest).getTime()
                : 0;
              const bTs = b.startWindowEarliest
                ? new Date(b.startWindowEarliest).getTime()
                : 0;
              return bTs - aTs;
            });
            predecessorPlanId = tailPlans[0]._id;
          }
        }
      }
    }

    // Perennial guard & auto-predecessor timing
    if (predecessorPlantedCropId) {
      const predecessor = await ctx.db.get(predecessorPlantedCropId);
      if (predecessor) {
        // Check if predecessor crop is perennial/orchard
        const predCrop = predecessor.cropId ? await ctx.db.get(predecessor.cropId) : null;
        const predLifecycleType = predecessor.lifecycleType ?? predCrop?.lifecycleType;
        if (predLifecycleType === "perennial" || predLifecycleType === "orchard") {
          throw new Error("多年生作物區域無法規劃輪作");
        }

        // Auto-fill start window from predecessor's estimated end
        if (!startWindowEarliest && !startWindowLatest) {
          let endEarliest = predecessor.endWindowEarliest;
          let endLatest = predecessor.endWindowLatest;

          // If not set, estimate from planting date + growth days
          if (!endEarliest && !endLatest) {
            const growthDays = predecessor.customGrowthDays ?? predCrop?.growthDays ?? DEFAULT_GROWTH_DAYS;
            const growthMs = growthDays * DAY_MS;

            const plantedTs = predecessor.plantedDate
              ? new Date(predecessor.plantedDate).getTime()
              : undefined;
            const startTs = plantedTs ?? predecessor.plantStartEarliest;

            if (startTs) {
              endEarliest = startTs + growthMs;
              endLatest = predecessor.plantStartLatest
                ? predecessor.plantStartLatest + growthMs
                : endEarliest;
            }
          }

          if (endEarliest !== undefined) {
            startWindowEarliest = new Date(endEarliest).toISOString().slice(0, 10);
          }
          if (endLatest !== undefined) {
            startWindowLatest = new Date(endLatest).toISOString().slice(0, 10);
          }
        }
      }
    }

    // Auto-fill start window from predecessor plan's end (if predecessorPlanId set)
    if (predecessorPlanId && !predecessorPlantedCropId) {
      if (!startWindowEarliest && !startWindowLatest) {
        const predPlan = await ctx.db.get(predecessorPlanId);
        if (predPlan) {
          // Use the predecessor plan's end window as our start window
          if (predPlan.endWindowEarliest) {
            startWindowEarliest = predPlan.endWindowEarliest;
          }
          if (predPlan.endWindowLatest) {
            startWindowLatest = predPlan.endWindowLatest;
          }
          // If predecessor plan has no end window but has start + crop growthDays
          if (!startWindowEarliest && !startWindowLatest && predPlan.startWindowEarliest) {
            let growthDays = DEFAULT_GROWTH_DAYS;
            if (predPlan.cropId) {
              const predCrop = await ctx.db.get(predPlan.cropId);
              if (predCrop?.growthDays) growthDays = predCrop.growthDays;
            }
            const predStartTs = new Date(predPlan.startWindowEarliest).getTime();
            startWindowEarliest = new Date(predStartTs + growthDays * DAY_MS)
              .toISOString()
              .slice(0, 10);
            if (predPlan.startWindowLatest) {
              startWindowLatest = new Date(
                new Date(predPlan.startWindowLatest).getTime() +
                  growthDays * DAY_MS,
              )
                .toISOString()
                .slice(0, 10);
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
      cropName,
      planningState: "draft",
      startWindowEarliest,
      startWindowLatest,
      endWindowEarliest: args.endWindowEarliest,
      endWindowLatest: args.endWindowLatest,
      predecessorPlantedCropId,
      predecessorPlanId,
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
