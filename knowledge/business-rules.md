# Business Rules

Full history and rationale for each rule: `~/Documents/obsidian-notes/projects_history/fitness/knowledge/business-rules.md`.

## Daily Log requires no weigh-in

Progress photos, workout logs, and diets attach to a Daily Log ([[glossary]]) whose `weight` field is nullable. A user can log a workout, upload photos, or generate a diet on a day with no weight recorded.

Why: the original schema required weight NOT NULL, which would have blocked any daily activity without a weigh-in first — doesn't match real usage (people train far more often than they weigh in).

---

## Weight-trend gaps are never interpolated

The weight-trend chart (FITNESS-15) reads `daily_logs` filtered to rows where `weight IS NOT NULL`, ordered by date. Two weigh-ins are connected by a line only when they fall on consecutive calendar days; any missing day(s) between them — no row at all, or a row with `weight` left null — leaves a visible gap instead.

Why: a straight line between two distant weigh-ins would assert a value for days that were never actually recorded.

---

## Multiple concurrent active Training Programs

A user may have several Training Programs active at the same time (e.g. Strength + Running + Stretching in parallel). `UserActiveProgram` is a plain many-to-many join, not one-to-one.

---

## Workout Log history is immune to source Training Program edits

`workout_logs.title` is copied from the Training Program at the moment a workout starts, not joined live, and `workout_sets.exercise_id` references the Exercise catalog directly — never a `program_exercises` row. Neither table has any foreign key into `program_exercises`. So reordering, removing, or retargeting a program's exercises, or archiving the program itself, never changes what an already-logged Workout Log displays — nor would renaming it, if a rename action existed (it doesn't yet; no endpoint currently mutates a Training Program's title).

A Workout Log can only be started from a Training Program that's currently active (`UserActiveProgram`) for the caller — archived or never-activated programs are rejected — but once started, the log is independent of the program's later state.

Why: a live join through Program Exercise would let already-logged history silently change.

---

## Workout Set weight/reps vs. duration follows the exercise's category

Same pattern as Program Exercise targets (FITNESS-18): a cardio-category Exercise is logged by `duration_seconds`, every other category by `weight` + `reps` together — never both, never neither. Enforced server-side in `workout-set-values.ts`, not a DB CHECK constraint, mirroring `program-exercise-targets.ts`.

---

## Diet regeneration is always manual

Logging a new weight or changing food/diet preferences never creates a Diet automatically. It only makes a "Regenerate menu" action relevant/visible in the UI — the user must explicitly trigger generation.

Why: avoids the `diets` table filling with rows nobody asked for, and avoids burning calculation work on days the user never opens their diet.

---

## Current diet resolution

The "current" Diet for a user is the most recently created `diets` row for that user (`ORDER BY created_at DESC LIMIT 1`), whenever it was generated. Older Diets are kept as history, not marked obsolete or deleted. See ADR-022.

Why: no extra state (`is_current` flag) to keep in sync; regenerating is just inserting a new row.

---

## Diet menu generation fits portions to the macro targets

Meals are identified purely by position (`meal_position`, 1-based, "Meal 1".."Meal N") — there is no meal-type category. For each meal, one Food Item is picked per required Food Role, then all of that meal's portions are sized together to hit its protein/carb/fat target as closely as possible.

Protein is split equally across meals; carbohydrates taper down by position across the carb-eligible meals and fat tapers across all meals (meal 1 gets the largest share). Each meal's calorie budget is what its own macros cost, so meals differ in size rather than each taking `totalCalories / mealCount`. Once `meal_count` is 3 or more, the last meal gets no carb-role food at all; past 3, the last two don't — the carbs those meals would have carried are redistributed across the rest, not dropped. See ADR-016 and ADR-019.

The day's calorie target is a hard ceiling: a menu may land under it, never over. Macro grams are fitted two-sided and may land slightly either side of target — an earlier rule capped each macro at its target, which is what left carbs starved whenever a meal's other content pushed calories up. Candidate choice is macro-aware: a food too dilute to carry its role's share in a sensible portion is passed over for a denser one from the same role, and a protein source whose own fat would eat most of the meal's fat budget loses to a leaner sibling when there is one. Where a slot draws from several Roles in order, a Role whose candidates carry none of the macro it promises hands the slot to the next Role rather than leaving the meal without that macro.

Why: this is a recommendation feature, not a medical prescription — but the macro grams are the point of a diet, so "close enough" applies to all four numbers, not to calories alone.

A single-item swap or reroll holds that item's calorie contribution — the replacement's `weight_grams` is rescaled so the day total stays within tolerance. Deleting an item drops it and re-derives the day's totals from what is left; the remaining meals keep their portions, since the menu is not rebuilt. A full regenerate re-runs generation from scratch and does not preserve prior swaps or deletions.

