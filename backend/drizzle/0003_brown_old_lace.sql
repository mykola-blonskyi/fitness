CREATE TYPE "public"."exercise_category" AS ENUM('chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core', 'cardio', 'full_body');--> statement-breakpoint
CREATE TABLE "exercise_translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	CONSTRAINT "exercise_translations_exercise_id_locale_unique" UNIQUE("exercise_id","locale")
);
--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"image_url" text,
	"category" "exercise_category" NOT NULL,
	"source" text,
	"source_id" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercises_source_source_id_unique" UNIQUE("source","source_id")
);
--> statement-breakpoint
ALTER TABLE "exercise_translations" ADD CONSTRAINT "exercise_translations_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;