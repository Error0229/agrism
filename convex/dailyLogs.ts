import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireFarmMembership } from "./_helpers";

// ---------------------------------------------------------------------------
// Daily Logs — end-of-day summary (issue #108)
// ---------------------------------------------------------------------------

/**
 * Get the daily log for a specific date.
 */
export const getByDate = query({
  args: {
    farmId: v.id("farms"),
    date: v.string(), // "YYYY-MM-DD"
  },
  handler: async (ctx, { farmId, date }) => {
    await requireFarmMembership(ctx, farmId);

    return ctx.db
      .query("dailyLogs")
      .withIndex("by_farm_date", (q) => q.eq("farmId", farmId).eq("date", date))
      .first();
  },
});

/**
 * List daily logs for a date range.
 */
export const list = query({
  args: {
    farmId: v.id("farms"),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);

    // Use index range query for date filtering when bounds are provided
    const results = await ctx.db
      .query("dailyLogs")
      .withIndex("by_farm_date", (q) => {
        const q2 = q.eq("farmId", args.farmId);
        if (args.dateFrom !== undefined && args.dateTo !== undefined) {
          return q2.gte("date", args.dateFrom).lte("date", args.dateTo);
        } else if (args.dateFrom !== undefined) {
          return q2.gte("date", args.dateFrom);
        } else if (args.dateTo !== undefined) {
          return q2.lte("date", args.dateTo);
        }
        return q2;
      })
      .order("desc")
      .take(args.limit ?? 100);

    return results;
  },
});

/**
 * Save or update a daily log for a given date.
 * If a log already exists for this farm+date, it will be updated (upsert).
 */
export const saveDailyLog = mutation({
  args: {
    farmId: v.id("farms"),
    date: v.string(), // "YYYY-MM-DD"
    completedTaskIds: v.array(v.id("tasks")),
    skippedTaskIds: v.array(v.id("tasks")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);

    // Check if a log already exists for this date
    const existing = await ctx.db
      .query("dailyLogs")
      .withIndex("by_farm_date", (q) =>
        q.eq("farmId", args.farmId).eq("date", args.date)
      )
      .first();

    if (existing) {
      // Update existing log
      await ctx.db.patch(existing._id, {
        completedTaskIds: args.completedTaskIds,
        skippedTaskIds: args.skippedTaskIds,
        notes: args.notes,
      });
      return existing._id;
    }

    // Create new log
    return ctx.db.insert("dailyLogs", {
      farmId: args.farmId,
      date: args.date,
      completedTaskIds: args.completedTaskIds,
      skippedTaskIds: args.skippedTaskIds,
      notes: args.notes,
    });
  },
});
