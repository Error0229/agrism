import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./_helpers";

export const list = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const results = await ctx.db
      .query("weatherLogs")
      .withIndex("by_farmId", (q) => q.eq("farmId", args.farmId))
      .collect();

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
    await requireAuth(ctx);
    return ctx.db.insert("weatherLogs", args);
  },
});

export const remove = mutation({
  args: { weatherLogId: v.id("weatherLogs") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await ctx.db.delete(args.weatherLogId);
  },
});
