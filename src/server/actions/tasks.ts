'use server'

import { and, between, eq, type SQL } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/server/db'
import { crops, fields, plantedCrops, tasks } from '@/server/db/schema'

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const taskTypeValues = [
  'seeding',
  'fertilizing',
  'watering',
  'pruning',
  'harvesting',
  'typhoon_prep',
  'pest_control',
] as const

const taskDifficultyValues = ['low', 'medium', 'high'] as const

const createTaskSchema = z.object({
  type: z.enum(taskTypeValues),
  title: z.string().min(1),
  cropId: z.string().uuid().nullable().optional(),
  plantedCropId: z.string().uuid().nullable().optional(),
  fieldId: z.string().uuid().nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completed: z.boolean().optional(),
  effortMinutes: z.number().int().min(5).max(480).nullable().optional(),
  difficulty: z.enum(taskDifficultyValues).nullable().optional(),
  requiredTools: z.array(z.string()).nullable().optional(),
})

const updateTaskSchema = z.object({
  type: z.enum(taskTypeValues).optional(),
  title: z.string().min(1).optional(),
  cropId: z.string().uuid().nullable().optional(),
  plantedCropId: z.string().uuid().nullable().optional(),
  fieldId: z.string().uuid().nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  completed: z.boolean().optional(),
  effortMinutes: z.number().int().min(5).max(480).nullable().optional(),
  difficulty: z.enum(taskDifficultyValues).nullable().optional(),
  requiredTools: z.array(z.string()).nullable().optional(),
})

