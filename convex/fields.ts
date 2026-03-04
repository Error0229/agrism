import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./_helpers";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const list = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    const rows = await ctx.db
      .query("fields")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .collect();

    return Promise.all(
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

        // Resolve crop data for each plantedCrop
        const plantedCropsWithCrop = await Promise.all(
          plantedCrops.map(async (pc) => {
            const crop = pc.cropId ? await ctx.db.get(pc.cropId) : null;
            return { ...pc, crop };
          })
        );

        return {
          ...field,
          plantedCrops: plantedCropsWithCrop,
          facilities,
          utilityNodes,
          utilityEdges,
        };
      })
    );
  },
});

export const getById = query({
  args: { fieldId: v.id("fields") },
  handler: async (ctx, { fieldId }) => {
    const field = await ctx.db.get(fieldId);
    if (!field) return null;

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

    const plantedCropsWithCrop = await Promise.all(
      plantedCrops.map(async (pc) => {
        const crop = pc.cropId ? await ctx.db.get(pc.cropId) : null;
        return { ...pc, crop };
      })
    );

    return {
      ...field,
      plantedCrops: plantedCropsWithCrop,
      facilities,
      utilityNodes,
      utilityEdges,
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
    await requireAuth(ctx);
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
    await requireAuth(ctx);
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
    await requireAuth(ctx);
    await ctx.db.patch(fieldId, { memo });
  },
});

export const remove = mutation({
  args: { fieldId: v.id("fields") },
  handler: async (ctx, { fieldId }) => {
    await requireAuth(ctx);

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
    await requireAuth(ctx);
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
    xM: v.number(),
    yM: v.number(),
    widthM: v.optional(v.number()),
    heightM: v.optional(v.number()),
    shapePoints: v.optional(
      v.array(v.object({ x: v.number(), y: v.number() }))
    ),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const plantedCropId = await ctx.db.insert("plantedCrops", {
      cropId: args.cropId,
      fieldId: args.fieldId,
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
    await requireAuth(ctx);
    await ctx.db.patch(plantedCropId, { cropId });
  },
});

export const updatePlantedCrop = mutation({
  args: {
    plantedCropId: v.id("plantedCrops"),
    notes: v.optional(v.string()),
    customGrowthDays: v.optional(v.number()),
  },
  handler: async (ctx, { plantedCropId, ...patch }) => {
    await requireAuth(ctx);
    const updates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(patch)) {
      if (val !== undefined) updates[key] = val;
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(plantedCropId, updates);
    }
  },
});

export const harvestCrop = mutation({
  args: { plantedCropId: v.id("plantedCrops") },
  handler: async (ctx, { plantedCropId }) => {
    await requireAuth(ctx);
    await ctx.db.patch(plantedCropId, {
      status: "harvested",
      harvestedDate: new Date().toISOString().split("T")[0],
    });
  },
});

export const removePlantedCrop = mutation({
  args: { plantedCropId: v.id("plantedCrops") },
  handler: async (ctx, { plantedCropId }) => {
    await requireAuth(ctx);
    await ctx.db.patch(plantedCropId, { status: "removed" });
  },
});

export const restorePlantedCrop = mutation({
  args: { plantedCropId: v.id("plantedCrops") },
  handler: async (ctx, { plantedCropId }) => {
    await requireAuth(ctx);
    await ctx.db.patch(plantedCropId, { status: "growing" });
  },
});

export const deletePlantedCropWithPlacement = mutation({
  args: { plantedCropId: v.id("plantedCrops") },
  handler: async (ctx, { plantedCropId }) => {
    await requireAuth(ctx);
    // Placements are inlined, so just delete the document
    await ctx.db.delete(plantedCropId);
  },
});

export const updateCropPlacement = mutation({
  args: {
    plantedCropId: v.id("plantedCrops"),
    xM: v.optional(v.number()),
    yM: v.optional(v.number()),
    widthM: v.optional(v.number()),
    heightM: v.optional(v.number()),
    shapePoints: v.optional(
      v.array(v.object({ x: v.number(), y: v.number() }))
    ),
  },
  handler: async (ctx, { plantedCropId, ...patch }) => {
    await requireAuth(ctx);
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
    await requireAuth(ctx);
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
    facilityType: v.optional(v.string()),
    name: v.optional(v.string()),
    xM: v.optional(v.number()),
    yM: v.optional(v.number()),
    widthM: v.optional(v.number()),
    heightM: v.optional(v.number()),
  },
  handler: async (ctx, { facilityId, ...patch }) => {
    await requireAuth(ctx);
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
    await requireAuth(ctx);
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
    await requireAuth(ctx);
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
    label: v.optional(v.string()),
    kind: v.optional(v.union(v.literal("water"), v.literal("electric"))),
    nodeType: v.optional(v.string()),
    xM: v.optional(v.number()),
    yM: v.optional(v.number()),
  },
  handler: async (ctx, { nodeId, ...patch }) => {
    await requireAuth(ctx);
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
    await requireAuth(ctx);

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
    await requireAuth(ctx);
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
    await requireAuth(ctx);
    await ctx.db.delete(edgeId);
  },
});
