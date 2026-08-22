CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TABLE "diet_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"diet_id" uuid NOT NULL,
	"food_item_id" uuid NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"weight_grams" numeric NOT NULL,
	"order_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daily_log_id" uuid NOT NULL,
	"algorithm_id" uuid NOT NULL,
	"total_calories" numeric NOT NULL,
	"total_protein" numeric NOT NULL,
	"total_carbs" numeric NOT NULL,
	"total_fat" numeric NOT NULL,
	"calculation_metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "meal_count" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "diet_items" ADD CONSTRAINT "diet_items_diet_id_diets_id_fk" FOREIGN KEY ("diet_id") REFERENCES "public"."diets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_items" ADD CONSTRAINT "diet_items_food_item_id_food_calories_id_fk" FOREIGN KEY ("food_item_id") REFERENCES "public"."food_calories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diets" ADD CONSTRAINT "diets_daily_log_id_daily_logs_id_fk" FOREIGN KEY ("daily_log_id") REFERENCES "public"."daily_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diets" ADD CONSTRAINT "diets_algorithm_id_diet_calculation_algorithms_id_fk" FOREIGN KEY ("algorithm_id") REFERENCES "public"."diet_calculation_algorithms"("id") ON DELETE no action ON UPDATE no action;