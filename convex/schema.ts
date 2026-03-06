// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // === Auth ===
  farms: defineTable({
    clerkUserId: v.string(),
    name: v.string(),
    createdAt: v.number(),
    // Location fields (all optional for backward compatibility)
    country: v.optional(v.string()),
    countyCity: v.optional(v.string()),
    districtTownship: v.optional(v.string()),
    locality: v.optional(v.string()),
    latitude: v.optional(v.float64()),
    longitude: v.optional(v.float64()),
    elevationBand: v.optional(v.string()),
    coastalInland: v.optional(v.string()),
    farmLocationNotes: v.optional(v.string()),
  }).index("by_clerkUserId", ["clerkUserId"]),

  farmMembers: defineTable({
    farmId: v.id("farms"),
    clerkUserId: v.string(),
    role: v.union(v.literal("owner"), v.literal("member")),
    createdAt: v.number(),
  })
    .index("by_farmId", ["farmId"])
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_farmId_clerkUserId", ["farmId", "clerkUserId"]),

  // === Crops ===
  crops: defineTable({
    farmId: v.id("farms"),
    name: v.string(),
    emoji: v.optional(v.string()),
    color: v.optional(v.string()),
    category: v.string(), // CropCategory enum as string
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
    isDefault: v.boolean(),
  }).index("by_farmId", ["farmId"]),

  cropTemplates: defineTable({
    farmId: v.id("farms"),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_farmId", ["farmId"]),

  cropTemplateItems: defineTable({
    templateId: v.id("cropTemplates"),
    cropId: v.id("crops"),
  }).index("by_templateId", ["templateId"]),

  // === Fields (with inlined fieldContexts) ===
  fields: defineTable({
    farmId: v.id("farms"),
    name: v.string(),
    widthM: v.number(),
    heightM: v.number(),
    memo: v.optional(v.string()),
    // Inlined from fieldContexts (1:1)
    plotType: v.optional(v.string()),
    sunHours: v.optional(v.string()),
    drainage: v.optional(v.string()),
    slope: v.optional(v.string()),
    windExposure: v.optional(v.string()),
    // Inlined from soilProfiles (1:1)
    soilTexture: v.optional(v.string()),
    soilPh: v.optional(v.number()),
    soilEc: v.optional(v.number()),
    soilOrganicMatterPct: v.optional(v.number()),
    soilUpdatedAt: v.optional(v.number()),
  }).index("by_farmId", ["farmId"]),

  // === Planted Crops (with inlined cropPlacements) ===
  plantedCrops: defineTable({
    cropId: v.optional(v.id("crops")),
    fieldId: v.id("fields"),
    plantedDate: v.optional(v.string()),
    harvestedDate: v.optional(v.string()),
    status: v.union(
      v.literal("growing"),
      v.literal("harvested"),
      v.literal("removed")
    ),
    customGrowthDays: v.optional(v.number()),
    notes: v.optional(v.string()),
    // Inlined from cropPlacements (1:1)
    xM: v.number(),
    yM: v.number(),
    widthM: v.optional(v.number()),
    heightM: v.optional(v.number()),
    shapePoints: v.optional(v.array(v.object({ x: v.number(), y: v.number() }))),

    // --- Lifecycle fields (issue #85) ---
    // Lifecycle type classification
    lifecycleType: v.optional(
      v.union(
        v.literal("seasonal"),
        v.literal("long_cycle"),
        v.literal("perennial"),
        v.literal("orchard")
      )
    ),
    // Current growth stage
    stage: v.optional(v.string()), // e.g. "seedling", "vegetative", "flowering", "fruiting", "harvest_ready", "dormant", "declining"
    stageConfidence: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
    ),
    stageUpdatedAt: v.optional(v.number()),
    // Start date semantics — supports fuzzy/uncertain planting dates
    // Migration note: existing records with plantedDate → startDateMode="exact", timelineConfidence="high"
    // Existing records without plantedDate → startDateMode="unknown", timelineConfidence="low"
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
    // Timeline estimates
    timelineConfidence: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("low"))
    ),
    endWindowEarliest: v.optional(v.number()),
    endWindowLatest: v.optional(v.number()),
    // Occupancy — whether this planting currently occupies its area
    isOccupyingArea: v.optional(v.boolean()),
  })
    .index("by_fieldId", ["fieldId"])
    .index("by_cropId", ["cropId"]),

  // === Facilities ===
  facilities: defineTable({
    fieldId: v.id("fields"),
    facilityType: v.string(),
    name: v.optional(v.string()),
    xM: v.number(),
    yM: v.number(),
    widthM: v.number(),
    heightM: v.number(),
  }).index("by_fieldId", ["fieldId"]),

  // === Utility Network ===
  utilityNodes: defineTable({
    fieldId: v.id("fields"),
    label: v.optional(v.string()),
    kind: v.union(v.literal("water"), v.literal("electric")),
    nodeType: v.optional(v.string()),
    xM: v.number(),
    yM: v.number(),
  }).index("by_fieldId", ["fieldId"]),

  utilityEdges: defineTable({
    fieldId: v.id("fields"),
    fromNodeId: v.id("utilityNodes"),
    toNodeId: v.id("utilityNodes"),
    kind: v.union(v.literal("water"), v.literal("electric")),
  })
    .index("by_fieldId", ["fieldId"])
    .index("by_fromNodeId", ["fromNodeId"])
    .index("by_toNodeId", ["toNodeId"]),

  // === Tasks ===
  tasks: defineTable({
    farmId: v.id("farms"),
    type: v.string(), // TaskType enum as string
    title: v.string(),
    cropId: v.optional(v.id("crops")),
    plantedCropId: v.optional(v.id("plantedCrops")),
    fieldId: v.optional(v.id("fields")),
    dueDate: v.optional(v.string()),
    completed: v.boolean(),
    effortMinutes: v.optional(v.number()),
    difficulty: v.optional(v.string()),
    requiredTools: v.optional(v.array(v.string())),
  }).index("by_farmId", ["farmId"]),

  // === Records ===
  harvestLogs: defineTable({
    farmId: v.id("farms"),
    plantedCropId: v.optional(v.id("plantedCrops")),
    fieldId: v.optional(v.id("fields")),
    cropId: v.optional(v.id("crops")),
    date: v.string(),
    quantity: v.number(),
    unit: v.string(),
    qualityGrade: v.optional(v.string()),
    pestIncidentLevel: v.optional(v.string()),
    weatherImpact: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_farmId", ["farmId"]),

  financeRecords: defineTable({
    farmId: v.id("farms"),
    type: v.union(v.literal("income"), v.literal("expense")),
    category: v.string(),
    amount: v.number(),
    date: v.string(),
    description: v.optional(v.string()),
    relatedFieldId: v.optional(v.id("fields")),
    relatedCropId: v.optional(v.id("crops")),
  }).index("by_farmId", ["farmId"]),

  soilAmendments: defineTable({
    fieldId: v.id("fields"),
    date: v.string(),
    amendmentType: v.string(),
    quantity: v.number(),
    unit: v.string(),
    notes: v.optional(v.string()),
  }).index("by_fieldId", ["fieldId"]),

  soilNotes: defineTable({
    fieldId: v.id("fields"),
    date: v.string(),
    ph: v.optional(v.number()),
    content: v.string(),
  }).index("by_fieldId", ["fieldId"]),

  weatherLogs: defineTable({
    farmId: v.id("farms"),
    date: v.string(),
    temperature: v.optional(v.number()),
    rainfallMm: v.optional(v.number()),
    condition: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_farmId", ["farmId"]),
});
