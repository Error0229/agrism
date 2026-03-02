CREATE TYPE "public"."crop_category" AS ENUM('leafy_vegetables', 'gourds_melons', 'root_vegetables', 'solanaceae', 'aromatics', 'fruits', 'legumes', 'ornamental', 'other');--> statement-breakpoint
CREATE TYPE "public"."pest_level" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."resistance_level" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."sunlight_level" AS ENUM('full_sun', 'partial_shade', 'shade_tolerant');--> statement-breakpoint
CREATE TYPE "public"."water_level" AS ENUM('minimal', 'moderate', 'abundant');--> statement-breakpoint
CREATE TYPE "public"."drainage" AS ENUM('poor', 'moderate', 'good');--> statement-breakpoint
CREATE TYPE "public"."facility_type" AS ENUM('water_tank', 'motor', 'road', 'tool_shed', 'house', 'custom');--> statement-breakpoint
CREATE TYPE "public"."planted_crop_status" AS ENUM('growing', 'harvested', 'removed');--> statement-breakpoint
CREATE TYPE "public"."plot_type" AS ENUM('open_field', 'raised_bed', 'container', 'greenhouse');--> statement-breakpoint
CREATE TYPE "public"."slope" AS ENUM('flat', 'gentle', 'steep');--> statement-breakpoint
CREATE TYPE "public"."sun_hours" AS ENUM('lt4', 'h4_6', 'h6_8', 'gt8');--> statement-breakpoint
CREATE TYPE "public"."utility_kind" AS ENUM('water', 'electric');--> statement-breakpoint
CREATE TYPE "public"."wind_exposure" AS ENUM('sheltered', 'moderate', 'exposed');--> statement-breakpoint
CREATE TYPE "public"."task_difficulty" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('seeding', 'fertilizing', 'watering', 'pruning', 'harvesting', 'typhoon_prep', 'pest_control');--> statement-breakpoint
CREATE TYPE "public"."finance_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."pest_incident" AS ENUM('none', 'minor', 'moderate', 'severe');--> statement-breakpoint
CREATE TYPE "public"."quality_grade" AS ENUM('a', 'b', 'c', 'reject');--> statement-breakpoint
CREATE TYPE "public"."soil_texture" AS ENUM('sand', 'loam', 'clay', 'silty', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."weather_impact" AS ENUM('none', 'heat', 'rain', 'wind', 'cold', 'mixed');--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "app_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "farm_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "farm_members_farm_id_user_id_unique" UNIQUE("farm_id","user_id"),
	CONSTRAINT "farm_members_role_check" CHECK ("farm_members"."role" IN ('owner', 'member'))
);
--> statement-breakpoint
CREATE TABLE "farms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crop_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"crop_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crop_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
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
);
--> statement-breakpoint
CREATE TABLE "crop_placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"planted_crop_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"x_m" real NOT NULL,
	"y_m" real NOT NULL,
	"width_m" real NOT NULL,
	"height_m" real NOT NULL,
	"shape_points" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "crop_placements_planted_crop_id_unique" UNIQUE("planted_crop_id")
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid NOT NULL,
	"facility_type" "facility_type" NOT NULL,
	"name" text NOT NULL,
	"x_m" real NOT NULL,
	"y_m" real NOT NULL,
	"width_m" real NOT NULL,
	"height_m" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "field_contexts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid NOT NULL,
	"plot_type" "plot_type",
	"sun_hours" "sun_hours",
	"drainage" "drainage",
	"slope" "slope",
	"wind_exposure" "wind_exposure",
	CONSTRAINT "field_contexts_field_id_unique" UNIQUE("field_id")
);
--> statement-breakpoint
CREATE TABLE "fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"name" text NOT NULL,
	"width_m" real NOT NULL,
	"height_m" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "planted_crops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crop_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"planted_date" date NOT NULL,
	"harvested_date" date,
	"status" "planted_crop_status" NOT NULL,
	"custom_growth_days" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "utility_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid NOT NULL,
	"from_node_id" uuid NOT NULL,
	"to_node_id" uuid NOT NULL,
	"kind" "utility_kind" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "utility_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid NOT NULL,
	"label" text NOT NULL,
	"kind" "utility_kind" NOT NULL,
	"node_type" text,
	"x_m" real NOT NULL,
	"y_m" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"type" "task_type" NOT NULL,
	"title" text NOT NULL,
	"crop_id" uuid,
	"planted_crop_id" uuid,
	"field_id" uuid,
	"due_date" date NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"effort_minutes" integer,
	"difficulty" "task_difficulty",
	"required_tools" text[],
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "finance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"type" "finance_type" NOT NULL,
	"category" text NOT NULL,
	"amount" real NOT NULL,
	"date" date NOT NULL,
	"description" text NOT NULL,
	"related_field_id" uuid,
	"related_crop_id" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "harvest_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"planted_crop_id" uuid,
	"field_id" uuid NOT NULL,
	"crop_id" uuid NOT NULL,
	"date" date NOT NULL,
	"quantity" real NOT NULL,
	"unit" text NOT NULL,
	"quality_grade" "quality_grade",
	"pest_incident_level" "pest_incident",
	"weather_impact" "weather_impact",
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "soil_amendments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid NOT NULL,
	"date" date NOT NULL,
	"amendment_type" text NOT NULL,
	"quantity" real NOT NULL,
	"unit" text DEFAULT 'kg' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "soil_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid NOT NULL,
	"date" date NOT NULL,
	"ph" real,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "soil_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_id" uuid NOT NULL,
	"texture" "soil_texture",
	"ph" real,
	"ec" real,
	"organic_matter_pct" real,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "soil_profiles_field_id_unique" UNIQUE("field_id"),
	CONSTRAINT "soil_profiles_ph_check" CHECK ("soil_profiles"."ph" >= 0 AND "soil_profiles"."ph" <= 14),
	CONSTRAINT "soil_profiles_ec_check" CHECK ("soil_profiles"."ec" >= 0 AND "soil_profiles"."ec" <= 20),
	CONSTRAINT "soil_profiles_organic_matter_pct_check" CHECK ("soil_profiles"."organic_matter_pct" >= 0 AND "soil_profiles"."organic_matter_pct" <= 100)
);
--> statement-breakpoint
CREATE TABLE "weather_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"date" date NOT NULL,
	"temperature" real,
	"rainfall_mm" real,
	"condition" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "farm_members" ADD CONSTRAINT "farm_members_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_members" ADD CONSTRAINT "farm_members_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_created_by_app_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crop_template_items" ADD CONSTRAINT "crop_template_items_template_id_crop_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."crop_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crop_template_items" ADD CONSTRAINT "crop_template_items_crop_id_crops_id_fk" FOREIGN KEY ("crop_id") REFERENCES "public"."crops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crop_templates" ADD CONSTRAINT "crop_templates_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crops" ADD CONSTRAINT "crops_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crop_placements" ADD CONSTRAINT "crop_placements_planted_crop_id_planted_crops_id_fk" FOREIGN KEY ("planted_crop_id") REFERENCES "public"."planted_crops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crop_placements" ADD CONSTRAINT "crop_placements_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_contexts" ADD CONSTRAINT "field_contexts_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fields" ADD CONSTRAINT "fields_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planted_crops" ADD CONSTRAINT "planted_crops_crop_id_crops_id_fk" FOREIGN KEY ("crop_id") REFERENCES "public"."crops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planted_crops" ADD CONSTRAINT "planted_crops_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_edges" ADD CONSTRAINT "utility_edges_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_edges" ADD CONSTRAINT "utility_edges_from_node_id_utility_nodes_id_fk" FOREIGN KEY ("from_node_id") REFERENCES "public"."utility_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_edges" ADD CONSTRAINT "utility_edges_to_node_id_utility_nodes_id_fk" FOREIGN KEY ("to_node_id") REFERENCES "public"."utility_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_nodes" ADD CONSTRAINT "utility_nodes_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_crop_id_crops_id_fk" FOREIGN KEY ("crop_id") REFERENCES "public"."crops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_planted_crop_id_planted_crops_id_fk" FOREIGN KEY ("planted_crop_id") REFERENCES "public"."planted_crops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_records" ADD CONSTRAINT "finance_records_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_records" ADD CONSTRAINT "finance_records_related_field_id_fields_id_fk" FOREIGN KEY ("related_field_id") REFERENCES "public"."fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance_records" ADD CONSTRAINT "finance_records_related_crop_id_crops_id_fk" FOREIGN KEY ("related_crop_id") REFERENCES "public"."crops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvest_logs" ADD CONSTRAINT "harvest_logs_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvest_logs" ADD CONSTRAINT "harvest_logs_planted_crop_id_planted_crops_id_fk" FOREIGN KEY ("planted_crop_id") REFERENCES "public"."planted_crops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvest_logs" ADD CONSTRAINT "harvest_logs_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "harvest_logs" ADD CONSTRAINT "harvest_logs_crop_id_crops_id_fk" FOREIGN KEY ("crop_id") REFERENCES "public"."crops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soil_amendments" ADD CONSTRAINT "soil_amendments_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soil_notes" ADD CONSTRAINT "soil_notes_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "soil_profiles" ADD CONSTRAINT "soil_profiles_field_id_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weather_logs" ADD CONSTRAINT "weather_logs_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crop_template_items_template_id_idx" ON "crop_template_items" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "crop_template_items_crop_id_idx" ON "crop_template_items" USING btree ("crop_id");--> statement-breakpoint
