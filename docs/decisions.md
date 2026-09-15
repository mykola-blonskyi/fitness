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

Status: Accepted; narrowed by ADR-022 (2026-09-03) — diets no longer attach to the Daily Log.

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

Status: Accepted; the no-sign-out half superseded by ADR-018 (2026-09-05)

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

Correction (2026-09-15, ADR-023): the protein role-slot is no longer a fallback chain. It draws one pool spanning `lean_protein`, `fatty_protein`, `plant_protein` and `dairy` at once, filtered by Category to animal plus fish, with `legumes`/`nuts` joining once a diet type excludes `meat` or `fish` — a chain that stopped at the first non-empty role never reached plant protein, because a vegetarian's dairy and eggs kept `lean_protein` populated. The carb and fat slots stay chains, but a role whose candidates carry none of its macro now hands the slot to the next role in the chain instead of abandoning it.

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

Status: Superseded by ADR-023 (2026-09-15). The partition key moved Role → Family (ADR-020/ADR-021) → macro slot, and ADR-014's swap exemption now holds only for explicit swap, not reroll. That a favorite targets a Food Item and never a taxonomy node still stands.

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

Status: Partially superseded by ADR-019 (2026-09-08) — positional naming and the carb-free tail stand; the equal-calorie split, the calorie-residual protein share and the tail's zero fat target do not. The carb-free tail is in turn superseded by ADR-020 (2026-09-12): a dinner has no grain slot because its Archetype says so. Positional "Meal N" naming stands.

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

---

## ADR-018: fitness is an independent OIDC client of login.blonskyi.dev

Date: 2026-09-05

Status: Accepted

Supersedes ADR-007's no-sign-out decision.

Authentication moves off the Hub's shared `.blonskyi.dev` cookie onto `login.blonskyi.dev` as a standard OIDC client (authorization code + PKCE, `client_id` `fitness`), with its own `AUTH_SECRET` and host-only session cookie. NestJS is unchanged in kind — still only `x-user-id`/`x-user-email` over the private network, no cookie/token validation. Identity comes from `profile.sub` in the `jwt` callback, never `user.id` (Auth.js substitutes a random value there absent a database adapter). Session `maxAge` is 24h; per-request revocation would need login's opt-in RFC 7662 introspection, deferred.

login's `sub` lands in a new `users.identity_sub` column, not the primary key — `users.id` has no `ON UPDATE CASCADE` from the seven+ tables referencing it, so re-pointing it would mean an FK-cascading rewrite. Migration `0024` adds the column, backfills it to the existing `id` (the Hub's id), then constrains it `NOT NULL UNIQUE`; `id` itself is never touched. Because the backfilled value can never match a real `sub`, `IdentityGuard` (the one place a `sub` becomes a `users.id`) reconciles by `email` (case-insensitively — login's claim casing isn't guaranteed) when the `identity_sub` lookup misses, updating it in place rather than treating the row as new — otherwise the owner's first login would silently orphan every row that FKs to their existing `id`.

Sign-out is added (supersedes ADR-007 — both of its reasons no longer hold once fitness owns its own session); it clears only this app's cookie. Env: added `OIDC_ISSUER`/`OIDC_CLIENT_SECRET`; dropped `API_URL`/`PROJECT_SLUG`/`COOKIE_DOMAIN`/`DEV_BYPASS_AUTH` and friends; `HUB_URL` takes over `API_URL`'s one surviving use, the nav rail's hub link.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.

---

## ADR-019: Meal targets are macro-priced, and portions are fitted to all three macros at once

Date: 2026-09-08

Status: Accepted; the equal-protein split is superseded by ADR-020 (2026-09-12) once Meal Archetypes carry their own macro shares; the joint macro fit itself stands.

Supersedes ADR-016's equal-calorie split, its calorie-residual protein share, and the tail meal's zero fat target. Positional naming, the linear carb taper and the carb-free tail itself are unchanged.

