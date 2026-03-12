import { query, mutation } from "./_generated/server";
import { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireFarmMembership } from "./_helpers";
import { resolveCropMedia } from "../shared/crop-media";
import {
  calculateGrowthStage,
  computeCropAlerts,
  estimateHarvestDate,
  mapCropLifecycleType,
} from "../shared/growth-stage";

async function resolveFieldFarmId(ctx: QueryCtx | MutationCtx, fieldId: Id<"fields">) {
  const field = await ctx.db.get(fieldId);
  if (!field) throw new Error("田區不存在");
  return field.farmId;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const list = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    await requireFarmMembership(ctx, farmId);
    const rows = await ctx.db
      .query("fields")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .collect();

    // Fetch all sub-entities per field in parallel
    const fieldSubEntities = await Promise.all(
      rows.map(async (field) => {
        const [plantedCrops, facilities, utilityNodes, utilityEdges] =
          await Promise.all([
            ctx.db
              .query("plantedCrops")
              .withIndex("by_fieldId", (q) => q.eq("fieldId", field._id))
              .collect(),
            ctx.db
              .query("facilities")
              .withIndex("by_fieldId", (q) => q.eq("fieldId", field._id))
              .collect(),
            ctx.db
              .query("utilityNodes")
              .withIndex("by_fieldId", (q) => q.eq("fieldId", field._id))
              .collect(),
            ctx.db
              .query("utilityEdges")
              .withIndex("by_fieldId", (q) => q.eq("fieldId", field._id))
              .collect(),
          ]);
        return { field, plantedCrops, facilities, utilityNodes, utilityEdges };
      })
    );

    // Batch-fetch all unique crop IDs across all fields to avoid N+1
    const allPlantedCrops = fieldSubEntities.flatMap((e) => e.plantedCrops);
    const cropIdSet = new Set<string>();
    for (const pc of allPlantedCrops) {
      if (pc.cropId) cropIdSet.add(pc.cropId as string);
    }
    const cropMap = new Map<string, NonNullable<Awaited<ReturnType<typeof ctx.db.get<"crops">>>>>();
    await Promise.all(
      Array.from(cropIdSet).map(async (cropId) => {
        const crop = await ctx.db.get(cropId as Id<"crops">);
        if (crop) cropMap.set(cropId, crop);
      })
    );

    return fieldSubEntities.map(({ field, plantedCrops, facilities, utilityNodes, utilityEdges }) => {
      const plantedCropsWithCrop = plantedCrops.map((pc) => {
        const crop = pc.cropId ? (cropMap.get(pc.cropId as string) ?? null) : null;
        return { ...pc, crop };
      });

      return {
        ...field,
        plantedCrops: plantedCropsWithCrop,
        facilities,
        utilityNodes,
        utilityEdges,
      };
    });
  },
});

export const getById = query({
  args: { fieldId: v.id("fields") },
  handler: async (ctx, { fieldId }) => {
    const field = await ctx.db.get(fieldId);
    if (!field) return null;
    await requireFarmMembership(ctx, field.farmId);

    const [plantedCrops, facilities, utilityNodes, utilityEdges] =
      await Promise.all([
        ctx.db
          .query("plantedCrops")
          .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
          .collect(),
        ctx.db
          .query("facilities")
          .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
          .collect(),
        ctx.db
          .query("utilityNodes")
          .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
          .collect(),
        ctx.db
          .query("utilityEdges")
          .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
          .collect(),
      ]);

    // Batch-fetch all unique crop IDs to avoid N+1
    const cropIdSet = new Set<string>();
    for (const pc of plantedCrops) {
      if (pc.cropId) cropIdSet.add(pc.cropId as string);
    }
    const cropMap = new Map<string, NonNullable<Awaited<ReturnType<typeof ctx.db.get<"crops">>>>>();
    await Promise.all(
      Array.from(cropIdSet).map(async (cropId) => {
        const crop = await ctx.db.get(cropId as Id<"crops">);
        if (crop) cropMap.set(cropId, crop);
      })
    );

    const plantedCropsWithCrop = plantedCrops.map((pc) => {
      const crop = pc.cropId ? (cropMap.get(pc.cropId as string) ?? null) : null;
      return { ...pc, crop };
    });

    return {
      ...field,
      plantedCrops: plantedCropsWithCrop,
      facilities,
      utilityNodes,
      utilityEdges,
    };
  },
});

