import { eq, and, asc } from 'drizzle-orm'
import { db } from '@/server/db'
import { farmMembers } from '@/server/db/schema'

export async function getDefaultFarmIdForUser(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ farmId: farmMembers.farmId })
    .from(farmMembers)
    .where(eq(farmMembers.userId, userId))
    .orderBy(asc(farmMembers.createdAt))
    .limit(1)

  return row?.farmId ?? null
}

export async function ensureUserFarmMembership(userId: string, farmId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: farmMembers.id })
    .from(farmMembers)
    .where(and(eq(farmMembers.userId, userId), eq(farmMembers.farmId, farmId)))
    .limit(1)

  return !!row
}