---

## Free Foods are eaten uncounted, and paid for at what they cost

A Food Item is a Free Food if its Food Family is `salad_vegetable`, `accent_vegetable` or `cooked_vegetable` — an allowlist, so an item with no Family (or a fatty, starchy or `mushroom` one) is always counted. Every meal draws three Free Foods: two from a bulk Family at 80 g, then an accent at 15 g, falling back to a third bulk item when no accent is available. The first two are bulk-only, so a salad can never hold fewer than two bulk items. They take no part in the portion fit, and their macros are excluded from the Diet's stored totals, so the listed items visibly sum to more than the stated day total. `diet_items.is_counted` carries the distinction, and the API exposes it so the UI can explain it.

What the free items actually supply is subtracted from all four of the day's targets — calories, protein, carbs and fat — before the counted items are fitted, not a flat allowance. Three portions cost 42–50 kcal per meal against the current catalog, which a flat ~120 kcal would overrun at four meals and above, and the calorie target is a hard ceiling. Subtracting the calories alone would leave the counted items chasing the full macro targets inside a smaller calorie envelope, which they cannot reach.

The counted totals therefore land under target by roughly what the free vegetables themselves supply: the plate hits its macros, the plan reports only the counted part of it.

A Free Food cannot be swapped or rerolled. The endpoint rejects an uncounted item with 422 and the menu shows no swap control for it, since a swap never revisits `is_counted` and would leave the replacement uncounted. It can be deleted, which moves no total.

---

## Food Replacement and diet generation are role-based

Two Food Items are interchangeable only if they share the same Food Role (e.g. Chicken Breast and Turkey Breast are both `lean_protein`). Category and Subcategory are for browsing/filtering only, never for substitution logic.

---

## Food Preferences target structured entities, not free text

`user_food_preferences.target_type` + `target_id` point at a Food Category, Food Subcategory, Food Role, or a specific Food Item. A candidate Food Item is excluded from diet generation if any of its own category/subcategory/role/id matches an active allergy or exclude preference's target.

Why: covers both broad exclusions ("all dairy") and narrow ones ("just peanut butter, not all nuts") with one mechanism.

---

## Favorited Food Items are the generation pool, and a menu needs some

A Food Preference of type `favorite` always targets a specific Food Item, never a Category, Subcategory, or Role. Generation draws from the user's favorited Food Items and nothing else, Free Foods included — a user who favorites no vegetables gets no salad. A user with no favorites at all cannot generate a menu.

Exclusions still apply on top of the favorites: a Food Item that is favorited but ruled out by an allergy, an exclusion or a diet type is not generated. Within that pool the protein slot is one pool across `lean_protein`, `fatty_protein`, `plant_protein` and `dairy`, filtered to animal plus fish by Category; `legumes` and `nuts` join it once a diet type excludes `meat` or `fish`. Role `fruit` is drawn by no slot, so its Food Items are browsable and loggable but never generated.

A day picks its least-used candidate first, so a day longer than the favorites list spreads the repeats evenly rather than serving one item in every leftover meal. The two-meal cap on one protein Family relaxes before a repeat does. The protein fat budget of 2.0 times the meal's fat target ranks the pool and never empties it, so a candidate too fatty for a late meal's tapered fat share still takes its turn; one too dilute to carry its slot at any portion is passed over.

A Food Family can prefer a meal position. `casein_dairy` prefers the last meal and is deprioritized in every other meal. An affinity never blocks a pick. The generator resolves the position when it builds the plan, so reordering meals afterwards does not move food between them.

Swap offers favorited same-Role Food Items only. Reroll draws the whole eligible same-Role catalog, favorited or not.

The same Food Item can never be both favorited and excluded/allergied at once — adding either is rejected while the other is active for that item.

Why: lets a user say "build my menu from these foods" and have it hold literally, with reroll as the one control that reaches past the list. See ADR-025.

---

## A favorite says so when generation cannot reach its Food Item

A favorite is marked as not affecting generated menus unless generation can actually produce that Food Item for this user. Reachable means all of: it has a Food Family, its calories per 100 g are above zero, its Food Role is one some meal slot draws, neither its Role nor its Category is excluded by the user's diet types, and — for a protein Role — its Category is one the protein pool currently includes.

Allergies and exclusions are always marked as affecting generation. Removing an item works whether or not it was reachable in the first place.

Why: this marker is the reason unusable Food Items are left in the catalog instead of being corrected one by one, so it has to be truthful or the decision resting on it is unsound. It matters more under ADR-025, where an unreachable favorite is a hole in the pool rather than one lost preference. See ADR-023.

