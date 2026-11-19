ALTER TABLE "daily_logs" DROP CONSTRAINT "daily_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "diet_items" DROP CONSTRAINT "diet_items_diet_id_diets_id_fk";
--> statement-breakpoint
ALTER TABLE "diet_meal_order" DROP CONSTRAINT "diet_meal_order_diet_id_diets_id_fk";
--> statement-breakpoint
ALTER TABLE "diet_preferences" DROP CONSTRAINT "diet_preferences_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "diets" DROP CONSTRAINT "diets_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "food_preferences" DROP CONSTRAINT "food_preferences_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "photo_sessions" DROP CONSTRAINT "photo_sessions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "program_exercises" DROP CONSTRAINT "program_exercises_training_program_id_training_programs_id_fk";
--> statement-breakpoint
ALTER TABLE "progress_photos" DROP CONSTRAINT "progress_photos_photo_session_id_photo_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "progress_photos" DROP CONSTRAINT "progress_photos_daily_log_id_daily_logs_id_fk";
--> statement-breakpoint
ALTER TABLE "training_programs" DROP CONSTRAINT "training_programs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_active_programs" DROP CONSTRAINT "user_active_programs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_active_programs" DROP CONSTRAINT "user_active_programs_training_program_id_training_programs_id_fk";
--> statement-breakpoint
ALTER TABLE "workout_logs" DROP CONSTRAINT "workout_logs_daily_log_id_daily_logs_id_fk";
--> statement-breakpoint
ALTER TABLE "workout_logs" DROP CONSTRAINT "workout_logs_training_program_id_training_programs_id_fk";
--> statement-breakpoint
ALTER TABLE "workout_sets" DROP CONSTRAINT "workout_sets_workout_log_id_workout_logs_id_fk";
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "health_data_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_items" ADD CONSTRAINT "diet_items_diet_id_diets_id_fk" FOREIGN KEY ("diet_id") REFERENCES "public"."diets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_meal_order" ADD CONSTRAINT "diet_meal_order_diet_id_diets_id_fk" FOREIGN KEY ("diet_id") REFERENCES "public"."diets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diet_preferences" ADD CONSTRAINT "diet_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diets" ADD CONSTRAINT "diets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_preferences" ADD CONSTRAINT "food_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_sessions" ADD CONSTRAINT "photo_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_exercises" ADD CONSTRAINT "program_exercises_training_program_id_training_programs_id_fk" FOREIGN KEY ("training_program_id") REFERENCES "public"."training_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_photo_session_id_photo_sessions_id_fk" FOREIGN KEY ("photo_session_id") REFERENCES "public"."photo_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_daily_log_id_daily_logs_id_fk" FOREIGN KEY ("daily_log_id") REFERENCES "public"."daily_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_programs" ADD CONSTRAINT "training_programs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_active_programs" ADD CONSTRAINT "user_active_programs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_active_programs" ADD CONSTRAINT "user_active_programs_training_program_id_training_programs_id_fk" FOREIGN KEY ("training_program_id") REFERENCES "public"."training_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_daily_log_id_daily_logs_id_fk" FOREIGN KEY ("daily_log_id") REFERENCES "public"."daily_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_training_program_id_training_programs_id_fk" FOREIGN KEY ("training_program_id") REFERENCES "public"."training_programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_workout_log_id_workout_logs_id_fk" FOREIGN KEY ("workout_log_id") REFERENCES "public"."workout_logs"("id") ON DELETE cascade ON UPDATE no action;