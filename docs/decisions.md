# Architecture Decisions

---

## ADR-001: NestJS owns the database; Next.js is a pure frontend

Date: 2026-08-15

Status: Accepted

Two write paths to the same schema (NestJS backend and Next.js Server Actions + Drizzle) would fork where business logic lives, how the photo-analysis worker integrates, and how auth is enforced. NestJS is the sole owner of Drizzle/Postgres and all business logic (diet calculation, photo-analysis orchestration, catalogs); Next.js never touches the database directly, and all frontend reads/writes go through the NestJS API. This gives every mutation one code path and one place to enforce authorization/business rules, at the cost of one more service to deploy versus a Next.js-only design.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.

---

## ADR-002: Progress photos are stored in a private MinIO bucket

Date: 2026-08-15

Status: Accepted

Progress photos are sensitive personal data, so `progress_photos.image_url` needed a deliberate access model rather than the default "just store a URL." The MinIO bucket is private; the database stores an object key, not a public URL, and the backend generates a short-lived presigned GET URL per authenticated request after verifying the requester owns the photo, mirroring the presigned-PUT pattern already used for uploads. Every read now needs a backend round-trip to mint a presigned URL, which is the right trade-off for this kind of data.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.

---

## ADR-003: Cross-language photo-analysis queue uses plain Redis primitives, not BullMQ

Date: 2026-08-15

Status: Accepted

The initial plan named BullMQ for the cross-language photo-analysis queue, but BullMQ is a Node-only library with no maintained Python client, and the consumer is the Python/FastAPI analysis worker. NestJS and the worker instead communicate over a plain Redis list or stream (`LPUSH`/`BRPOP` or `XADD`/`XREADGROUP`) with a JSON payload (`{ photoId, objectKey, pose }`); NestJS may still use BullMQ internally for its own scheduling/retry needs, but the cross-language contract is always a primitive both `ioredis` and `redis-py` speak natively. This avoids an unofficial/unmaintained BullMQ-Python bridge in the dependency tree, at the cost of hand-defining and versioning the JSON job schema.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.

---

## ADR-004: Daily Log is decoupled from weigh-in

Date: 2026-08-15

Status: Accepted

The original schema required `diary_entries.weight` NOT NULL, so no daily activity of any kind (photos, diets, workouts) could be logged without also entering a body weight that day — a real UX constraint, and one that's expensive to unwind once other tables depend on it. Renamed to Daily Log, keyed by `(user_id, date)` with `weight` nullable; progress photos, diets, and workout logs attach to the Daily Log regardless of whether a weight was recorded that day. Diet generation and any weight-trend logic must explicitly handle days with no weight value (skip or carry-forward from the last known weigh-in) rather than assuming every Daily Log has one.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.

---

## ADR-005: Migrations run at container boot, not as a separate CI step

Date: 2026-08-15

Status: Accepted

FITNESS-8's original plan assumed a separate CI step would run `drizzle migrate` against production Postgres, but GitHub Actions runners have no network path to it (only reachable inside Coolify's private network) without exposing a shared instance publicly. Instead the backend's own Docker container runs the migration as its entrypoint, before starting the server: `drizzle-kit migrate && node dist/main` (see `backend/Dockerfile`). CI's `deploy` job only triggers a Coolify webhook; Coolify builds and starts the container, and the container migrates itself against whatever `DATABASE_URL` Coolify injects. A failed migration crashes the new container before it calls `app.listen()`, so it never passes Coolify's healthcheck and the previous, still-healthy container keeps running instead of being cut over — `drizzle-kit` had to move from `devDependencies` to `dependencies` in `backend/package.json` so the CLI survives `pnpm deploy --prod`. The first real deploy (2026-08-16) also surfaced that Postgres 15+ doesn't grant `CREATE` on the `public` schema to a freshly created role by default; see `my-projects/docs/runbooks.md` for the one-time grant needed for any new app database on the shared instance.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.

---

## ADR-006: Error tracking is Sentry SaaS, one org shared across pet projects, UUID-only PII

Date: 2026-08-16

Status: Accepted

