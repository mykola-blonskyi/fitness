CREATE TABLE "food_calorie_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"food_calorie_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	CONSTRAINT "food_calorie_translations_food_calorie_id_locale_unique" UNIQUE("food_calorie_id","locale")
);
--> statement-breakpoint
CREATE TABLE "food_calories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"image_url" text,
	"category_id" uuid NOT NULL,
	"subcategory_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"calories_per_100g" numeric NOT NULL,
	"protein_per_100g" numeric NOT NULL,
	"carbs_per_100g" numeric NOT NULL,
	"fat_per_100g" numeric NOT NULL,
	"source" text,
	"source_id" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "food_calories_source_source_id_unique" UNIQUE("source","source_id")
);
--> statement-breakpoint
CREATE TABLE "food_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "food_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "food_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "food_roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "food_subcategories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "food_subcategories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "food_calorie_translations" ADD CONSTRAINT "food_calorie_translations_food_calorie_id_food_calories_id_fk" FOREIGN KEY ("food_calorie_id") REFERENCES "public"."food_calories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_calories" ADD CONSTRAINT "food_calories_category_id_food_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."food_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_calories" ADD CONSTRAINT "food_calories_subcategory_id_food_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."food_subcategories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_calories" ADD CONSTRAINT "food_calories_role_id_food_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."food_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_subcategories" ADD CONSTRAINT "food_subcategories_category_id_food_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."food_categories"("id") ON DELETE no action ON UPDATE no action;