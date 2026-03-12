import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireFarmMembership } from "./_helpers";
import { MutationCtx, QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Shared validators
// ---------------------------------------------------------------------------

const journalTypeValidator = v.union(
  v.literal("growth"),
  v.literal("pest"),
  v.literal("soil"),
  v.literal("harvest"),
  v.literal("weather"),
  v.literal("general")
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveFieldFarmId(ctx: QueryCtx | MutationCtx, fieldId: Id<"fields">) {
  const field = await ctx.db.get(fieldId);
  if (!field) throw new Error("田區不存在");
  return field.farmId;
}

async function resolvePlantedCropContext(ctx: QueryCtx | MutationCtx, plantedCropId: Id<"plantedCrops">) {
  const pc = await ctx.db.get(plantedCropId);
  if (!pc) throw new Error("找不到種植紀錄");
  const field = await ctx.db.get(pc.fieldId);
  if (!field) throw new Error("田區不存在");
  return { plantedCrop: pc, farmId: field.farmId, fieldId: pc.fieldId };
}

// ---------------------------------------------------------------------------
// Field Journal Queries
// ---------------------------------------------------------------------------

/**
 * List field-level journal entries for a specific field.
 * Results ordered by createdAt descending (newest first).
 * Optional type filter.
 */
export const getFieldEntries = query({
  args: {
    fieldId: v.id("fields"),
    type: v.optional(journalTypeValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { fieldId, type, limit }) => {
    const farmId = await resolveFieldFarmId(ctx, fieldId);
    await requireFarmMembership(ctx, farmId);

    const maxEntries = Math.min(Math.max(limit ?? 20, 1), 100);

    if (type) {
      return await ctx.db
        .query("fieldJournalEntries")
        .withIndex("by_field_type", (q) => q.eq("fieldId", fieldId).eq("type", type))
        .order("desc")
        .take(maxEntries);
    } else {
      return await ctx.db
        .query("fieldJournalEntries")
        .withIndex("by_field", (q) => q.eq("fieldId", fieldId))
        .order("desc")
        .take(maxEntries);
    }
  },
});

/**
 * List region-level journal entries for a specific planted crop.
 * Results ordered by createdAt descending (newest first).
 * Optional type filter.
 */
export const getRegionEntries = query({
  args: {
    plantedCropId: v.id("plantedCrops"),
    type: v.optional(journalTypeValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { plantedCropId, type, limit }) => {
    const { farmId } = await resolvePlantedCropContext(ctx, plantedCropId);
    await requireFarmMembership(ctx, farmId);

    const maxEntries = Math.min(Math.max(limit ?? 20, 1), 100);

    if (type) {
      // No dedicated index for plantedCropId+type, so fetch with a hard cap and filter in memory
      const allEntries = await ctx.db
        .query("regionJournalEntries")
        .withIndex("by_plantedCrop", (q) => q.eq("plantedCropId", plantedCropId))
        .order("desc")
        .take(maxEntries * 5);
      return allEntries.filter((e) => e.type === type).slice(0, maxEntries);
    } else {
      return await ctx.db
        .query("regionJournalEntries")
        .withIndex("by_plantedCrop", (q) => q.eq("plantedCropId", plantedCropId))
        .order("desc")
        .take(maxEntries);
    }
  },
});

/**
 * List recent journal entries across all fields for a farm.
 * Combines both field-level and region-level entries, sorted by createdAt desc.
 * Useful for dashboard integration.
 */
export const getRecentEntries = query({
  args: {
    farmId: v.id("farms"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { farmId, limit }) => {
    await requireFarmMembership(ctx, farmId);

    const maxEntries = Math.min(Math.max(limit ?? 20, 1), 100);

    const [fieldEntries, regionEntries] = await Promise.all([
      ctx.db
        .query("fieldJournalEntries")
        .withIndex("by_farm", (q) => q.eq("farmId", farmId))
        .order("desc")
        .take(maxEntries),
      ctx.db
        .query("regionJournalEntries")
        .withIndex("by_farm", (q) => q.eq("farmId", farmId))
        .order("desc")
        .take(maxEntries),
    ]);

    // Tag each entry with its scope for the frontend
    const tagged = [
      ...fieldEntries.map((e) => ({ ...e, scope: "field" as const })),
      ...regionEntries.map((e) => ({ ...e, scope: "region" as const })),
    ];

    // Sort combined list by createdAt descending
    tagged.sort((a, b) => b.createdAt - a.createdAt);

    return tagged.slice(0, maxEntries);
  },
});

// ---------------------------------------------------------------------------
// Field Journal Mutations
// ---------------------------------------------------------------------------

/**
 * Create a new field-level journal entry.
 */
export const createFieldEntry = mutation({
  args: {
    fieldId: v.id("fields"),
    type: journalTypeValidator,
    content: v.string(),
    quickPhrases: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { fieldId, type, content, quickPhrases }) => {
    const farmId = await resolveFieldFarmId(ctx, fieldId);
    await requireFarmMembership(ctx, farmId);

    if (content.length > 5000) throw new Error("日誌內容過長（最多 5000 字）");

    const entryId = await ctx.db.insert("fieldJournalEntries", {
      farmId,
      fieldId,
      type,
      content,
      quickPhrases,
      createdAt: Date.now(),
    });
    return entryId;
  },
});

/**
 * Create a new region-level journal entry.
 */
export const createRegionEntry = mutation({
  args: {
    plantedCropId: v.id("plantedCrops"),
    type: journalTypeValidator,
    content: v.string(),
    quickPhrases: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { plantedCropId, type, content, quickPhrases }) => {
    const { farmId, fieldId } = await resolvePlantedCropContext(ctx, plantedCropId);
    await requireFarmMembership(ctx, farmId);

    if (content.length > 5000) throw new Error("日誌內容過長（最多 5000 字）");

    const entryId = await ctx.db.insert("regionJournalEntries", {
      farmId,
      fieldId,
      plantedCropId,
      type,
      content,
      quickPhrases,
      createdAt: Date.now(),
    });
    return entryId;
  },
});

/**
 * Update an existing field journal entry (content, type, quickPhrases).
 */
export const updateFieldEntry = mutation({
  args: {
    entryId: v.id("fieldJournalEntries"),
    type: v.optional(journalTypeValidator),
    content: v.optional(v.string()),
    quickPhrases: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { entryId, ...patch }) => {
    const entry = await ctx.db.get(entryId);
    if (!entry) throw new Error("找不到日誌紀錄");
    await requireFarmMembership(ctx, entry.farmId);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, val] of Object.entries(patch)) {
      if (val !== undefined) updates[key] = val;
    }
    await ctx.db.patch(entryId, updates);
  },
});

/**
 * Update an existing region journal entry (content, type, quickPhrases).
 */
export const updateRegionEntry = mutation({
  args: {
    entryId: v.id("regionJournalEntries"),
    type: v.optional(journalTypeValidator),
    content: v.optional(v.string()),
    quickPhrases: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { entryId, ...patch }) => {
    const entry = await ctx.db.get(entryId);
    if (!entry) throw new Error("找不到日誌紀錄");
    await requireFarmMembership(ctx, entry.farmId);

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, val] of Object.entries(patch)) {
      if (val !== undefined) updates[key] = val;
    }
    await ctx.db.patch(entryId, updates);
  },
});

/**
 * Delete a field journal entry (hard delete).
 */
export const deleteFieldEntry = mutation({
  args: { entryId: v.id("fieldJournalEntries") },
  handler: async (ctx, { entryId }) => {
    const entry = await ctx.db.get(entryId);
    if (!entry) throw new Error("找不到日誌紀錄");
    await requireFarmMembership(ctx, entry.farmId);
    await ctx.db.delete(entryId);
  },
});

/**
 * Delete a region journal entry (hard delete).
 */
export const deleteRegionEntry = mutation({
  args: { entryId: v.id("regionJournalEntries") },
  handler: async (ctx, { entryId }) => {
    const entry = await ctx.db.get(entryId);
    if (!entry) throw new Error("找不到日誌紀錄");
    await requireFarmMembership(ctx, entry.farmId);
    await ctx.db.delete(entryId);
  },
});
