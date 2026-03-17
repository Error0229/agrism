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
      .take(50);

    // Fetch all sub-entities per field in parallel
    const fieldSubEntities = await Promise.all(
      rows.map(async (field) => {
        const [plantedCrops, facilities, utilityNodes, utilityEdges] =
          await Promise.all([
            ctx.db
              .query("plantedCrops")
              .withIndex("by_fieldId", (q) => q.eq("fieldId", field._id))
              .take(200),
            ctx.db
              .query("facilities")
              .withIndex("by_fieldId", (q) => q.eq("fieldId", field._id))
              .take(200),
            ctx.db
              .query("utilityNodes")
              .withIndex("by_fieldId", (q) => q.eq("fieldId", field._id))
              .take(200),
            ctx.db
              .query("utilityEdges")
              .withIndex("by_fieldId", (q) => q.eq("fieldId", field._id))
              .take(200),
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
          .take(200),
        ctx.db
          .query("facilities")
          .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
          .take(200),
        ctx.db
          .query("utilityNodes")
          .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
          .take(200),
        ctx.db
          .query("utilityEdges")
          .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
          .take(200),
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
      .take(50);

    // Fetch all planted crops across all fields
    const fieldPlantedCrops = await Promise.all(
      fields.map((field) =>
        ctx.db
          .query("plantedCrops")
          .withIndex("by_fieldId", (q) => q.eq("fieldId", field._id))
          .take(200)
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
            // Lifecycle fields (issue #110)
            stage: pc.stage,
            lifecycleType: pc.lifecycleType,
            stageConfidence: pc.stageConfidence,
            timelineConfidence: pc.timelineConfidence,
            estimatedAgeDays: pc.estimatedAgeDays,
            endWindowEarliest: pc.endWindowEarliest,
            endWindowLatest: pc.endWindowLatest,
            stageUpdatedAt: pc.stageUpdatedAt,
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
    today: v.optional(v.string()),
  },
  handler: async (ctx, { plantedCropId, today: todayArg }) => {
    const pc = await ctx.db.get(plantedCropId);
    if (!pc) return null;

    // Parallelize farm membership check and crop fetch to avoid sequential N+1
    const [, crop] = await Promise.all([
      resolveFieldFarmId(ctx, pc.fieldId).then((farmId) =>
        requireFarmMembership(ctx, farmId),
      ),
      pc.cropId ? ctx.db.get(pc.cropId) : Promise.resolve(null),
    ]);

    // If no crop is assigned, return minimal context
    if (!pc.cropId || !crop) {
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

    // Prefer caller-supplied date for determinism; fall back to Date for backward compat
    const today = todayArg ?? new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });

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

    // Days since planting — reuse growthStageInfo when available, fall back to manual calc
    let daysSincePlanting: number | null = growthStageInfo?.daysSincePlanting ?? null;
    if (daysSincePlanting == null && pc.plantedDate) {
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
// Rotation Validation (issue #117 — Smart Planting Validation)
// ---------------------------------------------------------------------------

/**
 * Checks whether planting a given crop in a field would violate rotation rules.
 * Looks at previously harvested/removed crops in the field and compares their
 * rotationFamily + harvestedDate against the candidate crop's rotation requirements.
 *
 * Returns null if the crop has no rotationFamily, otherwise returns violation info.
 */
export const checkRotationViolation = query({
  args: {
    fieldId: v.id("fields"),
    cropId: v.id("crops"),
  },
  handler: async (ctx, { fieldId, cropId }) => {
    const field = await ctx.db.get(fieldId);
    if (!field) return null;
    await requireFarmMembership(ctx, field.farmId);

    const crop = await ctx.db.get(cropId);
    if (!crop) return null;
    if (!crop.rotationFamily) return null;

    const rotationYears = crop.rotationYears ?? 3;
    const today = new Date();

    // Fetch all past plantings (harvested or removed) in this field
    const pastPlantings = await ctx.db
      .query("plantedCrops")
      .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
      .take(500);

    // Filter to harvested/removed with a harvestedDate
    const relevantPlantings = pastPlantings.filter(
      (pc) =>
        (pc.status === "harvested" || pc.status === "removed") &&
        pc.harvestedDate &&
        pc.cropId,
    );

    // Batch-fetch all related crops
    const cropIdSet = new Set<string>();
    for (const pc of relevantPlantings) {
      if (pc.cropId) cropIdSet.add(pc.cropId as string);
    }
    const cropMap = new Map<string, { name: string; rotationFamily?: string }>();
    await Promise.all(
      Array.from(cropIdSet).map(async (cid) => {
        const c = await ctx.db.get(cid as Id<"crops">);
        if (c) cropMap.set(cid, { name: c.name, rotationFamily: c.rotationFamily });
      }),
    );

    // Check for violations
    const violations: Array<{
      cropName: string;
      rotationFamily: string;
      yearsAgo: number;
      requiredYears: number;
    }> = [];

    for (const pc of relevantPlantings) {
      if (!pc.cropId || !pc.harvestedDate) continue;
      const pastCrop = cropMap.get(pc.cropId as string);
      if (!pastCrop?.rotationFamily) continue;
      if (pastCrop.rotationFamily !== crop.rotationFamily) continue;

      const harvestedDate = new Date(pc.harvestedDate + "T00:00:00");
      const diffMs = today.getTime() - harvestedDate.getTime();
      const yearsAgo = Math.round((diffMs / (1000 * 60 * 60 * 24 * 365)) * 10) / 10;

      if (yearsAgo < rotationYears) {
        violations.push({
          cropName: pastCrop.name,
          rotationFamily: crop.rotationFamily,
          yearsAgo: Math.round(yearsAgo * 10) / 10,
          requiredYears: rotationYears,
        });
      }
    }

    return {
      hasViolation: violations.length > 0,
      violations,
    };
  },
});

// ---------------------------------------------------------------------------
// Companion/Antagonist Check (issue #117 — Smart Planting Validation)
// ---------------------------------------------------------------------------

/**
 * Checks which companion and antagonist plants are currently growing in the
 * same field as the given planted crop. Cross-references neighbor crop names
 * against the crop's companionPlants / antagonistPlants arrays.
 */
export const checkCompanionStatus = query({
  args: {
    plantedCropId: v.id("plantedCrops"),
  },
  handler: async (ctx, { plantedCropId }) => {
    const pc = await ctx.db.get(plantedCropId);
    if (!pc) return null;

    await requireFarmMembership(ctx, await resolveFieldFarmId(ctx, pc.fieldId));

    // We need the crop to check its companion/antagonist lists
    if (!pc.cropId) return { companions: [], antagonists: [] };
    const crop = await ctx.db.get(pc.cropId);
    if (!crop) return { companions: [], antagonists: [] };

    const companionList = crop.companionPlants ?? [];
    const antagonistList = crop.antagonistPlants ?? [];
    if (companionList.length === 0 && antagonistList.length === 0) {
      return { companions: [], antagonists: [] };
    }

    // Fetch all growing crops in the same field (excluding self)
    const allPlantedInField = await ctx.db
      .query("plantedCrops")
      .withIndex("by_fieldId", (q) => q.eq("fieldId", pc.fieldId))
      .take(200);

    const neighbors = allPlantedInField.filter(
      (n) => n._id !== plantedCropId && n.status === "growing" && n.cropId,
    );

    // Batch-fetch neighbor crop names
    const neighborCropIdSet = new Set<string>();
    for (const n of neighbors) {
      if (n.cropId) neighborCropIdSet.add(n.cropId as string);
    }
    const neighborCropNames: string[] = [];
    await Promise.all(
      Array.from(neighborCropIdSet).map(async (cid) => {
        const c = await ctx.db.get(cid as Id<"crops">);
        if (c) neighborCropNames.push(c.name);
      }),
    );

    // Cross-reference
    const companions = companionList.filter((name) =>
      neighborCropNames.includes(name),
    );
    const antagonists = antagonistList.filter((name) =>
      neighborCropNames.includes(name),
    );

    return { companions, antagonists };
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
    if (args.widthM <= 0) throw new Error("田地寬度必須大於零");
    if (args.heightM <= 0) throw new Error("田地高度必須大於零");
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
    if (patch.widthM !== undefined && patch.widthM <= 0) throw new Error("田地寬度必須大於零");
    if (patch.heightM !== undefined && patch.heightM <= 0) throw new Error("田地高度必須大於零");
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
      .take(200);
    for (const edge of edges) {
      await ctx.db.delete(edge._id);
    }

    // 2. utility nodes
    const nodes = await ctx.db
      .query("utilityNodes")
      .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
      .take(200);
    for (const node of nodes) {
      await ctx.db.delete(node._id);
    }

    // 3. facilities
    const facs = await ctx.db
      .query("facilities")
      .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
      .take(200);
    for (const fac of facs) {
      await ctx.db.delete(fac._id);
    }

    // 4. planted crops
    const planted = await ctx.db
      .query("plantedCrops")
      .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
      .take(200);
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
        args.plantedDate ?? new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" }),
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
      plantedDate: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" }),
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
      harvestedDate: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" }),
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
      .take(200);
    for (const edge of fromEdges) {
      await ctx.db.delete(edge._id);
    }

    const toEdges = await ctx.db
      .query("utilityEdges")
      .withIndex("by_toNodeId", (q) => q.eq("toNodeId", nodeId))
      .take(200);
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
