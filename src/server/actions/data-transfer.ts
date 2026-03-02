'use server'

import { db } from '@/server/db'
import {
  crops,
  cropTemplates,
  cropTemplateItems,
  fields,
  fieldContexts,
  plantedCrops,
  cropPlacements,
  facilities,
  tasks,
  harvestLogs,
  financeRecords,
  soilProfiles,
  soilAmendments,
  soilNotes,
  weatherLogs,
  farms,
} from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Export — full JSON
// ---------------------------------------------------------------------------

export async function exportFarmData(farmId: string) {
  const [
    farmRows,
    cropRows,
    templateRows,
    templateItemRows,
    fieldRows,
    contextRows,
    plantedCropRows,
    placementRows,
    facilityRows,
    taskRows,
    harvestRows,
    financeRows,
    soilProfileRows,
    soilAmendmentRows,
    soilNoteRows,
    weatherRows,
  ] = await Promise.all([
    db.select().from(farms).where(eq(farms.id, farmId)),
    db.select().from(crops).where(eq(crops.farmId, farmId)),
    db.select().from(cropTemplates).where(eq(cropTemplates.farmId, farmId)),
    // Template items need to be fetched via templates
    db
      .select({ item: cropTemplateItems, templateFarmId: cropTemplates.farmId })
      .from(cropTemplateItems)
      .innerJoin(
        cropTemplates,
        eq(cropTemplateItems.templateId, cropTemplates.id),
      )
      .where(eq(cropTemplates.farmId, farmId))
      .then((rows) => rows.map((r) => r.item)),
    db.select().from(fields).where(eq(fields.farmId, farmId)),
    // Field contexts via fields
    db
      .select({ ctx: fieldContexts, fieldFarmId: fields.farmId })
      .from(fieldContexts)
      .innerJoin(fields, eq(fieldContexts.fieldId, fields.id))
      .where(eq(fields.farmId, farmId))
      .then((rows) => rows.map((r) => r.ctx)),
    // Planted crops via fields
    db
      .select({ pc: plantedCrops, fieldFarmId: fields.farmId })
      .from(plantedCrops)
      .innerJoin(fields, eq(plantedCrops.fieldId, fields.id))
      .where(eq(fields.farmId, farmId))
      .then((rows) => rows.map((r) => r.pc)),
    // Crop placements via fields
    db
      .select({ cp: cropPlacements, fieldFarmId: fields.farmId })
      .from(cropPlacements)
      .innerJoin(fields, eq(cropPlacements.fieldId, fields.id))
      .where(eq(fields.farmId, farmId))
      .then((rows) => rows.map((r) => r.cp)),
    // Facilities via fields
    db
      .select({ f: facilities, fieldFarmId: fields.farmId })
      .from(facilities)
      .innerJoin(fields, eq(facilities.fieldId, fields.id))
      .where(eq(fields.farmId, farmId))
      .then((rows) => rows.map((r) => r.f)),
    db.select().from(tasks).where(eq(tasks.farmId, farmId)),
    db.select().from(harvestLogs).where(eq(harvestLogs.farmId, farmId)),
    db.select().from(financeRecords).where(eq(financeRecords.farmId, farmId)),
    // Soil data via fields
    db
      .select({ sp: soilProfiles, fieldFarmId: fields.farmId })
      .from(soilProfiles)
      .innerJoin(fields, eq(soilProfiles.fieldId, fields.id))
      .where(eq(fields.farmId, farmId))
      .then((rows) => rows.map((r) => r.sp)),
    db
      .select({ sa: soilAmendments, fieldFarmId: fields.farmId })
      .from(soilAmendments)
      .innerJoin(fields, eq(soilAmendments.fieldId, fields.id))
      .where(eq(fields.farmId, farmId))
      .then((rows) => rows.map((r) => r.sa)),
    db
      .select({ sn: soilNotes, fieldFarmId: fields.farmId })
      .from(soilNotes)
      .innerJoin(fields, eq(soilNotes.fieldId, fields.id))
      .where(eq(fields.farmId, farmId))
      .then((rows) => rows.map((r) => r.sn)),
    db.select().from(weatherLogs).where(eq(weatherLogs.farmId, farmId)),
  ])

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    farm: farmRows[0] ?? null,
    crops: cropRows,
    cropTemplates: templateRows,
    cropTemplateItems: templateItemRows,
    fields: fieldRows,
    fieldContexts: contextRows,
    plantedCrops: plantedCropRows,
    cropPlacements: placementRows,
    facilities: facilityRows,
    tasks: taskRows,
    harvestLogs: harvestRows,
    financeRecords: financeRows,
    soilProfiles: soilProfileRows,
    soilAmendments: soilAmendmentRows,
    soilNotes: soilNoteRows,
    weatherLogs: weatherRows,
  }
}

// ---------------------------------------------------------------------------
// Export — CSV helpers
// ---------------------------------------------------------------------------

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const headerLine = headers.join(',')
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCsvField(row[h])).join(','),
  )
  return [headerLine, ...dataLines].join('\n')
}

export async function exportHarvestLogsCsv(farmId: string) {
  const rows = await db
    .select()
    .from(harvestLogs)
    .where(eq(harvestLogs.farmId, farmId))

  const headers = [
    'id',
    'fieldId',
    'cropId',
    'date',
    'quantity',
    'unit',
    'qualityGrade',
    'pestIncidentLevel',
    'weatherImpact',
    'notes',
  ]

  return toCsv(headers, rows)
}

export async function exportFinanceRecordsCsv(farmId: string) {
  const rows = await db
    .select()
    .from(financeRecords)
    .where(eq(financeRecords.farmId, farmId))

  const headers = [
    'id',
    'type',
    'category',
    'amount',
    'date',
    'description',
    'relatedFieldId',
    'relatedCropId',
  ]

  return toCsv(headers, rows)
}

