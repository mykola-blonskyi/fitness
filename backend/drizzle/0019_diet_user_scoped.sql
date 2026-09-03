DELETE FROM "diet_items";--> statement-breakpoint
DELETE FROM "diets";--> statement-breakpoint
ALTER TABLE "diets" DROP CONSTRAINT "diets_daily_log_id_daily_logs_id_fk";--> statement-breakpoint
ALTER TABLE "diets" DROP COLUMN "daily_log_id";--> statement-breakpoint
ALTER TABLE "diets" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "diets" ADD CONSTRAINT "diets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
