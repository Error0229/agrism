import { sql } from 'drizzle-orm'
import {
  check,
  date,
  index,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { farms } from './auth'
import { crops } from './crops'
import { fields, plantedCrops } from './fields'

// --- Enums ---

export const qualityGradeEnum = pgEnum('quality_grade', [
  'a',
  'b',
  'c',
  'reject',
])

export const pestIncidentEnum = pgEnum('pest_incident', [
  'none',
  'minor',
  'moderate',
  'severe',
])

export const weatherImpactEnum = pgEnum('weather_impact', [
  'none',
  'heat',
  'rain',
  'wind',
  'cold',
  'mixed',
])

export const financeTypeEnum = pgEnum('finance_type', ['income', 'expense'])

export const soilTextureEnum = pgEnum('soil_texture', [
  'sand',
  'loam',
  'clay',
  'silty',
  'mixed',
])

// --- Tables ---

export const harvestLogs = pgTable(
  'harvest_logs',
  {
    id: uuid().defaultRandom().primaryKey(),
    farmId: uuid('farm_id')
      .notNull()
      .references(() => farms.id),
    plantedCropId: uuid('planted_crop_id').references(() => plantedCrops.id),
    fieldId: uuid('field_id')
      .notNull()
      .references(() => fields.id),
    cropId: uuid('crop_id')
      .notNull()
      .references(() => crops.id),
    date: date().notNull(),
    quantity: real().notNull(),
    unit: text().notNull(),
    qualityGrade: qualityGradeEnum('quality_grade'),
    pestIncidentLevel: pestIncidentEnum('pest_incident_level'),
    weatherImpact: weatherImpactEnum('weather_impact'),
    notes: text(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('harvest_logs_farm_id_idx').on(table.farmId),
    index('harvest_logs_field_id_idx').on(table.fieldId),
    index('harvest_logs_crop_id_idx').on(table.cropId),
  ],
)

export const financeRecords = pgTable(
  'finance_records',
  {
    id: uuid().defaultRandom().primaryKey(),
    farmId: uuid('farm_id')
      .notNull()
      .references(() => farms.id),
    type: financeTypeEnum().notNull(),
    category: text().notNull(),
    amount: real().notNull(),
    date: date().notNull(),
    description: text().notNull(),
    relatedFieldId: uuid('related_field_id').references(() => fields.id),
    relatedCropId: uuid('related_crop_id').references(() => crops.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('finance_records_farm_id_idx').on(table.farmId),
    index('finance_records_field_id_idx').on(table.relatedFieldId),
    index('finance_records_crop_id_idx').on(table.relatedCropId),
  ],
)

export const soilProfiles = pgTable(
  'soil_profiles',
  {
    id: uuid().defaultRandom().primaryKey(),
    fieldId: uuid('field_id')
      .notNull()
      .references(() => fields.id)
      .unique(),
    texture: soilTextureEnum(),
    ph: real(),
    ec: real(),
    organicMatterPct: real('organic_matter_pct'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('soil_profiles_field_id_idx').on(table.fieldId),
    check('soil_profiles_ph_check', sql`${table.ph} >= 0 AND ${table.ph} <= 14`),
    check('soil_profiles_ec_check', sql`${table.ec} >= 0 AND ${table.ec} <= 20`),
    check(
      'soil_profiles_organic_matter_pct_check',
      sql`${table.organicMatterPct} >= 0 AND ${table.organicMatterPct} <= 100`,
    ),
  ],
)

export const soilAmendments = pgTable(
  'soil_amendments',
  {
    id: uuid().defaultRandom().primaryKey(),
    fieldId: uuid('field_id')
      .notNull()
      .references(() => fields.id),
    date: date().notNull(),
    amendmentType: text('amendment_type').notNull(),
    quantity: real().notNull(),
    unit: text().default('kg').notNull(),
    notes: text(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('soil_amendments_field_id_idx').on(table.fieldId)],
)

export const soilNotes = pgTable(
  'soil_notes',
  {
    id: uuid().defaultRandom().primaryKey(),
    fieldId: uuid('field_id')
      .notNull()
      .references(() => fields.id),
    date: date().notNull(),
    ph: real(),
    content: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('soil_notes_field_id_idx').on(table.fieldId)],
)

export const weatherLogs = pgTable(
  'weather_logs',
  {
    id: uuid().defaultRandom().primaryKey(),
    farmId: uuid('farm_id')
      .notNull()
      .references(() => farms.id),
    date: date().notNull(),
    temperature: real(),
    rainfallMm: real('rainfall_mm'),
    condition: text(),
    notes: text(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('weather_logs_farm_id_idx').on(table.farmId)],
)
