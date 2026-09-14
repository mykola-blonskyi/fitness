# Senior backend audit — `backend/` + `worker/`

Scope: NestJS API, Drizzle schema, Redis queue, MinIO storage, Python photo-analysis worker.
Read-only. Every finding below was checked against the code, not inferred from a pattern.

Headline: **per-row authorization is genuinely sound** — there is no route anywhere that accepts
another user's id, and every id-bearing route re-derives ownership from `identity.userId`. The real
damage is concentrated in the photo-analysis pipeline, where three separate paths strand a session
or a photo in a non-terminal state with no way out, and in one identity-reconciliation path that can
hand an entire health record to a different OIDC subject.

---

## B1. The worker's queue thread dies on any Redis hiccup and `/health` keeps saying "ok"

- **Kind:** BUG
- **Severity:** high
- **Where:** `worker/app/queue_consumer.py:64-77`, `worker/app/main.py:13-15`, `docker-compose.yml` (worker `healthcheck`)
- **What:** `consume_forever` runs `client.brpop(...)` in a bare `while True` with no exception handling, on a daemon thread started at FastAPI startup. `/health` is a static `{"status": "ok"}` that never looks at the thread.
- **Failure:** Coolify redeploys or restarts `photo-queue-redis` (or the network blips). `redis-py` raises `ConnectionError` out of `brpop`; nothing catches it; `consume_forever` returns; the daemon thread exits. The uvicorn process is still alive, `/health` still returns 200, the compose healthcheck stays green, and `restart: unless-stopped` never fires. From that moment every photo session the user creates sits at `status = 'detecting'` forever and nothing — no log, no Sentry, no healthcheck — says so. The worker has no Sentry at all (`docs/architecture.md:140` leaves that undecided), so the only symptom is a UI that spins.
- **Fix:** wrap the loop body in `try/except Exception: logger.exception(...); time.sleep(backoff)` so a transient Redis error retries instead of killing the thread, and have `/health` return 503 unless the consumer thread `is_alive()`. No migration.

---

## B2. A `detect` job that exhausts its retries is dropped, and the session is unrecoverable

- **Kind:** BUG
- **Severity:** high
- **Where:** `worker/app/queue_consumer.py:24` (`JOB_FAILURE_HANDLERS` has only `analyze-alignment`), `backend/src/db/schema.ts:466-470` (`photoSessionStatusEnum` has no failed value), `backend/src/photo-sessions/retry-analysis.ts:16`
- **What:** `_process_with_retry` retries a failed job `JOB_MAX_ATTEMPTS` (3) times with a 2s×attempt backoff, then looks up a failure handler. There is no handler registered for `detect`, so after ~6 seconds of failure the job is logged and silently discarded. Nothing on the backend can re-enqueue it: `retryAnalysis` pushes an `analyze-alignment` job, and `assertRetryableAnalysis` requires `sessionStatus === 'confirmed'`, which a `detecting` session is not.
- **Failure:** MinIO returns 5xx for six seconds while a `detect` job is in flight (`storage.read_object` at `worker/app/detect_job.py:20`). Three attempts fail, the job is dropped, and the `photo_sessions` row stays `detecting` with all three `progress_photos.pose` null. The gallery shows the session permanently "analysing"; there is no retry button for this stage and no terminal state to render. The user's only escape is `DELETE /photo-sessions/:id`, which destroys the photos, and re-uploading.
- **Fix:** register a `detect` failure handler. The cheapest terminal state that needs **no migration** is `needs_review` with poses left null — `business-rules.md:133-135` already says an unresolvable detect is resolved by manual pose assignment, and `confirmReview` accepts exactly that. Adding a `failed` value to `photo_session_status` would need a migration.

---

## B3. Queue pushes happen after commit, so a Redis failure leaves committed rows with no job

