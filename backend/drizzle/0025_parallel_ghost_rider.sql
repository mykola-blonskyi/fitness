CREATE TABLE "food_families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "food_families_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "food_calories" ADD COLUMN "family_id" uuid;--> statement-breakpoint
ALTER TABLE "food_calories" ADD CONSTRAINT "food_calories_family_id_food_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."food_families"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "food_calories_family_id_index" ON "food_calories" USING btree ("family_id");