---

## Diet Calculation Algorithm formula is documentation only

`diet_calculation_algorithms.formula` is a human-readable description for display/audit purposes. The real calculation is versioned backend code (e.g. a `mifflinV1()` function) looked up by `code` — never parsed or evaluated at runtime.

Why: new algorithm versions should be code changes, not runtime-evaluated expressions.

---

## Photo analysis failure handling: auto-retry then give up

The Python worker automatically retries a failed job a few times with backoff before marking it permanently failed. No further automatic retries after that; the UI offers a manual retry that re-enqueues the job. Applies independently to each of the two queue job types (see "Photo pose is machine-suggested, then confirmed" below) — a `detect` job failing (e.g. MinIO read error) and an `analyze-alignment` job failing are separate, separately-retried events.

A transient failure (DB/queue/storage blip) is what the backoff retries are for. A permanent failure — `analyze-alignment` finding no usable detection landmarks — skips the retry loop and marks the photo `failed` at once, since re-running the same check on the same stored landmarks cannot change the outcome. Only a manual retry (or fixing the upstream `detect` result) resolves it.

---

## Photo pose is machine-suggested, then confirmed

Uploading a Photo Session no longer means labeling each photo's pose. A `detect` queue job classifies front/side/back for all of a session's photos jointly (one assignment maximizing total confidence across all three, never per-photo in isolation), moving the session to `needs_review`. The user reviews and can edit any of the three before confirming; only once the session is `confirmed` does `progress_photos.pose` count as final, alignment analysis (FITNESS-24/ADR-013's `analyze-alignment` job) run, or the session become eligible for baseline.

Why: these feed health-trend comparisons — a silently-wrong pose label is worse than asking for one confirm tap. See ADR-013.

---

## Ambiguous pose detection needs manual assignment, not retry

A low-confidence or ambiguous `detect` result is a distinct `needs_review` outcome, not `failed`. Retrying the same heuristic against the same photo produces the same ambiguous result — automatic retry only makes sense for transient technical failures (worker crash, MinIO read error), never for "the geometry heuristic genuinely can't tell." Resolution is always a manual pose assignment in the review step, never a retry button.

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

## Migrations run at container boot, not as a separate CI step

The backend container runs `drizzle-kit migrate` as its own entrypoint before serving traffic; CI's `deploy` job only POSTs the Coolify webhook. See ADR-005. A failed migration crashes the new container before it becomes healthy, so Coolify never cuts over and the previous version keeps serving.

A green CI run therefore does not prove the release landed. The check goes green once the webhook is accepted, so a new container crashlooping on a bad migration leaves the old one serving with a green tick on `main`.

---

## Food/exercise data import is a one-time curated seed, not a live sync

A backend script pulls a subset from Open Food Facts/USDA/wger once, maps source categories to this project's category/subcategory/role taxonomy via an explicit mapping table, and inserts with `source` + `is_verified=false`. Re-run manually to add more items later. Per-locale names (uk/ru/es) are sourced from the source API's own translations where it provides them (e.g. wger ships community-maintained en/uk/ru/es names natively — used directly rather than re-translated), machine-translated at the same import step for sources that don't (e.g. Open Food Facts/USDA, English-only), and always marked unverified either way — "unverified" reflects that this project's own reviewers haven't checked it, regardless of translation origin.

wger is the exception that proved the rule: it ships ~620 Spanish exercise names but only a dozen Ukrainian and Russian ones, so those two locales stayed English on screen. Their names now come from `backend/src/scripts/data/exercise-translations.uk-ru.json`, applied by `db:seed:exercise-translations` after the wger import, and keyed by wger id so a rebuilt catalog picks them up again.

A third seed, `db:seed:food-table-ru`, covers the CIS/Eastern-European staples (гречка, творог, кефир, сало…) that Open Food Facts and USDA are thin on: a generic Russian-language КБЖУ-per-100 g reference table bundled as `backend/src/scripts/data/food-table-ru.json` (334 rows, source noted in the file). Its names are Russian, so the base English `name` is machine-translated ru→en at import and the Russian original is kept verbatim as the `ru` translation row; uk/es are translated from the Russian, not round-tripped through English. Machine translation misreads a Russian food name as an ordinary word often enough to matter (Треска → “Fever”, Сом → “Monday”), and it gets every target locale wrong at once because all three come from that same Russian; the 57 names it got wrong are corrected in `backend/src/scripts/data/food-table-ru.names.json`, which the script prefers over DeepL. Overrides apply at insert time, so rows already imported have to be corrected directly. Same unverified-on-import rule as the other sources.

A fourth seed, `db:seed:food-staples`, is the one exception to the unverified rule. It imports `backend/src/scripts/data/food-staples.json` — ADR-020's curated staples set, 130 hand-authored foods under source `curated_staples`, each keyed by an explicit slug — and marks both the `food_calories` row and its uk/ru/es translation rows `is_verified = true`, because the macros and all four locale names were written by hand rather than inferred from a source taxonomy or machine-translated. Macros are stated per 100 g of dry or raw weight, ADR-020's canonical form, and are reference values rather than recomputed from the 4/4/9 Atwater rule: USDA SR Legacy for the Western staples, the CIS КБЖУ convention for творог/кефир and the kasha grains. The file mixes the two deliberately, so checking a кета or минтай row against USDA reports a difference that is not an error. A stated calorie value can therefore sit either side of 4P+4C+9F — under it for anything with fibre, since total carbohydrate includes fibre and fibre does not yield 4 kcal/g — which is why `food-staples.spec.ts` allows 15 kcal or 15%, whichever is larger, as a typo catcher only. The file also declares each row's Food Family, which `resolveFamily` looks up by slug rather than inferring, so the insert path and the classification pass agree and a re-run of the pass never rewrites a staple's Family. The seed runs on every boot from `backend/Dockerfile`'s `CMD`, between the migration and the classification pass, so a deployed environment cannot fall behind the file. It upserts on `(source, sourceId)`, so a boot that has nothing to add writes nothing. It was manual until 2026-09-16, and in that time dev fell ten rows behind and production was never seeded at all.

Why: avoids maintaining a recurring sync job and unattended auto-categorization against a taxonomy the external sources don't natively provide.

---

## Catalog display names resolve against the user's stored locale, not the route

Catalog browse endpoints (Exercise, Food Item) resolve each item's display name against the caller's own `users.locale` value — read server-side from the authenticated identity, never a `locale` value the client passes in. The rule extends to every read path that renders a catalog name inside another entity: Diet items and Food Preference targets. A translation row missing for that locale falls back to the item's base English `name`. Name search matches either the base English name or the translated one, so a user can type what's on screen.

Both language controls — the top-bar switcher and Settings → Profile's Language field — write `users.locale` and move the route segment together, so the stored preference and the displayed UI language can't diverge.

Food taxonomy names (category, subcategory, role) are the exception: they have no translation table, so their labels live in `frontend/messages/*.json` under `FoodCategories`/`FoodSubcategories`/`FoodRoles`, keyed by the seeded name — the same arrangement as `ExerciseCategories`.

Why: the stored preference is the only locale available to read paths with no route context, and resolving it server-side keeps a client-supplied value from choosing which content is served.

---

## Error reports never carry more than a user's UUID

Sentry (see [[decisions]] ADR-006) only ever receives a user's UUID as identifying context — never email, IP, or request bodies, even though NestJS trusts an `x-user-email` header it could easily attach. Only unhandled exceptions and 5xx-class errors are reported; a deliberately-thrown 4xx (validation rejection, 404, 401/403) is expected control flow, not a failure, and is never sent.

Why: this app handles real health data (weight, date of birth, goals) — sending more than the minimum needed to a third-party SaaS should be a deliberate choice, not an SDK default.

---

## PWA offline supports queued writes, not just cached reads

The service worker caches active programs/exercises/recent logs for offline viewing. Workout sets and weight entries written while offline queue in IndexedDB and flush to the NestJS API in order once connectivity returns. The flush is not the service worker's: it runs in the React tree (`OfflineIndicator`, mounted by `TopBar`) on the `online` event, so a queue drains only while a tab is open. No conflict resolution is needed — workout sets are append-only, and a weight write is a last-write-wins upsert on its own `(user, date)` row.

Why: "gym usage without internet" only holds if the core action (logging a set) works with no signal, not just viewing cached data.

---

## Logged weight keeps its own entry unit; only Mifflin input is normalized

A body-weight entry (`daily_logs.weight`) and a workout set's weight (`workout_sets.weight`) each carry their own `weight_unit` (`kg`/`lb`), set once at write time from `users.default_weight_unit` or a per-entry override, and never converted afterward — viewing or re-submitting an entry always shows its original unit. Rows predating the `weight_unit` column, and any row where it's left `null`, are treated as `kg`.

The one exception is the calorie-target calculation's Mifflin input, which needs a single unit to do the math — `calorie-targets.service.ts` converts the latest weigh-in to kg for that formula input only, via `shared/weight-unit.ts`'s `toKg()`; the stored row and the API's own `weighIn.weight`/`weighIn.unit` fields stay unconverted. Broader read-time conversion (the weight-trend chart, a user-facing display-unit toggle) is FITNESS-48, not yet built.
