import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

import { farms } from './auth'
import { crops } from './crops'

// --- Enums ---

export const plotTypeEnum = pgEnum('plot_type', [
  'open_field',
  'raised_bed',
  'container',
  'greenhouse',
])

export const sunHoursEnum = pgEnum('sun_hours', [
  'lt4',
  'h4_6',
  'h6_8',
  'gt8',
])

export const drainageEnum = pgEnum('drainage', ['poor', 'moderate', 'good'])

export const slopeEnum = pgEnum('slope', ['flat', 'gentle', 'steep'])

export const windExposureEnum = pgEnum('wind_exposure', [
  'sheltered',
  'moderate',
  'exposed',
])

export const plantedCropStatusEnum = pgEnum('planted_crop_status', [
  'growing',
  'harvested',
  'removed',
])

export const facilityTypeEnum = pgEnum('facility_type', [
  'water_tank',
  'motor',
  'road',
  'tool_shed',
  'house',
  'custom',
])

export const utilityKindEnum = pgEnum('utility_kind', ['water', 'electric'])

// --- Tables ---

export const fields = pgTable(
  'fields',
  {
    id: uuid().defaultRandom().primaryKey(),
    farmId: uuid('farm_id')
      .notNull()
      .references(() => farms.id),
    name: text().notNull(),
    widthM: real('width_m').notNull(),
    heightM: real('height_m').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('fields_farm_id_idx').on(table.farmId)],
)

export const fieldContexts = pgTable(
  'field_contexts',
  {
    id: uuid().defaultRandom().primaryKey(),
    fieldId: uuid('field_id')
      .notNull()
      .references(() => fields.id)
      .unique(),
    plotType: plotTypeEnum('plot_type'),
    sunHours: sunHoursEnum('sun_hours'),
    drainage: drainageEnum(),
    slope: slopeEnum(),
    windExposure: windExposureEnum('wind_exposure'),
  },
  (table) => [index('field_contexts_field_id_idx').on(table.fieldId)],
)

export const plantedCrops = pgTable(
  'planted_crops',
  {
    id: uuid().defaultRandom().primaryKey(),
    cropId: uuid('crop_id')
      .notNull()
      .references(() => crops.id),
    fieldId: uuid('field_id')
      .notNull()
      .references(() => fields.id),
    plantedDate: date('planted_date').notNull(),
    harvestedDate: date('harvested_date'),
    status: plantedCropStatusEnum().notNull(),
    customGrowthDays: integer('custom_growth_days'),
    notes: text(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('planted_crops_crop_id_idx').on(table.cropId),
    index('planted_crops_field_id_idx').on(table.fieldId),
  ],
)

export const cropPlacements = pgTable(
  'crop_placements',
  {
    id: uuid().defaultRandom().primaryKey(),
    plantedCropId: uuid('planted_crop_id')
      .notNull()
      .references(() => plantedCrops.id)
      .unique(),
    fieldId: uuid('field_id')
      .notNull()
      .references(() => fields.id),
    xM: real('x_m').notNull(),
    yM: real('y_m').notNull(),
    widthM: real('width_m').notNull(),
    heightM: real('height_m').notNull(),
    shapePoints: jsonb('shape_points'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('crop_placements_planted_crop_id_idx').on(table.plantedCropId),
    index('crop_placements_field_id_idx').on(table.fieldId),
  ],
)

export const facilities = pgTable(
  'facilities',
  {
    id: uuid().defaultRandom().primaryKey(),
    fieldId: uuid('field_id')
      .notNull()
      .references(() => fields.id),
    facilityType: facilityTypeEnum('facility_type').notNull(),
    name: text().notNull(),
    xM: real('x_m').notNull(),
    yM: real('y_m').notNull(),
    widthM: real('width_m').notNull(),
    heightM: real('height_m').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('facilities_field_id_idx').on(table.fieldId)],
)

export const utilityNodes = pgTable(
  'utility_nodes',
  {
    id: uuid().defaultRandom().primaryKey(),
    fieldId: uuid('field_id')
      .notNull()
      .references(() => fields.id),
    label: text().notNull(),
    kind: utilityKindEnum().notNull(),
    nodeType: text('node_type'),
    xM: real('x_m').notNull(),
    yM: real('y_m').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('utility_nodes_field_id_idx').on(table.fieldId)],
)

export const utilityEdges = pgTable(
  'utility_edges',
  {
    id: uuid().defaultRandom().primaryKey(),
    fieldId: uuid('field_id')
      .notNull()
      .references(() => fields.id),
    fromNodeId: uuid('from_node_id')
      .notNull()
      .references(() => utilityNodes.id),
    toNodeId: uuid('to_node_id')
      .notNull()
      .references(() => utilityNodes.id),
    kind: utilityKindEnum().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('utility_edges_field_id_idx').on(table.fieldId)],
)
