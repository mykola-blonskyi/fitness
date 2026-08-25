# Current Plan

## Goal

Build fitness.blonskyi.dev end-to-end per the resolved architecture ([[architecture]]), domain model ([[domain-model]]), and business rules ([[business-rules]]) — full scope in one pass, not a phased MVP. Source grooming note: `~/Documents/obsidian-notes/fit/Grooming plan for fitness.blonskyi.dev project.md`.

---

## Phase 1 — Project scaffolding & auth

- [x] Scaffold Next.js frontend + NestJS backend per `my-projects/boilerplates/subdomain-app.md` (FITNESS-7)
- [x] Wire up Hub auth reuse (Auth.js cookie validation in Next.js, `x-user-id`/`x-user-email` forwarding to NestJS) (FITNESS-9)
- [x] Register `fitness` project slug + access grant in the Hub's Postgres (FITNESS-9)
- [ ] Set up Drizzle schema for User, Daily Log (see ADR-004), Training Program stack, and migration step in CI/CD (User schema + migration-in-CI done via FITNESS-7/8; Daily Log schema done via FITNESS-14; Training Program stack schema not yet started)

---

## Phase 2 — Training & body-weight diary

- [x] Exercise catalog (schema + one-time seed import from wger/ExerciseDB + translations) (FITNESS-16)
- [x] Exercise catalog browse/search + manual creation UI (FITNESS-17)
- [x] Training Programs, Program Exercises, multiple concurrent active programs (many-to-many `UserActiveProgram`) (FITNESS-18, FITNESS-19)
- [x] Workout Logs/Sets, started from an active program or ad hoc, online only (FITNESS-20) — offline queue wiring (FITNESS-13's generic mechanism) not yet connected to this feature, tracked as follow-up
- [x] Daily Log + weigh-in tracking (FITNESS-14)

---

## Phase 3 — Diet engine

- [x] Food catalog (schema + one-time curated seed from Open Food Facts/USDA + category/subcategory/role mapping + translations) (FITNESS-28)
- [x] Polymorphic Food Preferences (category/subcategory/role/food_item targets) + Diet Preferences (FITNESS-29)
- [x] Diet Calculation Algorithm registry (versioned code, `formula` field is documentation only) (FITNESS-26)
- [x] Greedy-heuristic diet generator, manual regeneration trigger, current-diet resolution by `created_at` (FITNESS-30)

---

## Phase 4 — Photo progress tracking

- [ ] Presigned upload flow (Photo Session, Progress Photo, private MinIO bucket + presigned GET on read)
- [ ] Redis job queue (plain list/stream, JSON payload — not BullMQ, see ADR-003) between NestJS and the Python worker
- [ ] Python/FastAPI worker: MediaPipe pose analysis, own MinIO credentials, auto-retry-then-fail
- [ ] Progress gallery grouped by date, baseline comparison

---

## Phase 5 — Polish & deploy

- [ ] next-intl for UI chrome (en/uk/ru/es) (FITNESS-11, not started)
- [x] PWA manifest + service worker offline caching (FITNESS-12)
- [x] Generic IndexedDB offline write-queue + sync + offline/syncing/synced indicator, reusable by any feature's write endpoint; wired up to the daily-log weight entry Server Action as the concrete example (FITNESS-13)
- [x] Coolify/Docker Compose deployment, CI/CD gates (lint, prettier, tests, migration-before-deploy) — live at fitness.blonskyi.dev (FITNESS-8)
- [x] Plane workspace (FITNESS) ticket setup: Modules = specs above, Work items = individual tickets, branch-per-ticket workflow

---

## Risks

- Food/exercise seed data quality: imported items start `is_verified=false` and machine-translated names are unverified — needs an ongoing manual review pass, not a one-time fix
- Greedy diet-generation heuristic may produce awkward menus at the tails (very low/high calorie targets, sparse Food Preferences) — worth a manual spot-check once seed data exists
- Shared Postgres/Coolify host with other pet projects — migrations must stay scoped to this project's tables and never run unattended after a failed deploy (see [[business-rules]] "Migrations are a mandatory pre-deploy gate")
