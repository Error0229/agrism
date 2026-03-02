import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { farms } from './auth'
import { crops } from './crops'
import { fields, plantedCrops } from './fields'

// --- Enums ---

export const taskTypeEnum = pgEnum('task_type', [
  'seeding',
  'fertilizing',
  'watering',
  'pruning',
  'harvesting',
  'typhoon_prep',
  'pest_control',
])

export const taskDifficultyEnum = pgEnum('task_difficulty', [
  'low',
  'medium',
  'high',
])

// --- Tables ---

export const tasks = pgTable(
  'tasks',
  {
    id: uuid().defaultRandom().primaryKey(),
    farmId: uuid('farm_id')
      .notNull()
      .references(() => farms.id),
    type: taskTypeEnum().notNull(),
    title: text().notNull(),
    cropId: uuid('crop_id').references(() => crops.id),
    plantedCropId: uuid('planted_crop_id').references(() => plantedCrops.id),
    fieldId: uuid('field_id').references(() => fields.id),
    dueDate: date('due_date').notNull(),
    completed: boolean().default(false).notNull(),
    effortMinutes: integer('effort_minutes'),
    difficulty: taskDifficultyEnum(),
    requiredTools: text('required_tools').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('tasks_farm_id_idx').on(table.farmId),
    index('tasks_crop_id_idx').on(table.cropId),
    index('tasks_field_id_idx').on(table.fieldId),
  ],
)