export const listSummary = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    await requireFarmMembership(ctx, farmId);
    const fields = await ctx.db
      .query("fields")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .collect();

    // Fetch all planted crops across all fields
    const fieldPlantedCrops = await Promise.all(
      fields.map((field) =>
        ctx.db
          .query("plantedCrops")
          .withIndex("by_fieldId", (q) => q.eq("fieldId", field._id))
          .collect()
      )
    );
    const allPlantedCrops = fieldPlantedCrops.flat();

    // Batch-fetch all unique crop IDs
    const cropIdSet = new Set<string>();
    for (const pc of allPlantedCrops) {
      if (pc.cropId) cropIdSet.add(pc.cropId as string);
    }
    const cropMap = new Map<
      string,
      {
        name: string;
        emoji?: string;
        growthDays?: number;
        imageUrl?: string;
        thumbnailUrl?: string;
      }
    >();
    await Promise.all(
      Array.from(cropIdSet).map(async (cropId) => {
        const crop = await ctx.db.get(cropId as Id<"crops">);
        if (crop) {
          const media = resolveCropMedia(crop);
          cropMap.set(cropId, {
            name: crop.name,
            emoji: media.emoji,
            growthDays: crop.growthDays,
            imageUrl: media.imageUrl,
            thumbnailUrl: media.thumbnailUrl,
          });
        }
      })
    );

    return fields.map((field, i) => {
      const plantedCrops = fieldPlantedCrops[i]!;
      return {
        _id: field._id,
        name: field.name,
        plantedCrops: plantedCrops.map((pc) => {
          const crop = pc.cropId ? cropMap.get(pc.cropId as string) : undefined;
          return {
            _id: pc._id,
            cropId: pc.cropId,
            cropName: crop?.name ?? "未知",
            cropEmoji: crop?.emoji ?? "🌱",
            cropImageUrl: crop?.imageUrl ?? "",
            cropThumbnailUrl: crop?.thumbnailUrl ?? "",
            status: pc.status,
            plantedDate: pc.plantedDate,
            customGrowthDays: pc.customGrowthDays,
            growthDays: crop?.growthDays ?? 0,
          };
        }),
      };
    });
  },
});

// ---------------------------------------------------------------------------
// Crop Care Context (issue #106 — Smart Crop Card)
// ---------------------------------------------------------------------------

/**
 * Returns actionable crop care context for a planted crop, powering the
 * SmartCropCard inspector component. Includes:
 * - Current growth stage (auto-detected from plantedDate + crop growthStages)
 * - Stage-specific care tips (water frequency, fertilizer, careNotes)
 * - Reference data (spacing, companions, antagonists, pest/disease risks)
 * - Contextual alerts (typhoon, drought, planting month, harvest approaching)
 */
