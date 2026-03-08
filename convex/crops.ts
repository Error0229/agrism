import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
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
    const all = await ctx.db
      .query("crops")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .collect();
    // Filter out crops pending review — they should not appear in the main crop list
    return all.filter((c) => c.importStatus !== "pending_review");
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

export const getByIdInternal = internalQuery({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    return ctx.db.get(cropId);
  },
});

export const listByFarmInternal = internalQuery({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    return ctx.db
      .query("crops")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .collect();
  },
});

export const listAllFarmsInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("farms").collect();
  },
});

// === Import Review Queries (issue #89/#90) ===

/** Get a single crop by ID without filtering by importStatus (for the review page). */
export const getPendingImport = query({
  args: { cropId: v.id("crops") },
  handler: async (ctx, { cropId }) => {
    const crop = await ctx.db.get(cropId);
    if (!crop) return null;
    await requireFarmMembership(ctx, crop.farmId);
    return crop;
  },
});

/** List all crops with importStatus === "pending_review" for a farm. */
export const listPendingImports = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    await requireFarmMembership(ctx, farmId);
    const all = await ctx.db
      .query("crops")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .collect();
    return all.filter((c) => c.importStatus === "pending_review");
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

// === Import Review (issue #89/#90) ===

export const saveDraftCrop = internalMutation({
  args: {
    farmId: v.id("farms"),
    name: v.string(),
    category: v.string(),
    isDefault: v.boolean(),
    importStatus: v.optional(v.string()),
    fieldMeta: v.optional(v.any()),
    source: v.optional(v.string()),
    // Identity
    scientificName: v.optional(v.string()),
    variety: v.optional(v.string()),
    aliases: v.optional(v.array(v.string())),
    emoji: v.optional(v.string()),
    color: v.optional(v.string()),
    lifecycleType: v.optional(v.string()),
    propagationMethod: v.optional(v.string()),
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
    // Growth stages
    growthStages: v.optional(v.array(growthStageValidator)),
    // Growing guide
    growingGuide: v.optional(growingGuideValidator),
    // Meta
    lastAiEnriched: v.optional(v.number()),
    aiEnrichmentNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("crops", args as never);
    return id;
  },
});

export const approveImport = mutation({
  args: {
    cropId: v.id("crops"),
    // Optional field overrides from user review edits
    overrides: v.optional(v.any()),
  },
  handler: async (ctx, { cropId, overrides }) => {
    const crop = await ctx.db.get(cropId);
    if (!crop) {
      throw new Error("找不到此作物");
    }
    if (crop.importStatus !== "pending_review") {
      throw new Error("此作物不在待審核狀態");
    }

    await requireFarmMembership(ctx, crop.farmId);

    // Build updates
    const updates: Record<string, unknown> = {
      importStatus: "approved",
    };

    // Apply any user overrides
    if (overrides && typeof overrides === "object") {
      const fieldMeta = (crop.fieldMeta as Record<string, Record<string, unknown>> | undefined) ?? {};
      const now = Date.now();

      for (const [key, value] of Object.entries(overrides as Record<string, unknown>)) {
        if (value !== undefined) {
          updates[key] = value;
          // Mark user-edited fields in fieldMeta
          fieldMeta[key] = {
            ...(fieldMeta[key] || {}),
            origin: "user",
            lastVerified: now,
          };
        }
      }

      updates.fieldMeta = fieldMeta;
    }

    await ctx.db.patch(cropId, updates);
    return ctx.db.get(cropId);
  },
});

