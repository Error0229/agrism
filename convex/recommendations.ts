import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireFarmMembership } from "./_helpers";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getActive = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    await requireFarmMembership(ctx, farmId);
    const now = Date.now();
    const all = await ctx.db
      .query("recommendations")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .collect();

    return all
      .filter(
        (r) =>
          (r.status === "new" || r.status === "accepted") &&
          (!r.expiresAt || r.expiresAt > now)
      )
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  },
});

export const getHistory = query({
  args: {
    farmId: v.id("farms"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { farmId, limit }) => {
    await requireFarmMembership(ctx, farmId);
    const all = await ctx.db
      .query("recommendations")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .collect();

    const historical = all
      .filter(
        (r) =>
          r.status === "completed" ||
          r.status === "dismissed" ||
          r.status === "snoozed"
      )
      .sort((a, b) => b.createdAt - a.createdAt);

    return limit ? historical.slice(0, limit) : historical;
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const accept = mutation({
  args: { recommendationId: v.id("recommendations") },
  handler: async (ctx, { recommendationId }) => {
    const rec = await ctx.db.get(recommendationId);
    if (!rec) throw new Error("找不到建議");
    await requireFarmMembership(ctx, rec.farmId);
    await ctx.db.patch(recommendationId, { status: "accepted" });
  },
});

export const snooze = mutation({
  args: { recommendationId: v.id("recommendations") },
  handler: async (ctx, { recommendationId }) => {
    const rec = await ctx.db.get(recommendationId);
    if (!rec) throw new Error("找不到建議");
    await requireFarmMembership(ctx, rec.farmId);
    await ctx.db.patch(recommendationId, {
      status: "snoozed",
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
  },
});

export const dismiss = mutation({
  args: {
    recommendationId: v.id("recommendations"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { recommendationId, reason }) => {
    const rec = await ctx.db.get(recommendationId);
    if (!rec) throw new Error("找不到建議");
    await requireFarmMembership(ctx, rec.farmId);
    await ctx.db.patch(recommendationId, {
      status: "dismissed",
      ...(reason ? { dismissReason: reason } : {}),
    });
  },
});

export const complete = mutation({
  args: { recommendationId: v.id("recommendations") },
  handler: async (ctx, { recommendationId }) => {
    const rec = await ctx.db.get(recommendationId);
    if (!rec) throw new Error("找不到建議");
    await requireFarmMembership(ctx, rec.farmId);
    await ctx.db.patch(recommendationId, { status: "completed" });
  },
});

// ---------------------------------------------------------------------------
// Internal mutation (used by briefing generation action)
// ---------------------------------------------------------------------------

export const insertRecommendation = internalMutation({
  args: {
    farmId: v.id("farms"),
    type: v.string(),
    title: v.string(),
    summary: v.string(),
    recommendedAction: v.string(),
    priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    confidence: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    reasoning: v.string(),
    sourceSignals: v.array(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("recommendations", {
      ...args,
      status: "new",
    });
  },
});
