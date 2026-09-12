# Current Plan

## Goal

Build fitness.blonskyi.dev end-to-end per the resolved architecture ([[architecture]]), domain model ([[domain-model]]), and business rules ([[business-rules]]) — full scope in one pass, not a phased MVP. Source grooming note: `~/Documents/obsidian-notes/fit/Grooming plan for fitness.blonskyi.dev project.md`.

**Status — 2026-09-12.** The original build (Phases 1-6 below) is closed: every item is built, merged and deployed. The active plan is now the menu-composition rework (ADR-020), tracked immediately below.

---

# Active plan — Menu composition rework (ADR-020)

## Goal

Generated plans should read like food a person would actually cook and eat, not a macro-correct list of ingredients. Today every meal is the same four role-slots filled independently from an uncurated pool: no plain rice exists in it, while beef brains, frankfurters, vegetable chips and babyfood carrots do. Target model, slot by slot, is in ADR-020; the vocabulary (Meal Archetype, Meal Slot, Food Family, Serving, Free Food) is in [[glossary]].

Delivered in three phases — a half-migrated model generates worse plans than either end state, so each phase has to stand on its own.

## Phase 1 — The pool and the picking rules

Meal shape stays as it is today. The foods stop being absurd.

- [x] Food Family taxonomy: table + nullable `food_calories.family_id`, ~20 families per ADR-020
- [x] Family classification pass over the ~570 generation-eligible rows — rule-based inference in the seed scripts plus a reviewed override file (`food-families.json`), same pattern as `food-table-ru.names.json`
  - Deploy note: the migration only adds a nullable `family_id`. Every existing row stays unclassified until the classification script runs against that database, and re-seeding does not do it (`insertItem` never rewrites an existing row's classification). Production needs that run after the migration deploys and **before** generation is restricted to Family-carrying foods. In a checkout it is `pnpm --filter backend db:classify:food-families`; the deployed image has no ts-node and no `src/`, so on the server it is `node dist/scripts/classify-food-families.js`. Both accept `--dry-run`, which reads only. Run it only from a build at or newer than the curated staples commit: an older build has no `curated_staples` branch in `resolveFamily`, so it computes `null` for all 120 staples and strips their Family. Verified against dev: the older code reports 120 would change, the current code reports 0.
- [x] Curated staples set (~80-120 foods: macros, family, names in all four locales), delivered as a reviewable file **before** seeding
  - 120 foods in `backend/src/scripts/data/food-staples.json`, source `curated_staples`, seeded by `pnpm --filter backend db:seed:food-staples` (`node dist/scripts/seed-food-staples.js` on a server). Every one of the 19 families has at least three members, asserted by `food-staples.spec.ts`. A staple declares its Family in the file and `resolveFamily` reads it from there, so the classification pass leaves those rows alone.
  - Outstanding: the file has not had a human read-through yet, and production has not been seeded.
  - **24 of the 120 staples are not reachable by generation**: 8 `casein_dairy` (Role `dairy`) plus 10 `fruit` and 6 `berries` (Role `fruit`). `MEAL_ROLE_CHAINS` has no chain for either Role, so the candidate query never loads them. Measured: seeding 120 staples grew the generation pool by exactly 96. Keeping those Roles is what ADR-020 requires so "exclude dairy" and "exclude fruit" keep working, so this is not a misclassification to fix here. It does mean ADR-020's own target plan is not yet buildable, since its breakfast is porridge plus fruit plus eggs and its dinner is a slow protein plus fruit. All 24 come into play in Phase 2, when an Archetype's Slots draw by Family instead of by Role.
  - Ten staple names collided exactly with their RU-import twins in the same Family (Orange, Pear, Plum, Strawberries, Peanuts, Pistachios, Grapefruit, Mandarin, sunflower and flaxseed oil), which would have let one day hold both copies, since the no-repeat rule matches on item id. The RU twin is overridden out of the pool in `food-families.json` and the reviewed staple kept.
- [ ] Generation draws only from Food Items that carry a Family (no rule needed for sweets/beverages/flours/offal — they simply have none)
  - Must land **after** the two picking rules below, not before. Measured: restricting the pool from 430 candidates to 176 takes days that repeat a Food Item from 169/300 to 300/300 at six meals, and the worst case from the same food in three meals to the same food in all six. See `reports/audits/2026-09-12-diet-quality-baseline.md`.
- [ ] Reclassification: potato + sweet potato -> `complex_carb`/`starchy_vegetable`, beans + lentils -> `plant_protein`, olives -> fat; Category untouched
- [ ] Dry/raw weight as the canonical form; cooked duplicates get no Family
- [x] No Food Item twice in a day (fall back to a repeat only when the Family has nothing else eligible)
- [x] At most 2 meals per day drawing from the same protein Family
- [x] Free Foods: the `salad_vegetable` and `cooked_vegetable` Families get fixed nominal portions, leave the macro fit and the displayed totals, and what they actually supply is subtracted from all four targets before fitting (FITNESS-74)
  - Not a flat ~120 kcal: measured against the catalog, three nominal portions cost 42-50 kcal per meal, so a flat allowance under-prices the day from 4 meals up (302 kcal at 6) and the calorie ceiling is hard. Subtracting only calories and not the macros made every delta worse; taking all four off restores them. Plate carb delta 5.2/11.9/10.6/10.0 -> 0.8/2.3/2.9/2.7 at 3-6 meals.
  - Deferred from this ticket: the 80 g/15 g bulk-vs-accent split (no attribute separates onion and parsley from tomato; both sit in `salad_vegetable`) and the favourites bias (contradicts ADR-014's hard filter). Both want FITNESS-71's staples data or a product call.
  - Deploy gate: production's `family_id` is still null everywhere and the 100 g vegetable floor is gone, so the classification pass must run there before this ships or diets get no vegetables at all.

## Phase 2 — The shape of a meal

- [ ] Meal Archetypes (`breakfast`/`main`/`dinner`) + Meal Slots in versioned code, serialisable
- [ ] Archetype macro weights replace ADR-019's equal-protein split and ADR-016's carb/fat taper
- [ ] `diet_items.slot_key` + multi-item slots (3-item salad, 1-2 item dinner protein), rendered as one labelled group
- [ ] Servings (`serving_unit`/`serving_grams` on ~50-80 foods) + whole-unit snapping in the fit
- [ ] Swap/reroll retargeted from Role to Family; slot-level reroll ("give me another salad")
  - A Family is not a calorie band: `white_fish` spans 0.4-30.7 g fat and 67-331 kcal/100 g, because `red_fish` keys off five salmonid names and every other finfish falls through to it. Offering cod -> sea eel as a swap is a four-fold calorie substitution, so the swap has to filter on Role as well as Family, or `white_fish` has to be split first. Measured in `reports/audits/2026-09-12-food-family-classification.md`.
- [ ] Favorites narrow per Family instead of per Role (ADR-014 as narrowed by ADR-020)

## Phase 3 — Variants and settings

- [ ] Breakfast and dinner Archetype variants, with `vary` as the default
- [ ] Profile settings to pin either end of the day to one variant
- [ ] Meal-level reroll (re-pick the variant and everything in it)
- [ ] `meal_count` narrowed from 1-6 to 3-6, with stored 1s and 2s bumped to 3

---

# Closed plan — initial build (2026-08 .. 2026-09-08)

---

## Phase 1 — Project scaffolding & auth

- [x] Scaffold Next.js frontend + NestJS backend per `my-projects/boilerplates/subdomain-app.md` (FITNESS-7)
- [x] Wire up Hub auth reuse (Auth.js cookie validation in Next.js, `x-user-id`/`x-user-email` forwarding to NestJS) (FITNESS-9) — superseded by Phase 6
- [x] Register `fitness` project slug + access grant in the Hub's Postgres (FITNESS-9) — superseded by Phase 6
- [x] Set up Drizzle schema for User, Daily Log (see ADR-004), Training Program stack, and migration step in CI/CD (User schema + migration-in-CI via FITNESS-7/8; Daily Log schema via FITNESS-14; Training Program stack schema via FITNESS-18/19)

---

## Phase 2 — Training & body-weight diary

- [x] Exercise catalog (schema + one-time seed import from wger/ExerciseDB + translations) (FITNESS-16)
- [x] Exercise catalog browse/search + manual creation UI (FITNESS-17)
- [x] Training Programs, Program Exercises, multiple concurrent active programs (many-to-many `UserActiveProgram`) (FITNESS-18, FITNESS-19)
- [x] Workout Logs/Sets, started from an active program or ad hoc (FITNESS-20), with FITNESS-13's generic offline queue wired in via `features/workout-logs/offline.ts` (FITNESS-21)
- [x] Daily Log + weigh-in tracking (FITNESS-14)

---

## Phase 3 — Diet engine

- [x] Food catalog (schema + one-time curated seed from Open Food Facts/USDA + category/subcategory/role mapping + translations) (FITNESS-28)
- [x] Polymorphic Food Preferences (category/subcategory/role/food_item targets) + Diet Preferences (FITNESS-29)
- [x] Diet Calculation Algorithm registry (versioned code, `formula` field is documentation only) (FITNESS-26)
- [x] Greedy-heuristic diet generator, manual regeneration trigger, current-diet resolution by `created_at` (FITNESS-30)
- [x] Food Item swap (same-Role) on a generated Diet (FITNESS-31)
- [x] Diet menu UI (generate/regenerate, meal-grouped menu) + hold-calories swap/reroll (FITNESS-52)

---

## Phase 4 — Photo progress tracking

- [x] Presigned upload flow (Photo Session, Progress Photo, private MinIO bucket + presigned GET on read) (FITNESS-22)
- [x] Redis job queue (plain list, JSON payload — not BullMQ, see ADR-003) between NestJS and the Python worker (FITNESS-23)
- [x] Python/FastAPI worker: MediaPipe pose analysis, own MinIO credentials, auto-retry-then-fail (skeleton + stub via FITNESS-23; real `detect` classification via FITNESS-49; real pose-specific `analyze-alignment` + permanent-vs-transient retry semantics + manual retry endpoint/UI via FITNESS-24)
- [x] Progress gallery grouped by date, baseline comparison (FITNESS-25)

---

## Phase 5 — Polish & deploy

- [x] next-intl for UI chrome (en/uk/ru/es) (FITNESS-11)
- [x] PWA manifest + service worker offline caching (FITNESS-12)
- [x] Generic IndexedDB offline write-queue + sync + offline/syncing/synced indicator, reusable by any feature's write endpoint; wired up to the daily-log weight entry Server Action as the concrete example (FITNESS-13)
- [x] Coolify/Docker Compose deployment, CI/CD gates (lint, prettier, tests, migration-before-deploy) — live at fitness.blonskyi.dev (FITNESS-8)
- [x] Plane workspace (FITNESS) ticket setup: Modules = specs above, Work items = individual tickets, branch-per-ticket workflow

---

## Phase 6 — Identity migration to login.blonskyi.dev

- [x] Frontend becomes an independent OIDC client of `login.blonskyi.dev` (own Auth.js instance, authorization code + PKCE, own `AUTH_SECRET`, host-only session cookie); the Hub's shared `.blonskyi.dev` cookie and its `/api/auth/validate` call are dropped (see ADR-018)
- [x] `users.identity_sub` added as its own column with a backfill migration; `users.id` and every FK referencing it are left untouched
- [x] Identity resolution reconciles on email in `IdentityGuard`, so the owner's first login under a new `sub` keeps their existing row instead of orphaning it
- [x] Sign-out control added to the header (supersedes ADR-007's no-sign-out decision)
- [x] Operational: `fitness` registered as a client of the deployed login instance, with `OIDC_ISSUER`/`OIDC_CLIENT_SECRET`/a fresh `AUTH_SECRET` set in Coolify. Verified 2026-09-08 — `login.blonskyi.dev` serves its discovery document, production runs the post-#78 build, and a sign-in from `fitness.blonskyi.dev` produces an authorize request the issuer accepts for `client_id=fitness` with the callback URL whitelisted. Only the token exchange is still unproven from outside, since it takes a real login.

---

## Risks

- Food/exercise seed data quality: catalog rows were bulk-approved in dev and production on 2026-09-08, but their machine-translated names went with them unreviewed (`food_calorie_translations.is_verified` is still false for every row) — needs an ongoing manual review pass, not a one-time fix
- Greedy diet-generation heuristic may produce awkward menus at the tails (very low/high calorie targets, sparse Food Preferences) — worth a manual spot-check once seed data exists
- Shared Postgres/Coolify host with other pet projects — migrations must stay scoped to this project's tables and never run unattended after a failed deploy (see [[business-rules]] "Migrations are a mandatory pre-deploy gate")
- GitHub Actions billing is failing, so a push to `main` no longer auto-deploys — no workflow has run since 2026-09-03, and every release since then has to be triggered by hand in Coolify, which is why production can sit several merged PRs behind `main`