- **Kind:** BUG
- **Severity:** high
- **Where:** `backend/src/photo-sessions/photo-sessions.service.ts:140-146` (`confirm`), `:200-206` (`confirmReview`), `:323-327` (`retryAnalysis`)
- **What:** each of the three transactions commits first, then pushes to Redis outside the transaction. `confirmReview` pushes one job **per photo in a loop**, so the pushes are not even atomic with each other. The `ioredis` client (`photo-analysis-queue.module.ts:10`) is constructed with defaults, so `enableOfflineQueue` is on: with Redis down, `lpush` neither resolves nor rejects — it queues and the HTTP request hangs until the client reconnects.
- **Failure:** two concrete cases.
  (a) `POST /photo-sessions/2026-09-14` commits the session (`detecting`) and three `progress_photos`, then `pushDetectJob` throws → the caller gets a 500 and the session is stuck exactly as in B2, except nothing ever failed in the worker.
  (b) `PATCH /photo-sessions/:id/review` commits `status = 'confirmed'` and three photos at `analysisStatus = 'pending'`, pushes the job for photo 1, then throws on photo 2. Photos 2 and 3 stay `pending` forever; `assertRetryableAnalysis` (`retry-analysis.ts:16`) only accepts `failed`, so the manual retry button answers 400 for exactly the photos that need it.
- **Fix:** widen `assertRetryableAnalysis` to accept `pending` and `processing` as well as `failed` on a `confirmed` session — one line, and it also closes B4. Separately, set `enableOfflineQueue: false` plus a `commandTimeout` on the ioredis client so a dead Redis fails fast instead of hanging the request. No migration.

---

## B4. A worker restart mid-analysis strands the photo in `processing`

- **Kind:** BUG
- **Severity:** medium
- **Where:** `worker/app/analyze_alignment_job.py:11`, `worker/app/queue_consumer.py:68-71`, `backend/src/photo-sessions/retry-analysis.ts:16`
- **What:** `process_analyze_alignment_job` writes `analysis_status = 'processing'` before doing any work. The job was taken off the list with `BRPOP`, which removes it atomically — there is no in-flight/processing list, so a crash loses the job outright.
- **Failure:** Coolify redeploys the worker (or MediaPipe OOMs) while a job is between `set_analysis_status(photo_id, "processing")` and `write_alignment_result`. The container comes back with an empty queue and the photo pinned at `processing`. The UI shows a permanent spinner and the retry button answers 400, because `assertRetryableAnalysis` only accepts `failed`.
- **Fix:** same one-line widening of `assertRetryableAnalysis` as B3. For genuine at-least-once delivery, `BRPOPLPUSH` onto a processing list with a reaper — worth it only if photo analysis becomes load-bearing. No migration.

---

## B5. Email-fallback identity reconciliation silently rebinds a profile to a different OIDC subject

- **Kind:** SECURITY
- **Severity:** high
- **Where:** `backend/src/users/users.service.ts:41-54`, called on **every request** from `backend/src/identity/identity.guard.ts:40-43`
- **What:** when no `users` row matches the token's `sub`, `findByIdentity` falls back to a case-insensitive match on `users.email` and, on a hit, **writes the new `sub` into `identity_sub` and returns that user**. There is no `email_verified` check (the backend only ever sees `x-user-email`, `parse-identity.ts:7-16`), no bound on which rows are eligible, and no expiry. The comment says this exists to carry pre-conversion Hub rows across ADR-018 — that migration is done (`CLAUDE.md`, "Phase 6 … is live").
- **Failure:** `login.blonskyi.dev` issues a token for any principal whose `email` claim equals an existing row's email but whose `sub` differs — a re-registered account, an admin re-creating a user at the IdP, an IdP-side email change, or any provider that lets an unverified address be claimed. The very next request through `IdentityGuard` rebinds `identity_sub` to the new subject and hands that caller the existing user's entire record: weights, dates of birth, progress photos, food logs. The rebind is a write, so the original subject is now permanently locked out of their own data with no audit trail.
- **Fix:** delete the fallback now that the conversion is complete — the branch is dead for every legitimate login. If it must stay, gate it on `identity_sub` still matching the old Hub id format so it can only ever fire for a genuinely un-migrated row. No migration.

---

