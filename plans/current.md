# Current Plan

## Goal

Build fitness.blonskyi.dev end-to-end per the resolved architecture ([[architecture]]), domain model ([[domain-model]]), and business rules ([[business-rules]]) — full scope in one pass, not a phased MVP. Source grooming note: `~/Documents/obsidian-notes/fit/Grooming plan for fitness.blonskyi.dev project.md`.

**Status — 2026-09-08: closed.** Every item below is built, merged and deployed; the last one open, the OIDC client registration, was verified against production today. New work belongs in `plans/backlog.md` and Plane, not here.

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
