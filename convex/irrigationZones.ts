import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireFarmMembership } from "./_helpers";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const list = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, { farmId }) => {
    await requireFarmMembership(ctx, farmId);
    return ctx.db
      .query("irrigationZones")
      .withIndex("by_farmId", (q) => q.eq("farmId", farmId))
      .take(200);
  },
});

export const listByField = query({
  args: { fieldId: v.id("fields") },
  handler: async (ctx, { fieldId }) => {
    const field = await ctx.db.get(fieldId);
    if (!field) throw new Error("找不到田區");
    await requireFarmMembership(ctx, field.farmId);
    return ctx.db
      .query("irrigationZones")
      .withIndex("by_fieldId", (q) => q.eq("fieldId", fieldId))
      .take(200);
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export const create = mutation({
  args: {
    farmId: v.id("farms"),
    fieldId: v.id("fields"),
    name: v.string(),
    linkedRegionIds: v.optional(v.array(v.string())),
    linkedNodeIds: v.optional(v.array(v.id("utilityNodes"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.name.trim() === "") throw new Error("灌溉區域名稱不可為空");
    await requireFarmMembership(ctx, args.farmId);
    return ctx.db.insert("irrigationZones", args);
  },
});

export const update = mutation({
  args: {
    zoneId: v.id("irrigationZones"),
    name: v.optional(v.string()),
    linkedRegionIds: v.optional(v.array(v.string())),
    linkedNodeIds: v.optional(v.array(v.id("utilityNodes"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { zoneId, ...updates }) => {
    const zone = await ctx.db.get(zoneId);
    if (!zone) throw new Error("找不到灌溉區域");
    await requireFarmMembership(ctx, zone.farmId);

    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.linkedRegionIds !== undefined)
      patch.linkedRegionIds = updates.linkedRegionIds;
    if (updates.linkedNodeIds !== undefined)
      patch.linkedNodeIds = updates.linkedNodeIds;
    if (updates.notes !== undefined) patch.notes = updates.notes;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(zoneId, patch);
    }
  },
});

export const markWatered = mutation({
  args: { zoneId: v.id("irrigationZones") },
  handler: async (ctx, { zoneId }) => {
    const zone = await ctx.db.get(zoneId);
    if (!zone) throw new Error("找不到灌溉區域");
    await requireFarmMembership(ctx, zone.farmId);
    await ctx.db.patch(zoneId, {
      lastWateredAt: Date.now(),
      skipReason: undefined,
    });
  },
});

export const markSkipped = mutation({
  args: {
    zoneId: v.id("irrigationZones"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { zoneId, reason }) => {
    const zone = await ctx.db.get(zoneId);
    if (!zone) throw new Error("找不到灌溉區域");
    await requireFarmMembership(ctx, zone.farmId);
    await ctx.db.patch(zoneId, {
      skipReason: reason ?? "已跳過",
    });
  },
});

export const remove = mutation({
  args: { zoneId: v.id("irrigationZones") },
  handler: async (ctx, { zoneId }) => {
    const zone = await ctx.db.get(zoneId);
    if (!zone) return;
    await requireFarmMembership(ctx, zone.farmId);
    await ctx.db.delete(zoneId);
  },
});
