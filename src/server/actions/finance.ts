'use server'

import { db } from '@/server/db'
import { financeRecords } from '@/server/db/schema'
import { eq, desc, and, sum, sql } from 'drizzle-orm'
import { z } from 'zod'

const createFinanceRecordSchema = z.object({
  type: z.enum(['income', 'expense']),
  category: z.string().min(1),
  amount: z.number().positive(),
  date: z.string().date(),
  description: z.string().min(1),
  relatedFieldId: z.string().uuid().optional(),
  relatedCropId: z.string().uuid().optional(),
})

export async function getFinanceRecords(farmId: string) {
  return db
    .select()
    .from(financeRecords)
    .where(eq(financeRecords.farmId, farmId))
    .orderBy(desc(financeRecords.date))
}

export async function createFinanceRecord(
  farmId: string,
  data: z.infer<typeof createFinanceRecordSchema>,
) {
  const parsed = createFinanceRecordSchema.parse(data)
  const [row] = await db
    .insert(financeRecords)
    .values({ ...parsed, farmId })
    .returning()
  return row
}

export async function deleteFinanceRecord(id: string) {
  await db.delete(financeRecords).where(eq(financeRecords.id, id))
}

export async function getFinanceSummary(farmId: string) {
  const [incomeResult] = await db
    .select({ total: sum(financeRecords.amount) })
    .from(financeRecords)
    .where(
      and(
        eq(financeRecords.farmId, farmId),
        eq(financeRecords.type, 'income'),
      ),
    )

  const [expenseResult] = await db
    .select({ total: sum(financeRecords.amount) })
    .from(financeRecords)
    .where(
      and(
        eq(financeRecords.farmId, farmId),
        eq(financeRecords.type, 'expense'),
      ),
    )

  const byCategory = await db
    .select({
      type: financeRecords.type,
      category: financeRecords.category,
      total: sum(financeRecords.amount),
    })
    .from(financeRecords)
    .where(eq(financeRecords.farmId, farmId))
    .groupBy(financeRecords.type, financeRecords.category)
    .orderBy(sql`${sum(financeRecords.amount)} desc`)

  const totalIncome = Number(incomeResult?.total ?? 0)
  const totalExpense = Number(expenseResult?.total ?? 0)

  return {
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    byCategory,
  }
}
