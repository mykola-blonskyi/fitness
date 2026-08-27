CREATE TYPE "public"."photo_analysis_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."photo_pose" AS ENUM('front', 'side', 'back');--> statement-breakpoint
CREATE TABLE "photo_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"is_baseline" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"photo_session_id" uuid NOT NULL,
	"daily_log_id" uuid NOT NULL,
	"pose" "photo_pose" NOT NULL,
	"object_key" text NOT NULL,
	"analysis_status" "photo_analysis_status" DEFAULT 'pending' NOT NULL,
	"pose_landmarks" jsonb,
	"alignment_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progress_photos_object_key_unique" UNIQUE("object_key"),
	CONSTRAINT "progress_photos_photo_session_id_pose_unique" UNIQUE("photo_session_id","pose")
);
--> statement-breakpoint
ALTER TABLE "photo_sessions" ADD CONSTRAINT "photo_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_photo_session_id_photo_sessions_id_fk" FOREIGN KEY ("photo_session_id") REFERENCES "public"."photo_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_daily_log_id_daily_logs_id_fk" FOREIGN KEY ("daily_log_id") REFERENCES "public"."daily_logs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "photo_sessions_one_baseline_per_user" ON "photo_sessions" USING btree ("user_id") WHERE "photo_sessions"."is_baseline" = true;