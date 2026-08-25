# Business Rules

## Daily Log requires no weigh-in

Progress photos, workout logs, and diets attach to a Daily Log ([[glossary]]) whose `weight` field is nullable. A user can log a workout, upload photos, or generate a diet on a day with no weight recorded.

Why: the original schema required weight NOT NULL, which would have blocked any daily activity without a weigh-in first — doesn't match real usage (people train far more often than they weigh in).

---

## Weight-trend gaps are never interpolated

The weight-trend chart (FITNESS-15) reads `daily_logs` filtered to rows where `weight IS NOT NULL`, ordered by date. Two weigh-ins are connected by a line only when they fall on consecutive calendar days; any missing day(s) between them — no row at all, or a row with `weight` left null — leaves a visible gap instead.

Why: a straight line between two distant weigh-ins would assert a value for the days in between that was never actually recorded — misleading, given how easily a day's weigh-in gets skipped (see "Daily Log requires no weigh-in" above).

---

## Multiple concurrent active Training Programs

A user may have several Training Programs active at the same time (e.g. Strength + Running + Stretching in parallel). `UserActiveProgram` is a plain many-to-many join, not one-to-one.

Why: the grooming note's example explicitly described concurrent programs; the original schema's one-to-one constraint contradicted it.

---

## Workout Log history is immune to source Training Program edits

`workout_logs.title` is copied from the Training Program at the moment a workout starts, not joined live, and `workout_sets.exercise_id` references the Exercise catalog directly — never a `program_exercises` row. Neither table has any foreign key into `program_exercises`. So reordering, removing, or retargeting a program's exercises, or archiving the program itself, never changes what an already-logged Workout Log displays — nor would renaming it, if a rename action existed (it doesn't yet; no endpoint currently mutates a Training Program's title).

A Workout Log can only be started from a Training Program that's currently active (`UserActiveProgram`) for the caller — archived or never-activated programs are rejected — but once started, the log is independent of the program's later state.

Why: the same "history is never retroactively altered" requirement `knowledge/glossary.md`'s Workout Log entry already states; a live join through Program Exercise would let the past silently change.

---

## Workout Set weight/reps vs. duration follows the exercise's category

Same pattern as Program Exercise targets (FITNESS-18): a cardio-category Exercise is logged by `duration_seconds`, every other category by `weight` + `reps` together — never both, never neither. Enforced server-side in `workout-set-values.ts`, not a DB CHECK constraint, mirroring `program-exercise-targets.ts`.

---

## Diet regeneration is always manual

Logging a new weight or changing food/diet preferences never creates a Diet automatically. It only makes a "Regenerate menu" action relevant/visible in the UI — the user must explicitly trigger generation.

Why: avoids the `diets` table filling with rows nobody asked for, and avoids burning calculation work on days the user never opens their diet.

---

## Current diet resolution

The "current" Diet for a Daily Log is the most recently created `diets` row for that Daily Log (`ORDER BY created_at DESC LIMIT 1`). Older Diets for the same Daily Log are kept as history, not marked obsolete or deleted.

Why: no extra state (`is_current` flag) to keep in sync; regenerating is just inserting a new row.

---

## Diet menu generation is a greedy heuristic

For each meal, pick one Food Item per required Food Role, then scale portion size (`weight_grams`) to hit that meal's calorie share; adjust the largest items if the day's total drifts outside tolerance (~±5%) of the target.

Why: this is a recommendation feature, not a medical prescription — "close enough" is the actual requirement. A constraint solver would add real complexity and a new dependency for no meaningful benefit here.

---

## Food Replacement and diet generation are role-based

Two Food Items are interchangeable only if they share the same Food Role (e.g. Chicken Breast and Turkey Breast are both `lean_protein`). Category and Subcategory are for browsing/filtering only, never for substitution logic.

---

## Food Preferences target structured entities, not free text

`user_food_preferences.target_type` + `target_id` point at a Food Category, Food Subcategory, Food Role, or a specific Food Item. A candidate Food Item is excluded from diet generation if any of its own category/subcategory/role/id matches an active preference's target.

Why: covers both broad exclusions ("all dairy") and narrow ones ("just peanut butter, not all nuts") with one mechanism, using real foreign keys instead of fuzzy text matching.

---

## Diet Calculation Algorithm formula is documentation only

`diet_calculation_algorithms.formula` is a human-readable description for display/audit purposes. The real calculation is versioned backend code (e.g. a `mifflinV1()` function) looked up by `code` — never parsed or evaluated at runtime.

