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

export const remove = mutation({
  args: { harvestLogId: v.id("harvestLogs") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.harvestLogId);
    if (!record) return;
    await requireFarmMembership(ctx, record.farmId);
    await ctx.db.delete(args.harvestLogId);
  },
});
