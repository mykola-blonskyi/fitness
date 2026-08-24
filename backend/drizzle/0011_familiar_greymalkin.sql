CREATE TABLE "user_active_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"training_program_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_active_programs_user_id_training_program_id_unique" UNIQUE("user_id","training_program_id")
);
--> statement-breakpoint
ALTER TABLE "user_active_programs" ADD CONSTRAINT "user_active_programs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_active_programs" ADD CONSTRAINT "user_active_programs_training_program_id_training_programs_id_fk" FOREIGN KEY ("training_program_id") REFERENCES "public"."training_programs"("id") ON DELETE no action ON UPDATE no action;