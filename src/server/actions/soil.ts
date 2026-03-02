'use server'

import { db } from '@/server/db'
import { soilProfiles, soilAmendments, soilNotes } from '@/server/db/schema'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'

// --- Soil Profiles ---

const upsertSoilProfileSchema = z.object({
  texture: z.enum(['sand', 'loam', 'clay', 'silty', 'mixed']).optional(),
  ph: z.number().min(0).max(14).optional(),
  ec: z.number().min(0).max(20).optional(),
  organicMatterPct: z.number().min(0).max(100).optional(),
})

export async function getSoilProfile(fieldId: string) {
  const [row] = await db
    .select()
    .from(soilProfiles)
    .where(eq(soilProfiles.fieldId, fieldId))
    .limit(1)
  return row ?? null
}

export async function upsertSoilProfile(
  fieldId: string,
  data: z.infer<typeof upsertSoilProfileSchema>,
) {
  const parsed = upsertSoilProfileSchema.parse(data)
  const [row] = await db
    .insert(soilProfiles)
    .values({ ...parsed, fieldId })
    .onConflictDoUpdate({
      target: soilProfiles.fieldId,
      set: parsed,
    })
    .returning()
  return row
}

// --- Soil Amendments ---

const createSoilAmendmentSchema = z.object({
  date: z.string().date(),
  amendmentType: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1).default('kg'),
  notes: z.string().optional(),
})

export async function getSoilAmendments(fieldId: string) {
  return db
    .select()
    .from(soilAmendments)
    .where(eq(soilAmendments.fieldId, fieldId))
    .orderBy(desc(soilAmendments.date))
}

export async function createSoilAmendment(
  fieldId: string,
  data: z.infer<typeof createSoilAmendmentSchema>,
) {
  const parsed = createSoilAmendmentSchema.parse(data)
  const [row] = await db
    .insert(soilAmendments)
    .values({ ...parsed, fieldId })
    .returning()
  return row
}

export async function deleteSoilAmendment(id: string) {
  await db.delete(soilAmendments).where(eq(soilAmendments.id, id))
}

// --- Soil Notes ---

const createSoilNoteSchema = z.object({
  date: z.string().date(),
  ph: z.number().min(0).max(14).optional(),
  content: z.string().min(1),
})

export async function getSoilNotes(fieldId: string) {
  return db
    .select()
    .from(soilNotes)
    .where(eq(soilNotes.fieldId, fieldId))
    .orderBy(desc(soilNotes.date))
}

export async function createSoilNote(
  fieldId: string,
  data: z.infer<typeof createSoilNoteSchema>,
) {
  const parsed = createSoilNoteSchema.parse(data)
  const [row] = await db
    .insert(soilNotes)
    .values({ ...parsed, fieldId })
    .returning()
  return row
}

export async function deleteSoilNote(id: string) {
  await db.delete(soilNotes).where(eq(soilNotes.id, id))
}