The app had no error-tracking layer at all. Errors are reported via Sentry SaaS, free tier — self-hosting was rejected since full Sentry OSS needs Kafka+ClickHouse+Postgres+Redis+Zookeeper (~16GB+ RAM) against a VPS with only ~1.4GB free, and off-box tracking stays reachable even when the VPS itself is degraded. One Sentry org is shared across the user's `*.blonskyi.dev` pet projects (mirroring the shared-Postgres pattern), with fitness as its own project inside it; the free tier's ~5k-events/month quota is pooled per-org, accepted as a low-probability risk. Sentry covers backend (`@sentry/nestjs`) and frontend (`@sentry/nextjs`) in production only, never local `pnpm dev`; only unhandled exceptions and 5xx-class errors are reported, not deliberately-thrown 4xx `HttpException`s (validation rejections, 404s, 401/403). Only the user's UUID is attached as Sentry `user` context — `sendDefaultPii` is disabled, request bodies are scrubbed, and email/IP/payload contents never reach Sentry. Alerting uses Sentry's own email notifications, not the Telegram bot used for uptime alerts. Events are tagged with the deploying commit SHA as the release, with frontend source maps uploaded at build time. General log management and the not-yet-built Python photo-analysis worker are explicitly out of scope of this decision. Two post-implementation bugs were found and fixed: frontend source-map uploads were silently producing empty releases (a Coolify `CI` env-var gap, an empty `SENTRY_RELEASE`, and a missing CA-cert trust store in the `node:slim` build image all had to be fixed together), and a real PII leak was caught where the `x-user-email` request header reached Sentry on both frontend and backend before header-scrubbing was added to both sides' `beforeSend`/`beforeSendTransaction`.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.

---

## ADR-007: App header uses a nav menu, not breadcrumbs; account menu is identity-only, no sign-out

Date: 2026-08-17

Status: Accepted

Every other `*.blonskyi.dev` app uses a breadcrumb-style header, but fitness has several genuinely separate top-level sections (Training, Diary, Diet, Photos, Settings) a user needs to move between, which breadcrumbs don't serve. The header is a nav menu, not a breadcrumb trail, scoped to only what's actually built (currently Diary and Settings) and growing as each section ships its first page; it renders on every route except `/onboarding`. The account menu is identity-only (name/email as plain text) with no dropdown, no settings link, and no sign-out — dropped entirely rather than worked around, since fitness has no public logout URL to redirect to (the Hub's sign-out is a Server Action bound to its own session) and clearing the shared cookie itself would contradict ADR-001. Locale switching and theme toggling are out of scope for this header entirely, deferred to FITNESS-11 and a future theming ticket respectively. The header ships without sign-out, a real gap for a personal-data app until the Hub exposes a public logout mechanism.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.

---

## ADR-008: Zustand is the standard tool for cross-component/outside-React client state, adopted when FITNESS-13 needs it

Date: 2026-08-17

Status: Accepted

The frontend had zero client-side state management. FITNESS-13's offline write-queue rule ("writes queue in IndexedDB and flush to the NestJS API in order once connectivity returns") needs client-only state that survives reloads and is driven by a browser `online` event — something neither TanStack Query nor component state solves. Zustand is adopted specifically to build this queue, using the `persist` middleware with a custom IndexedDB storage adapter (e.g. `idb-keyval`, since Zustand's `persist` defaults to `localStorage`). Sync replays through the existing Server Actions rather than a new backend-facing pathway: an `online` event listener drains the queue by calling the same Server Actions already used for the online write path, in order. Standing heuristic for future work: reach for Zustand when state needs to be read or written across a non-parent-child boundary, or must persist/be read outside the React tree entirely; plain `useState`/`useReducer`/Context stays the default for anything a single component or its direct children own.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.

---

## ADR-009: ShadCN is deferred; forms use shared raw-Tailwind primitives instead

Date: 2026-08-20

Status: Accepted

Every form shipped so far (Onboarding, Profile, Weight, Create Food Item) plus the header uses hand-rolled Tailwind-styled elements instead of the ShadCN listed in `docs/architecture.md`'s intended stack — an undocumented divergence flagged by a code review. ShadCN is deferred, same status as TanStack Query: the four forms shipped so far are plain field lists with no interaction complexity ShadCN would meaningfully help with, and the actual duplication across them was addressed directly with two small shared components (`FieldError`, `ProfileFields`) rather than pulling in ShadCN. Trigger for revisiting: adopt ShadCN as one deliberate migration, not form-by-form, once a form needs a primitive that's genuinely hard to hand-roll correctly (`Combobox`, a `Popover`-based date picker, a `Dialog`-driven multi-step flow) — the Training Program builder (FITNESS-18) is the most likely first candidate.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.

---

## ADR-010: mifflin_v1 calorie/macro calculation — formula constants and code/DB split

Date: 2026-08-20

Status: Accepted