## B6. Admin exercise delete ignores `workout_sets`, so the FK turns a 409 into a 500

- **Kind:** BUG
- **Severity:** medium
- **Where:** `backend/src/admin/exercises/admin-exercises.service.ts:113-128`
- **What:** `remove()` counts references in `program_exercises` only and feeds that to `checkDeleteGuard`. `workout_sets.exercise_id` is a not-null FK to `exercises.id` (`backend/src/db/schema.ts:246-249`) and is never counted.
- **Failure:** an admin deletes a catalog exercise that a user has logged sets against but that sits in no training program (e.g. an ad-hoc workout). `usageCount` is 0, the guard allows it, and `tx.delete(exercises)` violates `workout_sets_exercise_id_fkey` → Postgres 23503 → no handler → 500 and a Sentry event, where the intended answer is the guard's own 409. (The transaction rolls back, so no data is lost — but the operator sees an unexplained server error instead of "used by 4 workout sets".)
- **Fix:** add a second `count()` against `workoutSets` and pass the sum into `checkDeleteGuard`. No migration. (`admin-food-items.service.ts:147-155` has the same shape but its only FK is `diet_items`, which it does count — that one is correct.)

---

## B7. A baseline photo session can be set but never moved

- **Kind:** BUG
- **Severity:** medium
- **Where:** `backend/src/photo-sessions/photo-sessions.service.ts:236-262`; partial unique index `photo_sessions_one_baseline_per_user` in `backend/src/db/schema.ts:487-489`
- **What:** `setBaseline` only ever sets `is_baseline = true` and translates the resulting unique violation into a 409. There is no route or service method anywhere in the repo that clears it — confirmed by grep across `backend/src` and `frontend/src`; `frontend/src/features/photo-sessions/actions.ts:104` calls the setter and nothing calls an unsetter.
- **Failure:** a user marks their first session as baseline in January. In September they want the baseline to be a more recent session: `PATCH /photo-sessions/:newId/baseline` answers 409 "Another session is already marked as baseline", permanently. The only workaround is `DELETE /photo-sessions/:oldId`, which destroys the original photos — the exact ones a baseline exists to preserve.
- **Fix:** in `setBaseline`, clear the user's existing baseline and set the new one in a single transaction; the partial index still guards against concurrent setters. No migration.

---

## B8. Reroll, explicit swap and generation disagree about which foods are eligible

- **Kind:** BUG
- **Severity:** medium
- **Where:** `backend/src/diets/diets.service.ts:392-404` (reroll), `:352-374` (explicit swap), `:151-184` (generation)
- **What:** three candidate predicates, none of them the same.
  - generation filters on `familyName != null` (`:174`) and does **not** filter `isVerified`
  - reroll filters on `isVerified = true` (`:395`) and does **not** require a Family
  - explicit swap checks neither — only role match, calories > 0, and preference exclusions
- **Failure:** two symmetrical bugs.
  (a) Generation picks an unverified but Family-classified staple (the seed scripts insert `is_verified = false` for everything except `db:seed:food-staples`, per `business-rules.md:169-175`). The user taps "reroll" on it: `POST /diets/:dietId/items/:itemId/swap` with no body → `pickRerollReplacement` finds no *verified* same-role candidate → 422 "No other food item in this role matches your preferences", while the pool is in fact full.
  (b) `POST /diets/:dietId/items/:itemId/swap` with an explicit `foodItemId` for a Family-less row (flour, offal, babyfood — exactly what ADR-020 removed from the pool) is accepted, putting into a generated menu an item ADR-020 states "is never generated".
- **Fix:** extract one predicate and use it in all three places — drop `eq(isVerified, true)` from reroll, add `isNotNull(familyId)` to both swap paths. No migration. (Note: swap staying Role-scoped rather than Family-scoped is *correct* for now — ADR-020 parks "swap retargeted to Family" in phase 2.)

---

## B9. No UUID validation on any path parameter — a malformed id is a 500