export const rejectImport = mutation({
  args: {
    cropId: v.id("crops"),
  },
  handler: async (ctx, { cropId }) => {
    const crop = await ctx.db.get(cropId);
    if (!crop) {
      throw new Error("找不到此作物");
    }
    if (crop.importStatus !== "pending_review") {
      throw new Error("此作物不在待審核狀態");
    }

    await requireFarmMembership(ctx, crop.farmId);

    await ctx.db.delete(cropId);
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
    scientificName: "Ipomoea batatas",
    variety: "台農57號",
    aliases: ["甘藷", "番薯", "蕃薯"],
    emoji: "🍠",
    color: "#c2410c",
    category: "root_vegetables",
    lifecycleType: "annual",
    propagationMethod: "cutting",
    source: "seeded",
    plantingMonths: [2, 3, 4, 8, 9],
    harvestMonths: [6, 7, 8, 12, 1],
    growthDays: 120,
    daysToGermination: 7,
    daysToTransplant: 0,
    daysToFlowering: 90,
    harvestWindowDays: 30,
    growingSeasonStart: 2,
    growingSeasonEnd: 12,
    tempMin: 20,
    tempMax: 30,
    tempOptimalMin: 24,
    tempOptimalMax: 28,
    humidityMin: 60,
    humidityMax: 85,
    sunlight: "full_sun",
    sunlightHoursMin: 6,
    sunlightHoursMax: 10,
    windSensitivity: "low",
    droughtTolerance: "high",
    waterloggingTolerance: "low",
    soilPhMin: 5.2,
    soilPhMax: 6.7,
    soilType: "sandy",
    fertilityDemand: "light",
    fertilizerType: "organic",
    fertilizerFrequencyDays: 30,
    commonDeficiencies: ["鉀", "硼"],
    spacingRowCm: 80,
    spacingPlantCm: 30,
    maxHeightCm: 40,
    maxSpreadCm: 200,
    trellisRequired: false,
    water: "moderate",
    waterFrequencyDays: 5,
    waterAmountMl: 500,
    criticalDroughtStages: ["塊根膨大期"],
    companionPlants: ["玉米", "豆類"],
    antagonistPlants: ["番茄", "南瓜"],
    rotationFamily: "root",
    rotationYears: 2,
    commonPests: [
      { name: "甘藷蟻象", symptoms: "塊根表面出現蟲孔，內部有蛀道及蟲糞", organicTreatment: "使用性費洛蒙誘殺、輪作水田、採收後清除殘株", triggerConditions: "高溫乾燥季節" },
      { name: "甘藷螟蛾", symptoms: "莖蔓出現蛀孔，葉片萎黃", organicTreatment: "清除被害莖蔓、使用蘇力菌防治", triggerConditions: "春夏季高溫期" },
      { name: "猿葉蟲", symptoms: "葉片被啃食成孔洞或缺刻", organicTreatment: "人工捕捉、使用苦楝油噴施", triggerConditions: "春季新葉萌發期" },
    ],
    commonDiseases: [
      { name: "蔓割病", symptoms: "莖蔓基部變褐腐爛，葉片萎凋黃化", organicTreatment: "選用無病藷苗、輪作3年以上、藷苗浸藥處理", triggerConditions: "高溫多濕環境" },
      { name: "軟腐病", symptoms: "塊根出現水浸狀軟爛，發出惡臭", organicTreatment: "避免機械傷口、收穫後充分晾乾、貯藏環境通風乾燥", triggerConditions: "採收後貯藏期間高溫潮濕" },
      { name: "病毒病", symptoms: "葉片捲曲、黃化、植株矮化", organicTreatment: "使用健康種苗、防治蚜蟲媒介、清除病株", triggerConditions: "蚜蟲密度高時傳播迅速" },
    ],
    typhoonResistance: "high",
    typhoonPrep: "地瓜為匍匐性作物，颱風抗性強。颱風前確保排水暢通即可，避免田間積水導致塊根腐爛。",
    harvestMaturitySigns: "葉片開始轉黃、莖蔓生長趨緩；挖出試採塊根，皮色鮮明飽滿即可採收",
    harvestMethod: "dig",
    harvestCadence: "once",
    yieldPerPlant: "0.5~1.5 公斤",
    storageNotes: "採收後需陰乾3~5天癒傷處理，存放於通風陰涼處",
    shelfLifeDays: 60,
    growthStages: [
      { stage: "扦插期", daysFromStart: 0, careNotes: "選用健康藷苗扦插，每穴1~2條，插入土中2~3節", waterFrequencyDays: 2, fertilizerFrequencyDays: 0 },
      { stage: "發根期", daysFromStart: 10, careNotes: "保持土壤濕潤促進發根，避免積水", waterFrequencyDays: 3, fertilizerFrequencyDays: 0 },
      { stage: "莖葉生長期", daysFromStart: 30, careNotes: "追施有機肥一次，注意翻蔓避免節間生根", waterFrequencyDays: 5, fertilizerFrequencyDays: 30 },
      { stage: "塊根膨大期", daysFromStart: 60, careNotes: "培土覆蓋裸露塊根，維持適當水分供應", waterFrequencyDays: 5, fertilizerFrequencyDays: 30 },
      { stage: "成熟期", daysFromStart: 100, careNotes: "減少灌水，葉片轉黃後可試挖確認成熟度", waterFrequencyDays: 7, fertilizerFrequencyDays: 0 },
    ],
    growingGuide: {
      howToPlant: "選擇排水良好的砂質壤土，作畦高20~30cm，畦寬80cm。取健康母株莖蔓前端約25~30cm扦插，每穴1~2條，株距30cm。春作2~4月、秋作8~9月定植。",
      howToCare: "定植後保持濕潤至發根成活。生長期間每月追施有機肥一次，注意翻蔓（提蔓）避免莖節着地生根分散養分。塊根膨大期適當培土，防止塊根外露變綠。全期注意排水，避免積水。",
      warnings: "避免連作，最好與水田輪作。不可施用過多氮肥，否則莖葉徒長、塊根產量低。甘藷蟻象為花蓮地區主要害蟲，需加強防治。",
      localNotes: "花蓮地區春作產量較佳，秋作需注意颱風季節排水。花蓮1號品種為當地育成，適合春作栽培，生育日數約160天。砂質土壤排水佳，適合地瓜栽培。",
    },
    isDefault: true as const,
  },
  {
    name: "南瓜",
    scientificName: "Cucurbita moschata",
    variety: "阿成南瓜",
    aliases: ["金瓜", "番瓜"],
    emoji: "🎃",
    color: "#ea580c",
    category: "gourds_melons",
    lifecycleType: "annual",
    propagationMethod: "seed",
    source: "seeded",
    plantingMonths: [2, 3, 4, 8, 9],
    harvestMonths: [5, 6, 7, 11, 12],
    growthDays: 90,
    daysToGermination: 5,
    daysToTransplant: 20,
    daysToFlowering: 45,
    harvestWindowDays: 21,
    growingSeasonStart: 2,
    growingSeasonEnd: 12,
    tempMin: 18,
    tempMax: 32,
    tempOptimalMin: 22,
    tempOptimalMax: 28,
    humidityMin: 55,
    humidityMax: 80,
    sunlight: "full_sun",
    sunlightHoursMin: 6,
    sunlightHoursMax: 10,
    windSensitivity: "medium",
    droughtTolerance: "medium",
    waterloggingTolerance: "low",
    soilPhMin: 5.5,
    soilPhMax: 6.8,
    soilType: "loamy",
    fertilityDemand: "heavy",
    fertilizerType: "organic",
    fertilizerFrequencyDays: 21,
    commonDeficiencies: ["鈣", "硼", "鎂"],
    spacingRowCm: 200,
    spacingPlantCm: 150,
    maxHeightCm: 50,
    maxSpreadCm: 500,
    trellisRequired: false,
    pruningRequired: true,
    pruningMonths: [3, 4, 5, 9, 10],
    water: "moderate",
    waterFrequencyDays: 3,
    waterAmountMl: 800,
    criticalDroughtStages: ["開花期", "果實膨大期"],
    companionPlants: ["玉米", "豆類", "萬壽菊"],
    antagonistPlants: ["馬鈴薯", "茴香"],
    rotationFamily: "cucurbit",
    rotationYears: 3,
    commonPests: [
      { name: "黃守瓜", symptoms: "成蟲啃食葉片成圓形孔洞，幼蟲蛀食根部", organicTreatment: "使用黃色黏蟲板誘殺、覆蓋銀色反光膜驅避", triggerConditions: "春季高溫回暖時成蟲活躍" },
      { name: "瓜實蠅", symptoms: "果實表面出現針孔狀產卵痕，內部幼蟲蛀食導致腐爛", organicTreatment: "使用含毒甲基丁香油誘殺雄蟲、果實套袋保護", triggerConditions: "6~8月高溫期族群密度最高" },
      { name: "潛葉蠅", symptoms: "葉片出現白色蛇形隧道狀食痕", organicTreatment: "摘除被害葉片、使用黃色黏蟲板、噴施苦楝油", triggerConditions: "乾燥高溫環境" },
    ],
    commonDiseases: [
      { name: "白粉病", symptoms: "葉片表面出現白色粉狀黴菌斑，嚴重時葉片枯萎", organicTreatment: "噴施硫磺水溶液或小蘇打水、保持通風良好", triggerConditions: "日夜溫差大、空氣乾燥時" },
      { name: "露菌病", symptoms: "葉背出現灰白色黴層，葉面黃褐色斑塊", organicTreatment: "避免葉面澆水、清除病葉、噴施波爾多液", triggerConditions: "高濕多雨環境" },
      { name: "病毒病", symptoms: "葉片皺縮變形、嵌紋黃化、果實畸形", organicTreatment: "防治蚜蟲媒介、選用抗病品種、清除病株", triggerConditions: "蚜蟲大量發生時傳播" },
    ],
    typhoonResistance: "low",
    typhoonPrep: "颱風前加強棚架固定或將果實提前採收。匍匐栽培者清理排水溝，防止積水爛根。可用防風網保護幼苗。",
    harvestMaturitySigns: "果梗木質化、果皮顏色轉深且指甲無法刮入、敲擊聲音沉悶",
    harvestMethod: "cut",
    harvestCadence: "multiple_flushes",
    yieldPerPlant: "2~5 公斤（每株2~3果）",
    storageNotes: "採收後放置通風處後熟7~10天，可提升甜度。完整果實可存放2~3個月",
    shelfLifeDays: 90,
    growthStages: [
      { stage: "育苗期", daysFromStart: 0, careNotes: "種子浸種5~10小時後催芽，25~30°C環境下3~5天發芽", waterFrequencyDays: 1, fertilizerFrequencyDays: 0 },
      { stage: "定植期", daysFromStart: 20, careNotes: "本葉3~4片時定植，澆足定根水", waterFrequencyDays: 2, fertilizerFrequencyDays: 0 },
      { stage: "伸蔓期", daysFromStart: 35, careNotes: "整枝留主蔓1~2條，摘除多餘側芽，追施有機肥", waterFrequencyDays: 3, fertilizerFrequencyDays: 21 },
      { stage: "開花授粉期", daysFromStart: 45, careNotes: "清晨人工授粉提高著果率，每蔓留2~3果", waterFrequencyDays: 3, fertilizerFrequencyDays: 21 },
      { stage: "果實膨大期", daysFromStart: 55, careNotes: "追施鉀肥促進果實充實，墊草防止果實接觸地面腐爛", waterFrequencyDays: 3, fertilizerFrequencyDays: 14 },
      { stage: "成熟期", daysFromStart: 80, careNotes: "減少灌水，觀察果梗木質化程度判斷成熟度", waterFrequencyDays: 5, fertilizerFrequencyDays: 0 },
    ],
    growingGuide: {
      howToPlant: "種子先浸泡殺菌劑消毒，洗淨後浸種5~10小時，以濕布催芽至露白播種。穴盤育苗或直播皆可，育苗期約15~20天。定植於排水良好的壤土，畦寬2公尺，株距1.5公尺。",
      howToCare: "採單蔓或雙蔓整枝，摘除多餘側芽。開花期清晨6~8點人工授粉。果實膨大期追施有機肥與鉀肥。注意排水，避免積水導致根腐。下位老葉適度摘除以利通風採光。",
      warnings: "南瓜耐旱不耐淹水，雨季栽培需特別注意排水。高溫期不可從頂部噴水灌溉，容易日燒及傳播病原。花蓮亞蔬2號品種抗病毒能力較強。",
      localNotes: "花蓮地區秋作（8~9月播種）品質較佳，春作需避開梅雨季。可採棚架式栽培節省空間，密植株距縮至60~80cm，單蔓整枝。花蓮區農改場有南瓜有機栽培技術資料可參考。",
    },
    isDefault: true as const,
  },
  {
    name: "絲瓜",
    scientificName: "Luffa cylindrica",
    variety: "圓筒絲瓜",
    aliases: ["菜瓜", "水瓜"],
    emoji: "🥒",
    color: "#16a34a",
    category: "gourds_melons",
    lifecycleType: "annual",
    propagationMethod: "seed",
    source: "seeded",
    plantingMonths: [3, 4, 5],
    harvestMonths: [5, 6, 7, 8, 9],
    growthDays: 60,
    daysToGermination: 7,
    daysToTransplant: 15,
    daysToFlowering: 40,
    harvestWindowDays: 60,
    growingSeasonStart: 3,
    growingSeasonEnd: 9,
    tempMin: 22,
    tempMax: 35,
    tempOptimalMin: 25,
    tempOptimalMax: 30,
    humidityMin: 65,
    humidityMax: 90,
    sunlight: "full_sun",
    sunlightHoursMin: 6,
    sunlightHoursMax: 10,
    windSensitivity: "medium",
    droughtTolerance: "low",
    waterloggingTolerance: "low",
    soilPhMin: 6.0,
    soilPhMax: 7.0,
    soilType: "loamy",
    fertilityDemand: "heavy",
    fertilizerType: "organic",
    fertilizerFrequencyDays: 14,
    commonDeficiencies: ["氮", "鈣", "硼"],
    spacingRowCm: 150,
    spacingPlantCm: 100,
    maxHeightCm: 300,
    maxSpreadCm: 400,
    trellisRequired: true,
    pruningRequired: true,
    pruningMonths: [5, 6, 7, 8],
    water: "abundant",
    waterFrequencyDays: 2,
    waterAmountMl: 1000,
    criticalDroughtStages: ["開花期", "結果期"],
    companionPlants: ["蔥", "萬壽菊", "羅勒"],
    antagonistPlants: ["馬鈴薯"],
    rotationFamily: "cucurbit",
    rotationYears: 3,
    commonPests: [
      { name: "瓜實蠅", symptoms: "果實出現產卵針孔，幼蟲蛀食導致果實畸形腐爛", organicTreatment: "含毒甲基丁香油誘殺器、果實套袋", triggerConditions: "6~8月高溫期密度最高" },
      { name: "蚜蟲", symptoms: "群聚於嫩葉及生長點吸汁，導致葉片捲曲及病毒傳播", organicTreatment: "噴施苦楝油或肥皂水、釋放瓢蟲天敵", triggerConditions: "乾燥溫暖氣候" },
      { name: "紅蜘蛛", symptoms: "葉背出現細小紅色蟎蟲，葉片黃化出現白色斑點", organicTreatment: "噴水增加濕度、噴施礦物油或苦楝油", triggerConditions: "高溫乾燥環境" },
    ],
    commonDiseases: [
      { name: "露菌病", symptoms: "葉片出現多角形黃褐色病斑，葉背灰白色黴層", organicTreatment: "改善通風、避免葉面澆水、噴施波爾多液", triggerConditions: "高溫多雨、28~32°C最適發病" },
      { name: "白粉病", symptoms: "葉面出現白色粉狀黴斑，嚴重時葉片乾枯", organicTreatment: "噴施硫磺水溶液或小蘇打水溶液", triggerConditions: "日夜溫差大、空氣濕度低" },
      { name: "炭疽病", symptoms: "果實及葉片出現圓形褐色凹陷病斑", organicTreatment: "清除病果病葉、噴施波爾多液", triggerConditions: "高溫多濕、連作田區" },
    ],
    typhoonResistance: "low",
    typhoonPrep: "颱風前加固棚架及支撐繩索，將成熟果實提前採收。颱風後立即排水，噴施殺菌劑預防傷口感染。",
    harvestMaturitySigns: "果實表面光滑飽滿、手壓有彈性、花萼乾枯、果長約30~40cm時採收最嫩",
    harvestMethod: "cut",
    harvestCadence: "continuous",
    yieldPerPlant: "15~25 條",
    storageNotes: "採收後儘速食用或冷藏，鮮果不耐儲存",
    shelfLifeDays: 5,
    growthStages: [
      { stage: "育苗期", daysFromStart: 0, careNotes: "種子破殼浸種12~24小時催芽，穴盤育苗10~15天", waterFrequencyDays: 1, fertilizerFrequencyDays: 0 },
      { stage: "定植期", daysFromStart: 15, careNotes: "本葉4~5片時定植，搭建棚架", waterFrequencyDays: 2, fertilizerFrequencyDays: 0 },
      { stage: "伸蔓期", daysFromStart: 25, careNotes: "引蔓上架，摘除側芽(子蔓)，保留母蔓", waterFrequencyDays: 2, fertilizerFrequencyDays: 14 },
      { stage: "開花結果期", daysFromStart: 40, careNotes: "清晨人工授粉，追施磷鉀肥促進結果", waterFrequencyDays: 2, fertilizerFrequencyDays: 14 },
      { stage: "盛產期", daysFromStart: 55, careNotes: "每2~3天採收嫩果，持續追肥維持產量", waterFrequencyDays: 1, fertilizerFrequencyDays: 10 },
    ],
    growingGuide: {
      howToPlant: "種子先破殼處理或浸種12~24小時（或流水浸種48小時），催芽後直播或穴盤育苗。育苗10~15天後，本葉4~5片定植。搭設隧道棚架，畦寬4公尺，株距45~100cm，採母蔓單蔓整枝。",
      howToCare: "母蔓任其生長結果，子蔓（側芽）全部摘除以延長採收期並提高產量。每2週追施有機液肥一次，盛產期可加密施肥。高溫期注意充分灌水，避免乾旱導致落花落果。",
      warnings: "絲瓜怕積水，雨季需注意排水。灌溉水傳播病害，避免噴灌改用滴灌。高氮肥易誘發病害，需均衡施肥。夏季病害隨高溫多雨增加，需加強防治。",
      localNotes: "花蓮地區3~5月定植，可採收至9~10月。棚架式栽培通風良好可減少病蟲害。夏季為花蓮絲瓜盛產期，但需注意颱風季節棚架防護。當地市場需求量大，是重要夏季蔬菜。",
    },
    isDefault: true as const,
  },
  {
    name: "苦瓜",
    scientificName: "Momordica charantia",
    variety: "花蓮6號",
    aliases: ["涼瓜", "錦荔枝"],
    emoji: "🥬",
    color: "#65a30d",
    category: "gourds_melons",
    lifecycleType: "annual",
    propagationMethod: "seed",
    source: "seeded",
    plantingMonths: [3, 4, 5],
    harvestMonths: [6, 7, 8, 9],
    growthDays: 70,
    daysToGermination: 7,
    daysToTransplant: 20,
    daysToFlowering: 40,
    harvestWindowDays: 60,
    growingSeasonStart: 3,
    growingSeasonEnd: 10,
    tempMin: 20,
    tempMax: 35,
    tempOptimalMin: 25,
    tempOptimalMax: 30,
    humidityMin: 60,
    humidityMax: 85,
    sunlight: "full_sun",
    sunlightHoursMin: 6,
    sunlightHoursMax: 10,
    windSensitivity: "medium",
    droughtTolerance: "medium",
    waterloggingTolerance: "low",
    soilPhMin: 5.5,
    soilPhMax: 6.5,
    soilType: "loamy",
    fertilityDemand: "heavy",
    fertilizerType: "organic",
    fertilizerFrequencyDays: 20,
    commonDeficiencies: ["氮", "鉀", "鈣"],
    spacingRowCm: 150,
    spacingPlantCm: 80,
    maxHeightCm: 300,
    maxSpreadCm: 400,
    trellisRequired: true,
    pruningRequired: true,
    pruningMonths: [5, 6, 7, 8],
    water: "moderate",
    waterFrequencyDays: 3,
    waterAmountMl: 800,
    criticalDroughtStages: ["開花期", "結果期"],
    companionPlants: ["蔥", "豆類", "萬壽菊"],
    antagonistPlants: ["馬鈴薯", "茴香"],
    rotationFamily: "cucurbit",
    rotationYears: 3,
    commonPests: [
      { name: "瓜實蠅", symptoms: "果實出現產卵痕，幼蟲蛀食果肉導致腐爛", organicTreatment: "含毒甲基丁香油誘殺、果實套袋保護", triggerConditions: "6~8月族群密度最高" },
      { name: "蚜蟲", symptoms: "嫩芽及葉背群聚吸汁，傳播病毒病", organicTreatment: "噴施苦楝油、釋放瓢蟲天敵", triggerConditions: "乾燥溫暖氣候" },
      { name: "薊馬", symptoms: "花器及嫩葉表面出現銀白色刮痕", organicTreatment: "使用藍色黏蟲板誘捕、噴施苦楝油", triggerConditions: "乾燥高溫環境" },
    ],
    commonDiseases: [
      { name: "白粉病", symptoms: "葉面出現白色粉狀黴斑，嚴重時葉片枯萎", organicTreatment: "噴施小蘇打水或硫磺水溶液、改善通風", triggerConditions: "日夜溫差大時" },
      { name: "露菌病", symptoms: "葉片出現多角形黃褐色病斑，葉背灰色黴層", organicTreatment: "避免葉面澆水、噴施波爾多液", triggerConditions: "高濕多雨季節" },
      { name: "萎凋病", symptoms: "植株從下位葉開始萎凋黃化，切開莖部可見維管束褐變", organicTreatment: "輪作3年以上、選用抗病品種、土壤添加有機質", triggerConditions: "高溫多濕、連作田區" },
    ],
    typhoonResistance: "low",
    typhoonPrep: "颱風前加固棚架、採收可食用果實。颱風後及時排水，修剪受損枝蔓，噴施殺菌劑防止病害蔓延。",
    harvestMaturitySigns: "果實表面瘤狀突起明顯、果色翠綠有光澤、果長約15~25cm時採收",
    harvestMethod: "cut",
    harvestCadence: "continuous",
    yieldPerPlant: "10~20 條",
    storageNotes: "採收後放入塑膠袋冷藏可保鮮約1週",
    shelfLifeDays: 7,
    growthStages: [
      { stage: "育苗期", daysFromStart: 0, careNotes: "種子浸種8~12小時後催芽，穴盤育苗15~20天", waterFrequencyDays: 1, fertilizerFrequencyDays: 0 },
      { stage: "定植期", daysFromStart: 20, careNotes: "本葉4~5片定植，搭設棚架或籬架", waterFrequencyDays: 2, fertilizerFrequencyDays: 0 },
      { stage: "伸蔓期", daysFromStart: 30, careNotes: "引蔓上架，適度整枝留主蔓及強壯側蔓", waterFrequencyDays: 3, fertilizerFrequencyDays: 20 },
      { stage: "開花結果期", daysFromStart: 40, careNotes: "追施高氮有機肥，保持適當水分", waterFrequencyDays: 3, fertilizerFrequencyDays: 20 },
      { stage: "盛產採收期", daysFromStart: 60, careNotes: "每2~3天採收嫩果，持續追肥延長採收期", waterFrequencyDays: 2, fertilizerFrequencyDays: 14 },
    ],
    growingGuide: {
      howToPlant: "種子浸種8~12小時催芽後穴盤育苗，育苗期15~20天。本葉4~5片定植於排水良好壤土。行距150cm、株距80cm。搭設棚架高約180~200cm。",
      howToCare: "苦瓜吸肥力強，基肥施用腐熟堆肥每公頃12,000公斤以上。氮肥效果顯著，宜施含氮量高之有機質肥料。每20天追施一次，結果期間加強鉀肥。生育期保持適當水分但不可積水。",
      warnings: "瓜實蠅為台灣東部苦瓜主要害蟲，6~8月密度最高須重點防治。苦瓜為淺根作物，忌積水，雨季需特別注意排水。避免偏施氮肥導致徒長不結果。",
      localNotes: "花蓮區農改場育成之花蓮6號及花蓮7號品種適合當地栽培。花蓮東部地區瓜實蠅7~8月達高峰，建議使用套袋及誘殺器。春作3~5月播種、夏秋季採收為主要產期。",
    },
    isDefault: true as const,
  },
  {
    name: "空心菜",
    scientificName: "Ipomoea aquatica",
    variety: "竹葉種",
    aliases: ["蕹菜", "通菜", "甕菜"],
    emoji: "🥬",
    color: "#15803d",
    category: "leafy_vegetables",
    lifecycleType: "annual",
    propagationMethod: "seed",
    source: "seeded",
    plantingMonths: [3, 4, 5, 6, 7, 8, 9],
    harvestMonths: [4, 5, 6, 7, 8, 9, 10],
    growthDays: 30,
    daysToGermination: 7,
    daysToTransplant: 0,
    daysToFlowering: 60,
    harvestWindowDays: 120,
    growingSeasonStart: 3,
    growingSeasonEnd: 10,
    tempMin: 25,
    tempMax: 35,
    tempOptimalMin: 28,
    tempOptimalMax: 32,
    humidityMin: 70,
    humidityMax: 95,
    sunlight: "full_sun",
    sunlightHoursMin: 6,
    sunlightHoursMax: 10,
    windSensitivity: "low",
    droughtTolerance: "low",
    waterloggingTolerance: "high",
    soilPhMin: 5.5,
    soilPhMax: 7.0,
    soilType: "loamy",
    fertilityDemand: "moderate",
    fertilizerType: "organic",
    fertilizerFrequencyDays: 14,
    commonDeficiencies: ["氮", "鐵"],
    spacingRowCm: 20,
    spacingPlantCm: 15,
    maxHeightCm: 40,
    maxSpreadCm: 30,
    trellisRequired: false,
    water: "abundant",
    waterFrequencyDays: 1,
    waterAmountMl: 600,
    criticalDroughtStages: ["生長全期"],
    companionPlants: ["蔥", "大蒜"],
    antagonistPlants: ["牽牛花"],
    rotationFamily: "root",
    rotationYears: 2,
    commonPests: [
      { name: "蚜蟲", symptoms: "嫩葉及莖部群聚吸汁，導致植株矮化", organicTreatment: "噴施苦楝油或肥皂水、增加天敵棲地", triggerConditions: "乾燥季節" },
      { name: "斜紋夜蛾", symptoms: "幼蟲啃食葉片造成大面積孔洞", organicTreatment: "使用蘇力菌噴施、人工捕捉", triggerConditions: "高溫多濕季節" },
      { name: "葉甲蟲", symptoms: "成蟲咬食葉片成小孔洞", organicTreatment: "噴施苦楝油、清除田間雜草", triggerConditions: "春夏季" },
    ],
    commonDiseases: [
      { name: "白銹病", symptoms: "葉背出現白色隆起疱斑，嚴重時葉片變形", organicTreatment: "保持通風、清除病葉、噴施波爾多液", triggerConditions: "高溫高濕環境" },
      { name: "猝倒病", symptoms: "幼苗莖基部水浸狀腐爛倒伏", organicTreatment: "使用無病土壤育苗、冬季蒸氣消毒土壤", triggerConditions: "連作田區、高濕環境" },
      { name: "葉斑病", symptoms: "葉片出現圓形或不規則褐色斑點", organicTreatment: "清除病葉、保持通風、減少葉面澆水", triggerConditions: "多雨潮濕季節" },
    ],
    typhoonResistance: "medium",
    typhoonPrep: "颱風前加強排水溝清理。颱風後及時排除積水，追施速效氮肥促進恢復生長。空心菜再生力強，颱風後可較快恢復。",
    harvestMaturitySigns: "株高約25~30cm、莖部柔嫩未木質化、葉色濃綠時即可採收",
    harvestMethod: "cut",
    harvestCadence: "continuous",
    yieldPerPlant: "持續採收，每次約50~100公克",
    storageNotes: "採收後灑水保鮮，儘速冷藏或食用，不耐儲存",
    shelfLifeDays: 3,
    growthStages: [
      { stage: "播種期", daysFromStart: 0, careNotes: "種子催芽（浸水20小時）後直播，覆土約1cm", waterFrequencyDays: 1, fertilizerFrequencyDays: 0 },
      { stage: "發芽期", daysFromStart: 7, careNotes: "保持土壤濕潤，間苗至適當密度", waterFrequencyDays: 1, fertilizerFrequencyDays: 0 },
      { stage: "營養生長期", daysFromStart: 15, careNotes: "追施氮肥促進莖葉生長，充分灌水", waterFrequencyDays: 1, fertilizerFrequencyDays: 14 },
      { stage: "首次採收", daysFromStart: 25, careNotes: "株高25~30cm時從基部留2~3節剪取", waterFrequencyDays: 1, fertilizerFrequencyDays: 14 },
      { stage: "持續採收期", daysFromStart: 35, careNotes: "每7~10天可再次採收，每次採收後追肥灌水", waterFrequencyDays: 1, fertilizerFrequencyDays: 10 },
    ],
    growingGuide: {
      howToPlant: "種子種皮厚，播種前需催芽：將種子在陰濕環境放置約一週軟化種皮，再浸泡25~30°C水中20小時，撈起保濕催芽至露白即可播種。條播行距20cm、覆土約1cm。",
      howToCare: "空心菜為半水生蔬菜，需充足水分。秋冬每2~3天灌水一次，高溫期每天早晚各灌水一次。每次採收後追施速效氮肥促進再生。可連續採收4~6次。",
      warnings: "空心菜忌連作，專業栽培者冬季需蒸氣消毒土壤減少連作障礙。猝倒病及根瘤線蟲為連作主要問題。高溫多濕時注意白銹病防治。",
      localNotes: "花蓮地區3~9月為主要栽培期，全年高溫多雨的環境適合空心菜生長。竹葉種為台灣大宗品種，管理容易、產能佳。可利用稻田休耕期種植。",
    },
    isDefault: true as const,
  },
  {
    name: "小白菜",
    scientificName: "Brassica rapa var. chinensis",
    variety: "奶油白菜",
    aliases: ["青江菜", "湯匙菜", "不結球白菜"],
    emoji: "🥬",
    color: "#22c55e",
    category: "leafy_vegetables",
    lifecycleType: "annual",
    propagationMethod: "seed",
    source: "seeded",
    plantingMonths: [9, 10, 11, 12, 1, 2, 3],
    harvestMonths: [10, 11, 12, 1, 2, 3, 4],
    growthDays: 25,
    daysToGermination: 3,
    daysToTransplant: 15,
    daysToFlowering: 40,
    harvestWindowDays: 10,
    growingSeasonStart: 9,
    growingSeasonEnd: 4,
    tempMin: 15,
    tempMax: 25,
    tempOptimalMin: 18,
    tempOptimalMax: 22,
    humidityMin: 60,
    humidityMax: 85,
    sunlight: "partial_shade",
    sunlightHoursMin: 3,
    sunlightHoursMax: 6,
    windSensitivity: "medium",
    droughtTolerance: "low",
    waterloggingTolerance: "low",
    soilPhMin: 6.0,
    soilPhMax: 7.0,
    soilType: "loamy",
    fertilityDemand: "moderate",
    fertilizerType: "organic",
    fertilizerFrequencyDays: 10,
    commonDeficiencies: ["氮", "鈣", "硼"],
    spacingRowCm: 20,
    spacingPlantCm: 15,
    maxHeightCm: 25,
    maxSpreadCm: 20,
    trellisRequired: false,
    water: "moderate",
    waterFrequencyDays: 2,
    waterAmountMl: 300,
    criticalDroughtStages: ["發芽期", "生長全期"],
    companionPlants: ["蔥", "大蒜", "芫荽"],
    antagonistPlants: ["草莓"],
    rotationFamily: "brassica",
    rotationYears: 2,
    commonPests: [
      { name: "小菜蛾", symptoms: "幼蟲啃食葉片，僅留上表皮形成透明窗狀食痕", organicTreatment: "使用蘇力菌噴施、設置性費洛蒙誘殺", triggerConditions: "全年發生，設施栽培尤其嚴重" },
      { name: "黃條葉蚤", symptoms: "成蟲咬食葉片成密集小圓孔，幼蟲蛀食根部", organicTreatment: "噴施苦楝油、設置黃色黏蟲板", triggerConditions: "高溫乾燥時大量發生" },
      { name: "蚜蟲", symptoms: "群聚嫩葉吸汁，導致葉片捲曲變形及病毒傳播", organicTreatment: "噴施肥皂水或苦楝油、利用瓢蟲天敵", triggerConditions: "乾燥冷涼季節" },
    ],
    commonDiseases: [
      { name: "軟腐病", symptoms: "葉柄基部出現水浸狀腐爛，發出惡臭", organicTreatment: "避免傷口、改善排水、施用石灰調整土壤酸鹼度", triggerConditions: "高溫多濕、土壤偏酸" },
      { name: "露菌病", symptoms: "葉面黃褐色病斑，葉背灰白色黴層", organicTreatment: "保持通風、避免傍晚後澆水沾濕葉片", triggerConditions: "潮濕低溫環境" },
      { name: "根腫病", symptoms: "根部膨大成腫瘤狀，植株矮化萎凋", organicTreatment: "施用石灰提高土壤pH至7以上、輪作2~3年", triggerConditions: "酸性土壤、排水不良" },
    ],
    typhoonResistance: "low",
    typhoonPrep: "颱風前將接近成熟的小白菜提前採收。颱風後清除受損植株，儘速補播新一批。可利用簡易隧道棚保護幼苗。",
    harvestMaturitySigns: "株高約15~20cm、葉片肥厚濃綠、基部呈湯匙狀展開時即可採收",
    harvestMethod: "pull",
    harvestCadence: "once",
    yieldPerPlant: "100~200 公克",
    storageNotes: "採收後噴水保鮮，以報紙包裹冷藏可保存約5天",
    shelfLifeDays: 5,
    growthStages: [
      { stage: "播種期", daysFromStart: 0, careNotes: "直播或穴盤育苗，覆土薄薄一層即可", waterFrequencyDays: 1, fertilizerFrequencyDays: 0 },
      { stage: "發芽期", daysFromStart: 3, careNotes: "保持土壤濕潤，避免乾燥結皮影響出苗", waterFrequencyDays: 1, fertilizerFrequencyDays: 0 },
      { stage: "間苗期", daysFromStart: 10, careNotes: "間苗至株距15cm，保留健壯苗", waterFrequencyDays: 2, fertilizerFrequencyDays: 10 },
      { stage: "旺盛生長期", daysFromStart: 15, careNotes: "追施氮肥促進葉片生長，保持土壤濕潤", waterFrequencyDays: 2, fertilizerFrequencyDays: 10 },
      { stage: "採收期", daysFromStart: 25, careNotes: "整株拔起或留基部再生，清晨採收品質最佳", waterFrequencyDays: 2, fertilizerFrequencyDays: 0 },
    ],
    growingGuide: {
      howToPlant: "直播為主，撒播或條播皆可。種子細小，覆土薄薄一層約0.5cm。行距20cm、株距15cm。每公升栽培土混入約5g有機肥。秋冬季為最佳播種期。",
      howToCare: "出苗後適時間苗，保持株距15cm。每10天追施一次有機液肥。保持土壤濕潤但不積水，陽光充足排水良好即可生長良好。",
      warnings: "小菜蛾為台灣十字花科首要害蟲，需持續防治。高溫期易抽薹開花，夏季不宜栽種。避免連作，需輪作2~3年。深翻土壤20cm以上有助減少病害。",
      localNotes: "花蓮地區9月至翌年3月為最佳栽種期，涼爽氣候品質好。夏季高溫多雨不適合栽培。可利用簡易設施遮陰降溫延長栽培期。是花蓮地區冬季重要葉菜。",
    },
    isDefault: true as const,
  },
  {
    name: "蔥",
    scientificName: "Allium fistulosum",
    variety: "四季蔥",
    aliases: ["青蔥", "大蔥"],
    emoji: "🧅",
    color: "#4ade80",
    category: "aromatics",
    lifecycleType: "perennial",
    propagationMethod: "division",
    source: "seeded",
    plantingMonths: [9, 10, 11, 12, 1, 2],
    harvestMonths: [11, 12, 1, 2, 3, 4],
    growthDays: 60,
    daysToGermination: 10,
    daysToTransplant: 30,
    daysToFlowering: 120,
    harvestWindowDays: 30,
    growingSeasonStart: 9,
    growingSeasonEnd: 4,
    tempMin: 15,
    tempMax: 25,
    tempOptimalMin: 18,
    tempOptimalMax: 22,
    humidityMin: 55,
    humidityMax: 75,
    sunlight: "full_sun",
    sunlightHoursMin: 5,
    sunlightHoursMax: 8,
    windSensitivity: "medium",
    droughtTolerance: "low",
    waterloggingTolerance: "low",
    soilPhMin: 6.0,
    soilPhMax: 7.0,
    soilType: "loamy",
    fertilityDemand: "moderate",
    fertilizerType: "organic",
    fertilizerFrequencyDays: 15,
    commonDeficiencies: ["氮", "鉀"],
    spacingRowCm: 20,
    spacingPlantCm: 10,
    maxHeightCm: 50,
    maxSpreadCm: 15,
    trellisRequired: false,
    water: "moderate",
    waterFrequencyDays: 3,
    waterAmountMl: 400,
    criticalDroughtStages: ["定植後發根期"],
    companionPlants: ["胡蘿蔔", "番茄", "高麗菜"],
    antagonistPlants: ["豆類", "豌豆"],
    rotationFamily: "allium",
    rotationYears: 3,
    commonPests: [
      { name: "甜菜夜蛾", symptoms: "幼蟲啃食蔥管內部，導致蔥葉枯萎", organicTreatment: "使用蘇力菌噴施、設置性費洛蒙誘殺", triggerConditions: "高溫季節" },
      { name: "薊馬", symptoms: "蔥葉表面出現銀白色條紋刮痕", organicTreatment: "噴施苦楝油、使用藍色黏蟲板", triggerConditions: "乾燥高溫環境" },
      { name: "潛蠅", symptoms: "蔥葉內部出現白色蛇形蛀道", organicTreatment: "摘除被害葉片、噴施苦楝油", triggerConditions: "春秋季" },
    ],
    commonDiseases: [
      { name: "疫病", symptoms: "葉片水浸狀軟爛，莖基部褐化腐爛", organicTreatment: "花蓮農改場木黴菌粉衣處理種苗、改善排水", triggerConditions: "高溫多雨季節" },
      { name: "紫斑病", symptoms: "蔥葉出現紫色或暗褐色橢圓形病斑", organicTreatment: "噴施波爾多液、保持通風", triggerConditions: "高濕環境" },
      { name: "銹病", symptoms: "蔥葉表面出現橙黃色小型隆起銹斑", organicTreatment: "清除病葉、噴施硫磺水溶液", triggerConditions: "秋冬季涼爽多濕時" },
    ],
    typhoonResistance: "low",
    typhoonPrep: "颱風前加強排水溝疏通，蔥根怕浸水。可培土加高保護蔥白。颱風後立即排水、噴施殺菌劑防止病害蔓延。",
    harvestMaturitySigns: "蔥白充實飽滿、株高約30~40cm、蔥綠部分挺直有光澤",
    harvestMethod: "pull",
    harvestCadence: "once",
    yieldPerPlant: "50~100 公克",
    storageNotes: "採收後去除泥土，以報紙包裹冷藏可保鮮約1~2週",
    shelfLifeDays: 14,
    growthStages: [
      { stage: "定植期", daysFromStart: 0, careNotes: "每穴種植2~3支種苗，夏天植穴淺15cm、秋冬深20cm", waterFrequencyDays: 2, fertilizerFrequencyDays: 0 },
      { stage: "發根期", daysFromStart: 7, careNotes: "保持土壤濕潤促進生根，避免積水", waterFrequencyDays: 2, fertilizerFrequencyDays: 0 },
      { stage: "生長期", daysFromStart: 20, careNotes: "追施有機肥，可覆蓋稻草培土促進蔥白生長", waterFrequencyDays: 3, fertilizerFrequencyDays: 15 },
      { stage: "培土期", daysFromStart: 35, careNotes: "分次培土增加蔥白長度，鋪設稻草護根", waterFrequencyDays: 3, fertilizerFrequencyDays: 15 },
      { stage: "採收期", daysFromStart: 55, careNotes: "蔥白充實後整株拔起，清晨採收品質最佳", waterFrequencyDays: 3, fertilizerFrequencyDays: 0 },
    ],
    growingGuide: {
      howToPlant: "選擇無病蟲害且生長健壯的種苗，每穴2~3支。株距15cm，夏天植穴淺約15cm，秋冬可深至20cm。可在畦面鋪設稻草，讓蔥白在稻草保護下生長。",
      howToCare: "定植後保持濕潤促進生根。生長期間每15天追肥一次。分次培土增加蔥白長度。遇豪雨注意排水，蔥根最怕浸水。可用稻草覆蓋保濕保溫。",
      warnings: "青蔥忌連作，同一塊土地連續栽種三次後需另覓地區。根部怕浸水，排水務必良好。夏季高溫不利生長，宜選用耐熱品種。",
      localNotes: "花蓮區農改場研發的種苗粉衣技術（木黴菌、菌根菌混合矽藻土）可提升存活率約20%，減輕疫病菌及根蟎危害。花蓮地區秋冬季為最佳栽培期，可參考宜蘭三星蔥的稻草培土技術。",
    },
    isDefault: true as const,
  },
  {
    name: "薑",
    scientificName: "Zingiber officinale",
    variety: "竹薑",
    aliases: ["生薑", "老薑", "嫩薑"],
    emoji: "🫚",
    color: "#ca8a04",
    category: "root_vegetables",
    lifecycleType: "perennial",
    propagationMethod: "tuber",
    source: "seeded",
    plantingMonths: [2, 3, 4],
    harvestMonths: [8, 9, 10, 11],
    growthDays: 180,
    daysToGermination: 14,
    daysToTransplant: 0,
    daysToFlowering: 150,
    harvestWindowDays: 60,
    growingSeasonStart: 2,
    growingSeasonEnd: 11,
    tempMin: 20,
    tempMax: 30,
    tempOptimalMin: 25,
    tempOptimalMax: 28,
    humidityMin: 70,
    humidityMax: 90,
    sunlight: "partial_shade",
    sunlightHoursMin: 3,
    sunlightHoursMax: 6,
    windSensitivity: "medium",
    droughtTolerance: "low",
    waterloggingTolerance: "low",
    soilPhMin: 5.5,
    soilPhMax: 6.5,
    soilType: "loamy",
    fertilityDemand: "heavy",
    fertilizerType: "organic",
    fertilizerFrequencyDays: 21,
    commonDeficiencies: ["鉀", "鎂", "鋅"],
    spacingRowCm: 40,
    spacingPlantCm: 25,
    maxHeightCm: 100,
    maxSpreadCm: 40,
    trellisRequired: false,
    water: "moderate",
    waterFrequencyDays: 3,
    waterAmountMl: 600,
    criticalDroughtStages: ["塊莖膨大期"],
    companionPlants: ["豆類", "香蕉", "果樹"],
    antagonistPlants: ["馬鈴薯"],
    rotationFamily: "root",
    rotationYears: 6,
    commonPests: [
      { name: "根蟎", symptoms: "地下莖表面出現褐色腐爛斑，幼蟲取食塊莖", organicTreatment: "使用健康種薑、土壤蒸氣消毒、輪作", triggerConditions: "連作田區、高溫多濕" },
      { name: "根瘤線蟲", symptoms: "根系出現瘤狀腫大，植株矮化黃化", organicTreatment: "淹水處理土壤、輪作非寄主作物", triggerConditions: "連作田區帶蟲卵" },
      { name: "紋白蝶", symptoms: "幼蟲啃食葉片造成孔洞", organicTreatment: "人工捕捉、使用蘇力菌防治", triggerConditions: "春季新葉萌發期" },
    ],
    commonDiseases: [
      { name: "軟腐病", symptoms: "莖基部及塊莖出現水浸狀軟爛，發出惡臭", organicTreatment: "使用健康種薑、輪作3年以上、改善排水", triggerConditions: "4~6月高溫多濕為發病高峰" },
      { name: "根莖腐病", symptoms: "地下莖由外向內褐變腐爛，地上部萎凋", organicTreatment: "避免連作、種薑消毒處理、排水良好", triggerConditions: "連作田區、排水不良" },
      { name: "葉枯病", symptoms: "葉片出現褐色橢圓形病斑，嚴重時葉片撕裂枯死", organicTreatment: "噴施波爾多液、保持適當肥力", triggerConditions: "高濕低肥力環境" },
    ],
    typhoonResistance: "medium",
    typhoonPrep: "颱風前加強排水溝清理。薑為半遮蔭作物，地上部受損後仍可由地下莖恢復。颱風後立即排水防止軟腐病。",
    harvestMaturitySigns: "嫩薑：種植4~5個月，莖葉翠綠時採收。老薑：種植8~10個月，莖葉轉黃枯萎時採收",
    harvestMethod: "dig",
    harvestCadence: "once",
    yieldPerPlant: "0.3~1 公斤",
    storageNotes: "老薑可在陰涼通風處存放數月。嫩薑含水量高需冷藏，保鮮期較短",
    shelfLifeDays: 90,
    growthStages: [
      { stage: "種薑準備", daysFromStart: 0, careNotes: "選擇肉質密緻的無病老薑，切成50~70公克段，每段2~3個芽點", waterFrequencyDays: 3, fertilizerFrequencyDays: 0 },
      { stage: "發芽期", daysFromStart: 14, careNotes: "18°C即可萌芽，保持土壤濕潤但不積水", waterFrequencyDays: 3, fertilizerFrequencyDays: 0 },
      { stage: "幼苗期", daysFromStart: 40, careNotes: "遮蔭50~70%，追施有機肥", waterFrequencyDays: 3, fertilizerFrequencyDays: 21 },
      { stage: "分蘗期", daysFromStart: 80, careNotes: "大量分蘗生長，培土覆蓋新生塊莖，追肥", waterFrequencyDays: 3, fertilizerFrequencyDays: 21 },
      { stage: "塊莖膨大期", daysFromStart: 120, careNotes: "嫩薑可開始採收。老薑需等至莖葉枯黃", waterFrequencyDays: 3, fertilizerFrequencyDays: 21 },
      { stage: "成熟採收期", daysFromStart: 180, careNotes: "地上部轉黃後挖掘採收老薑", waterFrequencyDays: 5, fertilizerFrequencyDays: 0 },
    ],
    growingGuide: {
      howToPlant: "選充分成熟的無病老薑作種薑，切成50~70公克段，每段保留2~3個芽點。種植深度約5~8cm，覆土後澆水。需深厚疏鬆的砂質壤土，排水良好。可在果樹下或搭遮蔭網栽種。",
      howToCare: "薑為陰性作物，喜半遮蔭環境。生長期間每3週追施有機肥一次。分蘗期分次培土覆蓋新生塊莖。保持土壤濕潤但排水通暢，忌積水。",
      warnings: "薑最忌連作：嫩薑採收後土地需休息3年，老薑則需休息6~9年。軟腐病為最嚴重病害，4~6月高溫多濕為發病高峰，需嚴格使用健康種薑。",
      localNotes: "花蓮瑞穗鄉為當地薑的重要產區。利用檳榔園或果樹下遮蔭環境種植效果良好。山區海拔較高處氣候冷涼，多以老薑生產為主。種薑品質直接影響產量與病害發生。",
    },
    isDefault: true as const,
  },
  {
    name: "香蕉",
    scientificName: "Musa acuminata",
    variety: "北蕉（寶島蕉）",
    aliases: ["芎蕉", "弓蕉"],
    emoji: "🍌",
    color: "#eab308",
    category: "fruits",
    lifecycleType: "perennial",
    propagationMethod: "division",
    source: "seeded",
    plantingMonths: [2, 3, 4, 5],
    harvestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    growthDays: 365,
    daysToGermination: 0,
    daysToTransplant: 30,
    daysToFlowering: 270,
    harvestWindowDays: 30,
    growingSeasonStart: 1,
    growingSeasonEnd: 12,
    tempMin: 20,
    tempMax: 35,
    tempOptimalMin: 25,
    tempOptimalMax: 30,
    humidityMin: 65,
    humidityMax: 95,
    sunlight: "full_sun",
    sunlightHoursMin: 6,
    sunlightHoursMax: 10,
    windSensitivity: "high",
    droughtTolerance: "low",
    waterloggingTolerance: "low",
    soilPhMin: 5.5,
    soilPhMax: 7.0,
    soilType: "loamy",
    fertilityDemand: "heavy",
    fertilizerType: "organic",
    fertilizerFrequencyDays: 30,
    commonDeficiencies: ["鉀", "氮", "鎂"],
    spacingRowCm: 300,
    spacingPlantCm: 250,
    maxHeightCm: 400,
    maxSpreadCm: 300,
    trellisRequired: false,
    pruningRequired: true,
    pruningMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    water: "abundant",
    waterFrequencyDays: 3,
    waterAmountMl: 2000,
    criticalDroughtStages: ["抽穗期", "果實充實期"],
    companionPlants: ["薑", "芋頭", "地瓜"],
    antagonistPlants: [],
    rotationFamily: "root",
    rotationYears: 0,
    commonPests: [
      { name: "蕉蚜", symptoms: "群聚於嫩葉及花穗吸汁，為嵌紋病媒介昆蟲", organicTreatment: "噴施苦楝油、釋放瓢蟲天敵、清除罹病植株", triggerConditions: "秋冬乾燥涼爽季節蚜蟲孳生" },
      { name: "香蕉象鼻蟲", symptoms: "幼蟲蛀食假莖及球莖，導致植株傾倒", organicTreatment: "使用陷阱誘殺、清除殘株、種植組培健康苗", triggerConditions: "全年發生，高溫多濕期嚴重" },
      { name: "花薊馬", symptoms: "花器及幼果表面出現褐色銹斑", organicTreatment: "噴施苦楝油、使用藍色黏蟲板", triggerConditions: "開花期" },
    ],
    commonDiseases: [
      { name: "黃葉病", symptoms: "下位葉從葉緣向中肋黃化，假莖維管束褐變，植株萎凋死亡", organicTreatment: "使用抗病品種（台蕉5號等）、避免酸性土壤、嚴格清除病株及汙染土壤", triggerConditions: "酸性土壤、連作園區" },
      { name: "嵌紋病", symptoms: "葉片出現黃綠相間嵌紋斑，果實畸形減產", organicTreatment: "防治蚜蟲媒介、清除病株、使用健康種苗", triggerConditions: "蚜蟲密度高時傳播" },
      { name: "黑星病", symptoms: "果實表面出現黑褐色小圓斑點", organicTreatment: "套袋保護果串、噴施波爾多液", triggerConditions: "高溫多濕季節" },
    ],
    typhoonResistance: "low",
    typhoonPrep: "颱風前用支柱或繩索固定假莖，將接近成熟的果串提前採收。颱風後修剪折斷葉片、噴施殺菌劑，清除倒伏植株。可選用矮化品種降低風害。",
    harvestMaturitySigns: "果指飽滿圓潤、稜角消失、果皮由深綠轉淺綠",
    harvestMethod: "cut",
    harvestCadence: "once",
    yieldPerPlant: "15~30 公斤（每串）",
    storageNotes: "青果採收後在常溫下催熟約5~7天。已轉黃果實冷藏可延長3~5天",
    shelfLifeDays: 10,
    growthStages: [
      { stage: "定植期", daysFromStart: 0, careNotes: "使用組培苗或健康吸芽苗定植，株距250cm", waterFrequencyDays: 3, fertilizerFrequencyDays: 0 },
      { stage: "營養生長期", daysFromStart: 30, careNotes: "每月追施有機肥，保留最強壯的一株吸芽作為接替株", waterFrequencyDays: 3, fertilizerFrequencyDays: 30 },
      { stage: "快速生長期", daysFromStart: 120, careNotes: "加強鉀肥施用，清除多餘吸芽，保持園區通風", waterFrequencyDays: 3, fertilizerFrequencyDays: 30 },
      { stage: "抽穗開花期", daysFromStart: 270, careNotes: "花穗抽出後套袋保護，摘除多餘花苞", waterFrequencyDays: 3, fertilizerFrequencyDays: 21 },
      { stage: "果實充實期", daysFromStart: 310, careNotes: "支撐果串重量，持續追肥灌水促進果實飽滿", waterFrequencyDays: 3, fertilizerFrequencyDays: 21 },
      { stage: "採收期", daysFromStart: 360, careNotes: "果指飽滿、稜角消失後整串砍下催熟", waterFrequencyDays: 3, fertilizerFrequencyDays: 0 },
    ],
    growingGuide: {
      howToPlant: "使用組培苗或健康吸芽苗定植。種植穴深寬各60cm，施入有機肥10公斤作基肥。株距約250cm、行距300cm。種植深度以球莖頂部覆土5~10cm為宜。",
      howToCare: "每月追施有機肥一次，以鉀肥為主。定期清除多餘吸芽，每叢僅保留母株及一株接替吸芽。抽穗後套袋保護果串。假莖底部老葉定期清除保持通風。使用支柱固定防風。",
      warnings: "黃葉病（巴拿馬病）為土傳真菌病害，無藥可醫，務必使用抗病品種。香蕉極怕颱風，需做好支撐。1980年後花蓮地區也出現黃葉病，選用台蕉5號等抗病品種至關重要。",
      localNotes: "花蓮地區有香蕉種植歷史。建議選用抗黃葉病品種如台蕉5號、台蕉7號、寶島蕉等。矮化品種如台蕉三號更抗颱抗病且省工。利用防風林或建築遮擋減輕風害。",
    },
    isDefault: true as const,
  },
  {
    name: "木瓜",
    scientificName: "Carica papaya",
    variety: "台農2號",
    aliases: ["番木瓜"],
    emoji: "🫒",
    color: "#f97316",
    category: "fruits",
    lifecycleType: "perennial",
    propagationMethod: "seed",
    source: "seeded",
    plantingMonths: [3, 4, 5],
    harvestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    growthDays: 270,
    daysToGermination: 14,
    daysToTransplant: 60,
    daysToFlowering: 120,
    harvestWindowDays: 365,
    growingSeasonStart: 1,
    growingSeasonEnd: 12,
    tempMin: 22,
    tempMax: 35,
    tempOptimalMin: 25,
    tempOptimalMax: 30,
    humidityMin: 60,
    humidityMax: 85,
    sunlight: "full_sun",
    sunlightHoursMin: 6,
    sunlightHoursMax: 10,
    windSensitivity: "high",
    droughtTolerance: "medium",
    waterloggingTolerance: "low",
    soilPhMin: 5.5,
    soilPhMax: 7.0,
    soilType: "loamy",
    fertilityDemand: "heavy",
    fertilizerType: "organic",
    fertilizerFrequencyDays: 21,
    commonDeficiencies: ["氮", "鉀", "硼"],
    spacingRowCm: 250,
    spacingPlantCm: 200,
    maxHeightCm: 500,
    maxSpreadCm: 250,
    trellisRequired: false,
    water: "moderate",
    waterFrequencyDays: 3,
    waterAmountMl: 1500,
    criticalDroughtStages: ["開花期", "果實膨大期"],
    companionPlants: ["萬壽菊", "豆類"],
    antagonistPlants: [],
    rotationFamily: "root",
    rotationYears: 3,
    commonPests: [
      { name: "蚜蟲", symptoms: "群聚嫩葉吸汁，為木瓜輪點病毒主要媒介", organicTreatment: "使用網室阻隔、噴施苦楝油、釋放草蛉天敵", triggerConditions: "全年發生" },
      { name: "介殼蟲", symptoms: "莖幹及葉背附著白色或褐色蟲體，吸取汁液導致生長衰弱", organicTreatment: "噴施礦物油或苦楝油、釋放草蛉捕食", triggerConditions: "網室栽培內較易發生" },
      { name: "紅蜘蛛", symptoms: "葉背出現細小蟎蟲，葉面黃化出現細密白點", organicTreatment: "噴水增加濕度、噴施礦物油", triggerConditions: "高溫乾燥環境" },
    ],
    commonDiseases: [
      { name: "輪點病毒病", symptoms: "葉片出現黃綠嵌紋，果實表面出現輪紋斑，品質嚴重下降", organicTreatment: "網室栽培阻隔帶病蚜蟲、使用健康種苗、清除病株", triggerConditions: "蚜蟲傳播，露天栽培幾乎無法避免" },
      { name: "疫病", symptoms: "根部及莖基部水浸狀腐爛，植株急速萎凋死亡", organicTreatment: "噴施亞磷酸+氫氧化鉀增強抗性、改善排水", triggerConditions: "夏季雨季，排水不良田區" },
      { name: "炭疽病", symptoms: "果實出現黑褐色凹陷圓形病斑，逐漸擴大腐爛", organicTreatment: "果實套袋、噴施石灰硫磺合劑", triggerConditions: "高溫多雨季節" },
    ],
    typhoonResistance: "low",
    typhoonPrep: "颱風前支柱固定主幹，採收可食用果實。木瓜主幹脆弱極易折斷，颱風後檢查根系及主幹，嚴重受損者需砍除重新定植。",
    harvestMaturitySigns: "果實表面轉色由綠轉黃約1/3~1/2時採收（綠熟果），或全熟黃果食用",
    harvestMethod: "pick",
    harvestCadence: "continuous",
    yieldPerPlant: "30~60 公斤/年",
    storageNotes: "綠熟果常溫催熟3~5天，已轉黃果實冷藏可保存約1週",
    shelfLifeDays: 7,
    growthStages: [
      { stage: "育苗期", daysFromStart: 0, careNotes: "種子播於穴盤，14天發芽，育苗約60天", waterFrequencyDays: 2, fertilizerFrequencyDays: 0 },
      { stage: "定植期", daysFromStart: 60, careNotes: "本葉6~8片定植，畦高60cm，確保排水良好", waterFrequencyDays: 3, fertilizerFrequencyDays: 0 },
      { stage: "營養生長期", daysFromStart: 90, careNotes: "每3週追施有機肥，設置網室防病毒", waterFrequencyDays: 3, fertilizerFrequencyDays: 21 },
      { stage: "開花期", daysFromStart: 120, careNotes: "確認性別（兩性花株保留），摘除多餘花朵", waterFrequencyDays: 3, fertilizerFrequencyDays: 21 },
      { stage: "結果期", daysFromStart: 180, careNotes: "果實套袋保護，加強鉀肥促進果實品質", waterFrequencyDays: 3, fertilizerFrequencyDays: 14 },
      { stage: "採收期", daysFromStart: 270, careNotes: "果實轉色後採收，持續結果可全年採收", waterFrequencyDays: 3, fertilizerFrequencyDays: 21 },
    ],
    growingGuide: {
      howToPlant: "育苗約60天，本葉6~8片時定植。種植前深耕打破硬土層，做畦高60cm以利排水。行距250cm、株距200cm。基肥施有機質肥料每公頃20公噸。定植3株後選留兩性花株。",
      howToCare: "每3週追施有機肥，以鉀肥為主。雨季前噴施亞磷酸1000倍+氫氧化鉀1000倍增強抗病力，連續3~4次。果實套袋防炭疽病及蟲害。適時摘除下位老葉保持通風。",
      warnings: "木瓜是台灣唯一需要全年種植在網室裡的果樹，因輪點病毒由蚜蟲傳播，露天栽培極易感染。排水極為重要，積水24小時即可致死。避免連作。",
      localNotes: "花蓮地區以網室栽培為主，可有效阻隔帶病蚜蟲。春植3~5月最適合。注意颱風季節防護，木瓜主幹脆弱易折。台農2號為台灣主要商業品種。可噴施苦楝油或釋放草蛉進行非化學防治。",
    },
    isDefault: true as const,
  },
  {
    name: "番茄",
    scientificName: "Solanum lycopersicum",
    variety: "聖女小番茄",
    aliases: ["西紅柿", "柑仔蜜"],
    emoji: "🍅",
    color: "#dc2626",
    category: "solanaceae",
    lifecycleType: "annual",
    propagationMethod: "seedling",
    source: "seeded",
    plantingMonths: [9, 10, 11],
    harvestMonths: [12, 1, 2, 3, 4],
    growthDays: 90,
    daysToGermination: 7,
    daysToTransplant: 25,
    daysToFlowering: 50,
    harvestWindowDays: 90,
    growingSeasonStart: 9,
    growingSeasonEnd: 4,
    tempMin: 18,
    tempMax: 28,
    tempOptimalMin: 20,
    tempOptimalMax: 25,
    humidityMin: 50,
    humidityMax: 75,
    sunlight: "full_sun",
    sunlightHoursMin: 6,
    sunlightHoursMax: 10,
    windSensitivity: "medium",
    droughtTolerance: "medium",
    waterloggingTolerance: "low",
    soilPhMin: 5.6,
    soilPhMax: 6.7,
    soilType: "loamy",
    fertilityDemand: "heavy",
    fertilizerType: "organic",
    fertilizerFrequencyDays: 14,
    commonDeficiencies: ["鈣", "鎂", "硼"],
    spacingRowCm: 60,
    spacingPlantCm: 40,
    maxHeightCm: 200,
    maxSpreadCm: 60,
    trellisRequired: true,
    pruningRequired: true,
    pruningMonths: [10, 11, 12, 1, 2, 3],
    water: "moderate",
    waterFrequencyDays: 3,
    waterAmountMl: 600,
    criticalDroughtStages: ["開花期", "果實膨大期"],
    companionPlants: ["羅勒", "萬壽菊", "蔥"],
    antagonistPlants: ["茴香", "高麗菜", "馬鈴薯"],
    rotationFamily: "solanaceae",
    rotationYears: 3,
    commonPests: [
      { name: "番茄夜蛾", symptoms: "幼蟲蛀食果實內部，果實出現蟲孔腐爛", organicTreatment: "使用蘇力菌噴施、設置性費洛蒙誘殺", triggerConditions: "開花結果期" },
      { name: "銀葉粉蝨", symptoms: "葉背群聚吸汁，排泄蜜露引發煤煙病", organicTreatment: "噴施苦楝油、設置黃色黏蟲板", triggerConditions: "全年發生，設施栽培內尤甚" },
      { name: "斑潛蠅", symptoms: "葉片出現白色不規則蛇形隧道食痕", organicTreatment: "摘除被害葉片、使用黃色黏蟲板", triggerConditions: "秋冬季" },
    ],
    commonDiseases: [
      { name: "晚疫病", symptoms: "葉片出現水浸狀暗褐色病斑，迅速擴展導致全株枯萎", organicTreatment: "噴施波爾多液、保持通風、清除病株", triggerConditions: "低溫高濕環境" },
      { name: "萎凋病", symptoms: "植株單側葉片黃化萎凋，維管束褐變", organicTreatment: "使用抗病茄砧嫁接苗、輪作水稻田", triggerConditions: "連作田區、高溫" },
      { name: "灰黴病", symptoms: "花器及果實出現灰色黴層，果實腐爛", organicTreatment: "保持通風降低濕度、清除殘花病果", triggerConditions: "低溫高濕、通風不良" },
    ],
    typhoonResistance: "low",
    typhoonPrep: "番茄主要栽培期為秋冬季，颱風季節較少影響。若遇秋颱，需加固支架、綁縛枝條、提前採收成熟果實。",
    harvestMaturitySigns: "果實轉色均勻、果皮光滑有光澤、手感微軟彈性佳",
    harvestMethod: "pick",
    harvestCadence: "continuous",
    yieldPerPlant: "3~5 公斤",
    storageNotes: "未熟果常溫催熟，已紅熟果冷藏保存。避免低於10°C冷害",
    shelfLifeDays: 10,
    growthStages: [
      { stage: "育苗期", daysFromStart: 0, careNotes: "穴盤育苗25天，本葉4~5片時定植", waterFrequencyDays: 1, fertilizerFrequencyDays: 0 },
      { stage: "定植緩苗期", daysFromStart: 25, careNotes: "定植後搭設支架，澆足定根水", waterFrequencyDays: 2, fertilizerFrequencyDays: 0 },
      { stage: "營養生長期", daysFromStart: 35, careNotes: "整枝留1~2主幹，摘除腋芽（側芽），追施氮肥", waterFrequencyDays: 3, fertilizerFrequencyDays: 14 },
      { stage: "開花結果期", daysFromStart: 50, careNotes: "轉施磷鉀肥促進開花著果，適度疏果", waterFrequencyDays: 3, fertilizerFrequencyDays: 14 },
      { stage: "果實膨大期", daysFromStart: 65, careNotes: "加強鈣肥防止尻腐病，均勻灌水避免裂果", waterFrequencyDays: 3, fertilizerFrequencyDays: 14 },
      { stage: "採收期", daysFromStart: 85, careNotes: "果實轉色後逐批採收，持續追肥維持後續產量", waterFrequencyDays: 3, fertilizerFrequencyDays: 14 },
    ],
    growingGuide: {
      howToPlant: "穴盤育苗約25天，本葉4~5片時定植。前作以水稻田最佳，避免茄科連作。土壤有機質高於3%，pH 5.6~6.7。行距60cm、株距40cm。搭設支架或吊繩供攀爬。",
      howToCare: "採單幹或雙幹整枝，定期摘除腋芽。每2週追施有機肥一次。開花期轉施磷鉀肥。均勻灌水避免裂果，不可偏施氮肥以維持抗病性。保持田間通風排水良好。",
      warnings: "萎凋病嚴重田區建議使用抗病茄砧嫁接苗。不可偏施氮肥。台灣夏季高溫不適合番茄栽培，應選擇秋冬季種植。避免葉面澆水減少病害傳播。",
      localNotes: "花蓮地區秋作9~11月播種為主要產期，冬季冷涼乾燥有利品質。可選用聖女、玉女等小果番茄品種。嫁接栽培可有效防治萎凋病，提高產量與品質。",
    },
    isDefault: true as const,
  },
  {
    name: "辣椒",
    scientificName: "Capsicum annuum",
    variety: "朝天椒",
    aliases: ["番椒", "辣子"],
    emoji: "🌶️",
    color: "#ef4444",
    category: "solanaceae",
    lifecycleType: "annual",
    propagationMethod: "seedling",
    source: "seeded",
    plantingMonths: [2, 3, 4, 8, 9],
    harvestMonths: [5, 6, 7, 8, 11, 12],
    growthDays: 80,
    daysToGermination: 10,
    daysToTransplant: 30,
    daysToFlowering: 50,
    harvestWindowDays: 90,
    growingSeasonStart: 2,
    growingSeasonEnd: 12,
    tempMin: 20,
    tempMax: 30,
    tempOptimalMin: 22,
    tempOptimalMax: 28,
    humidityMin: 55,
    humidityMax: 80,
    sunlight: "full_sun",
    sunlightHoursMin: 6,
    sunlightHoursMax: 10,
    windSensitivity: "medium",
    droughtTolerance: "medium",
    waterloggingTolerance: "low",
    soilPhMin: 6.0,
    soilPhMax: 7.0,
    soilType: "loamy",
    fertilityDemand: "moderate",
    fertilizerType: "organic",
    fertilizerFrequencyDays: 21,
    commonDeficiencies: ["鈣", "鎂", "硼"],
    spacingRowCm: 50,
    spacingPlantCm: 35,
    maxHeightCm: 80,
    maxSpreadCm: 50,
    trellisRequired: false,
    pruningRequired: true,
    pruningMonths: [4, 5, 6, 9, 10, 11],
    water: "minimal",
    waterFrequencyDays: 4,
    waterAmountMl: 400,
    criticalDroughtStages: ["開花期", "果實發育期"],
    companionPlants: ["羅勒", "胡蘿蔔", "蔥"],
    antagonistPlants: ["茴香", "芥菜"],
    rotationFamily: "solanaceae",
    rotationYears: 3,
    commonPests: [
      { name: "蚜蟲", symptoms: "嫩葉及生長點群聚吸汁，傳播病毒病", organicTreatment: "噴施苦楝油或肥皂水、釋放瓢蟲天敵", triggerConditions: "乾燥溫暖季節" },
      { name: "薊馬", symptoms: "花器及嫩葉表面銀白色刮痕，果實表面疤痕", organicTreatment: "使用藍色黏蟲板、噴施苦楝油", triggerConditions: "乾燥高溫環境" },
      { name: "斜紋夜蛾", symptoms: "幼蟲啃食葉片及果實，造成大面積損害", organicTreatment: "使用蘇力菌噴施、設置性費洛蒙誘殺", triggerConditions: "高溫多濕季節" },
    ],
    commonDiseases: [
      { name: "炭疽病", symptoms: "果實出現圓形凹陷黑褐色病斑，向果肉擴展", organicTreatment: "清除病果、噴施波爾多液、保持通風", triggerConditions: "高溫多濕，生長全期均能感染" },
      { name: "疫病", symptoms: "莖基部水浸狀褐變，植株急速萎凋死亡", organicTreatment: "改善排水、避免連作、噴施亞磷酸", triggerConditions: "高溫多雨季節" },
      { name: "病毒病", symptoms: "葉片皺縮嵌紋、植株矮化、果實畸形", organicTreatment: "防治蚜蟲及薊馬媒介、清除病株、使用健康種苗", triggerConditions: "蚜蟲及薊馬大量發生時" },
    ],
    typhoonResistance: "medium",
    typhoonPrep: "颱風前採收成熟果實，加固支撐。辣椒植株較矮，受風面小，颱風後修剪折損枝條、追肥可恢復生長。",
    harvestMaturitySigns: "果實轉色完全（紅色或黃色依品種）、果實乾燥堅實",
    harvestMethod: "pick",
    harvestCadence: "continuous",
    yieldPerPlant: "0.5~1.5 公斤",
    storageNotes: "新鮮辣椒冷藏可保存1~2週。可曬乾或醃漬長期保存",
    shelfLifeDays: 14,
    growthStages: [
      { stage: "育苗期", daysFromStart: 0, careNotes: "穴盤育苗約30天，本葉6~8片時定植", waterFrequencyDays: 1, fertilizerFrequencyDays: 0 },
      { stage: "定植緩苗期", daysFromStart: 30, careNotes: "定植後澆足定根水，畦面覆蓋銀黑色塑膠布", waterFrequencyDays: 2, fertilizerFrequencyDays: 0 },
      { stage: "營養生長期", daysFromStart: 40, careNotes: "剪除第一分叉以下側芽及內向橫枝", waterFrequencyDays: 4, fertilizerFrequencyDays: 21 },
      { stage: "開花結果期", daysFromStart: 50, careNotes: "轉施磷鉀肥，維持適度乾燥促進辣度", waterFrequencyDays: 4, fertilizerFrequencyDays: 21 },
      { stage: "盛產採收期", daysFromStart: 75, careNotes: "每3~5天採收成熟果，持續追肥延長產期", waterFrequencyDays: 4, fertilizerFrequencyDays: 21 },
    ],
    growingGuide: {
      howToPlant: "穴盤育苗約30天，本葉6~8片定植。整地時施有機肥作基肥。畦寬100~120cm、雙行植、株距40~45cm、畦向南北。覆蓋銀黑色塑膠布抑制雜草及減少病害。",
      howToCare: "不摘心整枝，但剪除主枝第一分叉以下的側芽及內向橫枝。每20~30天追施一次。辣椒不耐旱也不耐濕，保持土壤適度濕潤。果實發育與轉色適溫20~25°C。",
      warnings: "炭疽病為辣椒全生育期病害，高溫多濕需加強防治。台灣夏季高溫常阻礙生育。避免連作茄科作物3年以上。不可積水。",
      localNotes: "花蓮地區春作2~4月、秋作8~9月播種。夏季平地高溫對辣椒生育有阻礙，可利用半遮蔭栽培緩解。朝天椒耐熱性較強，適合花蓮氣候。",
    },
    isDefault: true as const,
  },
  {
    name: "茄子",
    scientificName: "Solanum melongena",
    variety: "屏東長茄",
    aliases: ["茄", "矮瓜"],
    emoji: "🍆",
    color: "#7c3aed",
    category: "solanaceae",
    lifecycleType: "annual",
    propagationMethod: "seedling",
    source: "seeded",
    plantingMonths: [2, 3, 4, 8, 9],
    harvestMonths: [5, 6, 7, 8, 11, 12],
    growthDays: 75,
    daysToGermination: 10,
    daysToTransplant: 30,
    daysToFlowering: 50,
    harvestWindowDays: 90,
    growingSeasonStart: 2,
    growingSeasonEnd: 12,
    tempMin: 22,
    tempMax: 32,
    tempOptimalMin: 25,
    tempOptimalMax: 30,
    humidityMin: 60,
    humidityMax: 85,
    sunlight: "full_sun",
    sunlightHoursMin: 6,
    sunlightHoursMax: 10,
    windSensitivity: "medium",
    droughtTolerance: "low",
    waterloggingTolerance: "low",
    soilPhMin: 5.5,
    soilPhMax: 6.8,
    soilType: "loamy",
    fertilityDemand: "heavy",
    fertilizerType: "organic",
    fertilizerFrequencyDays: 14,
    commonDeficiencies: ["氮", "鉀", "鈣"],
    spacingRowCm: 60,
    spacingPlantCm: 45,
    maxHeightCm: 120,
    maxSpreadCm: 60,
    trellisRequired: false,
    pruningRequired: true,
    pruningMonths: [4, 5, 6, 7, 9, 10, 11],
    water: "moderate",
    waterFrequencyDays: 3,
    waterAmountMl: 600,
    criticalDroughtStages: ["開花期", "果實膨大期"],
    companionPlants: ["豆類", "萬壽菊", "羅勒"],
    antagonistPlants: ["茴香", "馬鈴薯"],
    rotationFamily: "solanaceae",
    rotationYears: 3,
    commonPests: [
      { name: "茄黃斑螟蛾", symptoms: "幼蟲蛀食嫩梢及果實，造成果實蟲孔腐爛", organicTreatment: "摘除被害果、使用蘇力菌噴施", triggerConditions: "全年發生，夏季高溫期嚴重" },
      { name: "銀葉粉蝨", symptoms: "葉背群聚吸汁，排泄蜜露引發煤煙病", organicTreatment: "噴施苦楝油、設置黃色黏蟲板", triggerConditions: "全年發生" },
      { name: "紅蜘蛛", symptoms: "葉背出現蟎蟲，葉面出現黃白色細斑", organicTreatment: "噴施礦物油或苦楝油、增加濕度", triggerConditions: "高溫乾燥環境" },
    ],
    commonDiseases: [
      { name: "疫病", symptoms: "果實出現水浸狀暗褐色腐爛斑，莖基部褐化", organicTreatment: "使用銀黑色塑膠布覆蓋畦面減少土壤病原飛濺、改善排水", triggerConditions: "20~25°C高濕度，夏秋雨季最嚴重" },
      { name: "青枯病", symptoms: "植株突然萎凋，莖部切面維管束褐變、擠壓流出乳白菌泥", organicTreatment: "使用抗病砧木嫁接苗、輪作水稻田、施用石灰調整pH", triggerConditions: "高溫多濕、酸性土壤" },
      { name: "灰黴病", symptoms: "花器及果實出現灰色黴層腐爛", organicTreatment: "保持通風降低濕度、清除殘花病果", triggerConditions: "低溫高濕、通風不良" },
    ],
    typhoonResistance: "low",
    typhoonPrep: "颱風前加固支柱、採收成熟果實。颱風後修剪折損枝條，噴施殺菌劑防止傷口感染。嚴重受損可回剪更新（剪除地上部留30cm重新萌芽）。",
    harvestMaturitySigns: "果皮光亮有彈性、顏色均勻（紫黑色）、萼片與果實間白色環帶明顯",
    harvestMethod: "cut",
    harvestCadence: "continuous",
    yieldPerPlant: "3~6 公斤",
    storageNotes: "採收後儘速食用或冷藏，避免低於10°C冷害。用報紙包裹冷藏可保鮮約1週",
    shelfLifeDays: 7,
    growthStages: [
      { stage: "育苗期", daysFromStart: 0, careNotes: "穴盤育苗約30天，本葉6~8片時定植", waterFrequencyDays: 1, fertilizerFrequencyDays: 0 },
      { stage: "定植緩苗期", daysFromStart: 30, careNotes: "定植後立支柱，覆蓋銀黑色塑膠布", waterFrequencyDays: 2, fertilizerFrequencyDays: 0 },
      { stage: "營養生長期", daysFromStart: 40, careNotes: "整枝留3~4主枝，摘除下位側芽", waterFrequencyDays: 3, fertilizerFrequencyDays: 14 },
      { stage: "開花結果期", daysFromStart: 50, careNotes: "追施磷鉀肥促進著果，適度疏花", waterFrequencyDays: 3, fertilizerFrequencyDays: 14 },
      { stage: "盛產採收期", daysFromStart: 70, careNotes: "每2~3天採收嫩果，持續追肥灌水維持產量", waterFrequencyDays: 3, fertilizerFrequencyDays: 14 },
    ],
    growingGuide: {
      howToPlant: "穴盤育苗約30天，本葉6~8片定植。行距60cm、株距45cm。可用V型棚架或水平低棚架整枝。覆蓋銀黑色塑膠布減少土壤病原飛濺及抑制雜草。",
      howToCare: "整枝留3~4主枝成V字型展開，摘除下位側芽。每2週追施有機肥。保持適當水分但避免積水。V型棚架通風好、施肥方便、採收容易，優於傳統低棚架。",
      warnings: "台灣高溫多濕條件下疫病猖獗。17°C以下或35°C以上生長受阻。青枯病田區需使用抗病砧木嫁接苗。避免茄科連作3年。",
      localNotes: "花蓮地區春作2~4月、秋作8~9月播種。夏季高溫多雨需加強疫病防治。可選用嫁接苗提高抗病性。V型棚架整枝法適合花蓮多雨環境，通風排水佳。",
    },
    isDefault: true as const,
  },
  {
    name: "高麗菜",
    scientificName: "Brassica oleracea var. capitata",
    variety: "初秋",
    aliases: ["甘藍", "包心菜", "捲心菜"],
    emoji: "🥬",
    color: "#86efac",
    category: "leafy_vegetables",
    lifecycleType: "biennial",
    propagationMethod: "seedling",
    source: "seeded",
    plantingMonths: [8, 9, 10, 11],
    harvestMonths: [11, 12, 1, 2, 3],
    growthDays: 90,
    daysToGermination: 5,
    daysToTransplant: 25,
    daysToFlowering: 150,
    harvestWindowDays: 14,
    growingSeasonStart: 8,
    growingSeasonEnd: 3,
    tempMin: 15,
    tempMax: 25,
    tempOptimalMin: 18,
    tempOptimalMax: 22,
    humidityMin: 60,
    humidityMax: 80,
    sunlight: "full_sun",
    sunlightHoursMin: 5,
    sunlightHoursMax: 8,
    windSensitivity: "low",
    droughtTolerance: "low",
    waterloggingTolerance: "low",
    soilPhMin: 6.0,
    soilPhMax: 7.0,
    soilType: "loamy",
    fertilityDemand: "heavy",
    fertilizerType: "organic",
    fertilizerFrequencyDays: 14,
    commonDeficiencies: ["氮", "鈣", "硼"],
    spacingRowCm: 50,
    spacingPlantCm: 40,
    maxHeightCm: 30,
    maxSpreadCm: 40,
    trellisRequired: false,
    water: "moderate",
    waterFrequencyDays: 3,
    waterAmountMl: 500,
    criticalDroughtStages: ["結球期"],
    companionPlants: ["蔥", "芹菜", "芫荽"],
    antagonistPlants: ["草莓", "番茄"],
    rotationFamily: "brassica",
    rotationYears: 3,
    commonPests: [
      { name: "小菜蛾", symptoms: "幼蟲啃食葉片，留下表皮形成窗狀食痕", organicTreatment: "使用蘇力菌噴施、設置性費洛蒙誘殺", triggerConditions: "全年發生" },
      { name: "紋白蝶", symptoms: "幼蟲啃食葉片成大面積孔洞", organicTreatment: "使用蘇力菌、設置防蟲網", triggerConditions: "秋冬季" },
      { name: "蚜蟲", symptoms: "群聚葉背吸汁，葉片捲曲黃化", organicTreatment: "噴施苦楝油、利用瓢蟲天敵", triggerConditions: "冷涼乾燥季節" },
    ],
    commonDiseases: [
      { name: "軟腐病", symptoms: "結球內部水浸狀腐爛，發出惡臭", organicTreatment: "改善排水、避免傷口、施用石灰調整pH", triggerConditions: "高溫多雨、土壤偏酸" },
      { name: "露菌病", symptoms: "葉面黃褐色不規則病斑，葉背灰白色黴層", organicTreatment: "噴施波爾多液、使用枯草桿菌、避免傍晚澆水", triggerConditions: "低溫高濕環境" },
      { name: "黑腐病", symptoms: "葉緣出現V字形黃褐色病斑，葉脈變黑", organicTreatment: "使用健康種子、輪作3年、清除病株殘體", triggerConditions: "暴雨後、高溫多濕" },
    ],
    typhoonResistance: "low",
    typhoonPrep: "高麗菜主要栽培期為秋冬季，颱風影響主要在早秋定植期。颱風後及時排水補苗。可使用簡易隧道棚保護幼苗。",
    harvestMaturitySigns: "球體緊實飽滿、用手按壓有硬實感、外葉微反捲",
    harvestMethod: "cut",
    harvestCadence: "once",
    yieldPerPlant: "1~2 公斤",
    storageNotes: "去除外葉，以報紙包裹放入冰箱冷藏可保存2~3週",
    shelfLifeDays: 21,
    growthStages: [
      { stage: "育苗期", daysFromStart: 0, careNotes: "穴盤育苗25~30天，本葉4片時定植", waterFrequencyDays: 1, fertilizerFrequencyDays: 0 },
      { stage: "定植緩苗期", daysFromStart: 25, careNotes: "定植株距50x40cm，澆足定根水", waterFrequencyDays: 2, fertilizerFrequencyDays: 0 },
      { stage: "蓮座期", daysFromStart: 35, careNotes: "外葉快速展開，追施氮肥促進葉片生長", waterFrequencyDays: 3, fertilizerFrequencyDays: 14 },
      { stage: "結球期", daysFromStart: 55, careNotes: "轉施鉀肥促進結球緊實，保持充足水分", waterFrequencyDays: 3, fertilizerFrequencyDays: 14 },
      { stage: "採收期", daysFromStart: 85, careNotes: "球體緊實後儘速採收，避免裂球", waterFrequencyDays: 3, fertilizerFrequencyDays: 0 },
    ],
    growingGuide: {
      howToPlant: "穴盤育苗25~30天，本葉4片定植。定植株距50x40cm。確保土壤保持充足水分。春秋季種植後約60~65天採收，冬季75天以上。",
      howToCare: "生育期間需充足水分。蓮座期追施氮肥促進葉片生長，結球期轉施鉀肥促進緊實。保持通風良好減少病害。適時中耕除草。",
      warnings: "夏季高溫導致病蟲害增多、纖維粗硬且易抽薹開花，不宜夏作。十字花科忌連作3年。小菜蛾及紋白蝶為主要害蟲須持續防治。",
      localNotes: "花蓮地區8~11月播種、冬季採收品質最佳。初秋品種口感爽脆適合炒食，雪翠品種甜嫩適合生食。日夜溫差大有助品質提升。可利用防蟲網降低蟲害。",
    },
    isDefault: true as const,
  },
  {
    name: "芥菜",
    scientificName: "Brassica juncea",
    variety: "大葉芥菜",
    aliases: ["大菜", "刈菜", "長年菜"],
    emoji: "🥬",
    color: "#059669",
    category: "leafy_vegetables",
    lifecycleType: "annual",
    propagationMethod: "seed",
    source: "seeded",
    plantingMonths: [9, 10, 11],
    harvestMonths: [12, 1, 2],
    growthDays: 60,
    daysToGermination: 4,
    daysToTransplant: 20,
    daysToFlowering: 80,
    harvestWindowDays: 14,
    growingSeasonStart: 9,
    growingSeasonEnd: 2,
    tempMin: 15,
    tempMax: 22,
    tempOptimalMin: 16,
    tempOptimalMax: 20,
    humidityMin: 60,
    humidityMax: 80,
    sunlight: "full_sun",
    sunlightHoursMin: 5,
    sunlightHoursMax: 8,
    windSensitivity: "low",
    droughtTolerance: "low",
    waterloggingTolerance: "low",
    soilPhMin: 5.0,
    soilPhMax: 6.5,
    soilType: "sandy",
    fertilityDemand: "moderate",
    fertilizerType: "organic",
    fertilizerFrequencyDays: 14,
    commonDeficiencies: ["氮", "鈣"],
    spacingRowCm: 40,
    spacingPlantCm: 30,
    maxHeightCm: 50,
    maxSpreadCm: 40,
    trellisRequired: false,
    water: "moderate",
    waterFrequencyDays: 3,
    waterAmountMl: 400,
    criticalDroughtStages: ["生長旺盛期"],
    companionPlants: ["蔥", "芹菜"],
    antagonistPlants: ["草莓"],
    rotationFamily: "brassica",
    rotationYears: 2,
    commonPests: [
      { name: "蚜蟲", symptoms: "群聚嫩葉及生長點吸汁，導致葉片捲曲變形", organicTreatment: "噴施苦楝油或肥皂水、利用瓢蟲天敵", triggerConditions: "冷涼乾燥季節" },
      { name: "小菜蛾", symptoms: "幼蟲啃食葉片留下透明窗狀食痕", organicTreatment: "使用蘇力菌噴施、性費洛蒙誘殺", triggerConditions: "全年發生" },
      { name: "黃條葉蚤", symptoms: "成蟲咬食葉片成密集小圓孔", organicTreatment: "噴施苦楝油、使用黃色黏蟲板", triggerConditions: "高溫乾燥時" },
    ],
    commonDiseases: [
      { name: "軟腐病", symptoms: "莖基部及葉柄水浸狀腐爛，發出惡臭", organicTreatment: "改善排水、避免傷口、施用石灰", triggerConditions: "高溫多雨後" },
      { name: "黑腐病", symptoms: "葉緣V字形黃褐色病斑，葉脈變黑", organicTreatment: "輪作2年以上、清除病株、使用健康種子", triggerConditions: "暴雨後" },
      { name: "露菌病", symptoms: "葉面黃色病斑，葉背灰白色黴層", organicTreatment: "保持通風、避免葉面澆水", triggerConditions: "低溫高濕" },
    ],
    typhoonResistance: "low",
    typhoonPrep: "芥菜主要栽培期為秋冬季，颱風季節影響較小。9月早播需防秋颱，可用簡易棚架保護幼苗。",
    harvestMaturitySigns: "植株充分展開、葉片肥厚濃綠、葉柄寬厚飽滿時採收",
    harvestMethod: "cut",
    harvestCadence: "once",
    yieldPerPlant: "0.5~1.5 公斤",
    storageNotes: "鮮食冷藏保存約5天。可醃製成酸菜、福菜、梅乾菜長期保存",
    shelfLifeDays: 5,
    growthStages: [
      { stage: "播種期", daysFromStart: 0, careNotes: "直播或育苗，覆土薄薄一層", waterFrequencyDays: 1, fertilizerFrequencyDays: 0 },
      { stage: "發芽期", daysFromStart: 4, careNotes: "保持土壤濕潤，避免乾燥影響出苗", waterFrequencyDays: 1, fertilizerFrequencyDays: 0 },
      { stage: "間苗定植期", daysFromStart: 15, careNotes: "間苗或定植至株距30cm，施基肥", waterFrequencyDays: 2, fertilizerFrequencyDays: 14 },
      { stage: "旺盛生長期", daysFromStart: 30, careNotes: "追施氮肥促進葉片生長，充分灌水", waterFrequencyDays: 3, fertilizerFrequencyDays: 14 },
      { stage: "採收期", daysFromStart: 55, careNotes: "葉片肥厚時整株採收或分次摘取外葉", waterFrequencyDays: 3, fertilizerFrequencyDays: 0 },
    ],
    growingGuide: {
      howToPlant: "直播或穴盤育苗。直播後間苗至株距30cm、行距40cm。土壤以砂質土、排水良好、pH5左右為宜。9~11月播種、日夜溫差大時品質最佳。",
      howToCare: "生育期間每2週追施有機液肥。保持土壤濕潤但排水良好。莖用芥菜需充足氮肥促進莖部肥大。適時中耕除草。",
      warnings: "高溫易抽薹開花，夏季不宜栽種。避免花芽分化導致莖部空心。十字花科忌連作。蚜蟲為嵌紋病毒媒介需注意防治。",
      localNotes: "花蓮地區9~11月播種為最佳，日夜溫差大有利品質。客家文化中芥菜為重要加工蔬菜（酸菜、福菜、梅乾菜），花蓮客家聚落有豐富的醃漬傳統。過年期間芥菜又稱「長年菜」，為年菜必備。",
    },
    isDefault: true as const,
  },
];
