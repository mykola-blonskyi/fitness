# Senior architect audit — fitness.blonskyi.dev

Read-only, HEAD d90aee6. Scope: boundary integrity, ADR conformance, domain modelling, coupling, failure design, backend/frontend contract drift. Every citation below was read against the source in this session.

The short version. The boundaries that are *structural* hold completely — NestJS is unreachable except through the proxy, the frontend never touches Drizzle, every response goes through a mapper that converts Drizzle's numeric strings. What fails is everything held together by discipline rather than by a mechanism: the same domain rule decided in two places with two different keys, four definitions of "an eligible Food Item", a queue contract that is 31 hand-written "Mirrors backend/src/..." comments, and a photo pipeline with at-most-once delivery and no reaper.

---

## A1. A photo session can be permanently stranded, and three separate mechanisms each cause it

- **Kind:** BUG
- **Severity:** critical
- **Where:** `worker/app/queue_consumer.py:68` (BRPOP outside any try), `worker/app/queue_consumer.py:24` (no `detect` failure handler), `backend/src/photo-sessions/photo-sessions.service.ts:140` and `:200-206` (enqueue after commit), `backend/src/photo-sessions/retry-analysis.ts:16` (retry only from `failed`), `docker-compose.yml:85-99` (Redis with no persistence and no volume)
- **What:** The photo pipeline is at-most-once delivery with no reconciler. `BRPOP` deletes the job before the handler runs; there is no `BRPOPLPUSH`, no processing list, no ack and no dead-letter queue, and no scheduled task exists anywhere in the backend (`grep -rn "@Cron|@Interval|setInterval|ScheduleModule" backend/src` returns nothing). The backend commits its rows and then enqueues outside the transaction, so a Redis failure leaves a row with no job. The worker registers a failure handler for `analyze-alignment` only, so an exhausted `detect` job writes nothing at all — and `photoSessionStatusEnum` (`backend/src/db/schema.ts:513-518`) has no `failed` member, so there is nowhere for a failed detect to go even if someone wanted to record it. `assertRetryableAnalysis` then permits a manual retry only from `analysisStatus === 'failed'` on a `confirmed` session, so the two states these failures actually produce — session `detecting`, photo `pending`/`processing` — are both rejected with a 400, and `PhotoSessionList.tsx:115-117` never renders the retry button for them either.
- **Failure:** Coolify redeploys the stack. `photo-queue-redis` restarts in two seconds. The worker's blocked `brpop` raises `ConnectionError`, which nothing catches, so the consumer thread unwinds and dies without a log line. `worker/app/main.py:18-20` keeps answering `/health` with 200 from the uvicorn thread, so the compose healthcheck (`docker-compose.yml:71-80`) stays green and `restart: unless-stopped` never fires. Every session confirmed from that moment sits at `status='detecting'` forever, rendering as three photos labelled "unassigned" with no badge, no review UI and no control (`PhotoSessionList.tsx:50`, `:74`, `:104`). The only escape is deleting the session and re-uploading. Two more routes reach the same dead end with no Redis involvement: a `detect` job that exhausts its three attempts (MinIO unreachable for 30 seconds covers all three, per `worker/app/config.py:16-17`), and a `confirmReview` whose second `LPUSH` of three throws — photo 1 completes, photos 2 and 3 stay `pending` forever, and re-confirming throws `BadRequestException('This session is not awaiting pose review')` at `photo-sessions.service.ts:159-161` because the session is already `confirmed`.
- **Fix:** Three small changes, in this order. (1) Wrap the worker loop body in `try/except Exception` with a log and a short sleep, and make `/health` fail when the consumer's last-tick timestamp is older than ~3× `BRPOP_TIMEOUT_SECONDS` — without the second half a thread that dies some other way stays invisible. (2) Register a `detect` failure handler that moves the session to `needs_review` with null poses; that reuses a state the review UI already drives and needs no migration. (3) Accept `pending` and `processing` in `assertRetryableAnalysis` so the retry endpoint can unstick what it currently rejects. A `BRPOPLPUSH` processing list and a periodic sweeper are the durable answer, but they are larger and are only safe after A2.

---

## A2. The worker's detect writer converges to `needs_review` from any state, including `confirmed`

