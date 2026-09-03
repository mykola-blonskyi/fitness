DELETE FROM "diet_items";--> statement-breakpoint
ALTER TABLE "diet_items" DROP COLUMN "meal_type";--> statement-breakpoint
ALTER TABLE "diet_items" DROP COLUMN "meal_occurrence";--> statement-breakpoint
ALTER TABLE "diet_items" ADD COLUMN "meal_position" integer NOT NULL;--> statement-breakpoint
DROP TYPE "public"."meal_type";
