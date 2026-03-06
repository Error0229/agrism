import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireFarmMembership } from "./_helpers";

// === Crops ===

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

export const create = mutation({
  args: {
    farmId: v.id("farms"),
    name: v.string(),
    emoji: v.optional(v.string()),
    color: v.optional(v.string()),
    category: v.string(),
    plantingMonths: v.optional(v.array(v.number())),
    harvestMonths: v.optional(v.array(v.number())),
    growthDays: v.optional(v.number()),
    spacingRowCm: v.optional(v.number()),
    spacingPlantCm: v.optional(v.number()),
    water: v.optional(v.string()),
    sunlight: v.optional(v.string()),
    tempMin: v.optional(v.number()),
    tempMax: v.optional(v.number()),
    soilPhMin: v.optional(v.number()),
    soilPhMax: v.optional(v.number()),
    pestSusceptibility: v.optional(v.string()),
    yieldKgPerSqm: v.optional(v.number()),
    fertilizerIntervalDays: v.optional(v.number()),
    needsPruning: v.optional(v.boolean()),
    pruningMonths: v.optional(v.array(v.number())),
    pestControl: v.optional(v.array(v.string())),
    typhoonResistance: v.optional(v.string()),
    hualienNotes: v.optional(v.string()),
    commonDiseases: v.optional(v.array(v.object({
      name: v.string(),
      organicTreatment: v.string(),
      symptoms: v.string(),
    }))),
    commonPests: v.optional(v.array(v.object({
      name: v.string(),
      organicTreatment: v.string(),
      symptoms: v.string(),
    }))),
    companionPlants: v.optional(v.array(v.string())),
    hualienGrowingTips: v.optional(v.string()),
    incompatiblePlants: v.optional(v.array(v.string())),
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
    emoji: v.optional(v.string()),
    color: v.optional(v.string()),
    category: v.optional(v.string()),
    plantingMonths: v.optional(v.array(v.number())),
    harvestMonths: v.optional(v.array(v.number())),
    growthDays: v.optional(v.number()),
    spacingRowCm: v.optional(v.number()),
    spacingPlantCm: v.optional(v.number()),
    water: v.optional(v.string()),
    sunlight: v.optional(v.string()),
    tempMin: v.optional(v.number()),
    tempMax: v.optional(v.number()),
    soilPhMin: v.optional(v.number()),
    soilPhMax: v.optional(v.number()),
    pestSusceptibility: v.optional(v.string()),
    yieldKgPerSqm: v.optional(v.number()),
    fertilizerIntervalDays: v.optional(v.number()),
    needsPruning: v.optional(v.boolean()),
    pruningMonths: v.optional(v.array(v.number())),
    pestControl: v.optional(v.array(v.string())),
    typhoonResistance: v.optional(v.string()),
    hualienNotes: v.optional(v.string()),
    commonDiseases: v.optional(v.array(v.object({
      name: v.string(),
      organicTreatment: v.string(),
      symptoms: v.string(),
    }))),
    commonPests: v.optional(v.array(v.object({
      name: v.string(),
      organicTreatment: v.string(),
      symptoms: v.string(),
    }))),
    companionPlants: v.optional(v.array(v.string())),
    hualienGrowingTips: v.optional(v.string()),
    incompatiblePlants: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { cropId, ...fields }) => {
    const crop = await ctx.db.get(cropId);
    if (!crop || crop.isDefault) return null;
    await requireFarmMembership(ctx, crop.farmId);

    // Only patch provided fields
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
    if (!crop || crop.isDefault) return;
    await requireFarmMembership(ctx, crop.farmId);
    await ctx.db.delete(cropId);
  },
});

// === Seed Defaults ===

export const seedDefaults = mutation({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    await requireFarmMembership(ctx, farmId);
    // Check if defaults already exist
    const existing = await ctx.db
      .query("crops")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .filter((q) => q.eq(q.field("isDefault"), true))
      .first();

    if (existing) return; // Already seeded

    for (const crop of DEFAULT_CROPS) {
      await ctx.db.insert("crops", { ...crop, farmId });
    }
  },
});

