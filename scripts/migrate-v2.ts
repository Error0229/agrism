/**
 * v2 Migration Script
 * Creates all new domain tables. Skips existing auth tables (app_users, farms, farm_members).
 * Run: bun scripts/migrate-v2.ts
 */
import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  // Try loading from .env.local
  const fs = await import('fs')
  const envContent = fs.readFileSync('.env.local', 'utf-8')
  const match = envContent.match(/^DATABASE_URL=(.+)$/m)
  if (!match) {
    console.error('DATABASE_URL not found')
    process.exit(1)
  }
  process.env.DATABASE_URL = match[1]
}

const sql = neon(process.env.DATABASE_URL!)

console.log('Starting v2 migration...')

// Helper: execute raw SQL string via tagged template
async function exec(statement: string) {
  await sql.query(statement, [])
}

// Create enums
const enums = [
  `DO $$ BEGIN CREATE TYPE "crop_category" AS ENUM('leafy_vegetables', 'gourds_melons', 'root_vegetables', 'solanaceae', 'aromatics', 'fruits', 'legumes', 'ornamental', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "water_level" AS ENUM('minimal', 'moderate', 'abundant'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "sunlight_level" AS ENUM('full_sun', 'partial_shade', 'shade_tolerant'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "pest_level" AS ENUM('low', 'medium', 'high'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "resistance_level" AS ENUM('low', 'medium', 'high'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "plot_type" AS ENUM('open_field', 'raised_bed', 'container', 'greenhouse'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "sun_hours" AS ENUM('lt4', 'h4_6', 'h6_8', 'gt8'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "drainage" AS ENUM('poor', 'moderate', 'good'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "slope" AS ENUM('flat', 'gentle', 'steep'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "wind_exposure" AS ENUM('sheltered', 'moderate', 'exposed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "planted_crop_status" AS ENUM('growing', 'harvested', 'removed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "facility_type" AS ENUM('water_tank', 'motor', 'road', 'tool_shed', 'house', 'custom'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "utility_kind" AS ENUM('water', 'electric'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "task_type" AS ENUM('seeding', 'fertilizing', 'watering', 'pruning', 'harvesting', 'typhoon_prep', 'pest_control'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "task_difficulty" AS ENUM('low', 'medium', 'high'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "quality_grade" AS ENUM('a', 'b', 'c', 'reject'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "pest_incident" AS ENUM('none', 'minor', 'moderate', 'severe'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "weather_impact" AS ENUM('none', 'heat', 'rain', 'wind', 'cold', 'mixed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "finance_type" AS ENUM('income', 'expense'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE "soil_texture" AS ENUM('sand', 'loam', 'clay', 'silty', 'mixed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
]

for (const stmt of enums) {
  const typeName = stmt.match(/CREATE TYPE "(\w+)"/)?.[1]
  try {
    await exec(stmt)
    console.log(`  ✓ enum: ${typeName}`)
  } catch (e: unknown) {
    console.error(`  ✗ enum ${typeName}: ${e instanceof Error ? e.message : e}`)
    throw e
  }
}

// Create tables (order matters for FK references)
const tables = [
  // Crops
  `CREATE TABLE IF NOT EXISTS "crops" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "farm_id" uuid NOT NULL REFERENCES "farms"("id"),
    "name" text NOT NULL,
    "emoji" text,
    "color" text,
    "category" "crop_category" NOT NULL,
    "planting_months" integer[],
    "harvest_months" integer[],
    "growth_days" integer,
    "spacing_row_cm" real,
    "spacing_plant_cm" real,
    "water" "water_level",
    "sunlight" "sunlight_level",
    "temp_min" real,
    "temp_max" real,
    "soil_ph_min" real,
    "soil_ph_max" real,
    "pest_susceptibility" "pest_level",
    "yield_kg_per_sqm" real,
    "fertilizer_interval_days" integer,
    "needs_pruning" boolean,
    "pruning_months" integer[],
    "pest_control" text[],
    "typhoon_resistance" "resistance_level",
    "hualien_notes" text,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "crop_templates" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "farm_id" uuid NOT NULL REFERENCES "farms"("id"),
    "name" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "crop_template_items" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "template_id" uuid NOT NULL REFERENCES "crop_templates"("id"),
    "crop_id" uuid NOT NULL REFERENCES "crops"("id")
  )`,

  // Fields
  `CREATE TABLE IF NOT EXISTS "fields" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "farm_id" uuid NOT NULL REFERENCES "farms"("id"),
    "name" text NOT NULL,
    "width_m" real NOT NULL,
    "height_m" real NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "field_contexts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "field_id" uuid NOT NULL UNIQUE REFERENCES "fields"("id"),
    "plot_type" "plot_type",
    "sun_hours" "sun_hours",
    "drainage" "drainage",
    "slope" "slope",
    "wind_exposure" "wind_exposure"
  )`,
  `CREATE TABLE IF NOT EXISTS "planted_crops" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "crop_id" uuid NOT NULL REFERENCES "crops"("id"),
    "field_id" uuid NOT NULL REFERENCES "fields"("id"),
    "planted_date" date NOT NULL,
    "harvested_date" date,
    "status" "planted_crop_status" NOT NULL,
    "custom_growth_days" integer,
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "crop_placements" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "planted_crop_id" uuid NOT NULL UNIQUE REFERENCES "planted_crops"("id"),
    "field_id" uuid NOT NULL REFERENCES "fields"("id"),
    "x_m" real NOT NULL,
    "y_m" real NOT NULL,
    "width_m" real NOT NULL,
    "height_m" real NOT NULL,
    "shape_points" jsonb,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "facilities" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "field_id" uuid NOT NULL REFERENCES "fields"("id"),
    "facility_type" "facility_type" NOT NULL,
    "name" text NOT NULL,
    "x_m" real NOT NULL,
    "y_m" real NOT NULL,
    "width_m" real NOT NULL,
    "height_m" real NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "utility_nodes" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "field_id" uuid NOT NULL REFERENCES "fields"("id"),
    "label" text NOT NULL,
    "kind" "utility_kind" NOT NULL,
    "node_type" text,
    "x_m" real NOT NULL,
    "y_m" real NOT NULL,
    "created_at" timestamp with time zone DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "utility_edges" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "field_id" uuid NOT NULL REFERENCES "fields"("id"),
    "from_node_id" uuid NOT NULL REFERENCES "utility_nodes"("id"),
    "to_node_id" uuid NOT NULL REFERENCES "utility_nodes"("id"),
    "kind" "utility_kind" NOT NULL,
    "created_at" timestamp with time zone DEFAULT now()
  )`,

  // Tasks
  `CREATE TABLE IF NOT EXISTS "tasks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "farm_id" uuid NOT NULL REFERENCES "farms"("id"),
    "type" "task_type" NOT NULL,
    "title" text NOT NULL,
    "crop_id" uuid REFERENCES "crops"("id"),
    "planted_crop_id" uuid REFERENCES "planted_crops"("id"),
    "field_id" uuid REFERENCES "fields"("id"),
    "due_date" date NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "effort_minutes" integer,
    "difficulty" "task_difficulty",
    "required_tools" text[],
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
  )`,

  // Records
  `CREATE TABLE IF NOT EXISTS "harvest_logs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "farm_id" uuid NOT NULL REFERENCES "farms"("id"),
    "planted_crop_id" uuid REFERENCES "planted_crops"("id"),
    "field_id" uuid NOT NULL REFERENCES "fields"("id"),
    "crop_id" uuid NOT NULL REFERENCES "crops"("id"),
    "date" date NOT NULL,
    "quantity" real NOT NULL,
    "unit" text NOT NULL,
    "quality_grade" "quality_grade",
    "pest_incident_level" "pest_incident",
    "weather_impact" "weather_impact",
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "finance_records" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "farm_id" uuid NOT NULL REFERENCES "farms"("id"),
    "type" "finance_type" NOT NULL,
    "category" text NOT NULL,
    "amount" real NOT NULL,
    "date" date NOT NULL,
    "description" text NOT NULL,
    "related_field_id" uuid REFERENCES "fields"("id"),
    "related_crop_id" uuid REFERENCES "crops"("id"),
    "created_at" timestamp with time zone DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "soil_profiles" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "field_id" uuid NOT NULL UNIQUE REFERENCES "fields"("id"),
    "texture" "soil_texture",
    "ph" real CHECK ("ph" >= 0 AND "ph" <= 14),
    "ec" real CHECK ("ec" >= 0 AND "ec" <= 20),
    "organic_matter_pct" real CHECK ("organic_matter_pct" >= 0 AND "organic_matter_pct" <= 100),
    "updated_at" timestamp with time zone DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "soil_amendments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "field_id" uuid NOT NULL REFERENCES "fields"("id"),
    "date" date NOT NULL,
    "amendment_type" text NOT NULL,
    "quantity" real NOT NULL,
    "unit" text DEFAULT 'kg' NOT NULL,
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "soil_notes" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "field_id" uuid NOT NULL REFERENCES "fields"("id"),
    "date" date NOT NULL,
    "ph" real,
    "content" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "weather_logs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "farm_id" uuid NOT NULL REFERENCES "farms"("id"),
    "date" date NOT NULL,
    "temperature" real,
    "rainfall_mm" real,
    "condition" text,
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now()
  )`,
]

console.log('\nCreating tables...')
for (const stmt of tables) {
  const tableName = stmt.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/)?.[1]
  try {
    await exec(stmt)
    console.log(`  ✓ ${tableName}`)
  } catch (e: unknown) {
    console.error(`  ✗ ${tableName}: ${e instanceof Error ? e.message : e}`)
    throw e
  }
}

// Create indexes
const indexes = [
  `CREATE INDEX IF NOT EXISTS "crops_farm_id_idx" ON "crops" ("farm_id")`,
  `CREATE INDEX IF NOT EXISTS "crop_templates_farm_id_idx" ON "crop_templates" ("farm_id")`,
  `CREATE INDEX IF NOT EXISTS "crop_template_items_template_id_idx" ON "crop_template_items" ("template_id")`,
  `CREATE INDEX IF NOT EXISTS "crop_template_items_crop_id_idx" ON "crop_template_items" ("crop_id")`,
  `CREATE INDEX IF NOT EXISTS "fields_farm_id_idx" ON "fields" ("farm_id")`,
  `CREATE INDEX IF NOT EXISTS "field_contexts_field_id_idx" ON "field_contexts" ("field_id")`,
  `CREATE INDEX IF NOT EXISTS "planted_crops_crop_id_idx" ON "planted_crops" ("crop_id")`,
  `CREATE INDEX IF NOT EXISTS "planted_crops_field_id_idx" ON "planted_crops" ("field_id")`,
  `CREATE INDEX IF NOT EXISTS "crop_placements_planted_crop_id_idx" ON "crop_placements" ("planted_crop_id")`,
  `CREATE INDEX IF NOT EXISTS "crop_placements_field_id_idx" ON "crop_placements" ("field_id")`,
  `CREATE INDEX IF NOT EXISTS "facilities_field_id_idx" ON "facilities" ("field_id")`,
  `CREATE INDEX IF NOT EXISTS "utility_nodes_field_id_idx" ON "utility_nodes" ("field_id")`,
  `CREATE INDEX IF NOT EXISTS "utility_edges_field_id_idx" ON "utility_edges" ("field_id")`,
  `CREATE INDEX IF NOT EXISTS "tasks_farm_id_idx" ON "tasks" ("farm_id")`,
  `CREATE INDEX IF NOT EXISTS "tasks_crop_id_idx" ON "tasks" ("crop_id")`,
  `CREATE INDEX IF NOT EXISTS "tasks_field_id_idx" ON "tasks" ("field_id")`,
  `CREATE INDEX IF NOT EXISTS "harvest_logs_farm_id_idx" ON "harvest_logs" ("farm_id")`,
  `CREATE INDEX IF NOT EXISTS "harvest_logs_field_id_idx" ON "harvest_logs" ("field_id")`,
  `CREATE INDEX IF NOT EXISTS "harvest_logs_crop_id_idx" ON "harvest_logs" ("crop_id")`,
  `CREATE INDEX IF NOT EXISTS "finance_records_farm_id_idx" ON "finance_records" ("farm_id")`,
  `CREATE INDEX IF NOT EXISTS "finance_records_field_id_idx" ON "finance_records" ("related_field_id")`,
  `CREATE INDEX IF NOT EXISTS "finance_records_crop_id_idx" ON "finance_records" ("related_crop_id")`,
  `CREATE INDEX IF NOT EXISTS "soil_amendments_field_id_idx" ON "soil_amendments" ("field_id")`,
  `CREATE INDEX IF NOT EXISTS "soil_notes_field_id_idx" ON "soil_notes" ("field_id")`,
  `CREATE INDEX IF NOT EXISTS "soil_profiles_field_id_idx" ON "soil_profiles" ("field_id")`,
  `CREATE INDEX IF NOT EXISTS "weather_logs_farm_id_idx" ON "weather_logs" ("farm_id")`,
]

console.log('\nCreating indexes...')
for (const stmt of indexes) {
  const idxName = stmt.match(/IF NOT EXISTS "(\w+)"/)?.[1]
  try {
    await exec(stmt)
    console.log(`  ✓ ${idxName}`)
  } catch (e: unknown) {
    console.error(`  ⊘ ${idxName}: ${e instanceof Error ? e.message : e}`)
  }
}

console.log('\n✅ Migration complete!')
