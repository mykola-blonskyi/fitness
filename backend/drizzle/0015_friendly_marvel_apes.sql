CREATE TYPE "public"."weight_unit" AS ENUM('kg', 'lb');--> statement-breakpoint
ALTER TABLE "daily_logs" ADD COLUMN "weight_unit" "weight_unit";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "default_weight_unit" "weight_unit" DEFAULT 'kg' NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD COLUMN "weight_unit" "weight_unit";