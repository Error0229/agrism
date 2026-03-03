ALTER TABLE "planted_crops" ALTER COLUMN "crop_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "farm_members" ADD COLUMN "created_at" timestamp with time zone DEFAULT now();