- **Kind:** BUG
- **Severity:** medium
- **Where:** every `@Param(...)` in the codebase. Examples: `backend/src/training-programs/training-programs.controller.ts:41`, `backend/src/diets/diets.controller.ts:34-35`, `backend/src/photo-sessions/photo-sessions.controller.ts:51`, `backend/src/workout-logs/workout-logs.controller.ts:28`. `grep -rn "ParseUUIDPipe" backend/src` returns nothing; `@IsUUID()` appears only inside request-body DTOs.
- **What:** the global `ValidationPipe` (`backend/src/main.ts:9`) validates DTO-typed `@Body`/`@Query` but path params are plain `string` and reach Drizzle unchecked.
- **Failure:** `GET /training-programs/abc` → `eq(schema.trainingPrograms.id, 'abc')` → Postgres `22P02 invalid input syntax for type uuid` → no handler → **500** plus a Sentry event, where 400 is correct. Trivially reachable from a stale bookmark, a truncated link, or a typo, and it pollutes the shared-quota Sentry org with noise that looks like a server fault.
- **Fix:** `@Param('id', ParseUUIDPipe)` on every uuid-shaped param. Date params are already handled correctly by `assertValidDate` (`shared/date.ts:5`). No migration.

---

## B10. Presigned upload URLs carry no size or content-type bound

- **Kind:** SECURITY
- **Severity:** medium
- **Where:** `backend/src/storage/storage.service.ts:35-41`, `backend/src/photo-sessions/photo-sessions.service.ts:46-50`
- **What:** `presignedPutObject` signs the bucket + key + expiry only. Nothing constrains what the client PUTs. `requestUploadUrl` is unauthenticated beyond `IdentityGuard` and unthrottled, and unconfirmed objects are never reaped — `remove()` (`:359-365`) only deletes objects whose rows exist.
- **Failure:** a caller loops `POST /photo-sessions/upload-url` and PUTs a 5 GB file to each returned URL. Every byte lands in the private bucket, counts against the shared VPS disk, and is never garbage-collected because no `progress_photos` row was ever created. A non-image file that *is* confirmed then gets fed straight to OpenCV/MediaPipe by `detect_job.py:20`.
- **Fix:** switch to `presignedPostPolicy` with `setContentLengthRange(0, ~15MB)` and a `Content-Type` starts-with `image/` condition; the frontend upload leg changes from PUT to a multipart POST. No migration.

---

## B11. Any authenticated user writes pre-verified rows into the shared global catalog

- **Kind:** RISK
- **Severity:** medium
- **Where:** `backend/src/exercises/exercises.controller.ts:23-26` → `exercises.service.ts:106-113` (`isVerified: true`), `backend/src/food-items/food-items.controller.ts:31-34` → `food-items.service.ts:173-186` (`isVerified: true`)
- **What:** `POST /exercises` and `POST /food-items` carry no `AdminGuard` — only the global `IdentityGuard` — and insert with `is_verified = true`, which is precisely the flag the entire `admin/` moderation queue exists to flip.
- **Failure:** in a deployment with more than one approved user (the schema already models `isAdmin` and login already gates client membership), user A posts a Food Item with `caloriesPer100g: 1`. It is immediately `is_verified = true`, so it appears in **every** user's `GET /food-items` browse list and is accepted by `resolveExplicitReplacement` as a swap target in their diets, having never passed through `GET /admin/food-items`. Same for exercises in every user's catalog. The two admin modules moderate only seeded rows and are bypassed entirely by the user-facing create path.
- **Fix:** either `@UseGuards(AdminGuard)` on the two POST routes, or insert with `isVerified: false` so they land in the moderation queue like every other unreviewed row. No migration. (If this is deliberate for a single-user deployment, it should be stated in `docs/decisions.md` — nothing currently records it.)

---

## B12. Every date boundary is UTC and no per-user timezone is stored

