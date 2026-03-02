import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { farms } from './auth'

// --- Enums ---

export const cropCategoryEnum = pgEnum('crop_category', [
  'leafy_vegetables',
  'gourds_melons',
  'root_vegetables',
  'solanaceae',
  'aromatics',
  'fruits',
  'legumes',
  'ornamental',
  'other',
])

export const waterLevelEnum = pgEnum('water_level', [
  'minimal',
  'moderate',
  'abundant',
])

export const sunlightLevelEnum = pgEnum('sunlight_level', [
  'full_sun',
  'partial_shade',
  'shade_tolerant',
])

export const pestLevelEnum = pgEnum('pest_level', ['low', 'medium', 'high'])

export const resistanceLevelEnum = pgEnum('resistance_level', [
  'low',
  'medium',
  'high',
])

// --- Tables ---

export const crops = pgTable(
  'crops',
  {
    id: uuid().defaultRandom().primaryKey(),
    farmId: uuid('farm_id')
      .notNull()
      .references(() => farms.id),
    name: text().notNull(),
    emoji: text(),
    color: text(),
    category: cropCategoryEnum().notNull(),
    plantingMonths: integer('planting_months').array(),
    harvestMonths: integer('harvest_months').array(),
    growthDays: integer('growth_days'),
    spacingRowCm: real('spacing_row_cm'),
    spacingPlantCm: real('spacing_plant_cm'),
    water: waterLevelEnum(),
    sunlight: sunlightLevelEnum(),
    tempMin: real('temp_min'),
    tempMax: real('temp_max'),
    soilPhMin: real('soil_ph_min'),
    soilPhMax: real('soil_ph_max'),
    pestSusceptibility: pestLevelEnum('pest_susceptibility'),
    yieldKgPerSqm: real('yield_kg_per_sqm'),
    fertilizerIntervalDays: integer('fertilizer_interval_days'),
    needsPruning: boolean('needs_pruning'),
    pruningMonths: integer('pruning_months').array(),
    pestControl: text('pest_control').array(),
    typhoonResistance: resistanceLevelEnum('typhoon_resistance'),
    hualienNotes: text('hualien_notes'),
    isDefault: boolean('is_default').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('crops_farm_id_idx').on(table.farmId)],
)

export const cropTemplates = pgTable(
  'crop_templates',
  {
    id: uuid().defaultRandom().primaryKey(),
    farmId: uuid('farm_id')
      .notNull()
      .references(() => farms.id),
    name: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('crop_templates_farm_id_idx').on(table.farmId)],
)

export const cropTemplateItems = pgTable(
  'crop_template_items',
  {
    id: uuid().defaultRandom().primaryKey(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => cropTemplates.id),
    cropId: uuid('crop_id')
      .notNull()
      .references(() => crops.id),
  },
  (table) => [
    index('crop_template_items_template_id_idx').on(table.templateId),
    index('crop_template_items_crop_id_idx').on(table.cropId),
  ],
)
