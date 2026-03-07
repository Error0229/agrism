import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireFarmMembership } from "./_helpers";

// === Shared validators for the new crop schema ===

const growthStageValidator = v.object({
  stage: v.string(),
  daysFromStart: v.number(),
  careNotes: v.optional(v.string()),
  waterFrequencyDays: v.optional(v.number()),
  fertilizerFrequencyDays: v.optional(v.number()),
});

const pestDiseaseValidator = v.object({
  name: v.string(),
  symptoms: v.string(),
  organicTreatment: v.string(),
  triggerConditions: v.optional(v.string()),
});

const growingGuideValidator = v.object({
  howToPlant: v.optional(v.string()),
  howToCare: v.optional(v.string()),
  warnings: v.optional(v.string()),
  localNotes: v.optional(v.string()),
});

// All optional crop fields (used in both create and update)
const optionalCropFields = {
  // Identity
  scientificName: v.optional(v.string()),
  variety: v.optional(v.string()),
  aliases: v.optional(v.array(v.string())),
  emoji: v.optional(v.string()),
  color: v.optional(v.string()),
  lifecycleType: v.optional(v.string()),
  propagationMethod: v.optional(v.string()),
  source: v.optional(v.string()),

  // Timing
  plantingMonths: v.optional(v.array(v.number())),
  harvestMonths: v.optional(v.array(v.number())),
  growthDays: v.optional(v.number()),
  daysToGermination: v.optional(v.number()),
  daysToTransplant: v.optional(v.number()),
  daysToFlowering: v.optional(v.number()),
  harvestWindowDays: v.optional(v.number()),
  growingSeasonStart: v.optional(v.number()),
  growingSeasonEnd: v.optional(v.number()),

  // Growth stages
  growthStages: v.optional(v.array(growthStageValidator)),

  // Environment
  tempMin: v.optional(v.number()),
  tempMax: v.optional(v.number()),
  tempOptimalMin: v.optional(v.number()),
  tempOptimalMax: v.optional(v.number()),
  humidityMin: v.optional(v.number()),
  humidityMax: v.optional(v.number()),
  sunlight: v.optional(v.string()),
  sunlightHoursMin: v.optional(v.number()),
  sunlightHoursMax: v.optional(v.number()),
  windSensitivity: v.optional(v.string()),
  droughtTolerance: v.optional(v.string()),
  waterloggingTolerance: v.optional(v.string()),
  altitudeMin: v.optional(v.number()),
  altitudeMax: v.optional(v.number()),

  // Soil
  soilPhMin: v.optional(v.number()),
  soilPhMax: v.optional(v.number()),
  soilType: v.optional(v.string()),
  organicMatterPreference: v.optional(v.string()),
  fertilityDemand: v.optional(v.string()),
  fertilizerType: v.optional(v.string()),
  fertilizerFrequencyDays: v.optional(v.number()),
  commonDeficiencies: v.optional(v.array(v.string())),

  // Spacing
  spacingPlantCm: v.optional(v.number()),
  spacingRowCm: v.optional(v.number()),
  maxHeightCm: v.optional(v.number()),
  maxSpreadCm: v.optional(v.number()),
  trellisRequired: v.optional(v.boolean()),
  pruningRequired: v.optional(v.boolean()),
  pruningFrequencyDays: v.optional(v.number()),
  pruningMonths: v.optional(v.array(v.number())),

  // Water
  water: v.optional(v.string()),
  waterFrequencyDays: v.optional(v.number()),
  waterAmountMl: v.optional(v.number()),
  criticalDroughtStages: v.optional(v.array(v.string())),

  // Companion & rotation
  companionPlants: v.optional(v.array(v.string())),
  antagonistPlants: v.optional(v.array(v.string())),
  rotationFamily: v.optional(v.string()),
  rotationYears: v.optional(v.number()),

  // Pest & disease
  commonPests: v.optional(v.array(pestDiseaseValidator)),
  commonDiseases: v.optional(v.array(pestDiseaseValidator)),
  typhoonResistance: v.optional(v.string()),
  typhoonPrep: v.optional(v.string()),

  // Harvest
  harvestMaturitySigns: v.optional(v.string()),
  harvestMethod: v.optional(v.string()),
  harvestCadence: v.optional(v.string()),
  yieldPerPlant: v.optional(v.string()),
  storageNotes: v.optional(v.string()),
  shelfLifeDays: v.optional(v.number()),

  // Growing guide
  growingGuide: v.optional(growingGuideValidator),

  // Meta
  lastAiEnriched: v.optional(v.number()),
  aiEnrichmentNotes: v.optional(v.string()),
};

