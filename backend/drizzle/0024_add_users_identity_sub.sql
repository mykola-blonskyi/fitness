ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "identity_sub" text;--> statement-breakpoint
-- Existing rows' id already is the Hub user id this column replaces, so
-- backfilling from it keeps them addressable until each owner's first
-- login through login.blonskyi.dev reconciles the real sub (ADR-018).
UPDATE "users" SET "identity_sub" = "id"::text WHERE "identity_sub" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "identity_sub" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_identity_sub_unique" UNIQUE("identity_sub");
