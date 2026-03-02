'use server'

import { db } from '@/server/db'
import { crops, cropTemplates, cropTemplateItems } from '@/server/db/schema'
import { eq, desc, and, inArray } from 'drizzle-orm'
import { z } from 'zod'

// --- Crops ---

const cropCategoryValues = [
  'leafy_vegetables',
  'gourds_melons',
  'root_vegetables',
  'solanaceae',
  'aromatics',
  'fruits',
  'legumes',
  'ornamental',
  'other',
] as const

const waterLevelValues = ['minimal', 'moderate', 'abundant'] as const
const sunlightLevelValues = [
  'full_sun',
  'partial_shade',
  'shade_tolerant',
] as const
const pestLevelValues = ['low', 'medium', 'high'] as const
const resistanceLevelValues = ['low', 'medium', 'high'] as const

const createCustomCropSchema = z.object({
  name: z.string().min(1),
  emoji: z.string().optional(),
  color: z.string().optional(),
  category: z.enum(cropCategoryValues),
  plantingMonths: z.array(z.number().int().min(1).max(12)).optional(),
  harvestMonths: z.array(z.number().int().min(1).max(12)).optional(),
  growthDays: z.number().int().positive().optional(),
  spacingRowCm: z.number().positive().optional(),
  spacingPlantCm: z.number().positive().optional(),
  water: z.enum(waterLevelValues).optional(),
  sunlight: z.enum(sunlightLevelValues).optional(),
  tempMin: z.number().optional(),
  tempMax: z.number().optional(),
  soilPhMin: z.number().min(0).max(14).optional(),
  soilPhMax: z.number().min(0).max(14).optional(),
  pestSusceptibility: z.enum(pestLevelValues).optional(),
  yieldKgPerSqm: z.number().positive().optional(),
  fertilizerIntervalDays: z.number().int().positive().optional(),
  needsPruning: z.boolean().optional(),
  pruningMonths: z.array(z.number().int().min(1).max(12)).optional(),
  pestControl: z.array(z.string()).optional(),
  typhoonResistance: z.enum(resistanceLevelValues).optional(),
  hualienNotes: z.string().optional(),
})

const updateCustomCropSchema = createCustomCropSchema.partial()

export async function getCrops(farmId: string) {
  return db
    .select()
    .from(crops)
    .where(eq(crops.farmId, farmId))
    .orderBy(crops.name)
}

export async function getCropById(id: string) {
  const [row] = await db.select().from(crops).where(eq(crops.id, id)).limit(1)
  return row ?? null
}

export async function createCustomCrop(
  farmId: string,
  data: z.infer<typeof createCustomCropSchema>,
) {
  const parsed = createCustomCropSchema.parse(data)
  const [row] = await db
    .insert(crops)
    .values({ ...parsed, farmId, isDefault: false })
    .returning()
  return row
}

export async function updateCustomCrop(
  id: string,
  data: z.infer<typeof updateCustomCropSchema>,
) {
  const parsed = updateCustomCropSchema.parse(data)
  const [row] = await db
    .update(crops)
    .set(parsed)
    .where(and(eq(crops.id, id), eq(crops.isDefault, false)))
    .returning()
  return row ?? null
}

export async function deleteCustomCrop(id: string) {
  await db
    .delete(crops)
    .where(and(eq(crops.id, id), eq(crops.isDefault, false)))
}

// --- Crop Templates ---

const createCropTemplateSchema = z.object({
  name: z.string().min(1),
  cropIds: z.array(z.string().uuid()).min(1),
})

export async function getCropTemplates(farmId: string) {
  return db
    .select()
    .from(cropTemplates)
    .where(eq(cropTemplates.farmId, farmId))
    .orderBy(desc(cropTemplates.createdAt))
}

export async function createCropTemplate(
  farmId: string,
  data: z.infer<typeof createCropTemplateSchema>,
) {
  const parsed = createCropTemplateSchema.parse(data)

  const [template] = await db
    .insert(cropTemplates)
    .values({ farmId, name: parsed.name })
    .returning()

  if (parsed.cropIds.length > 0) {
    await db.insert(cropTemplateItems).values(
      parsed.cropIds.map((cropId) => ({
        templateId: template.id,
        cropId,
      })),
    )
  }

  return template
}

export async function applyCropTemplate(templateId: string) {
  const items = await db
    .select({ cropId: cropTemplateItems.cropId })
    .from(cropTemplateItems)
    .where(eq(cropTemplateItems.templateId, templateId))

  if (items.length === 0) return []

  const cropIds = items.map((item) => item.cropId)
  return db.select().from(crops).where(inArray(crops.id, cropIds))
}

export async function deleteCropTemplate(id: string) {
  await db
    .delete(cropTemplateItems)
    .where(eq(cropTemplateItems.templateId, id))
  await db.delete(cropTemplates).where(eq(cropTemplates.id, id))
}