// === Queries ===

export const list = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    await requireFarmMembership(ctx, farmId);
    return ctx.db
      .query("crops")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .collect();
  },
});

export const getById = query({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const crop = await ctx.db.get(cropId);
    if (!crop) return null;
    await requireFarmMembership(ctx, crop.farmId);
    return crop;
  },
});

// === Mutations ===

export const create = mutation({
  args: {
    farmId: v.id("farms"),
    name: v.string(),
    category: v.string(),
    ...optionalCropFields,
  },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);
    const id = await ctx.db.insert("crops", {
      ...args,
      isDefault: false,
    });
    return ctx.db.get(id);
  },
});

export const update = mutation({
  args: {
    cropId: v.id("crops"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    ...optionalCropFields,
  },
  handler: async (ctx, { cropId, ...fields }) => {
    const crop = await ctx.db.get(cropId);
    if (!crop) return null;
    await requireFarmMembership(ctx, crop.farmId);

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(cropId, updates);
    return ctx.db.get(cropId);
  },
});

export const remove = mutation({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const crop = await ctx.db.get(cropId);
    if (!crop) return;
    await requireFarmMembership(ctx, crop.farmId);
    await ctx.db.delete(cropId);
  },
});

// === AI Enrichment ===

export const applyEnrichment = internalMutation({
  args: {
    cropId: v.id("crops"),
    // Identity + Timing
    scientificName: v.optional(v.string()),
    variety: v.optional(v.string()),
    aliases: v.optional(v.array(v.string())),
    lifecycleType: v.optional(v.string()),
    propagationMethod: v.optional(v.string()),
    plantingMonths: v.optional(v.array(v.number())),
    harvestMonths: v.optional(v.array(v.number())),
    growthDays: v.optional(v.number()),
    daysToGermination: v.optional(v.number()),
    daysToTransplant: v.optional(v.number()),
    daysToFlowering: v.optional(v.number()),
    harvestWindowDays: v.optional(v.number()),
    growingSeasonStart: v.optional(v.number()),
    growingSeasonEnd: v.optional(v.number()),
    // Environment
    tempMin: v.optional(v.number()),
    tempMax: v.optional(v.number()),
    tempOptimalMin: v.optional(v.number()),
    tempOptimalMax: v.optional(v.number()),
    humidityMin: v.optional(v.number()),
    humidityMax: v.optional(v.number()),
    sunlight: v.optional(v.string()),
    sunlightHoursMin: v.optional(v.number()),
    sunlightHoursMax: v.optional(v.number()),
    windSensitivity: v.optional(v.string()),
    droughtTolerance: v.optional(v.string()),
    waterloggingTolerance: v.optional(v.string()),
    // Soil
    soilPhMin: v.optional(v.number()),
    soilPhMax: v.optional(v.number()),
    soilType: v.optional(v.string()),
    fertilityDemand: v.optional(v.string()),
    fertilizerType: v.optional(v.string()),
    fertilizerFrequencyDays: v.optional(v.number()),
    commonDeficiencies: v.optional(v.array(v.string())),
    // Spacing
    spacingPlantCm: v.optional(v.number()),
    spacingRowCm: v.optional(v.number()),
    maxHeightCm: v.optional(v.number()),
    maxSpreadCm: v.optional(v.number()),
    trellisRequired: v.optional(v.boolean()),
    pruningRequired: v.optional(v.boolean()),
    pruningFrequencyDays: v.optional(v.number()),
    // Water
    water: v.optional(v.string()),
    waterFrequencyDays: v.optional(v.number()),
    waterAmountMl: v.optional(v.number()),
    criticalDroughtStages: v.optional(v.array(v.string())),
    // Companion & Rotation
    companionPlants: v.optional(v.array(v.string())),
    antagonistPlants: v.optional(v.array(v.string())),
    rotationFamily: v.optional(v.string()),
    rotationYears: v.optional(v.number()),
    // Pest & Disease
    commonPests: v.optional(v.array(pestDiseaseValidator)),
    commonDiseases: v.optional(v.array(pestDiseaseValidator)),
    typhoonResistance: v.optional(v.string()),
    typhoonPrep: v.optional(v.string()),
    // Harvest
    harvestMaturitySigns: v.optional(v.string()),
    harvestMethod: v.optional(v.string()),
    harvestCadence: v.optional(v.string()),
    yieldPerPlant: v.optional(v.string()),
    storageNotes: v.optional(v.string()),
    shelfLifeDays: v.optional(v.number()),
    // Growth Stages
    growthStages: v.optional(v.array(growthStageValidator)),
    // Growing Guide
    growingGuide: v.optional(growingGuideValidator),
    // Meta
    lastAiEnriched: v.optional(v.number()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, { cropId, ...fields }) => {
    const crop = await ctx.db.get(cropId);
    if (!crop) throw new Error("Crop not found");

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    await ctx.db.patch(cropId, updates);
    return ctx.db.get(cropId);
  },
});

// === Seed Defaults ===

export const seedDefaults = mutation({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    await requireFarmMembership(ctx, farmId);
    const existing = await ctx.db
      .query("crops")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    if (existing) return;

    for (const crop of DEFAULT_CROPS) {
      await ctx.db.insert("crops", { ...crop, farmId });
    }
  },
});

