'use server'

import { db } from '@/server/db'
import { weatherLogs } from '@/server/db/schema'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'

const createWeatherLogSchema = z.object({
  date: z.string().date(),
  temperature: z.number().optional(),
  rainfallMm: z.number().min(0).optional(),
  condition: z.string().optional(),
  notes: z.string().optional(),
})

export async function getWeatherLogs(farmId: string) {
  return db
    .select()
    .from(weatherLogs)
    .where(eq(weatherLogs.farmId, farmId))
    .orderBy(desc(weatherLogs.date))
}

export async function createWeatherLog(
  farmId: string,
  data: z.infer<typeof createWeatherLogSchema>,
) {
  const parsed = createWeatherLogSchema.parse(data)
  const [row] = await db
    .insert(weatherLogs)
    .values({ ...parsed, farmId })
    .returning()
  return row
}

export async function deleteWeatherLog(id: string) {
  await db.delete(weatherLogs).where(eq(weatherLogs.id, id))
}