FITNESS-26 needed a real, versioned calorie/macro-target algorithm (`mifflin_v1`), but neither `knowledge/business-rules.md` nor the Diet Engine spec pinned down the actual numbers. Decided constants: standard Mifflin-St Jeor BMR (`10×weight(kg) + 6.25×height(cm) − 5×age(yr) + 5` male, `−161` female); activity multipliers matching the `activity_level` enum exactly (sedentary 1.2, light 1.375, moderate 1.55, active 1.725, very_active 1.9); a goal adjustment on TDEE (weight_loss −500 kcal/day, maintenance 0, muscle_gain +300 kcal/day); a 1200 kcal/day safety floor regardless of goal; and a macro split of 2.0 g/kg bodyweight protein, 25% fat, remainder carbs (clamped at 0 rather than rebalanced). `diet_calculation_algorithms` stores only display/audit metadata (`code`/`name`/`description`/`formula`, per the "formula is documentation only" business rule); the actual math is the pure function `calorie-targets/algorithms/mifflin-v1.ts`, registered under the same `code` in `calorie-targets/algorithm-registry.ts`. The one required `mifflin_v1` row is seeded via a mandatory data migration rather than an optional `pnpm db:seed:*` script, since the feature can't function without it. `diets`/`diet_items` tables are deliberately not added yet — FITNESS-26's scope is target calculation only, not persistence.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.

---

## ADR-011: Greedy diet generator — required-role set, portion scaling, and where meal count lives

Date: 2026-08-22

Status: Accepted

FITNESS-30 needed to turn `knowledge/business-rules.md`'s greedy-heuristic description into actual code, which left several concrete choices unmade. Meal count lives on `users.meal_count` (integer, 1–4, default 3) as a stored profile field, not a per-request parameter, editable through the existing `CreateUserDto`/`UpdateUserDto`/`PATCH users/me` pattern. Every meal uses the same four macro-group role slots (protein, carb, `vegetable`, fat), each a fallback chain tried in order until a role has an eligible candidate after Food Preference exclusion (protein `lean_protein → fatty_protein → plant_protein`, carb `complex_carb → simple_carb`, fat `healthy_fat → saturated_fat`); a macro group with zero eligible candidates is skipped for that meal, and only a day with zero candidates across every role fails generation entirely (`UnprocessableEntityException`). The day's calorie target divides evenly across the active meal count, then evenly again across each meal's picked items; tolerance adjustment (~±5%) nudges the largest-calorie items' `weight_grams` first, with protein/carbs/fat moving proportionally rather than being independently corrected. `diets` stores day totals (`total_calories`/`total_protein`/`total_carbs`/`total_fat`) plus a `calculation_metadata` snapshot; `diet_items` stores only `weight_grams`/`meal_type`/`order_index`, with per-item macros derived at read time from the joined Food Item's per-100g values. The algorithm (`diets/greedy-heuristic.ts`) is a pure function with no I/O, mirroring `mifflin-v1.ts`'s split so it's unit-testable without a database. Diet Preferences (vegetarian/vegan/keto/paleo) are a second exclusion source, merged into the same `ExclusionTargets` shape Food Preferences already produce via a table-driven mapping in `diets/diet-preference-exclusions.ts` (vegetarian excludes `meat`/`fish`; vegan additionally excludes `dairy`/`eggs`; keto excludes `grains`/`legumes` plus `complex_carb`/`simple_carb`; paleo excludes `grains`/`legumes`/`dairy`).

Correction (2026-08-30, FITNESS-52): a single-item swap or reroll now holds calories — the replacement's `weight_grams` is rescaled so its calorie contribution matches the item it replaces (was: keep the original grams). An omitted `foodItemId` on the swap route means reroll: the backend picks a random valid same-Role candidate. A full regenerate still re-runs generation into a new Diet row and does not preserve swaps.

Correction (2026-08-31, FITNESS-54): portion sizing for protein/carb/fat role-slots is now driven by that macro's per-meal gram target divided by the candidate's per-100g density, not an even calorie split — protein/carbs/fat no longer just move proportionally with calorie corrections (a real diet had landed at roughly half its protein target this way). The `vegetable` role slot is unchanged. The ±5% calorie-tolerance correction pass still runs afterward, but now only adjusts carb/fat/vegetable items, in that preference order, so it can't undo the protein accuracy the sizing pass just achieved.

