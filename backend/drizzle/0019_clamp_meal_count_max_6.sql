-- meal_count's upper bound reverted from 20 to 6 (ADR-015 update) - clamp
-- any row a wider bound let through before revalidating on next write.
UPDATE "users" SET "meal_count" = 6 WHERE "meal_count" > 6;
