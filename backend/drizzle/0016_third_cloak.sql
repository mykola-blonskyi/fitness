CREATE TYPE "public"."photo_session_status" AS ENUM('uploading', 'detecting', 'needs_review', 'confirmed');--> statement-breakpoint
ALTER TABLE "progress_photos" ALTER COLUMN "pose" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "photo_sessions" ADD COLUMN "status" "photo_session_status" DEFAULT 'uploading' NOT NULL;