Correction (2026-09-03, FITNESS-64): the ±5% tolerance is replaced with a hard ceiling — a day's actual calories, and each of protein/carbs/fat independently, must never exceed target, falling up to 5% short is fine. Drift correction now scopes to a single meal rather than pooling the whole day's delta into one adjustment. A role whose computed portion (including a zero-macro-density candidate) would round below `MIN_WEIGHT_GRAMS` is skipped for that meal entirely rather than force-included at the floor. Fixing a shortfall grows an item capped at doubling its pre-correction weight and bounded by every one of calories/protein/carbs/fat's own remaining headroom to target, so it can't manufacture a new ceiling breach elsewhere; fixing an overshoot shrinks an item without that same floor protection on other macros — dropping it outright rather than leaving it at a token weight when the reduction would take it below `MIN_WEIGHT_GRAMS` — since the calorie ceiling is the one non-negotiable constraint and a single miscategorized calorie-dense/low-macro-density candidate can't otherwise be brought back under target.

---

## ADR-012: next-intl middleware composition and locale cookie lifetime

Date: 2026-08-25

Status: Accepted

next-intl's routing middleware runs first in `proxy.ts`, before Hub auth — a redirect from it (e.g. adding a locale prefix) short-circuits and re-enters on the next request, so auth never reasons about a locale-less path. Auth's final response is a single `NextResponse.next({ request: { headers } })` call carrying both next-intl's `X-NEXT-INTL-LOCALE` and the existing `x-user-id`/`x-user-email` headers — the only shape Next.js forwards to the origin — with `intlResponse`'s cookies copied on separately.

The locale cookie's `maxAge` is set to one year (next-intl defaults to session-only), since "persists across sessions" is an explicit acceptance criterion.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.

---

## ADR-013: Progress photo pose is auto-detected then human-confirmed, not user-labeled at upload

Date: 2026-08-28

Status: Accepted

Uploading a Photo Session no longer requires the user to label which of the three images is front/side/back — a single multi-select input replaces the three separately-labeled inputs. Pose is instead classified by a geometry heuristic over MediaPipe Pose Landmarker output (no separate trained model), solved as a joint assignment across all photos in the session at once (maximizing total confidence, no pose used twice) rather than per-photo independently. Classification runs as its own queue job (`detect`), separate from the alignment-analysis job (`analyze-alignment`, FITNESS-24) — alignment checks are pose-specific, so they can't run until pose is confirmed, and landmarks computed during detection are passed forward rather than re-extracted. Photo Session carries its own status (`uploading → detecting → needs_review → confirmed`), distinct from each Progress Photo's `analysis_status` (which continues to mean only the post-confirm alignment stage); a low-confidence/ambiguous detection is a distinct `needs_review` outcome rather than reusing `failed`, since re-running the same heuristic on the same photo can't change the result — only manual reassignment resolves it. A session can only be marked baseline once `confirmed`.

Alignment analysis (2026-08-30, FITNESS-24): `analyze-alignment` validates pose-specific geometry from the stored detection landmarks (common: subject-in-frame, centered, upright; front: shoulders/hips level, facing camera; side: true profile, body vertical; back: shoulders level, face hidden). Missing or too-few landmarks is a permanent failure — it skips the retry loop and marks the photo `failed` on the first attempt; transient failures (DB/queue/storage) still retry with backoff. A `failed` photo on a `confirmed` session can be manually re-enqueued (`POST /photo-sessions/photos/:photoId/retry-analysis`).

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.

---

## ADR-014: Favorite Food Items narrow generation per-role, as a hard filter not a weighted boost

Date: 2026-08-31

Status: Accepted

`favorite` is a third `food_preference_type` (alongside `allergy`/`exclude`), always targeting a specific Food Item — never a Category/Subcategory/Role, since favoriting a whole taxonomy node wouldn't disambiguate anything a generation role-slot needs. During generation, each role-slot restricts to only the user's favorited, otherwise-eligible items when any exist for that role; a role with none falls back to its full eligible pool, identical to generation with no favorites at all. Implemented as `restrictToFavorites()`, a pure function layered after the existing exclusion-filtered `candidatesByRole` — `greedy-heuristic.ts`'s picking/chain-fallback logic and `swapItem()` are both untouched, so a role favorited only in a fallback chain member (e.g. `fatty_protein` but not `lean_protein`) resolves correctly for free via the chain's existing empty-role fallthrough. The same Food Item can never be both favorited and excluded/allergied at once — rejected at creation, symmetric both directions. `swapItem()`'s replacement picker deliberately does not apply this restriction — a swap should still offer every eligible same-Role item, not just favorites.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.

---

## ADR-015: meal_count past 4 repeats meal types via a stored occurrence column

Date: 2026-09-03

Status: Superseded by ADR-016 (2026-09-04)