export const seedDefaultsInternal = internalMutation({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    const existing = await ctx.db
      .query("crops")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    if (existing) return;

    for (const crop of DEFAULT_CROPS) {
      await ctx.db.insert("crops", { ...crop, farmId });
    }
  },
});

// === Crop Templates ===

export const listTemplates = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    await requireFarmMembership(ctx, farmId);
    return ctx.db
      .query("cropTemplates")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .collect();
  },
});

export const createTemplate = mutation({
  args: {
    farmId: v.id("farms"),
    name: v.string(),
    cropIds: v.array(v.id("crops")),
  },
  handler: async (ctx, { farmId, name, cropIds }) => {
    await requireFarmMembership(ctx, farmId);
    const templateId = await ctx.db.insert("cropTemplates", {
      farmId,
      name,
      createdAt: Date.now(),
    });

    for (const cropId of cropIds) {
      await ctx.db.insert("cropTemplateItems", {
        templateId,
        cropId,
      });
    }

    return ctx.db.get(templateId);
  },
});

export const applyTemplate = query({
  args: { templateId: v.id("cropTemplates") },
  handler: async (ctx, { templateId }) => {
    const template = await ctx.db.get(templateId);
    if (!template) return [];
    await requireFarmMembership(ctx, template.farmId);

    const items = await ctx.db
      .query("cropTemplateItems")
      .withIndex("by_templateId", (q) => q.eq("templateId", templateId))
      .collect();

    if (items.length === 0) return [];

    const crops = await Promise.all(
      items.map((item) => ctx.db.get(item.cropId))
    );
    return crops.filter(Boolean);
  },
});