`mealTargetsForCount` splits protein equally across meals, tapers carbs across the carb-eligible meals and fat across all of them, and prices each meal at what its own macros cost (`P*4 + C*4 + F*9`) rather than giving every meal `totalCalories / mealCount`. Meals therefore differ in size — the front-loaded carb/fat meals are the bigger ones. An equal-calorie split cannot coexist with a steep carb/fat taper at a high protein share: at 310 g protein against 2463 kcal, meal 1's tapered carbs and fat alone cost more than its whole share, so the residual protein clamped to 0 and the meal was arithmetically impossible before generation even started. That impossibility, not the sizing, is what forced the correction pass to gut carbs (−47 g) and leave fat at nearly double target (+26 g).

`greedy-heuristic.ts` picks a candidate per role from those that can carry the meal's share of their own macro within a per-role portion cap (protein 600 g, carbs 500 g, vegetables 400 g, fat 80 g), preferring — for the protein role — one whose incidental fat stays under 70% of the meal's fat budget. Portions are then fitted to the meal's protein/carb/fat target together by bounded coordinate descent on squared error measured in calories, replacing the sequential per-role sizing plus grow/shrink correction passes (FITNESS-64/66) entirely. Fitting all three macros at once is what pays for a protein source's incidental fat out of the fat role instead of overshooting the day.

The calorie target stays a hard ceiling but is now enforced once over the whole day rather than meal by meal, so a meal that needs slightly more than its macros cost can borrow from meals that came in under; the shrink takes what it needs from carb/vegetable/fat items before touching protein. Individual macro grams are no longer capped at target — they are fitted two-sided, and may land a few grams either side. Vegetables keep a 100 g floor per meal since they are the one role with no macro target of their own.

Measured over 300 randomised menus per meal count against realistic catalogue foods: protein lands within ~4 g of target and carbs/fat within ~7 g at meal counts 3-6, against 19-47 g misses before. At meal counts 1-2 an extreme protein target (310 g/day) still falls short — no single portion of one food can carry it — which is accepted rather than solved by allowing multiple items per role.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.

---

## ADR-020: Meals are built from Archetypes and Food Families, not from four macro role-slots

Date: 2026-09-12

Status: Accepted (phased — phase 1 in progress); the bulk/accent half of its salad rule is settled by ADR-021 (2026-09-13)

