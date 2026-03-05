import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireFarmMembership } from "./_helpers";

// ---------------------------------------------------------------------------
// Soil Profile (inlined into fields table)
// ---------------------------------------------------------------------------

export const upsertProfile = mutation({
  args: {
    fieldId: v.id("fields"),
    texture: v.optional(v.string()),
    ph: v.optional(v.number()),
    ec: v.optional(v.number()),
    organicMatterPct: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { fieldId, texture, ph, ec, organicMatterPct } = args;
    const field = await ctx.db.get(fieldId);
    if (!field) throw new Error("找不到田區");
    await requireFarmMembership(ctx, field.farmId);

    const patch: Record<string, unknown> = { soilUpdatedAt: Date.now() };
    if (texture !== undefined) patch.soilTexture = texture;
    if (ph !== undefined) patch.soilPh = ph;
    if (ec !== undefined) patch.soilEc = ec;
    if (organicMatterPct !== undefined) patch.soilOrganicMatterPct = organicMatterPct;

    await ctx.db.patch(fieldId, patch);
  },
});

// ---------------------------------------------------------------------------
// Soil Amendments
// ---------------------------------------------------------------------------

export const listAmendments = query({
  args: { fieldId: v.id("fields") },
  handler: async (ctx, args) => {
    const field = await ctx.db.get(args.fieldId);
    if (!field) return [];
    await requireFarmMembership(ctx, field.farmId);

    const results = await ctx.db
      .query("soilAmendments")
      .withIndex("by_fieldId", (q) => q.eq("fieldId", args.fieldId))
      .collect();

    return results.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  },
});

export const createAmendment = mutation({
  args: {
    fieldId: v.id("fields"),
    date: v.string(),
    amendmentType: v.string(),
    quantity: v.number(),
    unit: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const field = await ctx.db.get(args.fieldId);
    if (!field) throw new Error("找不到田區");
    await requireFarmMembership(ctx, field.farmId);
    return ctx.db.insert("soilAmendments", args);
  },
});

export const removeAmendment = mutation({
  args: { amendmentId: v.id("soilAmendments") },
  handler: async (ctx, args) => {
    const amendment = await ctx.db.get(args.amendmentId);
    if (!amendment) return;
    const field = await ctx.db.get(amendment.fieldId);
    if (!field) return;
    await requireFarmMembership(ctx, field.farmId);
    await ctx.db.delete(args.amendmentId);
  },
});

// ---------------------------------------------------------------------------
// Soil Notes
// ---------------------------------------------------------------------------

export const listNotes = query({
  args: { fieldId: v.id("fields") },
  handler: async (ctx, args) => {
    const field = await ctx.db.get(args.fieldId);
    if (!field) return [];
    await requireFarmMembership(ctx, field.farmId);

    const results = await ctx.db
      .query("soilNotes")
      .withIndex("by_fieldId", (q) => q.eq("fieldId", args.fieldId))
      .collect();

    return results.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  },
});

export const createNote = mutation({
  args: {
    fieldId: v.id("fields"),
    date: v.string(),
    ph: v.optional(v.number()),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const field = await ctx.db.get(args.fieldId);
    if (!field) throw new Error("找不到田區");
    await requireFarmMembership(ctx, field.farmId);
    return ctx.db.insert("soilNotes", args);
  },
});

export const removeNote = mutation({
  args: { noteId: v.id("soilNotes") },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    if (!note) return;
    const field = await ctx.db.get(note.fieldId);
    if (!field) return;
    await requireFarmMembership(ctx, field.farmId);
    await ctx.db.delete(args.noteId);
  },
});