export const removeTemplate = mutation({
  args: { templateId: v.id("cropTemplates") },
  handler: async (ctx, { templateId }) => {
    const template = await ctx.db.get(templateId);
    if (!template) return;
    await requireFarmMembership(ctx, template.farmId);

    const items = await ctx.db
      .query("cropTemplateItems")
      .withIndex("by_templateId", (q) => q.eq("templateId", templateId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    await ctx.db.delete(templateId);
  },
});

// === Default Crop Data (15 Hualien crops) ===

const DEFAULT_CROPS = [
  {
    name: "地瓜",
    emoji: "🍠",
    color: "#c2410c",
    category: "root_vegetables",
    plantingMonths: [2, 3, 4, 8, 9],
    harvestMonths: [6, 7, 8, 12, 1],
    growthDays: 120,
    spacingRowCm: 80,
    spacingPlantCm: 30,
    water: "moderate",
    sunlight: "full_sun",
    tempMin: 20,
    tempMax: 30,
    typhoonResistance: "high",
    isDefault: true as const,
  },
  {
    name: "南瓜",
    emoji: "🎃",
    color: "#ea580c",
    category: "gourds_melons",
    plantingMonths: [2, 3, 4, 8, 9],
    harvestMonths: [5, 6, 7, 11, 12],
    growthDays: 90,
    spacingRowCm: 200,
    spacingPlantCm: 150,
    water: "moderate",
    sunlight: "full_sun",
    tempMin: 18,
    tempMax: 32,
    pruningRequired: true,
    pruningMonths: [3, 4, 5, 9, 10],
    typhoonResistance: "low",
    isDefault: true as const,
  },
  {
    name: "絲瓜",
    emoji: "🥒",
    color: "#16a34a",
    category: "gourds_melons",
    plantingMonths: [3, 4, 5],
    harvestMonths: [5, 6, 7, 8, 9],
    growthDays: 60,
    spacingRowCm: 150,
    spacingPlantCm: 100,
    water: "abundant",
    sunlight: "full_sun",
    tempMin: 22,
    tempMax: 35,
    pruningRequired: true,
    pruningMonths: [5, 6, 7, 8],
    typhoonResistance: "low",
    isDefault: true as const,
  },
  {
    name: "苦瓜",
    emoji: "🥬",
    color: "#65a30d",
    category: "gourds_melons",
    plantingMonths: [3, 4, 5],
    harvestMonths: [6, 7, 8, 9],
    growthDays: 70,
    spacingRowCm: 150,
    spacingPlantCm: 80,
    water: "moderate",
    sunlight: "full_sun",
    tempMin: 20,
    tempMax: 35,
    pruningRequired: true,
    pruningMonths: [5, 6, 7, 8],
    typhoonResistance: "low",
    isDefault: true as const,
  },
  {
    name: "空心菜",
    emoji: "🥬",
    color: "#15803d",
    category: "leafy_vegetables",
    plantingMonths: [3, 4, 5, 6, 7, 8, 9],
    harvestMonths: [4, 5, 6, 7, 8, 9, 10],
    growthDays: 30,
    spacingRowCm: 20,
    spacingPlantCm: 15,
    water: "abundant",
    sunlight: "full_sun",
    tempMin: 25,
    tempMax: 35,
    typhoonResistance: "medium",
    isDefault: true as const,
  },
  {
    name: "小白菜",
    emoji: "🥬",
    color: "#22c55e",
    category: "leafy_vegetables",
    plantingMonths: [9, 10, 11, 12, 1, 2, 3],
    harvestMonths: [10, 11, 12, 1, 2, 3, 4],
    growthDays: 25,
    spacingRowCm: 20,
    spacingPlantCm: 15,
    water: "moderate",
    sunlight: "partial_shade",
    tempMin: 15,
    tempMax: 25,
    typhoonResistance: "low",
    isDefault: true as const,
  },
  {
    name: "蔥",
    emoji: "🧅",
    color: "#4ade80",
    category: "aromatics",
    plantingMonths: [9, 10, 11, 12, 1, 2],
    harvestMonths: [11, 12, 1, 2, 3, 4],
    growthDays: 60,
    spacingRowCm: 20,
    spacingPlantCm: 10,
    water: "moderate",
    sunlight: "full_sun",
    tempMin: 15,
    tempMax: 25,
    typhoonResistance: "low",
    isDefault: true as const,
  },
  {
    name: "薑",
    emoji: "🫚",
    color: "#ca8a04",
    category: "root_vegetables",
    plantingMonths: [2, 3, 4],
    harvestMonths: [8, 9, 10, 11],
    growthDays: 180,
    spacingRowCm: 40,
    spacingPlantCm: 25,
    water: "moderate",
    sunlight: "partial_shade",
    tempMin: 20,
    tempMax: 30,
    typhoonResistance: "medium",
    isDefault: true as const,
  },
  {
    name: "香蕉",
    emoji: "🍌",
    color: "#eab308",
    category: "fruits",
    plantingMonths: [2, 3, 4, 5],
    harvestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    growthDays: 365,
    spacingRowCm: 300,
    spacingPlantCm: 250,
    water: "abundant",
    sunlight: "full_sun",
    tempMin: 20,
    tempMax: 35,
    pruningRequired: true,
    pruningMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    typhoonResistance: "low",
    isDefault: true as const,
  },
  {
    name: "木瓜",
    emoji: "🫒",
    color: "#f97316",
    category: "fruits",
    plantingMonths: [3, 4, 5],
    harvestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    growthDays: 270,
    spacingRowCm: 250,
    spacingPlantCm: 200,
    water: "moderate",
    sunlight: "full_sun",
    tempMin: 22,
    tempMax: 35,
    typhoonResistance: "low",
    isDefault: true as const,
  },
  {
    name: "番茄",
    emoji: "🍅",
    color: "#dc2626",
    category: "solanaceae",
    plantingMonths: [9, 10, 11],
    harvestMonths: [12, 1, 2, 3, 4],
    growthDays: 90,
    spacingRowCm: 60,
    spacingPlantCm: 40,
    water: "moderate",
    sunlight: "full_sun",
    tempMin: 18,
    tempMax: 28,
    pruningRequired: true,
    pruningMonths: [10, 11, 12, 1, 2, 3],
    typhoonResistance: "low",
    isDefault: true as const,
  },
  {
    name: "辣椒",
    emoji: "🌶️",
    color: "#ef4444",
    category: "solanaceae",
    plantingMonths: [2, 3, 4, 8, 9],
    harvestMonths: [5, 6, 7, 8, 11, 12],
    growthDays: 80,
    spacingRowCm: 50,
    spacingPlantCm: 35,
    water: "minimal",
    sunlight: "full_sun",
    tempMin: 20,
    tempMax: 30,
    pruningRequired: true,
    pruningMonths: [4, 5, 6, 9, 10, 11],
    typhoonResistance: "medium",
    isDefault: true as const,
  },
  {
    name: "茄子",
    emoji: "🍆",
    color: "#7c3aed",
    category: "solanaceae",
    plantingMonths: [2, 3, 4, 8, 9],
    harvestMonths: [5, 6, 7, 8, 11, 12],
    growthDays: 75,
    spacingRowCm: 60,
    spacingPlantCm: 45,
    water: "moderate",
    sunlight: "full_sun",
    tempMin: 22,
    tempMax: 32,
    pruningRequired: true,
    pruningMonths: [4, 5, 6, 7, 9, 10, 11],
    typhoonResistance: "low",
    isDefault: true as const,
  },
  {
    name: "高麗菜",
    emoji: "🥬",
    color: "#86efac",
    category: "leafy_vegetables",
    plantingMonths: [8, 9, 10, 11],
    harvestMonths: [11, 12, 1, 2, 3],
    growthDays: 90,
    spacingRowCm: 50,
    spacingPlantCm: 40,
    water: "moderate",
    sunlight: "full_sun",
    tempMin: 15,
    tempMax: 25,
    typhoonResistance: "low",
    isDefault: true as const,
  },
  {
    name: "芥菜",
    emoji: "🥬",
    color: "#059669",
    category: "leafy_vegetables",
    plantingMonths: [9, 10, 11],
    harvestMonths: [12, 1, 2],
    growthDays: 60,
    spacingRowCm: 40,
    spacingPlantCm: 30,
    water: "moderate",
    sunlight: "full_sun",
    tempMin: 15,
    tempMax: 22,
    typhoonResistance: "low",
    isDefault: true as const,
  },
];
