ALTER TABLE "exercises" ADD COLUMN "author_id" uuid;--> statement-breakpoint
ALTER TABLE "food_calories" ADD COLUMN "author_id" uuid;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_calories" ADD CONSTRAINT "food_calories_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;