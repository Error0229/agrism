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
    // === Identity ===
    farmId: v.id("farms"),
    name: v.string(),
    scientificName: v.optional(v.string()),
    variety: v.optional(v.string()),
    aliases: v.optional(v.array(v.string())),
    emoji: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    imageSourceUrl: v.optional(v.string()),
    imageAuthor: v.optional(v.string()),
    imageLicense: v.optional(v.string()),
    color: v.optional(v.string()),
    category: v.string(), // vegetable | fruit | herb | flower | grain | legume
    lifecycleType: v.optional(v.string()), // annual | biennial | perennial | orchard
    propagationMethod: v.optional(v.string()), // seed | seedling | cutting | tuber | grafted | division
    isDefault: v.boolean(),
    source: v.optional(v.string()), // "seeded" | "ai-imported" | "custom"

    // === Timing & Lifecycle ===
    plantingMonths: v.optional(v.array(v.number())),
    harvestMonths: v.optional(v.array(v.number())),
    growthDays: v.optional(v.number()),
    daysToGermination: v.optional(v.number()),
    daysToTransplant: v.optional(v.number()),
    daysToFlowering: v.optional(v.number()),
    harvestWindowDays: v.optional(v.number()),
    growingSeasonStart: v.optional(v.number()),
    growingSeasonEnd: v.optional(v.number()),

    // === Growth Stages ===
    growthStages: v.optional(v.array(v.object({
      stage: v.string(),
      daysFromStart: v.number(),
      careNotes: v.optional(v.string()),
      waterFrequencyDays: v.optional(v.number()),
      fertilizerFrequencyDays: v.optional(v.number()),
    }))),

    // === Environment Requirements ===
    tempMin: v.optional(v.number()),
    tempMax: v.optional(v.number()),
    tempOptimalMin: v.optional(v.number()),
    tempOptimalMax: v.optional(v.number()),
    humidityMin: v.optional(v.number()),
    humidityMax: v.optional(v.number()),
    sunlight: v.optional(v.string()), // full_sun | partial_shade | shade
    sunlightHoursMin: v.optional(v.number()),
    sunlightHoursMax: v.optional(v.number()),
    windSensitivity: v.optional(v.string()), // low | medium | high
    droughtTolerance: v.optional(v.string()), // low | medium | high
    waterloggingTolerance: v.optional(v.string()), // low | medium | high
    altitudeMin: v.optional(v.number()),
    altitudeMax: v.optional(v.number()),

    // === Soil & Fertility ===
    soilPhMin: v.optional(v.number()),
    soilPhMax: v.optional(v.number()),
    soilType: v.optional(v.string()), // sandy | loamy | clay | well-drained
    organicMatterPreference: v.optional(v.string()), // low | medium | high
    fertilityDemand: v.optional(v.string()), // light | moderate | heavy
    fertilizerType: v.optional(v.string()), // organic | chemical | compost | liquid
    fertilizerFrequencyDays: v.optional(v.number()),
    commonDeficiencies: v.optional(v.array(v.string())),

    // === Spacing & Structure ===
    spacingPlantCm: v.optional(v.number()),
    spacingRowCm: v.optional(v.number()),
    maxHeightCm: v.optional(v.number()),
    maxSpreadCm: v.optional(v.number()),
    trellisRequired: v.optional(v.boolean()),
    pruningRequired: v.optional(v.boolean()),
    pruningFrequencyDays: v.optional(v.number()),
    pruningMonths: v.optional(v.array(v.number())),

    // === Water ===
    water: v.optional(v.string()), // low | moderate | high
    waterFrequencyDays: v.optional(v.number()),
    waterAmountMl: v.optional(v.number()),
    criticalDroughtStages: v.optional(v.array(v.string())),

    // === Companion & Rotation ===
    companionPlants: v.optional(v.array(v.string())),
    antagonistPlants: v.optional(v.array(v.string())),
    rotationFamily: v.optional(v.string()), // brassica | solanaceae | cucurbit | legume | allium | root
    rotationYears: v.optional(v.number()),

    // === Pest & Disease ===
    commonPests: v.optional(v.array(v.object({
      name: v.string(),
      symptoms: v.string(),
      organicTreatment: v.string(),
      triggerConditions: v.optional(v.string()),
    }))),
    commonDiseases: v.optional(v.array(v.object({
      name: v.string(),
      symptoms: v.string(),
      organicTreatment: v.string(),
      triggerConditions: v.optional(v.string()),
    }))),
    typhoonResistance: v.optional(v.string()), // low | medium | high
    typhoonPrep: v.optional(v.string()),

    // === Harvest ===
    harvestMaturitySigns: v.optional(v.string()),
    harvestMethod: v.optional(v.string()), // cut | pull | pick | dig
    harvestCadence: v.optional(v.string()), // once | continuous | multiple_flushes
    yieldPerPlant: v.optional(v.string()),
    storageNotes: v.optional(v.string()),
    shelfLifeDays: v.optional(v.number()),

    // === Growing Guide (AI-generated, user-editable) ===
    growingGuide: v.optional(v.object({
      howToPlant: v.optional(v.string()),
      howToCare: v.optional(v.string()),
      warnings: v.optional(v.string()),
      localNotes: v.optional(v.string()),
    })),

    // === Meta ===
    lastAiEnriched: v.optional(v.number()),
    aiEnrichmentNotes: v.optional(v.string()),

    // === Import Review (issue #89/#90) ===
    importStatus: v.optional(v.string()),  // "pending_review" | "approved" | undefined
    fieldMeta: v.optional(v.record(v.string(), v.object({
      confidence: v.optional(v.string()),
      sources: v.optional(v.array(v.string())),
      origin: v.optional(v.string()),
      lastVerified: v.optional(v.string()),
    }))),
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
    name: v.optional(v.string()), // user-editable region/area name e.g. "區域 1"
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
  })
    .index("by_farmId", ["farmId"])
    .index("by_farmId_completed", ["farmId", "completed"]),

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
  })
    .index("by_farmId", ["farmId"])
    .index("by_farmId_date", ["farmId", "date"]),

  // === Planned Plantings (issue #87) ===
  plannedPlantings: defineTable({
    farmId: v.id("farms"),
    fieldId: v.id("fields"),
    regionId: v.optional(v.string()),
    cropId: v.optional(v.id("crops")),
    cropName: v.optional(v.string()),
    planningState: v.union(
      v.literal("draft"),
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("completed")
    ),
    startWindowEarliest: v.optional(v.string()),
    startWindowLatest: v.optional(v.string()),
    endWindowEarliest: v.optional(v.string()),
    endWindowLatest: v.optional(v.string()),
    predecessorPlantedCropId: v.optional(v.id("plantedCrops")),
    predecessorPlanId: v.optional(v.id("plannedPlantings")),
    notes: v.optional(v.string()),
    confidence: v.optional(v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    )),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_farmId", ["farmId"])
    .index("by_fieldId", ["fieldId"]),

  // === Irrigation Zones (issue #96) ===
  irrigationZones: defineTable({
    farmId: v.id("farms"),
    fieldId: v.id("fields"),
    name: v.string(),
    linkedRegionIds: v.optional(v.array(v.string())),
    linkedNodeIds: v.optional(v.array(v.id("utilityNodes"))),
    lastWateredAt: v.optional(v.number()),
    skipReason: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_farmId", ["farmId"])
    .index("by_fieldId", ["fieldId"]),

  // === Pest/Disease Observations (issue #97) ===
  pestObservations: defineTable({
    farmId: v.id("farms"),
    fieldId: v.optional(v.id("fields")),
    plantedCropId: v.optional(v.id("plantedCrops")),
    cropId: v.optional(v.id("crops")),
    observedAt: v.number(),
    symptoms: v.string(),
    affectedParts: v.optional(v.array(v.string())),
    severity: v.union(v.literal("mild"), v.literal("moderate"), v.literal("severe")),
    spreadRate: v.optional(v.string()),
    environmentNotes: v.optional(v.string()),
    triageResults: v.optional(v.array(v.object({
      possibleCause: v.string(),
      likelihood: v.string(),
      reasoning: v.string(),
      nextChecks: v.string(),
      treatment: v.string(),
    }))),
    triageStatus: v.optional(v.string()),
    resolution: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_farmId", ["farmId"]).index("by_cropId", ["cropId"]),

  // === AI Recommendations (issue #93) ===
  recommendations: defineTable({
    farmId: v.id("farms"),
    type: v.string(), // "care" | "harvest" | "weather" | "planning" | "pest" | "general"
    title: v.string(),
    summary: v.string(),
    recommendedAction: v.string(),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    confidence: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    reasoning: v.string(),
    sourceSignals: v.array(v.string()),
    status: v.union(
      v.literal("new"),
      v.literal("accepted"),
      v.literal("snoozed"),
      v.literal("dismissed"),
      v.literal("completed")
    ),
    relatedCropId: v.optional(v.id("crops")),
    relatedFieldId: v.optional(v.id("fields")),
    relatedPlantedCropId: v.optional(v.id("plantedCrops")),
    dismissReason: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_farmId", ["farmId"])
    .index("by_farmId_status", ["farmId", "status"]),
});