CREATE INDEX "crop_templates_farm_id_idx" ON "crop_templates" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "crops_farm_id_idx" ON "crops" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "crop_placements_planted_crop_id_idx" ON "crop_placements" USING btree ("planted_crop_id");--> statement-breakpoint
CREATE INDEX "crop_placements_field_id_idx" ON "crop_placements" USING btree ("field_id");--> statement-breakpoint
CREATE INDEX "facilities_field_id_idx" ON "facilities" USING btree ("field_id");--> statement-breakpoint
CREATE INDEX "field_contexts_field_id_idx" ON "field_contexts" USING btree ("field_id");--> statement-breakpoint
CREATE INDEX "fields_farm_id_idx" ON "fields" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "planted_crops_crop_id_idx" ON "planted_crops" USING btree ("crop_id");--> statement-breakpoint
CREATE INDEX "planted_crops_field_id_idx" ON "planted_crops" USING btree ("field_id");--> statement-breakpoint
CREATE INDEX "utility_edges_field_id_idx" ON "utility_edges" USING btree ("field_id");--> statement-breakpoint
CREATE INDEX "utility_nodes_field_id_idx" ON "utility_nodes" USING btree ("field_id");--> statement-breakpoint
CREATE INDEX "tasks_farm_id_idx" ON "tasks" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "tasks_crop_id_idx" ON "tasks" USING btree ("crop_id");--> statement-breakpoint
CREATE INDEX "tasks_field_id_idx" ON "tasks" USING btree ("field_id");--> statement-breakpoint
CREATE INDEX "finance_records_farm_id_idx" ON "finance_records" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "finance_records_field_id_idx" ON "finance_records" USING btree ("related_field_id");--> statement-breakpoint
CREATE INDEX "finance_records_crop_id_idx" ON "finance_records" USING btree ("related_crop_id");--> statement-breakpoint
CREATE INDEX "harvest_logs_farm_id_idx" ON "harvest_logs" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "harvest_logs_field_id_idx" ON "harvest_logs" USING btree ("field_id");--> statement-breakpoint
CREATE INDEX "harvest_logs_crop_id_idx" ON "harvest_logs" USING btree ("crop_id");--> statement-breakpoint
CREATE INDEX "soil_amendments_field_id_idx" ON "soil_amendments" USING btree ("field_id");--> statement-breakpoint
CREATE INDEX "soil_notes_field_id_idx" ON "soil_notes" USING btree ("field_id");--> statement-breakpoint
CREATE INDEX "soil_profiles_field_id_idx" ON "soil_profiles" USING btree ("field_id");--> statement-breakpoint
CREATE INDEX "weather_logs_farm_id_idx" ON "weather_logs" USING btree ("farm_id");