CREATE INDEX "diet_items_diet_id_index" ON "diet_items" USING btree ("diet_id");--> statement-breakpoint
CREATE INDEX "diet_items_food_item_id_index" ON "diet_items" USING btree ("food_item_id");--> statement-breakpoint
CREATE INDEX "diets_user_id_created_at_index" ON "diets" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "exercises_category_index" ON "exercises" USING btree ("category");--> statement-breakpoint
CREATE INDEX "food_calories_role_id_index" ON "food_calories" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "food_calories_category_id_index" ON "food_calories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "food_calories_subcategory_id_index" ON "food_calories" USING btree ("subcategory_id");--> statement-breakpoint
CREATE INDEX "program_exercises_training_program_id_index" ON "program_exercises" USING btree ("training_program_id");--> statement-breakpoint
CREATE INDEX "progress_photos_daily_log_id_index" ON "progress_photos" USING btree ("daily_log_id");--> statement-breakpoint
CREATE INDEX "training_programs_user_id_index" ON "training_programs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workout_logs_daily_log_id_index" ON "workout_logs" USING btree ("daily_log_id");--> statement-breakpoint
CREATE INDEX "workout_sets_workout_log_id_index" ON "workout_sets" USING btree ("workout_log_id");--> statement-breakpoint
CREATE INDEX "workout_sets_exercise_id_index" ON "workout_sets" USING btree ("exercise_id");