export const getCropCareContext = query({
  args: {
    plantedCropId: v.id("plantedCrops"),
  },
  handler: async (ctx, { plantedCropId }) => {
    const pc = await ctx.db.get(plantedCropId);
    if (!pc) return null;
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, pc.fieldId));

    // If no crop is assigned, return minimal context
    if (!pc.cropId) {
      return {
        plantedCrop: pc,
        crop: null,
        growthStageInfo: null,
        stageSpecificCare: null,
        estimatedHarvestDate: null,
        daysSincePlanting: null,
        daysToHarvest: null,
        alerts: [],
        reference: null,
        growingGuide: null,
      };
    }

    const crop = await ctx.db.get(pc.cropId);
    if (!crop) {
      return {
        plantedCrop: pc,
        crop: null,
        growthStageInfo: null,
        stageSpecificCare: null,
        estimatedHarvestDate: null,
        daysSincePlanting: null,
        daysToHarvest: null,
        alerts: [],
        reference: null,
        growingGuide: null,
      };
    }

    const today = new Date().toISOString().split("T")[0]!;

    // --- Growth stage calculation ---
    const growthStageInfo = pc.plantedDate && crop.growthStages
      ? calculateGrowthStage(pc.plantedDate, crop.growthStages, today)
      : null;

    // --- Stage-specific care tips ---
    // If we have a detected growth stage with care data, use that;
    // otherwise fall back to crop-level values.
    const currentStage = growthStageInfo?.currentStage ?? null;
    const stageSpecificCare = {
      waterFrequencyDays: currentStage?.waterFrequencyDays ?? crop.waterFrequencyDays ?? null,
      fertilizerFrequencyDays: currentStage?.fertilizerFrequencyDays ?? crop.fertilizerFrequencyDays ?? null,
      careNotes: currentStage?.careNotes ?? null,
      water: crop.water ?? null,
      sunlight: crop.sunlight ?? null,
      sunlightHoursMin: crop.sunlightHoursMin ?? null,
      sunlightHoursMax: crop.sunlightHoursMax ?? null,
    };

    // --- Harvest estimation ---
    const growthDays = pc.customGrowthDays ?? crop.growthDays;
    const harvestDate = pc.plantedDate && growthDays
      ? estimateHarvestDate(pc.plantedDate, growthDays)
      : null;

    // Days since planting
    let daysSincePlanting: number | null = null;
    if (pc.plantedDate) {
      const plantDate = new Date(pc.plantedDate + "T00:00:00");
      const todayDate = new Date(today + "T00:00:00");
      daysSincePlanting = Math.max(0, Math.floor((todayDate.getTime() - plantDate.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Days to harvest
    let daysToHarvest: number | null = null;
    if (harvestDate) {
      const harvestD = new Date(harvestDate + "T00:00:00");
      const todayDate = new Date(today + "T00:00:00");
      daysToHarvest = Math.max(0, Math.floor((harvestD.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // --- Contextual alerts ---
    const alerts = computeCropAlerts(crop, pc, today);

    // --- Reference data (Tier 3 — collapsed in UI) ---
    const reference = {
      propagationMethod: crop.propagationMethod ?? null,
      spacingPlantCm: crop.spacingPlantCm ?? null,
      spacingRowCm: crop.spacingRowCm ?? null,
      maxHeightCm: crop.maxHeightCm ?? null,
      maxSpreadCm: crop.maxSpreadCm ?? null,
      trellisRequired: crop.trellisRequired ?? null,
      companionPlants: crop.companionPlants ?? null,
      antagonistPlants: crop.antagonistPlants ?? null,
      rotationFamily: crop.rotationFamily ?? null,
      rotationYears: crop.rotationYears ?? null,
      soilPhMin: crop.soilPhMin ?? null,
      soilPhMax: crop.soilPhMax ?? null,
      tempOptimalMin: crop.tempOptimalMin ?? null,
      tempOptimalMax: crop.tempOptimalMax ?? null,
      harvestMaturitySigns: crop.harvestMaturitySigns ?? null,
      commonPests: crop.commonPests ?? null,
      commonDiseases: crop.commonDiseases ?? null,
    };

    // --- Growing guide (Tier 4) ---
    const growingGuide = crop.growingGuide ?? null;

    return {
      plantedCrop: pc,
      crop: {
        _id: crop._id,
        name: crop.name,
        emoji: crop.emoji,
        imageUrl: crop.imageUrl,
        thumbnailUrl: crop.thumbnailUrl,
        category: crop.category,
        lifecycleType: crop.lifecycleType,
        growthDays: crop.growthDays,
        growthStages: crop.growthStages ?? null,
        typhoonResistance: crop.typhoonResistance,
        plantingMonths: crop.plantingMonths,
      },
      growthStageInfo,
      stageSpecificCare,
      estimatedHarvestDate: harvestDate,
      daysSincePlanting,
      daysToHarvest,
      alerts,
      reference,
      growingGuide,
    };
  },
});

// ---------------------------------------------------------------------------
// Field CRUD
// ---------------------------------------------------------------------------

export const create = mutation({
  args: {
    farmId: v.id("farms"),
    name: v.string(),
    widthM: v.number(),
    heightM: v.number(),
    plotType: v.optional(v.string()),
    sunHours: v.optional(v.string()),
    drainage: v.optional(v.string()),
    slope: v.optional(v.string()),
    windExposure: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);
    const fieldId = await ctx.db.insert("fields", {
      farmId: args.farmId,
      name: args.name,
      widthM: args.widthM,
      heightM: args.heightM,
      plotType: args.plotType,
      sunHours: args.sunHours,
      drainage: args.drainage,
      slope: args.slope,
      windExposure: args.windExposure,
    });
    return fieldId;
  },
});

export const update = mutation({
  args: {
    fieldId: v.id("fields"),
    name: v.optional(v.string()),
    widthM: v.optional(v.number()),
    heightM: v.optional(v.number()),
    plotType: v.optional(v.string()),
    sunHours: v.optional(v.string()),
    drainage: v.optional(v.string()),
    slope: v.optional(v.string()),
    windExposure: v.optional(v.string()),
  },
  handler: async (ctx, { fieldId, ...patch }) => {
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, fieldId));
    // Filter out undefined values
    const updates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(patch)) {
      if (val !== undefined) updates[key] = val;
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(fieldId, updates);
    }
  },
});

export const updateMemo = mutation({
  args: {
    fieldId: v.id("fields"),
    memo: v.string(),
  },
  handler: async (ctx, { fieldId, memo }) => {
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, fieldId));
    await ctx.db.patch(fieldId, { memo });
  },
});