Narrows ADR-014 (favorites restrict a Food Family, not a whole Role), and supersedes ADR-016's carb-free-tail rule and ADR-019's equal-protein split once phase 2 lands (an Archetype declares its own share of the day's macros). ADR-016/ADR-017's positional "Meal N" labels stand — meals stay numbered, not named.

Every generated meal was the same four slots — one protein, one carb, one vegetable, one fat — filled independently from the whole Role pool. That produces plans that hit their macros and still read as nonsense: the `complex_carb` pool is 34 items of which a third are flours, crackers and branded French breads with no plain rice among them; `lean_protein` offers beef brains, frankfurters and "Potato salad with egg"; `vegetable` offers vegetable chips, babyfood carrots, and garlic as a 100 g salad.

A meal is now a **Meal Archetype** — `breakfast`, `main`, `dinner`, assigned by position (meal 1, the last, and everything between) — composed of **Meal Slots**. A Slot names a **Food Family**, the number of items it draws, the macro it carries and its portion range; several items under one Slot render as one labelled group. Archetypes and Slots are versioned code, serialisable for a later move into rows. Each Archetype declares its relative share of the day's protein/carb/fat, which is what makes dinner light without a separate taper.

Food Family is a new taxonomy level below Subcategory (~20 families) and becomes the unit of interchangeability: slots draw from it, swaps offer within it, favorites narrow inside it. **A Food Item with no Family is never generated** — it stays browsable and loggable, which is how flours, offal, babyfood and branded products leave the pool without a rule of their own. Role keeps its existing meaning for Food Preferences and for sizing portions. Potato and sweet potato move to Role `complex_carb`, beans and lentils to `plant_protein`, olives to a fat; Category is untouched so browsing and category-level exclusions keep working.

Supporting rules: plans are stated in dry/raw weight and cooked duplicates get no Family; no Food Item repeats within a day and at most two meals draw from one protein Family; salads are three items from `salad_vegetable`, at least two of them bulk; the `salad_vegetable` and `cooked_vegetable` Families are **Free Foods** — fixed nominal portions, excluded from the macro fit and from displayed totals, paid for by subtracting what the picked portions actually supply — calories and each macro — from the day's targets before fitting (an allowlist and an exact cost, because an unclassified vegetable must stay counted and a flat ~120 kcal allowance breaks the hard calorie ceiling at six meals); ~50–80 foods carry a **Serving** (1 egg, 1 spoon, 1 apple) and snap to whole units; breakfast and dinner have Archetype variants, pinnable per profile, defaulting to `vary`; `meal_count` narrows from 1–6 to 3–6. Macro targets still win over nominal portions — a 310 g protein target over 5 meals is ~200 g of chicken per main, not a shortfall.

The pool itself is curated rather than inherited: a hand-authored staples set of ~80–120 foods (reviewed before seeding) plus a Family classification pass over the ~570 generation-eligible catalog rows, machine-proposed in the seed scripts and corrected through a reviewed override file — the same pattern `food-table-ru.names.json` already uses.

Delivered in three phases: (1) the pool and the picking rules — families, staples, curation, reclassification, no-repeat, protein-family variety, free vegetables and the allowance, with today's four-slot meal shape unchanged; (2) the shape of a meal — Archetypes, Slots, grouped multi-item slots, Servings, Archetype macro weights replacing the taper, swap retargeted to Family; (3) variants, the profile settings, meal-level reroll and the `meal_count` restriction.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.

---

## ADR-021: A Free Food's portion class is carried by its Food Family, and favorites narrow by Family

Date: 2026-09-13

Status: Partially superseded by ADR-023 (2026-09-15) — the Free Food portion class stays on the Food Family and the bulk/bulk/accent salad slots stand; favorites no longer narrow by Family. Its measurement of why Role was the wrong key is what ADR-023 built the slot rule on.

ADR-020 said a salad is three items with at least two of them bulk, and nothing in the schema separated an onion from a tomato. **Bulk versus accent is a Food Family, `accent_vegetable`, not a Food Item attribute.** `salad_vegetable` and `cooked_vegetable` stay bulk at 80 g; `accent_vegetable` is served at 15 g. One record per Family in `free-foods.ts` carries both the grams and the class, so the two cannot disagree, and a salad is composed from a slot table of `[bulk, bulk, accent-or-bulk]` — the first two slots accept bulk only, which is what makes ADR-020's two-of-three rule hold by construction rather than on average. With no `accent_vegetable` row in a catalog the third slot falls through to bulk and generation is unchanged, so code, staples and a classification pass can land in any order.

A per-item portion column was rejected. `food_families` is unconstrained text seeded from a closed TS list, so a Family value costs no migration, while a column costs one and opens a second classification axis that production must populate, review and keep synced with the first — and production has not yet run the first. The column also represents states that mean nothing (`{ family: 'poultry', freePortionGrams: 15 }`), where a Family cannot. `accent_vegetable` is the first Family whose members are not interchangeable with the Family they left, which is the point: ADR-020 makes Family the unit of interchangeability, and a Family holding both parsley and tomato was mis-drawn.

**ADR-014's hard filter is not softened to a bias; its partition key changes from Role to Family**, which is the narrowing ADR-020 already recorded and parked in phase 2. Within a Family a favorite still wins outright and a Family with no favorite still falls back to its full pool. Role was the right key while every Role contributed one item per meal; Role `vegetable` now contributes three, and one favorited vegetable collapsed the Role to a single item that the day then served in every meal. A bias would not have fixed that, since a weighted pick over a one-item pool still returns that item. This reaches past the salad: favoriting chicken now narrows `poultry` and leaves cod, beef and eggs in the pool, where before it narrowed all of `lean_protein`.

Measured over five seeds and 300 menus per meal count, both pools: the calorie ceiling, the no-repeat rule and the protein-Family cap are unchanged, and no salad in 108,000 held fewer than two bulk items. On the moderate profile the three mean absolute macro deltas cost at most 0.76 g in total, at five meals. On ADR-019's extreme 310P profile they cost 0.78 to 4.16 g, which **fails** the +0.5 g per-macro and +1.0 g total thresholds this change was measured against: a profile whose protein target is unreachable already misses carbs by 42-52 g and has no headroom left to absorb the ~65 g of vegetable the accent slot removes from each meal. Accepted on the judgement that a target nobody can hit is not the one to protect. See `reports/audits/2026-09-13-salad-composition.md`.

Two known divergences are left for phase 2's Archetypes. `isFreeFood` covers `cooked_vegetable`, so a salad can legitimately be three mushrooms; and garlic and ginger stay outside the taxonomy, as cooking aromatics rather than things eaten at 15 g in a raw salad.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.

---

## ADR-022: A Diet is user-scoped and valid until regenerated, not a per-day record

Date: 2026-09-03

Status: Accepted

Narrows ADR-004. Progress photos and workout logs still attach to the Daily Log; diets no longer do.

`diets.daily_log_id` is dropped and replaced by `diets.user_id`. A Diet is a standing plan that stays current until the user regenerates it, so `POST /diets/generate` and `GET /diets/current` take no date at all, and `findCurrent` returns the most recently created row for the user regardless of when it was generated (`ORDER BY created_at DESC LIMIT 1`, served by the `(user_id, created_at)` index). Older rows are kept as history.

The row carries no date of its own, only `created_at`. No query can therefore recover what was planned on a past day, and a Diet generated three weeks ago is still the current one if nothing has replaced it. That is what "valid until regenerated" means here: the endpoints dropped their `:date` param rather than defaulting it to today.

`0020_diet_user_scoped.sql` deletes every `diets` and `diet_items` row before dropping the column instead of backfilling a `user_id` from the old Daily Log. The existing rows were test data and FITNESS-61 allowed clearing them explicitly.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.

---

## ADR-023: Favorites narrow the macro slot, and a Food Family can prefer a meal position

Date: 2026-09-15

Status: Accepted

Supersedes ADR-014's and ADR-021's partition key and ADR-014's swap exemption. Implements the "slow protein at dinner" half of ADR-020's `dinner` Archetype before phase 2.

A favorite narrows the **macro slot** it belongs to (protein, carb, vegetable, or fat), not its Food Family. #112 measured Family narrowing in production and found it narrowed 56 candidates to 49, then replaced it with a bias inside `pick`. That bias was too weak for the opposite reason. It runs after the density, fat-budget and day-rule filters, and those filters have already removed every favorite by the time it reads them. The slot is also the only level a user can name, because nobody knows their pickles are `accent_vegetable`.

The protein and carb slots narrow **hard**. If either holds an eligible favorite, only favorites fill it. They are used round-robin, so every favorite appears before any favorite repeats, and no per-item cap applies. The vegetable and fat slots take the **soft** rule instead. A favorite goes first and may repeat twice, then the normal pool opens. Those two slots take three items per meal. ADR-021 records what a hard narrow does to them. One favorited vegetable ends up served in every meal.

A slot with no favorite draws its normal pool. For protein that pool is animal plus fish by Category. `legumes` and `nuts` join it as soon as a diet type excludes `meat` or `fish`, so a vegetarian gets lentils rather than only dairy and eggs.

A favorite raises `PROTEIN_FAT_BUDGET_SHARE` from 0.7 to 2.0 times the meal's fat target. It does not skip the check. At a protein target of about 285 g a day, the 0.7 budget admits only the leanest protein. That left cottage cheese as the one qualifying favorite, and the casein rule below puts cottage cheese at dinner. At 2.0 turkey qualifies, and 449 g of egg per meal still does not. A favorite still has to pass the density and portion filters unchanged. The day's fat target stays a target. Calories remain the only hard ceiling.

`MEAL_AFFINITY` is a `Partial<Record<FoodFamily, …>>`, the same shape `free-foods.ts` uses for `FREE_FOODS`. It carries `last_meal` for `casein_dairy` and no entry for the other 19 families in `FOOD_FAMILIES` (`backend/src/food-items/food-item.types.ts`). The generator deprioritizes casein outside the last meal and prefers it at the last meal. An affinity never blocks a pick, so it cannot empty a slot. The generator resolves "last meal" by position when it builds the plan, so a later reorder stays a display concern.

Reroll obeys favorites, because "give me another one like this" has to honor the rule that produced the menu. Explicit swap still offers every eligible same-Role item, because narrowing a list the user opened on purpose is hostile.

Full rationale/alternatives: `~/Documents/obsidian-notes/projects_history/fitness/docs/decisions.md`.