const getTasksFiltersSchema = z.object({
  fieldId: z.string().uuid().optional(),
  cropId: z.string().uuid().optional(),
  completed: z.boolean().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

// ---------------------------------------------------------------------------
// Task effort/difficulty/tools presets
// ---------------------------------------------------------------------------

type TaskPreset = {
  effortMinutes: number
  difficulty: 'low' | 'medium' | 'high'
  requiredTools: string[]
}

const TASK_PRESETS: Record<string, TaskPreset> = {
  seeding: { effortMinutes: 45, difficulty: 'medium', requiredTools: ['手鏟'] },
  fertilizing: {
    effortMinutes: 30,
    difficulty: 'low',
    requiredTools: ['施肥器'],
  },
  watering: { effortMinutes: 20, difficulty: 'low', requiredTools: ['水管'] },
  pruning: { effortMinutes: 35, difficulty: 'medium', requiredTools: ['剪刀'] },
  harvesting: {
    effortMinutes: 60,
    difficulty: 'medium',
    requiredTools: ['採收籃'],
  },
  typhoon_prep: {
    effortMinutes: 90,
    difficulty: 'high',
    requiredTools: ['綁繩', '支架'],
  },
  pest_control: {
    effortMinutes: 50,
    difficulty: 'medium',
    requiredTools: ['噴霧器'],
  },
}

// ---------------------------------------------------------------------------
// Task CRUD
// ---------------------------------------------------------------------------

export async function getTasks(
  farmId: string,
  filters?: z.infer<typeof getTasksFiltersSchema>,
) {
  const parsed = filters ? getTasksFiltersSchema.parse(filters) : undefined

  const conditions: SQL[] = [eq(tasks.farmId, farmId)]

  if (parsed?.fieldId) {
    conditions.push(eq(tasks.fieldId, parsed.fieldId))
  }
  if (parsed?.cropId) {
    conditions.push(eq(tasks.cropId, parsed.cropId))
  }
  if (parsed?.completed !== undefined) {
    conditions.push(eq(tasks.completed, parsed.completed))
  }
  if (parsed?.dateFrom && parsed?.dateTo) {
    conditions.push(between(tasks.dueDate, parsed.dateFrom, parsed.dateTo))
  } else if (parsed?.dateFrom) {
    conditions.push(between(tasks.dueDate, parsed.dateFrom, '9999-12-31'))
  } else if (parsed?.dateTo) {
    conditions.push(between(tasks.dueDate, '0001-01-01', parsed.dateTo))
  }

  return db
    .select()
    .from(tasks)
    .where(and(...conditions))
}

export async function createTask(
  farmId: string,
  data: z.infer<typeof createTaskSchema>,
) {
  const parsed = createTaskSchema.parse(data)

  const [task] = await db
    .insert(tasks)
    .values({ farmId, ...parsed })
    .returning()

  return task
}

export async function updateTask(
  id: string,
  data: z.infer<typeof updateTaskSchema>,
) {
  const parsed = updateTaskSchema.parse(data)

  const [updated] = await db
    .update(tasks)
    .set(parsed)
    .where(eq(tasks.id, id))
    .returning()

  return updated
}

export async function deleteTask(id: string) {
  await db.delete(tasks).where(eq(tasks.id, id))
}

export async function toggleTaskComplete(id: string) {
  const existing = await db
    .select({ completed: tasks.completed })
    .from(tasks)
    .where(eq(tasks.id, id))
    .then((r) => r[0])

  if (!existing) return null

  const [updated] = await db
    .update(tasks)
    .set({ completed: !existing.completed })
    .where(eq(tasks.id, id))
    .returning()

  return updated
}

// ---------------------------------------------------------------------------
// Auto-generation
// ---------------------------------------------------------------------------

/**
 * Generate tasks for a newly planted crop, following the planting calendar rules:
 * - seeding: due on plant date (always)
 * - fertilizing: every fertilizerIntervalDays until harvest (individual tasks)
 * - pruning: every 30 days in pruning months if needsPruning
 * - harvesting: due on plantDate + growthDays (always)
 * - typhoon_prep: first month in Jun-Oct during growth period
 * - Skip crops with category='other' (infrastructure)
 */
export async function generateTasksForPlantedCrop(
  farmId: string,
  cropData: {
    id: string
    name: string
    emoji: string | null
    category: string
    growthDays: number | null
    fertilizerIntervalDays: number | null
    needsPruning: boolean | null
    pruningMonths: number[] | null
  },
  plantedCropData: {
    id: string
    fieldId: string
    plantedDate: string
    customGrowthDays: number | null
  },
) {
  // Skip infrastructure crops
  if (cropData.category === 'other') return []

  const plantDate = new Date(plantedCropData.plantedDate)
  const growthDays =
    plantedCropData.customGrowthDays ?? cropData.growthDays ?? 90
  const harvestDate = new Date(plantDate)
  harvestDate.setDate(harvestDate.getDate() + growthDays)

  const emoji = cropData.emoji ?? ''
  const name = cropData.name

  const newTasks: Array<{
    farmId: string
    type: (typeof taskTypeValues)[number]
    title: string
    cropId: string
    plantedCropId: string
    fieldId: string
    dueDate: string
    effortMinutes: number | null
    difficulty: 'low' | 'medium' | 'high' | null
    requiredTools: string[] | null
  }> = []

  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const preset = (type: string) => TASK_PRESETS[type]

  // 1. Seeding — always, due on plant date
  const seedingPreset = preset('seeding')
  newTasks.push({
    farmId,
    type: 'seeding',
    title: `${emoji} ${name} - 播種`,
    cropId: cropData.id,
    plantedCropId: plantedCropData.id,
    fieldId: plantedCropData.fieldId,
    dueDate: fmt(plantDate),
    effortMinutes: seedingPreset.effortMinutes,
    difficulty: seedingPreset.difficulty,
    requiredTools: seedingPreset.requiredTools,
  })

  // 2. Fertilizing — every fertilizerIntervalDays until harvest
  if (cropData.fertilizerIntervalDays && cropData.fertilizerIntervalDays > 0) {
    const fertPreset = preset('fertilizing')
    const interval = cropData.fertilizerIntervalDays
    let fertDate = new Date(plantDate)
    fertDate.setDate(fertDate.getDate() + interval)

    while (fertDate <= harvestDate) {
      newTasks.push({
        farmId,
        type: 'fertilizing',
        title: `${emoji} ${name} - 施肥`,
        cropId: cropData.id,
        plantedCropId: plantedCropData.id,
        fieldId: plantedCropData.fieldId,
        dueDate: fmt(fertDate),
        effortMinutes: fertPreset.effortMinutes,
        difficulty: fertPreset.difficulty,
        requiredTools: fertPreset.requiredTools,
      })
      fertDate = new Date(fertDate)
      fertDate.setDate(fertDate.getDate() + interval)
    }
  }

  // 3. Pruning — every 30 days in pruning months if needsPruning
  if (cropData.needsPruning && cropData.pruningMonths?.length) {
    const prunePreset = preset('pruning')
    const pruningMonthSet = new Set(cropData.pruningMonths)
    let pruneDate = new Date(plantDate)
    pruneDate.setDate(pruneDate.getDate() + 30)

    while (pruneDate <= harvestDate) {
      const month = pruneDate.getMonth() + 1 // 1-12
      if (pruningMonthSet.has(month)) {
        newTasks.push({
          farmId,
          type: 'pruning',
          title: `${emoji} ${name} - 剪枝`,
          cropId: cropData.id,
          plantedCropId: plantedCropData.id,
          fieldId: plantedCropData.fieldId,
          dueDate: fmt(pruneDate),
          effortMinutes: prunePreset.effortMinutes,
          difficulty: prunePreset.difficulty,
          requiredTools: prunePreset.requiredTools,
        })
      }
      pruneDate = new Date(pruneDate)
      pruneDate.setDate(pruneDate.getDate() + 30)
    }
  }

  // 4. Harvesting — always, due on plantDate + growthDays
  const harvestPreset = preset('harvesting')
  newTasks.push({
    farmId,
    type: 'harvesting',
    title: `${emoji} ${name} - 收成`,
    cropId: cropData.id,
    plantedCropId: plantedCropData.id,
    fieldId: plantedCropData.fieldId,
    dueDate: fmt(harvestDate),
    effortMinutes: harvestPreset.effortMinutes,
    difficulty: harvestPreset.difficulty,
    requiredTools: harvestPreset.requiredTools,
  })

  // 5. Typhoon prep — first month in Jun-Oct (6-10) during growth period
  const typhoonPreset = preset('typhoon_prep')
  const typhoonMonths = [6, 7, 8, 9, 10]
  let typhoonDate: Date | null = null

  for (const month of typhoonMonths) {
    // Check each year the growth period might span
    for (
      let year = plantDate.getFullYear();
      year <= harvestDate.getFullYear();
      year++
    ) {
      const candidate = new Date(year, month - 1, 1) // 1st of that month
      if (candidate >= plantDate && candidate <= harvestDate) {
        typhoonDate = candidate
        break
      }
    }
    if (typhoonDate) break
  }

  if (typhoonDate) {
    newTasks.push({
      farmId,
      type: 'typhoon_prep',
      title: `${emoji} ${name} - 防颱`,
      cropId: cropData.id,
      plantedCropId: plantedCropData.id,
      fieldId: plantedCropData.fieldId,
      dueDate: fmt(typhoonDate),
      effortMinutes: typhoonPreset.effortMinutes,
      difficulty: typhoonPreset.difficulty,
      requiredTools: typhoonPreset.requiredTools,
    })
  }

  // Batch insert all generated tasks
  if (newTasks.length === 0) return []

  return db.insert(tasks).values(newTasks).returning()
}

/**
 * Remove all tasks associated with a planted crop.
 * Used when a planted crop is removed or reassigned.
 */
export async function removeTasksByPlantedCrop(plantedCropId: string) {
  await db
    .delete(tasks)
    .where(eq(tasks.plantedCropId, plantedCropId))
}
