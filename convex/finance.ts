import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireFarmMembership } from "./_helpers";

export const list = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);

    const results = await ctx.db
      .query("financeRecords")
      .withIndex("by_farmId", (q) => q.eq("farmId", args.farmId))
      .take(200);

    // Sort by date desc in memory
    return results.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  },
});

export const create = mutation({
  args: {
    farmId: v.id("farms"),
    type: v.union(v.literal("income"), v.literal("expense")),
    category: v.string(),
    amount: v.number(),
    date: v.string(),
    description: v.optional(v.string()),
    relatedFieldId: v.optional(v.id("fields")),
    relatedCropId: v.optional(v.id("crops")),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) throw new Error("金額必須大於零");
    await requireFarmMembership(ctx, args.farmId);
    return ctx.db.insert("financeRecords", args);
  },
});

export const remove = mutation({
  args: { financeRecordId: v.id("financeRecords") },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.financeRecordId);
    if (!record) return;
    await requireFarmMembership(ctx, record.farmId);
    await ctx.db.delete(args.financeRecordId);
  },
});

export const getSummary = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);

    const records = await ctx.db
      .query("financeRecords")
      .withIndex("by_farmId", (q) => q.eq("farmId", args.farmId))
      .take(200);

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryMap = new Map<string, { type: string; category: string; total: number }>();

    for (const rec of records) {
      if (rec.type === "income") {
        totalIncome += rec.amount;
      } else {
        totalExpense += rec.amount;
      }

      const key = `${rec.type}:${rec.category}`;
      const existing = categoryMap.get(key);
      if (existing) {
        existing.total += rec.amount;
      } else {
        categoryMap.set(key, { type: rec.type, category: rec.category, total: rec.amount });
      }
    }

    const byCategory = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);

    return {
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
      byCategory,
    };
  },
});