export const remove = mutation({
  args: { fieldId: v.id("fields") },
  handler: async (ctx, { fieldId }) => {
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, fieldId));

    // CASCADE DELETE in dependency order
    // 1. utility edges
    const edges = await ctx.db
      .query("utilityEdges")
      .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
      .collect();
    for (const edge of edges) {
      await ctx.db.delete(edge._id);
    }

    // 2. utility nodes
    const nodes = await ctx.db
      .query("utilityNodes")
      .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
      .collect();
    for (const node of nodes) {
      await ctx.db.delete(node._id);
    }

    // 3. facilities
    const facs = await ctx.db
      .query("facilities")
      .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
      .collect();
    for (const fac of facs) {
      await ctx.db.delete(fac._id);
    }

    // 4. planted crops
    const planted = await ctx.db
      .query("plantedCrops")
      .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
      .collect();
    for (const pc of planted) {
      await ctx.db.delete(pc._id);
    }

    // 5. field itself
    await ctx.db.delete(fieldId);
  },
});

// ---------------------------------------------------------------------------
// Planted Crops
// ---------------------------------------------------------------------------

export const plantCrop = mutation({
  args: {
    fieldId: v.id("fields"),
    cropId: v.id("crops"),
    plantedDate: v.optional(v.string()),
    xM: v.number(),
    yM: v.number(),
    widthM: v.optional(v.number()),
    heightM: v.optional(v.number()),
    shapePoints: v.optional(
      v.array(v.object({ x: v.number(), y: v.number() }))
    ),
  },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, args.fieldId));
    const plantedCropId = await ctx.db.insert("plantedCrops", {
      cropId: args.cropId,
      fieldId: args.fieldId,
      plantedDate:
        args.plantedDate ?? new Date().toISOString().split("T")[0],
      status: "growing",
      xM: args.xM,
      yM: args.yM,
      widthM: args.widthM,
      heightM: args.heightM,
      shapePoints: args.shapePoints,
    });
    return plantedCropId;
  },
});

export const createRegion = mutation({
  args: {
    fieldId: v.id("fields"),
    cropId: v.optional(v.id("crops")),
    name: v.optional(v.string()),
    xM: v.number(),
    yM: v.number(),
    widthM: v.optional(v.number()),
    heightM: v.optional(v.number()),
    shapePoints: v.optional(
      v.array(v.object({ x: v.number(), y: v.number() }))
    ),
  },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, args.fieldId));
    const plantedCropId = await ctx.db.insert("plantedCrops", {
      cropId: args.cropId,
      fieldId: args.fieldId,
      name: args.name,
      plantedDate: new Date().toISOString().split("T")[0],
      status: "growing",
      xM: args.xM,
      yM: args.yM,
      widthM: args.widthM,
      heightM: args.heightM,
      shapePoints: args.shapePoints,
    });
    return plantedCropId;
  },
});

export const assignCropToRegion = mutation({
  args: {
    plantedCropId: v.id("plantedCrops"),
    cropId: v.id("crops"),
  },
  handler: async (ctx, { plantedCropId, cropId }) => {
    const pc = await ctx.db.get(plantedCropId);
    if (!pc) throw new Error("找不到種植紀錄");
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, pc.fieldId));

    // Auto-populate fields from crop metadata when not already set on the plantedCrop
    const crop = await ctx.db.get(cropId);
    const patch: Record<string, unknown> = { cropId };

    if (crop) {
      // Auto-populate lifecycleType from crop if not already set
      if (!pc.lifecycleType && crop.lifecycleType) {
        const mapped = mapCropLifecycleType(crop.lifecycleType);
        if (mapped) {
          patch.lifecycleType = mapped;
        }
      }
    }

    await ctx.db.patch(plantedCropId, patch);
  },
});

export const updatePlantedCrop = mutation({
  args: {
    plantedCropId: v.id("plantedCrops"),
    name: v.optional(v.string()),
    notes: v.optional(v.string()),
    customGrowthDays: v.optional(v.number()),
  },
  handler: async (ctx, { plantedCropId, ...patch }) => {
    const pc = await ctx.db.get(plantedCropId);
    if (!pc) throw new Error("找不到種植紀錄");
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, pc.fieldId));
    const updates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(patch)) {
      if (val !== undefined) updates[key] = val;
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(plantedCropId, updates);
    }
  },
});

