import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireFarmMembership } from "./_helpers";

export const list = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);

    const results = await ctx.db
      .query("weatherLogs")
      .withIndex("by_farmId", (q) => q.eq("farmId", args.farmId))
      .take(200);

    return results.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  },
});

export const create = mutation({
  args: {
    farmId: v.id("farms"),
    date: v.string(),
    temperature: v.optional(v.number()),
    rainfallMm: v.optional(v.number()),
    condition: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);
    return ctx.db.insert("weatherLogs", args);
  },
});

export const remove = mutation({
  args: { weatherLogId: v.id("weatherLogs") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.weatherLogId);
    if (!record) return;
    await requireFarmMembership(ctx, record.farmId);
    await ctx.db.delete(args.weatherLogId);
  },
});
