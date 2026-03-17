import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { requireFarmMembership } from "./_helpers";

// ---------------------------------------------------------------------------
// Export — full JSON
// ---------------------------------------------------------------------------

export const exportFarmData = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);

    const farm = await ctx.db.get(args.farmId);

    const [
      crops,
      cropTemplates,
      fields,
      tasks,
      harvestLogs,
      financeRecords,
      weatherLogs,
    ] = await Promise.all([
      ctx.db.query("crops").withIndex("by_farmId", (q) => q.eq("farmId", args.farmId)).take(1000),
      ctx.db.query("cropTemplates").withIndex("by_farmId", (q) => q.eq("farmId", args.farmId)).take(1000),
      ctx.db.query("fields").withIndex("by_farmId", (q) => q.eq("farmId", args.farmId)).take(1000),
      ctx.db.query("tasks").withIndex("by_farmId", (q) => q.eq("farmId", args.farmId)).take(1000),
      ctx.db.query("harvestLogs").withIndex("by_farmId", (q) => q.eq("farmId", args.farmId)).take(1000),
      ctx.db.query("financeRecords").withIndex("by_farmId", (q) => q.eq("farmId", args.farmId)).take(1000),
      ctx.db.query("weatherLogs").withIndex("by_farmId", (q) => q.eq("farmId", args.farmId)).take(1000),
    ]);

    // Fetch child records for templates
    const cropTemplateItems: Doc<"cropTemplateItems">[] = [];
    for (const template of cropTemplates) {
      const items = await ctx.db
        .query("cropTemplateItems")
        .withIndex("by_templateId", (q) => q.eq("templateId", template._id))
        .take(1000);
      cropTemplateItems.push(...items);
    }

    // Fetch child records for fields
    const plantedCrops: Doc<"plantedCrops">[] = [];
    const facilities: Doc<"facilities">[] = [];
    const utilityNodes: Doc<"utilityNodes">[] = [];
    const utilityEdges: Doc<"utilityEdges">[] = [];
    const soilAmendments: Doc<"soilAmendments">[] = [];
    const soilNotes: Doc<"soilNotes">[] = [];

    for (const field of fields) {
      const [pcs, facs, nodes, edges, amendments, notes] = await Promise.all([
        ctx.db.query("plantedCrops").withIndex("by_fieldId", (q) => q.eq("fieldId", field._id)).take(1000),
        ctx.db.query("facilities").withIndex("by_fieldId", (q) => q.eq("fieldId", field._id)).take(1000),
        ctx.db.query("utilityNodes").withIndex("by_fieldId", (q) => q.eq("fieldId", field._id)).take(1000),
        ctx.db.query("utilityEdges").withIndex("by_fieldId", (q) => q.eq("fieldId", field._id)).take(1000),
        ctx.db.query("soilAmendments").withIndex("by_fieldId", (q) => q.eq("fieldId", field._id)).take(1000),
        ctx.db.query("soilNotes").withIndex("by_fieldId", (q) => q.eq("fieldId", field._id)).take(1000),
      ]);
      plantedCrops.push(...pcs);
      facilities.push(...facs);
      utilityNodes.push(...nodes);
      utilityEdges.push(...edges);
      soilAmendments.push(...amendments);
      soilNotes.push(...notes);
    }

    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      farm: farm ?? null,
      crops,
      cropTemplates,
      cropTemplateItems,
      fields,
      plantedCrops,
      facilities,
      utilityNodes,
      utilityEdges,
      tasks,
      harvestLogs,
      financeRecords,
      soilAmendments,
      soilNotes,
      weatherLogs,
    };
  },
});

// ---------------------------------------------------------------------------
// Import — bulk insert from exported JSON
// ---------------------------------------------------------------------------

