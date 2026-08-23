CREATE TABLE "program_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_program_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"target_sets" integer,
	"target_reps" integer,
	"target_duration_seconds" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "program_exercises" ADD CONSTRAINT "program_exercises_training_program_id_training_programs_id_fk" FOREIGN KEY ("training_program_id") REFERENCES "public"."training_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_exercises" ADD CONSTRAINT "program_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_programs" ADD CONSTRAINT "training_programs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;