Why: avoids an expression-evaluation dependency/risk surface for a feature that doesn't need runtime flexibility; new algorithm versions are code changes, which is the normal and safer path.

---

## Photo analysis failure handling: auto-retry then give up

The Python worker automatically retries a failed analysis job a few times with backoff before marking `progress_photos.analysis_status = 'failed'` permanently. No further automatic retries after that; the UI can offer a manual retry.

---

## Progress photos are private

Photos are stored in a private MinIO bucket. `progress_photos` stores an object key, never a permanent public URL. The backend generates a short-lived presigned GET URL per authenticated request after checking ownership — the same presigning pattern already used for uploads, applied symmetrically to reads.

Why: these are sensitive personal body photos; a permanent public link would leak via referrers, screenshots, or bucket enumeration.

---

## Python worker accesses MinIO directly, not via presigned URLs

The photo-analysis worker is a trusted internal service (like the NestJS backend) with its own MinIO credentials, and reads objects directly by key over the internal Docker network. Presigned URLs exist specifically for the untrusted browser leg of the upload flow, not for service-to-service reads.

---

## Cross-language job queue uses plain Redis primitives, not BullMQ

NestJS and the Python worker communicate over a plain Redis list/stream with a JSON payload (`LPUSH`/`BRPOP` or `XADD`/`XREADGROUP`) — not BullMQ, which is Node-only with no maintained Python client. NestJS may use BullMQ internally for its own scheduling, but the cross-language contract is always a plain Redis primitive.

---

## Migrations are a mandatory pre-deploy gate

CI/CD runs lint + tests → build → `drizzle migrate` against the shared Postgres instance → deploys the new container only if migration succeeds. A failed migration blocks deploy; the previous version keeps serving traffic.

Why: the Postgres instance is shared across the user's other pet projects — migrations must never run unattended after a broken deploy.

---

## Food/exercise data import is a one-time curated seed, not a live sync

A backend script pulls a subset from Open Food Facts/USDA/wger once, maps source categories to this project's category/subcategory/role taxonomy via an explicit mapping table, and inserts with `source` + `is_verified=false`. Re-run manually to add more items later. Per-locale names (uk/ru/es) are sourced from the source API's own translations where it provides them (e.g. wger ships community-maintained en/uk/ru/es names natively — used directly rather than re-translated), machine-translated at the same import step for sources that don't (e.g. Open Food Facts/USDA, English-only), and always marked unverified either way — "unverified" reflects that this project's own reviewers haven't checked it, regardless of translation origin.

Why: avoids maintaining a recurring sync job and unattended auto-categorization against a taxonomy the external sources don't natively provide.

---

## Catalog display names resolve against the user's stored locale, not the route

Catalog browse endpoints (Exercise; Food Item will follow the same rule once it's revisited) resolve each item's display name against the caller's own `users.locale` value — read server-side from the authenticated identity, never a `locale` value the client passes in. A translation row missing for that locale falls back to the item's base English `name`.

Why: next-intl route-based locale segments (FITNESS-11) don't exist yet — the current `[locale]` route segment is a hardcoded `en` placeholder (see `frontend/src/app/[locale]/layout.tsx`), not a real locale switcher. Resolving against a stored user preference instead means catalog localization doesn't need to wait for FITNESS-11 to land, and won't need to change again once it does. Food Item's `list()` (`backend/src/food-items/food-items.service.ts`) still takes a `locale` query param tied to the route segment, predating this rule — a known inconsistency to fix when Food Item's browse UI is next touched, not retrofitted speculatively here.

---

## Error reports never carry more than a user's UUID

Sentry (see [[decisions]] ADR-006) only ever receives a user's UUID as identifying context — never email, IP, or request bodies, even though NestJS trusts an `x-user-email` header it could easily attach. Only unhandled exceptions and 5xx-class errors are reported; a deliberately-thrown 4xx (validation rejection, 404, 401/403) is expected control flow, not a failure, and is never sent.

Why: this app handles real health data (weight, date of birth, goals) — sending more than the minimum needed to correlate "this user hit this bug" to a third-party SaaS should be a deliberate choice, not an SDK default.

---

## PWA offline supports queued writes, not just cached reads

The service worker caches active programs/exercises/recent logs for offline viewing, and lets the user log workout sets while offline. Writes queue in IndexedDB and flush to the NestJS API in order once connectivity returns. No conflict resolution is needed since workout sets are append-only, never concurrently edited.

Why: "gym usage without internet" only holds if the core action (logging a set) works with no signal, not just viewing cached data.
