CREATE TYPE "public"."diet_type" AS ENUM('vegetarian', 'vegan', 'keto', 'paleo');--> statement-breakpoint
CREATE TYPE "public"."food_preference_target_type" AS ENUM('category', 'subcategory', 'role', 'food_item');--> statement-breakpoint
CREATE TYPE "public"."food_preference_type" AS ENUM('allergy', 'exclude');--> statement-breakpoint
CREATE TABLE "diet_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"diet_type" "diet_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "diet_preferences_user_id_diet_type_unique" UNIQUE("user_id","diet_type")
);
--> statement-breakpoint
CREATE TABLE "food_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "food_preference_type" NOT NULL,
	"target_type" "food_preference_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "food_preferences_user_id_type_target_type_target_id_unique" UNIQUE("user_id","type","target_type","target_id")
);
--> statement-breakpoint
ALTER TABLE "diet_preferences" ADD CONSTRAINT "diet_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_preferences" ADD CONSTRAINT "food_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;