export const updatePlantedCropLifecycle = mutation({
  args: {
    plantedCropId: v.id("plantedCrops"),
    plantedDate: v.optional(v.string()),
    lifecycleType: v.optional(
      v.union(
        v.literal("seasonal"),
        v.literal("long_cycle"),
        v.literal("perennial"),
        v.literal("orchard")
      )
    ),
    stage: v.optional(v.string()),
    stageConfidence: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
    ),
    startDateMode: v.optional(
      v.union(
        v.literal("exact"),
        v.literal("range"),
        v.literal("relative"),
        v.literal("unknown")
      )
    ),
    plantStartEarliest: v.optional(v.number()),
    plantStartLatest: v.optional(v.number()),
    estimatedAgeDays: v.optional(v.number()),
    timelineConfidence: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
    ),
    endWindowEarliest: v.optional(v.number()),
    endWindowLatest: v.optional(v.number()),
    isOccupyingArea: v.optional(v.boolean()),
  },
  handler: async (ctx, { plantedCropId, ...patch }) => {
    const pc = await ctx.db.get(plantedCropId);
    if (!pc) throw new Error("找不到種植紀錄");
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, pc.fieldId));
    const updates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(patch)) {
      if (val !== undefined) updates[key] = val;
    }
    // Auto-set stageUpdatedAt when stage changes
    if (updates.stage !== undefined) {
      updates.stageUpdatedAt = Date.now();
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(plantedCropId, updates);
    }
  },
});

export const harvestCrop = mutation({
  args: { plantedCropId: v.id("plantedCrops") },
  handler: async (ctx, { plantedCropId }) => {
    const pc = await ctx.db.get(plantedCropId);
    if (!pc) throw new Error("找不到種植紀錄");
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, pc.fieldId));
    await ctx.db.patch(plantedCropId, {
      status: "harvested",
      harvestedDate: new Date().toISOString().split("T")[0],
    });
  },
});

export const removePlantedCrop = mutation({
  args: { plantedCropId: v.id("plantedCrops") },
  handler: async (ctx, { plantedCropId }) => {
    const pc = await ctx.db.get(plantedCropId);
    if (!pc) throw new Error("找不到種植紀錄");
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, pc.fieldId));
    await ctx.db.patch(plantedCropId, { status: "removed" });
  },
});

export const restorePlantedCrop = mutation({
  args: { plantedCropId: v.id("plantedCrops") },
  handler: async (ctx, { plantedCropId }) => {
    const pc = await ctx.db.get(plantedCropId);
    if (!pc) throw new Error("找不到種植紀錄");
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, pc.fieldId));
    await ctx.db.patch(plantedCropId, { status: "growing" });
  },
});

export const deletePlantedCropWithPlacement = mutation({
  args: { plantedCropId: v.id("plantedCrops") },
  handler: async (ctx, { plantedCropId }) => {
    const pc = await ctx.db.get(plantedCropId);
    if (!pc) throw new Error("找不到種植紀錄");
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, pc.fieldId));
    await ctx.db.delete(plantedCropId);
  },
});

export const updateCropPlacement = mutation({
  args: {
    plantedCropId: v.id("plantedCrops"),
    fieldId: v.optional(v.id("fields")),
    xM: v.optional(v.number()),
    yM: v.optional(v.number()),
    widthM: v.optional(v.number()),
    heightM: v.optional(v.number()),
    shapePoints: v.optional(
      v.array(v.object({ x: v.number(), y: v.number() }))
    ),
  },
  handler: async (ctx, { plantedCropId, fieldId: _fieldId, ...patch }) => {
    const pc = await ctx.db.get(plantedCropId);
    if (!pc) throw new Error("找不到種植紀錄");
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, pc.fieldId));
    const updates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(patch)) {
      if (val !== undefined) updates[key] = val;
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(plantedCropId, updates);
    }
  },
});

// ---------------------------------------------------------------------------
// Facilities
// ---------------------------------------------------------------------------

export const createFacility = mutation({
  args: {
    fieldId: v.id("fields"),
    facilityType: v.string(),
    name: v.string(),
    xM: v.number(),
    yM: v.number(),
    widthM: v.number(),
    heightM: v.number(),
  },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, args.fieldId));
    const facilityId = await ctx.db.insert("facilities", {
      fieldId: args.fieldId,
      facilityType: args.facilityType,
      name: args.name,
      xM: args.xM,
      yM: args.yM,
      widthM: args.widthM,
      heightM: args.heightM,
    });
    return facilityId;
  },
});