- **Kind:** BUG
- **Severity:** medium
- **Where:** `backend/src/daily-logs/daily-logs.service.ts:131-139` (trend window), `frontend/src/shared/libs/date.ts:2` (the client's "today"), `backend/src/db/schema.ts:36-68` (`users` has no timezone column)
- **What:** the client computes today as `new Date().toISOString().slice(0, 10)` — UTC, not local. `getWeightTrend` computes its `since` boundary from `Date.UTC(...)` on server time. There is nowhere to record what day it actually is for the user.
- **Failure:** a user in UTC+13 weighs in at 09:00 local on 2026-09-15. The client sends `PUT /daily-logs/2026-09-14/weight`, so the weigh-in attaches to the previous Daily Log — and `GET /daily-logs/2026-09-15` then answers 404 "No Daily Log for this date" for the day they are standing in. Symmetrically, a user at UTC-5 logging an evening workout creates tomorrow's Daily Log. The 7/30/90-day trend window is off by one day at both ends for anyone not near UTC.
- **Fix:** smallest correct change is client-side — send `toLocaleDateString('en-CA')` (local, ISO-shaped) instead of `toISOString().slice(0,10)` — and derive the trend's `since` from the caller's own latest date rather than server `new Date()`. A proper fix stores `users.timezone` and **needs a migration**.

---

## B13. `set_number` and `order_index` are assigned by a non-atomic `max()+1`

- **Kind:** RISK
- **Severity:** low
- **Where:** `backend/src/workout-logs/workout-logs.service.ts:184-196`, `backend/src/training-programs/training-programs.service.ts:185-192`. No unique constraint on `(workout_log_id, exercise_id, set_number)` or `(training_program_id, order_index)` in `schema.ts`.
- **What:** read all existing rows, compute `Math.max(...) + 1` in JS, insert. Two statements, no lock, no constraint to catch the collision.
- **Failure:** the user has the workout open in two tabs (or the PWA flush races a live tap) and both `POST /workout-logs/:id/sets` for the same exercise read `max = 2`. Both insert `set_number = 3`; the log renders "Set 3" twice and "Set 4" never. The offline queue flushes in order (`business-rules.md:201-205`), so this needs genuine concurrency — hence low.
- **Fix:** compute the next value inside the insert with a scalar subquery. Guaranteeing it needs a unique index → **migration**.

---

## B14. Concurrent swaps on one diet lose a total

- **Kind:** RISK
- **Severity:** low
- **Where:** `backend/src/diets/diets.service.ts:475-513`
- **What:** the transaction updates one `diet_items` row, then re-derives the whole diet's totals with a fresh `SELECT` (`:483-497`) and writes them back. No lock is taken on the `diets` row first.
- **Failure:** two swaps on the same diet overlap. Under READ COMMITTED, tx2's re-derive cannot see tx1's uncommitted item change, so it computes totals from the pre-swap value of tx1's item; it then blocks on the `diets` UPDATE and, once tx1 commits, overwrites tx1's totals. `diets.total_calories` no longer equals what the items sum to — the exact drift the "re-derives totals from every item" comment at `:481-482` was written to prevent.
- **Fix:** `SELECT ... FOR UPDATE` on the `diets` row as the first statement of the transaction. No migration.

---

## B15. Check-then-insert races answer 500 where the code already knows the 4xx

- **Kind:** RISK
- **Severity:** low
- **Where:** `backend/src/users/users.service.ts:62-68`, `backend/src/food-preferences/food-preferences.service.ts:227-237`, `backend/src/photo-sessions/photo-sessions.service.ts:125-134`
- **What:** each does a `findFirst` existence check, then an insert against a column that carries a real unique constraint. `shared/db-errors.ts:5`'s `isUniqueViolation` exists and is used correctly by `setBaseline` (`photo-sessions.service.ts:251-257`) — nowhere else.
- **Failure:** the most reachable of the three needs no concurrency at all: replaying a `POST /photo-sessions/:date` body (a double-tap, a client retry after a timeout) re-inserts the same `object_key`, which is `.unique()` in `schema.ts:501`. Postgres 23505 → unhandled → **500**, where 409 is correct.
- **Fix:** wrap each insert in the existing `isUniqueViolation` → `ConflictException` pattern. No migration.

---

## B16. `assertRealisticWeight` only guards the ceiling

- **Kind:** BUG
- **Severity:** low
- **Where:** `backend/src/shared/weight-unit.ts:10-15`; the only floor is `@Min(0.1)` in `dto/set-weight.dto.ts:6`
- **What:** the helper rejects >500 kg / >1100 lb and says nothing about the bottom.
- **Failure:** `PUT /daily-logs/2026-09-14/weight {"weight": 0.5, "unit": "kg"}` is accepted. `computeForUser` feeds 0.5 kg into Mifflin (`mifflin-v1.ts:48-59`), which yields a negative BMR, gets clamped to the 1200 kcal floor, and silently produces a diet that looks plausible against a garbage weigh-in — while the weight-trend chart's axis collapses.
- **Fix:** add a `MIN_KG = 20` / `MIN_LB = 44` check next to the existing ceiling. No migration.

---

## B17. "Current diet" is per-user-forever, not per-Daily-Log as documented

- **Kind:** RISK
- **Severity:** low
- **Where:** `backend/src/diets/diets.service.ts:321-332`; `schema.ts:378-403` (`diets` has no `daily_log_id`) vs `knowledge/business-rules.md:51-55` and `docs/architecture.md:106`
- **What:** the docs state the current Diet is "the most recently created `diets` row **for that Daily Log**" and that generation writes a row "linked to the triggering Daily Log". The table has no such column; `findCurrent` orders by `created_at desc` across all of the user's diets, ever.
- **Failure:** a user generates a menu on 1 September and opens the Diet page on 14 September. `GET /diets/current` returns the two-week-old menu with no indication of its age, computed against a weigh-in and preferences that may since have changed. Not wrong code so much as an undecided rule with two contradictory written answers.
- **Fix:** decide and write it down — either add `daily_log_id` (**migration**) and scope `findCurrent` to today's log, or amend `business-rules.md:51-55` and `architecture.md:106` to match the implemented behaviour, which `diets.controller.ts:23` already describes accurately.

---

## B18. The only thing separating a normal user from the admin catalog has no test

- **Kind:** TEST-GAP
- **Severity:** medium
- **Where:** `backend/src/admin/admin.guard.ts` — no `admin.guard.spec.ts` exists; the `admin/` directory tests only `cursor-pagination` and `delete-guard`
- **What:** `AdminGuard` is the sole control preventing any authenticated user from approving, unapproving and **deleting** shared catalog rows. `IdentityGuard` has a spec (`identity.guard.spec.ts`); `AdminGuard` has none. Nothing asserts that a non-admin gets 403, that the guard runs after `IdentityGuard` (so `req.identity.userId` is populated), or that a missing user row denies rather than throws.
- **Failure:** a future refactor that changes guard registration order, or a `columns: { isAdmin: true }` projection change that makes `user?.isAdmin` undefined-y in a new way, passes CI green while opening `DELETE /admin/food-items/:id` to everyone.
- **Fix:** one spec in the shape of `identity.guard.spec.ts` — non-admin 403, admin passes, unknown user 403. No migration.

---

## Healthy

Checked and found sound — no action needed:

- **Per-row authorization.** Every controller route was read. No route anywhere accepts a user id; all of them take `identity.userId` from `@CurrentUser()`. Ownership is re-derived server-side on every id-bearing route: `findOwnedDiet`, `getOwnedProgram`/`getOwnedUnarchivedProgram`, `findOwnedSession`, `findOwnedWorkoutLog`, and the two `progress_photos → photo_sessions` joins in `getPhotoViewUrl`/`retryAnalysis`. `workout_logs` and `diets` carry no `user_id` and correctly verify through their Daily Log / own column instead. `assertOwnedObjectKey` (`photo-sessions.service.ts:88-92`) closes the one place a client-supplied MinIO key could have crossed users.
- **Admin surface.** `AdminGuard` reads `users.isAdmin` from the DB per request; `isAdmin` is set only out of band (no DTO carries it) and the global `whitelist: true` strips it from any `PATCH /users/me` body, so there is no mass-assignment path to admin. Guard ordering (global → controller) is correct.
- **Input validation.** DTO coverage is genuinely good: `@Type(() => Number)` before numeric `@IsInt`/`@IsIn` on every query DTO, `@ValidateNested` + `@ArrayMaxSize` on both photo DTOs, `@IsIn` against real enum tuples rather than free strings, and `@Min(1)/@Max(100)` on every `limit` so no caller can ask for the whole table. Pagination is keyset, not offset, with a signed-shape cursor that fails closed (`cursor-pagination.ts:15-38` returns null → 400, never 500).
- **SQL injection.** None. Every `ilike`/`eq` value goes through Drizzle's parameter binding; the one raw fragment (`sql\`lower(${schema.users.email})\`` at `users.service.ts:42`) interpolates a column reference, not user input.
- **Sentry / PII.** `instrument.ts` is exactly what ADR-006 specifies: `sendDefaultPii: false`, `requestDataIntegration({ include: { data: false } })`, and `beforeSend`/`beforeSendTransaction` both deleting `event.request.headers` — which is the non-obvious part, since every request carries a real `x-user-email`. `IdentityGuard` sets only `{ id: sub }`. Deliberate 4xx `HttpException`s are not captured by `SentryGlobalFilter`. I found no path that leaks another user's data or an internal detail into a response body.
- **Transactions.** The multi-statement mutations that matter *are* wrapped: diet generate (diet + items), swap (item + totals), reorder (delete + reinsert), photo session create and delete, confirmReview's null-then-assign pose dance (with a correct comment explaining why the null pass is needed against the non-deferrable `(photo_session_id, pose)` unique index), and both admin cascading deletes. The gaps are the Redis pushes outside them (B3), not the SQL.
- **Query shapes.** No N+1 anywhere. `list()` in training-programs, workout-logs and photo-sessions each fetch children in one `inArray` query and group in memory, with an explicit comment saying so. Indexes match the actual predicates: `diets(userId, createdAt)` for `findCurrent`'s order-by, `food_calories(roleId/categoryId/subcategoryId/familyId)` for generation's hot filter, `progress_photos(dailyLogId)`, `workout_sets(workoutLogId, exerciseId)`. Column projections are explicit — no `select *` on a wide table in a hot path.
- **Unit conversion.** `shared/weight-unit.ts` is the single implementation, correctly one-directional: stored rows keep their entry unit and are never rewritten; only Mifflin's input and the trend chart's axis convert, each rounding at the display boundary (`round2`) rather than in storage. Matches `business-rules.md:209-212` exactly.
- **Calorie/macro maths.** `mifflin-v1.ts` is a pure function with the documented constants, rounds once at the end, and clamps carbs at 0 with a stated rationale. `mealTargetsForCount` cannot divide by zero for any `meal_count` the DTO permits (1–6), and its calorie scale-down is one-directional, preserving the hard-ceiling rule. `sumCountedTotals` correctly filters `isCounted` so Free Foods stay out of stored totals per ADR-020/021.
- **Scripts.** All six are re-run-safe: every insert is `onConflictDoUpdate`/`onConflictDoNothing` on a real unique target, none deletes or truncates, `classify-food-families.ts` computes a `pending` diff and writes only changed rows inside one transaction, and its `--dry-run` genuinely touches nothing (it joins families by name specifically so a dry run needs no rows to exist). The unmatched-override condition is reported and deliberately non-gating, with the reasoning written down at the call site. Nothing here is destructive or silently partial.
- **Minor notes, not findings.** `main.ts` sets `whitelist: true` but not `forbidNonWhitelisted` — extra body fields are silently stripped rather than rejected, which is safe but hides client bugs. `bootstrap()` never calls `enableShutdownHooks()`, so the `onModuleDestroy` handlers in `DbModule`/`PhotoAnalysisQueueModule` fire under Jest but not on production SIGTERM. `calculateAge` (`user.mapper.ts:27-36`) mixes a UTC-parsed date with local getters, which is off by a day on the birthday itself in a negative-offset timezone — moot while the container runs UTC.