- **Kind:** BUG
- **Severity:** high
- **Where:** `worker/app/db.py:8-32`, against `backend/src/photo-sessions/photo-sessions.service.ts:176-191` and `backend/src/db/schema.ts:574`
- **What:** `write_detect_result` updates each photo's `pose` and `pose_landmarks` and then sets `photo_sessions.status = 'needs_review'` with no `WHERE` clause on the current status. It also updates poses one row at a time without nulling them first, while the backend's own `confirmReview` deliberately does null them first, with a comment at `:177-179` explaining that the `(photoSessionId, pose)` unique index is checked per statement and a swap would otherwise violate it mid-loop. The worker does not copy that care.
- **Failure:** Session S has p1=side, p2=front, p3=back (the user swapped the machine's suggestion at review), `status='confirmed'`, alignment complete. An operator re-enqueues a detect job by hand — the only available workaround for A1. The worker re-derives p1=front and the first `UPDATE` collides with p2's existing `front`; Postgres raises 23505, the transaction rolls back, and the retry loop burns three attempts and gives up silently. That is the lucky outcome. Had the user not swapped anything, every `UPDATE` succeeds, the confirmed poses are overwritten with machine values, and the session is dragged from `confirmed` back to `needs_review`, discarding a completed alignment run and stranding any `analyze-alignment` job still in flight.
- **Fix:** Do the session update first and make it conditional: `UPDATE photo_sessions SET status='needs_review', updated_at=now() WHERE id=%s AND status='detecting'`, then abort the transaction when `cur.rowcount == 0`. One guard makes the job converge correctly from any state, and it is the precondition for any redelivery or sweeper added for A1.

---

## A3. There are four different definitions of an eligible Food Item

- **Kind:** BUG
- **Severity:** high
- **Where:** `backend/src/diets/diets.service.ts:172-174` (generation: Family required, `isVerified` ignored), `:392-404` (reroll: `isVerified` required, Family ignored), `:352-374` (explicit swap: neither), `backend/src/food-items/food-items.service.ts:92` (the picker's list: `isVerified` only, no preference exclusions); the claim being violated is the comment at `diets.service.ts:190-192`
- **What:** ADR-020's central rule is "a Food Item with no Family is never generated" — it is how flours, offal, babyfood and branded products leave the pool without a rule of their own. `findCandidatesByRole` enforces it. No other path does. `pickRerollReplacement` instead filters on `isVerified = true`, which generation never checks; `resolveExplicitReplacement` checks neither; and the list endpoint that populates the swap picker applies no Food Preference exclusions at all, while `swapItem` rejects on exactly those exclusions at `:369-373`. The comment above `resolveExclusions` asserts that generation and swap "can never drift apart" — the exclusion *targets* are shared, but the Family gate, the verification gate, the favourites narrowing and the picker's own filter are not.
- **Failure:** Three concrete outcomes from one incoherence. A user rerolls the protein slot on a generated menu; `pickRerollReplacement` queries every verified `lean_protein` row with no Family filter — the pool ADR-020 describes as holding "beef brains, frankfurters and 'Potato salad with egg'" — and picks one at random, putting back in one tap the item the whole phase-1 rework removed. A vegetarian opens the swap picker for that same slot and is shown chicken, cod and beef, because the list endpoint ignores their exclusions; every one they pick returns 422. And a Food Item the user creates themselves gets `isVerified: true` with `familyId` null (`food-items.service.ts:173-186`), so their own food can be swapped in explicitly or drawn by reroll but can never be generated.
- **Fix:** One predicate, one home. Hoist the eligibility filter out of `findCandidatesByRole` into a function all four call sites share — at minimum add `isNotNull(foodCalories.familyId)` to `pickRerollReplacement` and `resolveExplicitReplacement`, and add an `excludePreferences` flag to the list endpoint that reuses `getExclusionTargets`. Then decide whether `isVerified` belongs in the predicate at all or in none of them; deleting it from reroll is the smaller half of that decision, since generation already ignores it.

---

## A4. The offline queue duplicates a logged set, and the duplicate cannot be deleted

- **Kind:** BUG
- **Severity:** high
- **Where:** `backend/src/workout-logs/workout-logs.service.ts:184-209`, `frontend/src/shared/offline/create-synced-write.ts:157-168`, `frontend/src/shared/offline/offline-queue-store.ts:73`; against `knowledge/business-rules.md:201-205`
- **What:** The queue has exactly two registered writes. `syncedSetWeight` is safe by construction — `setWeight` upserts on `(userId, date)` (`daily-logs.service.ts:87-94`). `syncedLogWorkoutSet` is not: no idempotency key, `setNumber` derived as `max(existing) + 1` from a separate `SELECT`, a plain insert, and no unique constraint that would catch a duplicate (`backend/src/db/schema.ts:246-266`). The documented design is "writes queue in IndexedDB and flush to the NestJS API in order once connectivity returns. No conflict resolution is needed since workout sets are append-only" — but append-only is exactly what turns an at-least-once retry into a duplicate rather than a no-op, and the client cannot detect it because the discriminating value is assigned by the server. Two independent paths produce the retry. A response lost after the row commits is classified as a network error at `create-synced-write.ts:163` and re-queued. And `isSyncing` is per-tab in-memory state while IndexedDB is per-origin, with no `BroadcastChannel` or `navigator.locks` anywhere, so two open tabs both drain the same queue on the same `online` event.
- **Failure:** `/diary` open in one tab and `/workouts/<id>` in another. Four sets logged offline, wifi returns, both tabs drain. Eight rows; bench press shows sets 1 through 8. `backend/src/workout-logs/workout-logs.controller.ts` exposes only `@Get`, `@Get(':id')`, `@Post(':date')` and `@Post(':id/sets')` — there is no delete route, so the four phantom sets are permanent.
- **Fix:** The queue item already mints a `crypto.randomUUID()` at `offline-queue-store.ts:62`; it is just minted too late to cover the first send. Generate it in `createSyncedWrite` before the first attempt, pass it as `clientRequestId` on `LogWorkoutSetDto`, store it in a nullable column with `unique().on(workoutLogId, clientRequestId)`, and write with `onConflictDoNothing` plus a re-select. That covers both paths, where a cross-tab lock would cover only one.

---

## A5. The offline queue silently destroys writes in three distinct ways

- **Kind:** BUG
- **Severity:** high
- **Where:** `frontend/src/shared/libs/form-action.ts:47-51` (status discarded), `frontend/src/shared/offline/drain-queue.ts:37-44` (drop on anything but `TypeError`), `frontend/src/shared/offline/offline-queue-store.ts:77-88` (snapshot overwritten), `drain-queue.ts:28-31` (head-of-line block), `frontend/src/shared/offline/useSyncStatus.ts:15-17` (shows "synced" either way)
- **What:** Three separate mechanisms, one subsystem. (1) `api-client.ts:57-62` extracts `ApiError.status`, and `submitFormAction` immediately flattens it to `{ error: string }`, so by the time `drainQueue` sees the replay failure a 502 is indistinguishable from a 400. `isNetworkError` matches only `TypeError`, so every backend rejection — transient included — is treated as poison and dropped. (2) `drain` snapshots `get().queue`, awaits, then overwrites with `set({ queue: remaining })`; anything enqueued during the drain is erased from memory and from IndexedDB on the next persist. (3) An item whose handler is not registered breaks the loop and blocks everything behind it, and handlers register only as a side effect of importing the feature's `offline.ts` — which Next.js code-splits per route, so on `/workouts` the daily-log handler does not exist. In all three cases `useSyncStatus` returns `'synced'` once the queue empties, and the only record of a dropped write is a Sentry event that carries no payload by design.
- **Failure:** A user logs six sets in a basement gym and walks out; the phone reconnects while Coolify is mid-redeploy, which a push to `main` triggers automatically. All six replays get a 502, all six are dropped, `WorkoutSetList.tsx:76-79` sees `pendingSets.length` shrink and fires the same `router.refresh()` a successful sync would, and the indicator turns green. Six sets of health data are gone with nothing recoverable. The block is as easy to hit: log a weight on `/diary` and three sets on `/workouts/<id>` while offline, then reopen on `/workouts/<id>` — the head item has no handler, so the three sets behind it never flush until the user happens to navigate to `/diary`. On a captive portal, where `navigator.onLine` never flips, `useOfflineSync` has no interval, `focus` or `visibilitychange` trigger, so nothing drains at all.
- **Fix:** Stop destroying the status: have `submitFormAction` rethrow when `err instanceof ApiError && err.status >= 500`, and treat that rethrow like a network error in `drainQueue`. Widening the regex in `network-error.ts` is the tempting fix and cannot work — the information is already gone by then. Merge rather than overwrite the queue on drain completion, and move an unhandled item to the back with a per-drain visited set instead of breaking. Finally, keep the poison drop but move dropped items to a `failed` list with a fourth sync status, so the user is told which writes did not land rather than shown a green tick.

---

## A6. Cardio-versus-strength is not one rule duplicated — it is two rules with different keys

- **Kind:** BUG
- **Severity:** high
- **Where:** `backend/src/workout-logs/workout-set-values.ts:27` and `backend/src/training-programs/program-exercise-targets.ts:23` (keyed on the exercise's **category**, from the database) against `frontend/src/shared/schemas/workout-log.ts:47` and `frontend/src/shared/schemas/training-program.ts:41` (keyed on **the shape of what was submitted**: `if (data.durationSeconds != null) return;`)
- **What:** `business-rules.md:37-39` states one rule: a cardio-category exercise is logged by duration, every other category by weight and reps. The backend implements exactly that. Neither frontend schema ever looks at the category — they infer it from whether `durationSeconds` happens to be present. `training-program.ts:19-21` writes the assumption down in a comment, and the assumption is false. Both components already have the real key in hand (`LogSetForm.tsx:50`, `AddProgramExerciseForm.tsx:35` compute `isCardio`) and both already `useMemo` the schema, so the divergence is not forced by anything.
- **Failure:** Two symptoms, one root. A dead form: pick a cardio exercise, leave duration blank, submit. `blankToUndefined` (`preprocess.ts:5`) maps the input's `NaN` to `undefined`, so the early return does not fire, and `superRefine` writes issues to the `weight`, `unit` and `reps` paths. The cardio branch of `LogSetForm.tsx:94-108` mounts only `errors.durationSeconds`. Nothing renders, `errors.root` is untouched, and the submit button does nothing, forever. `AddProgramExerciseForm.tsx:67-111` reproduces it exactly. And a stale value suppressing validation: `use-zod-form.ts:16-24` does not set `shouldUnregister`, so React Hook Form retains unmounted values. Type `1800` into duration for a cardio exercise, switch to Bench Press without submitting, submit with weight and reps blank — the schema early-returns and passes, and the backend rejects at `workout-set-values.ts:46`. Offline, that same payload is queued, shown as "saved offline", and then dropped by A5.
- **Fix:** Pass `isCardio` into both schemas and branch on it, so both sides key on the category. That is the change that gives the rule one home rather than two copies to keep in sync.

---

## A7. `diets` was detached from Daily Log in a migration, and four documents still describe the old model

- **Kind:** DOC-DRIFT
- **Severity:** high
- **Where:** `backend/drizzle/0020_diet_user_scoped.sql` (drops `diets.daily_log_id`, adds `diets.user_id`, and `DELETE`s both tables first), `backend/src/db/schema.ts:438-461`, `backend/src/diets/diets.service.ts:321-332`; contradicted by `knowledge/domain-model.md:197` and `:206`, `knowledge/business-rules.md:53`, `docs/architecture.md:106`
- **What:** Commit f189f55 (FITNESS-61, "make diet a user-scoped record valid until regenerated") removed the Daily Log link entirely and deleted every existing diet row. There is no ADR for it — `docs/decisions.md` runs to ADR-021 and none of them mentions the change, so ADR-004's framing of Daily Log as the anchor all activity attaches to is now only two-thirds true. `domain-model.md:197` still says "A single generated meal plan for one Daily Log. Never edited in place", `:206` still lists `many_to_one Daily Log`, `business-rules.md:53` still defines the current diet as the most recent row "for that Daily Log", and `architecture.md:106` still says generation writes rows "linked to the triggering Daily Log". "Never edited in place" is false too — `swapItem` updates `diet_items` and `diets` totals in place (`diets.service.ts:475-513`), as the controller comment at `diets.controller.ts:29-30` states plainly.
- **Failure:** A reader implementing the diary page from `business-rules.md:53` writes `GET /daily-logs/:date/diet`, finds no such route, and falls back to `GET /diets/current` — which returns whatever was generated most recently regardless of date. Opening the diary for 10 September after regenerating on 14 September shows the 14 September menu as that day's plan. No query can recover what was actually planned on a past day, because the row carries no date at all.
- **Fix:** Write the ADR — this is a real, deliberate decision with a destructive data migration behind it — then correct the four lines. `business-rules.md:53` becomes "for the user"; `domain-model.md:206` becomes `many_to_one User`; `:197` drops both "for one Daily Log" and "Never edited in place"; `architecture.md:106` drops the Daily Log clause.

---

## A8. The Family gate ships as code while the data it needs ships as a manual script run

- **Kind:** RISK
- **Severity:** high
- **Where:** `backend/src/diets/diets.service.ts:172-174` (the gate), `backend/src/db/schema.ts:315-317` (`family_id` nullable, added by a migration that backfills nothing), `backend/src/scripts/classify-food-families.ts:1-10` (the pass that fills it, run by hand), `.github/workflows/ci.yml:203-230` (the deploy job, which only POSTs a webhook); the risk is noted at `plans/current.md:25` and `:43`
- **What:** `findCandidatesByRole` skips every row whose `familyName` is null. The migration adding `family_id` only adds a nullable column, and the seed scripts never rewrite an existing row's classification, so the column is null for the whole catalog until `classify-food-families` is run against that specific database. Nothing in the deploy path runs it, nothing asserts it ran, and nothing degrades gracefully if it did not. The plan flags the ordering requirement but states the consequence as "diets get no vegetables at all"; the gate applies to every role, so the real blast radius is larger.
- **Failure:** `main` deploys to production, where `family_id` is still null on every row (`plans/current.md:43`). The next `POST /diets/generate` filters out all ~570 candidates, `hasAnyCandidate` is false, and every user gets `422 'No food items available that match your food and diet preferences'`. Diet generation is entirely down, and the message sends whoever investigates to the Food Preferences screen rather than to the unrun classification pass. Because the run lives in an operator's memory, the failure mode is a silent total outage of the headline feature rather than a failed deploy.
- **Fix:** Make the data a migration so the gate and its data land atomically — the classification is deterministic from `food-families.ts`, which is what a data migration is for, and ADR-010 already set the precedent ("seeded via a mandatory data migration rather than an optional `pnpm db:seed:*` script, since the feature can't function without it"). Failing that, split the 422 into two messages so "the catalog is unclassified" cannot be mistaken for "your preferences exclude everything".

---

## A9. Not one external client in either process has a timeout

- **Kind:** RISK
- **Severity:** medium
- **Where:** `backend/src/db/db.module.ts:14-15`, `backend/src/photo-analysis-queue/photo-analysis-queue.module.ts:10`, `backend/src/storage/storage.service.ts:18-24`, `worker/app/db.py:9,36,51,61`, `worker/app/queue_consumer.py:65`, `frontend/src/proxy.ts:29-42`
- **What:** No connect timeout, socket timeout or statement timeout anywhere; a repo-wide grep for `AbortSignal`, `AbortController` and `timeout` across `frontend/src` and `backend/src` finds only unrelated comments. `pg.Pool` defaults to `connectionTimeoutMillis: 0` — wait forever — and `max: 10`. The documented context makes this sharper than usual: the Postgres instance is *shared* with the user's other pet projects (`docs/architecture.md:112`), so saturation is neither hypothetical nor under this app's control.
- **Failure:** Another `*.blonskyi.dev` project exhausts the shared connection limit, or a firewall state table expires and blackholes the route without an RST. All ten backend pool connections block indefinitely and every subsequent request queues behind them with no deadline, while `/health` keeps returning 200 because `AppController.getHealth` (`backend/src/app.controller.ts:53-57`) touches nothing, so Coolify never restarts the container. The blast radius is the whole UI rather than just API calls: `proxy.ts:84-88` runs `hasCompletedProfile` on every non-onboarding page request and that fetch has no timeout either, so every navigation hangs in middleware. The worker fails the same way from the other end — the single consumer thread blocks inside `psycopg.connect` while `/health` answers 200 from the uvicorn thread, with the queue growing in a Redis that has no persistence, no volume and no `maxmemory` policy.
- **Fix:** Argument-only changes. `new Pool({ connectionString, connectionTimeoutMillis: 5000, statement_timeout: 30000 })`; `new Redis(url, { connectTimeout: 5000, commandTimeout: 5000 })`; `psycopg.connect(url, connect_timeout=5, options='-c statement_timeout=30000')`; `redis.Redis.from_url(url, socket_connect_timeout=5, socket_timeout=BRPOP_TIMEOUT_SECONDS + 5, health_check_interval=30)`; `signal: AbortSignal.timeout(3000)` on the middleware fetch. Separately, make each `/health` prove the dependency it actually needs — a probe that touches nothing cannot distinguish "serving" from "wedged".

---

## A10. A backend outage bounces every signed-in user into onboarding

- **Kind:** BUG
- **Severity:** medium
- **Where:** `frontend/src/proxy.ts:29-42` and `:84-88`, against `backend/src/users/users.service.ts:65-66`
- **What:** `hasCompletedProfile` swallows every failure and returns `false`, which the caller reads as "no profile yet" and redirects to `/onboarding`. The comment at `:26-28` is explicit that this is deliberate — better than a 500 — but it conflates "the backend said this user has no profile" with "the backend said nothing". It is the same conflation as A5's dropped writes and A13's missing object, in a third place.
- **Failure:** NestJS restarts during a deploy, or stalls per A9. For those seconds every page load redirects an established user to the onboarding form, telling them to create a profile they already have. If they fill it in, `POST /users` finds their row by `identitySub` and throws `ConflictException('Profile already exists')`, which surfaces as a generic save failure. A user whose weight history and progress photos are already in the system is shown a first-run flow that then refuses to complete.
- **Fix:** Distinguish the two cases: treat a 404 as "not onboarded" and anything else — non-response, 5xx, timeout — as "unknown", and let an unknown fall through to the requested page rather than to onboarding. The page's own data fetch will produce a real error the user can act on.

---

## A11. Permanent input failures in the worker are classified as transient

- **Kind:** BUG
- **Severity:** medium
- **Where:** `worker/app/pose_landmarker.py:69` (`Image.open` on raw bytes), `worker/app/storage.py:18` (`get_object`), against the two-bucket loop at `worker/app/queue_consumer.py:37-48`
- **What:** The classification machinery is correct — `PermanentJobError` breaks the loop, everything else retries with backoff, and `PoseNotDetectedError` (`worker/app/alignment.py:43`) subclasses it so missing landmarks fail on the first attempt exactly as ADR-013 describes. But nothing on the `detect` path ever raises `PermanentJobError`, and that is where the permanent input failures live. `PIL.UnidentifiedImageError` (a subclass of `OSError`) and `minio.error.S3Error` for `NoSuchKey` are generic exceptions, so both are retried three times and can never succeed.
- **Failure:** A user on an iPhone uploads three HEIC files. The presigned PUT accepts them, `objectExists` confirms them, the session is created as `detecting`. Pillow 11 has no HEIF decoder and `pillow-heif` is absent from `worker/requirements.txt`, so `Image.open` raises three times over six seconds, re-downloading three full images from MinIO each time, then logs and gives up — landing in A1's dead end with no user-visible signal at all.
- **Fix:** Catch `OSError` around `Image.open` in `detect_landmarks` and re-raise as `PermanentJobError`; catch `S3Error` in `read_object` and re-raise as `PermanentJobError` when `e.code` is `NoSuchKey` or `NoSuchBucket`, leaving every other S3 error transient. Both are three-line changes, and they only become user-visible once A1's `detect` failure handler exists, so land them together.

---

## A12. `IdentityGuard`'s email reconciliation is a permanent rebind path, not a migration step

- **Kind:** RISK
- **Severity:** medium
- **Where:** `backend/src/users/users.service.ts:41-54`, reached from `backend/src/identity/identity.guard.ts:39-42` on every authenticated request; the intent is recorded at `docs/decisions.md:237`
- **What:** ADR-018 introduces the email fallback for one bounded purpose: migration `0024` backfilled `identity_sub` with the old Hub id, which no real login `sub` can match, so the owner's first login under the new issuer must reconcile by email or orphan every row FK'd to their `users.id`. The code implements it unconditionally and forever — no migration flag, no predicate on the stored value, no expiry — and it fires as a write on a GET. Nothing checks an `email_verified` claim either: `frontend/src/features/auth/lib/auth.ts:25-32` takes `profile.email` as-is.
- **Failure:** login.blonskyi.dev grants a second person membership of the `fitness` client, or re-issues an address a former account held. Their token carries a new `sub` and a matching email; the `identity_sub` lookup misses, the email lookup hits, and `UPDATE users SET identity_sub = <new sub>` hands them the owner's entire profile — weight history, photos, diets. The original owner's next login then misses on both `sub` and email and is sent to onboarding, where `create()` fails on the `email` unique constraint as an unhandled 500. The backfill is long since consumed, so the branch has no remaining legitimate trigger.
- **Fix:** Confirm the backfill is done — one query, `SELECT count(*) FROM users WHERE identity_sub = id::text` — and delete the branch. That is the smaller change and the one this warrants. If it cannot be confirmed yet, bound it: require an `email_verified` claim and a one-shot marker (a nullable `identity_reconciled_at`, or a predicate that the stored `identity_sub` still equals the row's own `id`), so it can fire at most once per row and never for an identity the app has not seen.

---

## A13. `objectExists` cannot tell a missing object from an unreachable MinIO

- **Kind:** BUG
- **Severity:** medium
- **Where:** `backend/src/storage/storage.service.ts:54-61`, called from `backend/src/photo-sessions/photo-sessions.service.ts:106`
- **What:** `statObject` is wrapped in a bare `catch { return false }`, so `NoSuchKey`, a connection refusal, a 503, a TLS error and a timeout all collapse into "the object is not there", which the caller reports to the user as a failed upload.
- **Failure:** MinIO is restarting during a disk resize. The user's three photos uploaded successfully a moment earlier through the presigned PUTs and are physically in the bucket. `confirm()` gets a connection refusal, the catch swallows it, and the user is told `'A photo was not found in storage - upload may have failed'`. They re-upload; the original three objects are now orphaned in the bucket with no row referencing them, and nothing ever deletes them, because `remove()` only cleans up keys that reached the database.
- **Fix:** Narrow the catch to MinIO's not-found codes (`NoSuchKey`, `NotFound`) and rethrow everything else, so a storage outage surfaces as a 5xx the user can meaningfully retry rather than a 400 that blames their upload.

---

## A14. Generation can persist a Diet with zero counted items and a 0 kcal total

- **Kind:** BUG
- **Severity:** medium
- **Where:** `backend/src/diets/diets.service.ts:256-263` (the guard) and `:300-311` (the insert), against `backend/src/diets/greedy-heuristic.ts:407` and `:454-462`
- **What:** `generate()` throws `UnprocessableEntityException` only when *every* role has an empty candidate list. But `buildMeal` skips the vegetable role whenever the meal already has free-food items (`greedy-heuristic.ts:382`) and filters free foods out of every counted role (`:385-387`), so a pool consisting solely of free vegetables satisfies `hasAnyCandidate` while producing no counted item at all. `buildMeal` returns `[]` for every meal and the totals are 0, but `generated.items` is non-empty because the free salad items survive, so the `items.length > 0` check at `:300` passes and the row is written.
- **Failure:** A user sets Diet Preferences `vegan` and `keto` and adds `exclude` preferences on the `nuts` and `oils` Categories — four actions. Vegan removes meat/fish/dairy/eggs, keto removes grains/legumes plus the `complex_carb` and `simple_carb` roles (which also removes potato, reclassified to `complex_carb` by ADR-020), and the two excludes remove the remaining fat and plant-protein sources. Only the `vegetable` role survives, and every Family in it is on the Free Food allowlist (`backend/src/diets/free-foods.ts:7-13`). Generation returns HTTP 200 with a Diet whose stored total is 0 kcal and 0 g protein and whose only contents are three uncounted salad items per meal, presented as today's plan. ADR-011 promises a 422 for exactly this case.
- **Fix:** Move the guard after `generateDietItems` and base it on the result rather than the inputs: throw the same 422 when `generated.items.every((item) => !item.isCounted)`.

---

## A15. The service worker keeps the previous user's pages after sign-out

- **Kind:** RISK
- **Severity:** medium
- **Where:** `frontend/public/sw.js:91-104` (`networkFirst` caches every OK navigation response), `frontend/src/shared/ui/components/SignOutButton.tsx:26` (posts to `/api/auth/signout` and nothing else)
- **What:** Every successful navigation is written to `RUNTIME_CACHE`, which is the whole point — it is what makes an authenticated route survive a reload offline. Nothing clears that cache on sign-out, because sign-out did not exist when the service worker was written: `sw.js`'s own header comment still says so, and ADR-018 added sign-out on 2026-09-05 without revisiting it. The cached pages are Server Components with their data baked into the HTML, which `sw.js:23-28` states explicitly — so the cache holds rendered weight history, diet plans and photo pages, not just a shell.
- **Failure:** The owner signs out on a shared or handed-over laptop. The session cookie is cleared, so a live request would redirect to login, but going offline (airplane mode, or simply a dropped connection) makes `networkFirst` fall back to `cache.match` and serve the previous user's rendered diary page — weights, dates of birth, generated diets — to whoever holds the device. The app's own business rules classify this as health data that should not even reach Sentry.
- **Fix:** Have the sign-out handler post a message to the service worker (or call `caches.delete(RUNTIME_CACHE)` from the page, which has the same origin) before redirecting, so the runtime cache dies with the session.

---

## A16. The frontend/backend contract is 31 comments, and closed unions are declared up to five times

- **Kind:** DESIGN
- **Severity:** medium
- **Where:** 31 `// Mirrors backend/src/...` comments across `frontend/src`; `exercise_category` declared at `backend/src/db/schema.ts:94-104`, `backend/src/exercises/exercise.types.ts`, `frontend/src/shared/types/exercise.ts:5-15` and four message catalogues, crossing into the typed world by `as` assertion at `exercise.mapper.ts:26`, `workout-log.mapper.ts:33` and `training-program.mapper.ts:49`; `photo_pose` repeated again at `frontend/src/features/photo-sessions/photo-pairing.ts:6` and `PhotoSessionReview.tsx:13`
- **What:** No response is parsed at runtime anywhere on the frontend, and no generated client or shared package exists. The contract is maintained entirely by hand-copied interfaces, and the `*Row` types that feed the backend mappers restate the Drizzle columns as strings by hand as well (`diet.mapper.ts:12-26`, `food-item.mapper.ts:26-38`). The backend's response types also do not describe the wire: `createdAt: Date` at `user.mapper.ts:21`, `diet.mapper.ts:48`, `workout-log.mapper.ts:47`, `daily-log.mapper.ts:11` and `photo-session.mapper.ts:44` all ship as ISO strings, and the frontend mirrors type them `string` — correctly, but only because someone knew to diverge from the thing the comment says they mirror. The admin mappers already call `.toISOString()` (`admin-exercise.mapper.ts:36`), so the codebase disagrees with itself about which is right.
- **Failure:** Adding a ninth `exercise_category` (say `glutes`) requires four coordinated edits plus four message catalogues; miss the frontend const and the `as ExerciseCategory` cast at `exercise.mapper.ts:26` accepts it silently, so the UI renders the literal key `ExerciseCategories.glutes` to the user. Miss a message catalogue and only Ukrainian breaks. Adding a `numeric` column and forgetting the `Number()` in its mapper typechecks on both sides and breaks in the browser, because the hand-written `*Row` type is what declares it a string.
- **Fix:** Not a generated client — too large for this codebase. One parity test that asserts the pgEnum values, the backend const, the frontend const and the message-catalogue keys are the same set turns every one of these silent drifts into a red CI run, which is what `check:i18n` already does for translations. Then replace the three `as` casts with a validating narrow, so an unknown value fails at the mapper instead of at the render site.

---

## A17. The backend is not in TypeScript strict mode, and the generator depends on unchecked index access

- **Kind:** DESIGN
- **Severity:** medium
- **Where:** `backend/tsconfig.json` (`strictNullChecks` only; `noImplicitAny: false`, `strictBindCallApply: false`, `noFallthroughCasesInSwitch: false`, no `noUncheckedIndexedAccess`) against `frontend/tsconfig.json` (`strict: true`); the concrete dependency is `backend/src/diets/greedy-heuristic.ts:44-49`, `:67-72` and `:287`
- **What:** ADR-001 puts all business logic in the backend, and the backend has the weaker type checking of the two packages. The generator encodes one domain concept — the role slot — as a positional index into `MEAL_ROLE_CHAINS` (`diet.types.ts:4-9`), four named integer constants, two parallel `Record<number, number>` lookup tables, and two `switch` statements. Without `noUncheckedIndexedAccess`, `MAX_PORTION_GRAMS[item.chainIndex]` at `:287` is typed `number` when it can be `undefined`, so the compiler cannot see the hazard.
- **Failure:** ADR-020 phase 2 replaces the four fixed slots with Archetype-declared Meal Slots. The first person to add a fifth chain to `MEAL_ROLE_CHAINS` without also adding entries to `MAX_PORTION_GRAMS` and `STARTING_PORTION_GRAMS` gets a clean typecheck and a clean test run against the existing four. At runtime `Math.min(undefined, x)` is `NaN`, the item's `weightGrams` becomes `NaN`, `NaN >= MIN_WEIGHT_GRAMS` is false, and the slot is silently dropped from every meal — a plan quietly missing a food group, with no error anywhere.
- **Fix:** Turn on `"strict": true` and `"noUncheckedIndexedAccess": true` in `backend/tsconfig.json` and fix the fallout; that is what makes the hazard a compile error rather than a silent drop. Independently, and before phase 2 rather than during it, collapse the four parallel structures into one array of slot records (`{ chain, macro, maxPortionGrams, startingPortionGrams }`) so a new slot is one object literal instead of five coordinated edits.

---

## A18. Two auth-boundary invariants are enforced by a comment rather than by code

- **Kind:** RISK
- **Severity:** low
- **Where:** `frontend/src/proxy.ts:47-48` and `:66-68` (early returns that forward the request headers untouched) against `:96-98` and `:109-111`; and roughly 25 Server Actions interpolating a caller-supplied id straight into a backend path — `frontend/src/features/diet/actions.ts:114`, `frontend/src/features/photo-sessions/actions.ts:56,104,116`, `frontend/src/features/daily-log/actions.ts:57,70`, `frontend/src/features/workout-logs/actions.ts:38,70` among them
- **What:** Neither is exploitable today, and both are one routine change away from being so. The proxy overwrites `x-user-id`/`x-user-email` on the normal path, which is correct, but the health and sign-in early returns forward whatever the client sent, and `api-client.ts:29-31` reads `headers()` with no way to tell a proxy-set value from a client-set one — safe only because `/[locale]/health/page.tsx` is a static `<p>ok</p>` and the login page makes no `apiFetch` call. Separately, WHATWG URL parsing normalises `..` before `fetch` sends, so `swapDietItem('x/../../food-preferences', 'y')` retargets the request; safe only because every backend route scopes by `identity.userId` and `/admin/*` is gated by `admin.guard.ts:32`, so a caller reaches nothing but their own data. The codebase already knows the encoding pattern — it encodes cursors at `admin-exercises/actions.ts:19` and nowhere else.
- **Failure:** The day someone adds a page to the health route that reads user data, or a backend route that is not user-scoped (a shared catalog mutation, a webhook receiver, an internal endpoint), both of these become live holes with no code change in the file that broke them. The comment at `proxy.ts:109-111` states the rule that keeps the first one safe; nothing enforces it.
- **Fix:** Delete `x-user-id`/`x-user-email` from the inbound headers once at the top of `proxy`, before any early return, so no path can forward a client-supplied value. Add a one-line path-segment helper that encodes by construction and use it in the Server Actions, so the rule lives in a function rather than in a reviewer's attention.

---

## A19. Five documented claims the code contradicts

- **Kind:** DOC-DRIFT
- **Severity:** low
- **Where:** each pairs a doc line with the code that refutes it
- **What:**
  1. `knowledge/business-rules.md:161` and `docs/architecture.md:112` say CI runs `drizzle migrate` and deploys only if it succeeds. ADR-005 (`docs/decisions.md:59`) records that this was never possible — GitHub runners have no network path to that Postgres — and that the migration moved into the backend container's entrypoint. `.github/workflows/ci.yml:203-230` only POSTs a webhook.
  2. `knowledge/business-rules.md:203` and `docs/architecture.md:32` say the service worker flushes the offline queue. It does not, and `sw.js:18-21` says so itself; the drain runs in the React tree via `TopBar.tsx:31`, so closing the tab flushes nothing. The same line scopes offline writes to workout sets, but weight is queued too.
  3. `knowledge/business-rules.md:81` says swapping or rerolling a Free Food rescales its portion. `diets.service.ts:438-443` rejects it with a 422, and `DietMenu.tsx:250` renders no swap control for uncounted items. Code and UI agree; only the rule is stale.
  4. `docs/architecture.md:140` says the Python worker "isn't built yet" and defers its Sentry decision on that basis. It is built, deployed and CI-tested — and that deferral is precisely why A1's thread death is silent.
  5. `docs/architecture.md:25` lists ShadCN and TanStack Query in the frontend stack; neither is in `frontend/package.json`, and ADR-009 already records both as deferred. `plans/current.md:131`'s GitHub-Actions-billing risk is stale in the same way.
- **Failure:** Each sends a reader to the wrong place at the moment they most need the right one. (1) is the sharpest: a broken migration leaves CI green, the webhook fired, the new container crashlooping and the old one still serving — so the operator sees a green tick on `main` and a production silently several commits behind, which is exactly the confusion CLAUDE.md's "a red check means no release, by design" is trying to prevent and does not cover. (3) invites someone to wire a swap button onto free items that returns 422 every time it is pressed.
- **Fix:** Correct the five lines. For (1), replace the pipeline sentence in both files with a pointer to ADR-005 and state explicitly that a green CI run does not prove the release landed.

---

## Healthy

Areas checked and found genuinely sound.

- **ADR-001's database boundary holds completely.** No `drizzle`, `pg` or `DATABASE_URL` reference anywhere under `frontend/src`, no import from `backend/src`, no duplicated Drizzle type. The backend declares no ports and no domain in `docker-compose.yml:40-42`, so it really is reachable only at `http://backend:3001` over the private network.
- **The Drizzle numeric-string class of bug does not exist here.** Every controller returns a mapper `*Response` type and never a raw row, and every mapper calls `Number()` on every `numeric` column. This is the most disciplined thing in the codebase, and it is why A16 is a design risk rather than a live bug.
- **Per-user scoping is uniform.** Every service re-derives ownership from the resolved `users.id` rather than trusting a URL (`findOwnedSession`, `findOwnedDiet`, `findOwnedProgram`, `findOwnedWorkoutLog`), and `workout_logs`/`diets` — which carry no `userId` of their own — join through their parent to prove it. Admin pages gate in the UI at `admin/layout.tsx:14`, but the real gate is `admin.guard.ts:32`, so a directly-invoked Server Action is still rejected.
- **Mass assignment is closed** by `whitelist: true` at `backend/src/main.ts:9` — that is what stops `isAdmin` reaching `users.service.ts:101`.
- **ADR-002's photo privacy model is implemented exactly as written.** The database stores object keys, `getPhotoViewUrl` joins through `photo_sessions.userId` before minting a 5-minute presigned GET, and `ownsObjectKey` cross-checks the key prefix on confirm so one user cannot claim another's upload URL.
- **Training Program state is sound.** `isArchived` and "active" are two axes with one invariant (archived implies inactive) and both mutation paths enforce it. Reorder is a full-set exact-match replace in one transaction, and `activate` is idempotent via `onConflictDoNothing`.
- **The workout-history isolation rule is real, not aspirational.** `workout_logs.title` is copied at start time and `workout_sets.exerciseId` points at the catalog; neither table has any FK into `program_exercises`, so program edits provably cannot rewrite logged history.
- **kg/lb conversion has exactly one home** (`backend/src/shared/weight-unit.ts:21-27`); the frontend converts nothing. The favourite-versus-exclude conflict likewise lives only at `food-preferences.service.ts:204-225`, with `frontend/src/features/preferences/actions.ts:28-29` forwarding the 409 verbatim rather than restating the rule. That is the shape A6 should have had.
- **ADR-012's middleware composition is implemented as written** — next-intl first, one `NextResponse.next({ request: { headers } })`, `intlResponse`'s cookies copied on afterwards — and the normal path overwrites the identity headers rather than trusting them (see A18 for the two early returns that do not).
- **Sentry's PII posture matches ADR-006** on both sides: `sendDefaultPii: false`, `requestDataIntegration({ include: { data: false } })`, headers deleted in `beforeSend` and `beforeSendTransaction`, and only the `sub` attached. I confirmed in `node_modules` that `SentryGlobalFilter`'s `isExpectedError` suppresses every `HttpException`, so the "no deliberate 4xx" rule holds.
- **Every user-authored body is parsed with zod before forwarding** and re-validated with class-validator on arrival; no raw `formData.get()` cast exists anywhere.
- **The offline queue handles the shared-device case deliberately** — `setOwnerUserId` clears the queue on a user switch rather than replaying one person's writes under another's identity (`offline-queue-store.ts:51-58`), ordered before the drain.
- **Array indexing and nullable handling were checked across all five feature slices and are guarded throughout**, including the divide-by-zero at `WeightTrendChart.tsx:81`; `mealOrder` always covers every position present (`diets.service.ts:639-640`), so the `indexOf` sorts cannot hit `-1`.
- **The worker's permanent-versus-transient machinery is correctly built where it exists.** `PermanentJobError` breaks the retry loop, `PoseNotDetectedError` subclasses it per ADR-013, malformed JSON is dropped rather than retried, and the consumer cannot hot-spin on an unknown job type.