/** Internal version callable from other mutations via scheduler */
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

    // Delete items first
    const items = await ctx.db
      .query("cropTemplateItems")
      .withIndex("by_templateId", (q) => q.eq("templateId", templateId))
      .collect();

    for (const item of items) {
      await ctx.db.delete(item._id);
    }

    // Delete template
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
    fertilizerIntervalDays: 30,
    needsPruning: false,
    pestControl: ["甘藷蟻象：使用性費洛蒙誘殺", "蟻象幼蟲：培土覆蓋薯塊", "葉蟎：噴施礦物油乳劑"],
    typhoonResistance: "high",
    hualienNotes: "花蓮土壤排水良好適合種植，秋作品質較佳。颱風後可快速恢復生長。",
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
    fertilizerIntervalDays: 14,
    needsPruning: true,
    pruningMonths: [3, 4, 5, 9, 10],
    pestControl: ["白粉病：通風管理、避免葉面澆水", "瓜實蠅：套袋保護果實", "蚜蟲：黃色黏紙誘捕"],
    typhoonResistance: "low",
    hualienNotes: "花蓮春作為主，需搭設棚架。颱風季前務必提前採收或加強固定藤蔓。",
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
    fertilizerIntervalDays: 14,
    needsPruning: true,
    pruningMonths: [5, 6, 7, 8],
    pestControl: ["瓜實蠅：誘殺器設置", "露菌病：避免傍晚澆水", "銀葉粉蝨：懸掛黃色黏紙"],
    typhoonResistance: "low",
    hualienNotes: "花蓮夏季高溫多濕，絲瓜生長快速。棚架需加強抗風能力。",
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
    fertilizerIntervalDays: 14,
    needsPruning: true,
    pruningMonths: [5, 6, 7, 8],
    pestControl: ["瓜實蠅：含毒甲基丁香油誘殺", "白粉病：保持通風、降低密度", "薊馬：藍色黏紙誘捕"],
    typhoonResistance: "low",
    hualienNotes: "花蓮山苦瓜品質優良，適合有機栽培。建議搭設堅固棚架。",
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
    fertilizerIntervalDays: 10,
    needsPruning: false,
    pestControl: ["斜紋夜蛾：使用蘇力菌防治", "白鏽病：避免連作、保持排水", "蚜蟲：噴施苦楝油"],
    typhoonResistance: "medium",
    hualienNotes: "花蓮水源充沛，適合大面積種植。可連續採收多次。颱風後恢復力強。",
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
    fertilizerIntervalDays: 10,
    needsPruning: false,
    pestControl: ["小菜蛾：蘇力菌噴施", "黃條葉蚤：覆蓋防蟲網", "根瘤病：輪作管理"],
    typhoonResistance: "low",
    hualienNotes: "秋冬為主要產期，花蓮冬季溫暖適合生長。夏季高溫需遮陰處理。",
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
    fertilizerIntervalDays: 14,
    needsPruning: false,
    pestControl: ["甜菜夜蛾：性費洛蒙誘殺", "銹病：避免密植、保持通風", "薊馬：藍色黏紙"],
    typhoonResistance: "low",
    hualienNotes: "花蓮三星蔥品質聞名，秋冬種植品質最佳。夏季容易軟腐需注意排水。",
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
    fertilizerIntervalDays: 21,
    needsPruning: false,
    pestControl: ["軟腐病：避免積水、種薑消毒", "紋枯病：降低密度", "薑螟蛾：清除被害莖"],
    typhoonResistance: "medium",
    hualienNotes: "花蓮山區種薑品質優良，需注意排水。建議覆蓋稻草保濕並抑制雜草。",
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
    fertilizerIntervalDays: 30,
    needsPruning: true,
    pruningMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    pestControl: ["香蕉黃葉病：使用健康種苗", "花薊馬：套袋保護", "象鼻蟲：清除殘株"],
    typhoonResistance: "low",
    hualienNotes: "花蓮為重要香蕉產區，颱風是最大威脅。建議種植矮性品種並做好防風措施。",
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
    fertilizerIntervalDays: 14,
    needsPruning: false,
    pestControl: ["輪點病毒：種植抗病品種", "果實蠅：套袋或誘殺", "紅蜘蛛：噴水沖洗葉背"],
    typhoonResistance: "low",
    hualienNotes: "花蓮木瓜甜度高，但極怕颱風。建議種植矮化品種，颱風前採收青木瓜。",
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
    fertilizerIntervalDays: 14,
    needsPruning: true,
    pruningMonths: [10, 11, 12, 1, 2, 3],
    pestControl: ["晚疫病：避免葉面濕潤過久", "番茄斑潛蠅：黃色黏紙", "青枯病：輪作、嫁接抗病砧木"],
    typhoonResistance: "low",
    hualienNotes: "花蓮秋冬種植品質佳，日夜溫差大有助糖度累積。需搭設支架防倒伏。",
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
    fertilizerIntervalDays: 14,
    needsPruning: true,
    pruningMonths: [4, 5, 6, 9, 10, 11],
    pestControl: ["炭疽病：避免密植、通風良好", "蚜蟲：噴施苦楝油", "疫病：排水良好、輪作"],
    typhoonResistance: "medium",
    hualienNotes: "花蓮辣椒風味獨特，春秋兩季皆可種植。注意排水以防根部病害。",
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
    fertilizerIntervalDays: 14,
    needsPruning: true,
    pruningMonths: [4, 5, 6, 7, 9, 10, 11],
    pestControl: ["二點葉蟎：噴水沖洗", "茄黃萎病：嫁接抗病砧木", "茄螟蛾：摘除被害果"],
    typhoonResistance: "low",
    hualienNotes: "花蓮茄子品質優良，需搭設支架。高溫期注意紅蜘蛛為害。",
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
    fertilizerIntervalDays: 14,
    needsPruning: false,
    pestControl: ["紋白蝶：防蟲網覆蓋", "小菜蛾：蘇力菌防治", "黑腐病：輪作、排水管理"],
    typhoonResistance: "low",
    hualienNotes: "花蓮秋冬高麗菜品質好，但需注意秋颱影響。建議9月後定植較安全。",
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
    fertilizerIntervalDays: 14,
    needsPruning: false,
    pestControl: ["蚜蟲：苦楝油防治", "黃條葉蚤：輪作管理", "軟腐病：避免積水"],
    typhoonResistance: "low",
    hualienNotes: "花蓮客家庄傳統作物，適合製作酸菜、福菜。冬季種植品質最佳。",
    isDefault: true as const,
  },
];