export async function exportTasksCsv(farmId: string) {
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.farmId, farmId))

  const formatted = rows.map((row) => ({
    ...row,
    requiredTools: row.requiredTools?.join('|') ?? '',
  }))

  const headers = [
    'id',
    'type',
    'title',
    'cropId',
    'dueDate',
    'completed',
    'effortMinutes',
    'difficulty',
    'requiredTools',
  ]

  return toCsv(headers, formatted)
}

// ---------------------------------------------------------------------------
// Import — v1 localStorage JSON migration
// ---------------------------------------------------------------------------

const v1ImportSchema = z.object({
  version: z.number().optional(),
  plannerEvents: z.array(z.record(z.unknown())).optional(),
  tasks: z.array(z.record(z.unknown())).optional(),
  customCrops: z.array(z.record(z.unknown())).optional(),
  cropTemplates: z.array(z.record(z.unknown())).optional(),
  harvestLogs: z.array(z.record(z.unknown())).optional(),
  financeRecords: z.array(z.record(z.unknown())).optional(),
  soilNotes: z.array(z.record(z.unknown())).optional(),
  soilProfiles: z.array(z.record(z.unknown())).optional(),
  soilAmendments: z.array(z.record(z.unknown())).optional(),
  weatherLogs: z.array(z.record(z.unknown())).optional(),
})

export async function importFarmData(
  farmId: string,
  data: z.infer<typeof v1ImportSchema>,
) {
  const parsed = v1ImportSchema.parse(data)
  const results: { imported: string[]; skipped: string[]; errors: string[] } = {
    imported: [],
    skipped: [],
    errors: [],
  }

  // Import custom crops
  if (parsed.customCrops?.length) {
    try {
      for (const crop of parsed.customCrops) {
        await db.insert(crops).values({
          farmId,
          name: String(crop.name ?? ''),
          emoji: crop.emoji ? String(crop.emoji) : null,
          color: crop.color ? String(crop.color) : null,
          category: (crop.category as typeof crops.$inferInsert.category) ?? 'other',
          plantingMonths: crop.plantingMonths as number[] | undefined,
          harvestMonths: crop.harvestMonths as number[] | undefined,
          growthDays: crop.growthDays ? Number(crop.growthDays) : null,
          water: crop.water as typeof crops.$inferInsert.water,
          sunlight: crop.sunlight as typeof crops.$inferInsert.sunlight,
          isDefault: false,
        })
      }
      results.imported.push(`customCrops (${parsed.customCrops.length})`)
    } catch (e) {
      results.errors.push(`customCrops: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Import harvest logs
  if (parsed.harvestLogs?.length) {
    try {
      for (const log of parsed.harvestLogs) {
        await db.insert(harvestLogs).values({
          farmId,
          fieldId: String(log.fieldId ?? ''),
          cropId: String(log.cropId ?? ''),
          date: String(log.date ?? ''),
          quantity: Number(log.quantity ?? 0),
          unit: String(log.unit ?? 'kg'),
          qualityGrade: log.qualityGrade as typeof harvestLogs.$inferInsert.qualityGrade,
          notes: log.notes ? String(log.notes) : null,
        })
      }
      results.imported.push(`harvestLogs (${parsed.harvestLogs.length})`)
    } catch (e) {
      results.errors.push(`harvestLogs: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Import finance records
  if (parsed.financeRecords?.length) {
    try {
      for (const rec of parsed.financeRecords) {
        await db.insert(financeRecords).values({
          farmId,
          type: (rec.type as typeof financeRecords.$inferInsert.type) ?? 'expense',
          category: String(rec.category ?? ''),
          amount: Number(rec.amount ?? 0),
          date: String(rec.date ?? ''),
          description: String(rec.description ?? ''),
        })
      }
      results.imported.push(`financeRecords (${parsed.financeRecords.length})`)
    } catch (e) {
      results.errors.push(`financeRecords: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Import soil notes
  if (parsed.soilNotes?.length) {
    try {
      for (const note of parsed.soilNotes) {
        await db.insert(soilNotes).values({
          fieldId: String(note.fieldId ?? ''),
          date: String(note.date ?? ''),
          content: String(note.content ?? ''),
          ph: note.ph ? Number(note.ph) : null,
        })
      }
      results.imported.push(`soilNotes (${parsed.soilNotes.length})`)
    } catch (e) {
      results.errors.push(`soilNotes: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Import weather logs
  if (parsed.weatherLogs?.length) {
    try {
      for (const log of parsed.weatherLogs) {
        await db.insert(weatherLogs).values({
          farmId,
          date: String(log.date ?? ''),
          temperature: log.temperature ? Number(log.temperature) : null,
          rainfallMm: log.rainfallMm ? Number(log.rainfallMm) : null,
          condition: log.condition ? String(log.condition) : null,
          notes: log.notes ? String(log.notes) : null,
        })
      }
      results.imported.push(`weatherLogs (${parsed.weatherLogs.length})`)
    } catch (e) {
      results.errors.push(`weatherLogs: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Import soil amendments
  if (parsed.soilAmendments?.length) {
    try {
      for (const amendment of parsed.soilAmendments) {
        await db.insert(soilAmendments).values({
          fieldId: String(amendment.fieldId ?? ''),
          date: String(amendment.date ?? ''),
          amendmentType: String(amendment.amendmentType ?? ''),
          quantity: Number(amendment.quantity ?? 0),
          unit: String(amendment.unit ?? 'kg'),
          notes: amendment.notes ? String(amendment.notes) : null,
        })
      }
      results.imported.push(`soilAmendments (${parsed.soilAmendments.length})`)
    } catch (e) {
      results.errors.push(`soilAmendments: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return results
}
