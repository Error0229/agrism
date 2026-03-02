'use server'

import { db } from '@/server/db'
import { harvestLogs } from '@/server/db/schema'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'

const createHarvestLogSchema = z.object({
  fieldId: z.string().uuid(),
  cropId: z.string().uuid(),
  plantedCropId: z.string().uuid().optional(),
  date: z.string().date(),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  qualityGrade: z.enum(['a', 'b', 'c', 'reject']).optional(),
  pestIncidentLevel: z.enum(['none', 'minor', 'moderate', 'severe']).optional(),
  weatherImpact: z
    .enum(['none', 'heat', 'rain', 'wind', 'cold', 'mixed'])
    .optional(),
  notes: z.string().optional(),
})

export async function getHarvestLogs(farmId: string) {
  return db
    .select()
    .from(harvestLogs)
    .where(eq(harvestLogs.farmId, farmId))
    .orderBy(desc(harvestLogs.date))
}

export async function createHarvestLog(
  farmId: string,
  data: z.infer<typeof createHarvestLogSchema>,
) {
  const parsed = createHarvestLogSchema.parse(data)
  const [row] = await db
    .insert(harvestLogs)
    .values({ ...parsed, farmId })
    .returning()
  return row
}

export async function deleteHarvestLog(id: string) {
  await db.delete(harvestLogs).where(eq(harvestLogs.id, id))
}