`users.meal_count` was capped at 4 because `meal_type` is a fixed 4-value enum (breakfast/lunch/dinner/snack) and generation picked one slot per type. Chosen design: keep the 4-value enum, allow `meal_count` up to 6 (default 3), and add `diet_items.meal_occurrence` (integer, default 1) — `mealSlotsForCount(mealCount)` (`diets/diet.types.ts`) round-robins through the 4 types so count 6 produces breakfast/lunch/dinner/snack/breakfast(2)/lunch(2). `order_index` is scoped within its `(meal_type, meal_occurrence)` pair, not the whole diet. Within a repeated occurrence of the same meal type, `greedy-heuristic.ts` avoids repeating a dish already used earlier that day for that meal type when another eligible candidate exists for the role, falling back to a repeat only when it's the only option. The frontend groups diet items by `(mealType, occurrence)` and labels repeats "Breakfast 2" etc.; the meal-count select computes each option's breakdown (e.g. "6 — 2 Breakfast, 2 Lunch, 1 Dinner, 1 Snack") instead of a hardcoded label table.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.

---

## ADR-016: Positional meal naming with equal-calorie, tapered-macro portioning and a carb-free tail

Date: 2026-09-04

Status: Accepted

Supersedes ADR-015: `meal_type`/`meal_occurrence` are dropped entirely in favor of a single `diet_items.meal_position` integer (1-based, computed fresh at generation time, never persisted as a category). Generated meals are labeled purely by position ("Meal 1".."Meal N", translated per locale) instead of breakfast/lunch/dinner/snack.

Every meal gets an equal share of the day's calories (`totalCalories / mealCount`). Carbohydrate and fat grams taper linearly by position across the carb-eligible meals only, using integer taper weights `carbEligibleCount..1` (meal 1 gets the largest share) — this distributes the day's *full* carb/fat targets over just the eligible meals, which is how a tail meal's would-be share ends up redistributed onto the rest rather than dropped. Protein for each meal is what's left of that meal's fixed calorie share once carb/fat calories are subtracted (`(calories - carbsG*4 - fatG*9) / 4`), floored at 0.

Once `mealCount` is 3 or more, the last meal is excluded from the carb taper entirely (no carb-role food, minimal fat via a zero fat target); once `mealCount` exceeds 3, the last two meals both are. At `mealCount` 1-2 every meal follows the normal taper with no tail. `greedy-heuristic.ts` enforces the carb exclusion by skipping the carb role chain outright for a tail meal (never selecting a candidate for it); the fat exclusion is not a hard skip — a zero fat gram target simply rounds below the minimum-gram floor and drops out through the same mechanism as any other unreachable macro portion.

`mealTargetsForCount` (`diets/diet.types.ts`) computes every meal's raw protein residual, clamps each to 0, then rescales the whole set down proportionally (never up) whenever their sum exceeds `totalProteinG` — keeping the day-level protein ceiling always `<= totalProteinG` while preserving each meal's relative share and the monotonic taper. The FITNESS-64 per-meal correction step (`correctMeal`) is otherwise unchanged — it still receives one `{calories, protein, carbs, fat}` ceiling per meal and corrects that meal's own drift in isolation.

The profile form's meal-count `<select>` no longer computes a per-type breakdown string — options just show the plain number.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.

---

## ADR-017: Meal display order is a separate value from mealPosition; "Meal N" labels always name mealPosition

Date: 2026-09-04

Status: Accepted

A diet's meals have no standalone row — each is a `dietItems.mealPosition` group. Reordering adds a `diet_meal_order` table (`dietId`, `mealPosition`, `displayOrder`) rather than a `displayOrder` column duplicated across every `diet_items` row in a group — one row per meal instead of N. A meal absent from `diet_meal_order` (never reordered) falls back to its own `mealPosition` for display order, so a freshly generated diet needs no order rows at all. The reorder endpoint (`PUT /diets/:dietId/meals/reorder`) takes the diet's full, exact set of `mealPosition` values in the desired order — `mealPosition` doubles as each meal's stable identifier, since it's already unique per diet and no synthetic meal id is needed. Same convention as `training-programs.service.ts`'s `reorderExercises`: exact-set validation, one transaction (existing `diet_meal_order` rows for the diet are deleted and reinserted in the new order).

"Meal N" labels always name a meal's `mealPosition` (the generation slot its macro taper was computed against — ADR-016), never its current display position — reordering only changes which section renders where in the list, not what number a meal is called. Labeling by display position instead would make "Meal 1" lie about which physical meal has the largest carb/fat share once a user reorders away from generation order — exactly the ambiguity ADR-016 introduced positional naming to resolve in the first place.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.
