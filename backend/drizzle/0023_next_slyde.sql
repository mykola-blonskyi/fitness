CREATE TABLE "diet_meal_order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"diet_id" uuid NOT NULL,
	"meal_position" integer NOT NULL,
	"display_order" integer NOT NULL,
	CONSTRAINT "diet_meal_order_diet_id_meal_position_unique" UNIQUE("diet_id","meal_position")
);
--> statement-breakpoint
ALTER TABLE "diet_meal_order" ADD CONSTRAINT "diet_meal_order_diet_id_diets_id_fk" FOREIGN KEY ("diet_id") REFERENCES "public"."diets"("id") ON DELETE no action ON UPDATE no action;