export const importFarmData = mutation({
  args: {
    farmId: v.id("farms"),
    data: v.object({
      crops: v.optional(v.array(v.any())),
      harvestLogs: v.optional(v.array(v.any())),
      financeRecords: v.optional(v.array(v.any())),
      soilAmendments: v.optional(v.array(v.any())),
      soilNotes: v.optional(v.array(v.any())),
      weatherLogs: v.optional(v.array(v.any())),
    }),
  },
  handler: async (ctx, args) => {
    await requireFarmMembership(ctx, args.farmId);
    const { farmId, data } = args;
    const results: { imported: string[]; skipped: string[]; errors: string[] } = {
      imported: [],
      skipped: [],
      errors: [],
    };

    // Import custom crops
    if (Array.isArray(data.crops) && data.crops.length > 0) {
      try {
        for (const crop of data.crops) {
          await ctx.db.insert("crops", {
            farmId,
            name: String(crop.name ?? ""),
            emoji: crop.emoji ? String(crop.emoji) : undefined,
            imageUrl: crop.imageUrl ? String(crop.imageUrl) : undefined,
            thumbnailUrl: crop.thumbnailUrl ? String(crop.thumbnailUrl) : undefined,
            imageSourceUrl: crop.imageSourceUrl ? String(crop.imageSourceUrl) : undefined,
            imageAuthor: crop.imageAuthor ? String(crop.imageAuthor) : undefined,
            imageLicense: crop.imageLicense ? String(crop.imageLicense) : undefined,
            color: crop.color ? String(crop.color) : undefined,
            category: crop.category ?? "other",
            plantingMonths: crop.plantingMonths,
            harvestMonths: crop.harvestMonths,
            growthDays: crop.growthDays ? Number(crop.growthDays) : undefined,
            water: crop.water,
            sunlight: crop.sunlight,
            isDefault: false,
          });
        }
        results.imported.push(`crops (${data.crops.length})`);
      } catch (e) {
        results.errors.push(`crops: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Import harvest logs
    if (Array.isArray(data.harvestLogs) && data.harvestLogs.length > 0) {
      try {
        for (const log of data.harvestLogs) {
          await ctx.db.insert("harvestLogs", {
            farmId,
            date: String(log.date ?? ""),
            quantity: Number(log.quantity ?? 0),
            unit: String(log.unit ?? "kg"),
            qualityGrade: log.qualityGrade,
            notes: log.notes ? String(log.notes) : undefined,
          });
        }
        results.imported.push(`harvestLogs (${data.harvestLogs.length})`);
      } catch (e) {
        results.errors.push(`harvestLogs: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Import finance records
    if (Array.isArray(data.financeRecords) && data.financeRecords.length > 0) {
      try {
        for (const rec of data.financeRecords) {
          await ctx.db.insert("financeRecords", {
            farmId,
            type: rec.type ?? "expense",
            category: String(rec.category ?? ""),
            amount: Number(rec.amount ?? 0),
            date: String(rec.date ?? ""),
            description: rec.description ? String(rec.description) : undefined,
          });
        }
        results.imported.push(`financeRecords (${data.financeRecords.length})`);
      } catch (e) {
        results.errors.push(`financeRecords: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Import soil amendments
    if (Array.isArray(data.soilAmendments) && data.soilAmendments.length > 0) {
      try {
        let importedCount = 0;
        for (const amendment of data.soilAmendments) {
          // We need a fieldId — skip if not present since we can't map without field context
          if (!amendment.fieldId) continue;
          // Validate that the fieldId belongs to this farm
          const fieldId_ = amendment.fieldId as Id<"fields">;
          const field = await ctx.db.get(fieldId_);
          if (!field || field.farmId !== farmId) continue;
          await ctx.db.insert("soilAmendments", {
            fieldId: fieldId_,
            date: String(amendment.date ?? ""),
            amendmentType: String(amendment.amendmentType ?? ""),
            quantity: Number(amendment.quantity ?? 0),
            unit: String(amendment.unit ?? "kg"),
            notes: amendment.notes ? String(amendment.notes) : undefined,
          });
          importedCount++;
        }
        results.imported.push(`soilAmendments (${importedCount})`);
      } catch (e) {
        results.errors.push(`soilAmendments: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Import soil notes
    if (Array.isArray(data.soilNotes) && data.soilNotes.length > 0) {
      try {
        let importedCount = 0;
        for (const note of data.soilNotes) {
          if (!note.fieldId) continue;
          // Validate that the fieldId belongs to this farm
          const fieldId_ = note.fieldId as Id<"fields">;
          const field = await ctx.db.get(fieldId_);
          if (!field || field.farmId !== farmId) continue;
          await ctx.db.insert("soilNotes", {
            fieldId: fieldId_,
            date: String(note.date ?? ""),
            content: String(note.content ?? ""),
            ph: note.ph ? Number(note.ph) : undefined,
          });
          importedCount++;
        }
        results.imported.push(`soilNotes (${importedCount})`);
      } catch (e) {
        results.errors.push(`soilNotes: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Import weather logs
    if (Array.isArray(data.weatherLogs) && data.weatherLogs.length > 0) {
      try {
        for (const log of data.weatherLogs) {
          await ctx.db.insert("weatherLogs", {
            farmId,
            date: String(log.date ?? ""),
            temperature: log.temperature ? Number(log.temperature) : undefined,
            rainfallMm: log.rainfallMm ? Number(log.rainfallMm) : undefined,
            condition: log.condition ? String(log.condition) : undefined,
            notes: log.notes ? String(log.notes) : undefined,
          });
        }
        results.imported.push(`weatherLogs (${data.weatherLogs.length})`);
      } catch (e) {
        results.errors.push(`weatherLogs: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return results;
  },
});