export const updateFacility = mutation({
  args: {
    facilityId: v.id("facilities"),
    fieldId: v.optional(v.id("fields")),
    facilityType: v.optional(v.string()),
    name: v.optional(v.string()),
    xM: v.optional(v.number()),
    yM: v.optional(v.number()),
    widthM: v.optional(v.number()),
    heightM: v.optional(v.number()),
  },
  handler: async (ctx, { facilityId, fieldId: _fieldId, ...patch }) => {
    const facility = await ctx.db.get(facilityId);
    if (!facility) throw new Error("找不到設施");
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, facility.fieldId));
    const updates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(patch)) {
      if (val !== undefined) updates[key] = val;
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(facilityId, updates);
    }
  },
});

export const deleteFacility = mutation({
  args: { facilityId: v.id("facilities") },
  handler: async (ctx, { facilityId }) => {
    const facility = await ctx.db.get(facilityId);
    if (!facility) throw new Error("找不到設施");
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, facility.fieldId));
    await ctx.db.delete(facilityId);
  },
});

// ---------------------------------------------------------------------------
// Utility Nodes
// ---------------------------------------------------------------------------

export const createUtilityNode = mutation({
  args: {
    fieldId: v.id("fields"),
    label: v.string(),
    kind: v.union(v.literal("water"), v.literal("electric")),
    nodeType: v.optional(v.string()),
    xM: v.number(),
    yM: v.number(),
  },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, args.fieldId));
    const nodeId = await ctx.db.insert("utilityNodes", {
      fieldId: args.fieldId,
      label: args.label,
      kind: args.kind,
      nodeType: args.nodeType,
      xM: args.xM,
      yM: args.yM,
    });
    return nodeId;
  },
});

export const updateUtilityNode = mutation({
  args: {
    nodeId: v.id("utilityNodes"),
    fieldId: v.optional(v.id("fields")),
    label: v.optional(v.string()),
    kind: v.optional(v.union(v.literal("water"), v.literal("electric"))),
    nodeType: v.optional(v.string()),
    xM: v.optional(v.number()),
    yM: v.optional(v.number()),
  },
  handler: async (ctx, { nodeId, fieldId: _fieldId, ...patch }) => {
    const node = await ctx.db.get(nodeId);
    if (!node) throw new Error("找不到節點");
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, node.fieldId));
    const updates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(patch)) {
      if (val !== undefined) updates[key] = val;
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(nodeId, updates);
    }
  },
});

export const deleteUtilityNode = mutation({
  args: { nodeId: v.id("utilityNodes") },
  handler: async (ctx, { nodeId }) => {
    const node = await ctx.db.get(nodeId);
    if (!node) throw new Error("找不到節點");
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, node.fieldId));

    // Delete edges referencing this node (from or to)
    const fromEdges = await ctx.db
      .query("utilityEdges")
      .withIndex("by_fromNodeId", (q) => q.eq("fromNodeId", nodeId))
      .collect();
    for (const edge of fromEdges) {
      await ctx.db.delete(edge._id);
    }

    const toEdges = await ctx.db
      .query("utilityEdges")
      .withIndex("by_toNodeId", (q) => q.eq("toNodeId", nodeId))
      .collect();
    for (const edge of toEdges) {
      await ctx.db.delete(edge._id);
    }

    // Delete the node itself
    await ctx.db.delete(nodeId);
  },
});

// ---------------------------------------------------------------------------
// Utility Edges
// ---------------------------------------------------------------------------

export const createUtilityEdge = mutation({
  args: {
    fieldId: v.id("fields"),
    fromNodeId: v.id("utilityNodes"),
    toNodeId: v.id("utilityNodes"),
    kind: v.union(v.literal("water"), v.literal("electric")),
  },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, args.fieldId));
    const edgeId = await ctx.db.insert("utilityEdges", {
      fieldId: args.fieldId,
      fromNodeId: args.fromNodeId,
      toNodeId: args.toNodeId,
      kind: args.kind,
    });
    return edgeId;
  },
});

export const deleteUtilityEdge = mutation({
  args: { edgeId: v.id("utilityEdges") },
  handler: async (ctx, { edgeId }) => {
    const edge = await ctx.db.get(edgeId);
    if (!edge) throw new Error("找不到管線");
    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, edge.fieldId));
    await ctx.db.delete(edgeId);
  },
});
