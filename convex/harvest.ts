import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireFarmMembership } from "./_helpers";

export const list = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);

    const results = await ctx.db
      .query("harvestLogs")
      .withIndex("by_farmId", (q) => q.eq("farmId", args.farmId))
      .take(200);

    // Sort by date desc in memory
    return results.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  },
});

export const create = mutation({
  args: {
    farmId: v.id("farms"),
    fieldId: v.optional(v.id("fields")),
    cropId: v.optional(v.id("crops")),
    plantedCropId: v.optional(v.id("plantedCrops")),
    date: v.string(),
    quantity: v.number(),
    unit: v.string(),
    qualityGrade: v.optional(v.string()),
    pestIncidentLevel: v.optional(v.string()),
    weatherImpact: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) throw new Error("收穫數量必須大於零");
    await requireFarmMembership(ctx, args.farmId);
    return ctx.db.insert("harvestLogs", args);
  },
});

export const getByFieldId = query({
  args: {
    fieldId: v.id("fields"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { fieldId, limit }) => {
    // 1. Get the field to find farmId
    const field = await ctx.db.get(fieldId);
    if (!field) throw new Error("找不到田區");

    // 2. Check farm membership
    await requireFarmMembership(ctx, field.farmId);

    // 3. Query harvestLogs by farmId then filter by fieldId in memory
    const allLogs = await ctx.db
      .query("harvestLogs")
      .withIndex("by_farmId", (q) => q.eq("farmId", field.farmId))
      .take(200);

    const fieldLogs = allLogs.filter((log) => log.fieldId === fieldId);

    // 4. Sort by date desc and take limit
    fieldLogs.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    const limited = fieldLogs.slice(0, limit ?? 5);

    // 5. For each log, resolve cropName from crops table
    const results = await Promise.all(
      limited.map(async (log) => {
        let cropName: string | undefined;
        if (log.cropId) {
          const crop = await ctx.db.get(log.cropId);
          cropName = crop?.name;
        }
        return { ...log, cropName };
      })
    );

    return results;
  },
});

export const remove = mutation({
  args: { harvestLogId: v.id("harvestLogs") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.harvestLogId);
    if (!record) return;
    await requireFarmMembership(ctx, record.farmId);
    await ctx.db.delete(args.harvestLogId);
  },
});
