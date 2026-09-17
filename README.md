# fitness

Fitness-tracking PWA at [fitness.blonskyi.dev](https://fitness.blonskyi.dev) — a subdomain project
of the personal hub ([blonskyi.dev](https://blonskyi.dev), repo `my-projects`). Users log in
exclusively via the hub's SSO; this repo never implements its own login.

**Status: in active development, live in production.** Scaffolding, Hub SSO auth, profile
onboarding/settings, CI/CD, Daily Log + weight logging, training programs and workout logs, the
diet engine (generation from your favorites, swap/reroll/delete), progress photos (upload, pose analysis, gallery with
baseline comparison), i18n (en/uk/ru/es), and PWA offline support are all built, merged, and
deployed at [fitness.blonskyi.dev](https://fitness.blonskyi.dev). See
[plans/current.md](plans/current.md) for the phased plan and remaining work.

## What it does

- Training programs and workout logs — multiple concurrent active programs, offline-capable logging
- Body-weight diary, decoupled from any other daily activity (no forced weigh-in to log a workout)
- Progress photos (front/side/back sessions, baseline comparison) with async, non-LLM pose/alignment
  analysis (MediaPipe/OpenCV)
- A diet engine that generates a full day's menu from calorie/macro targets, food preferences
  (allergy/exclusion at any granularity), and diet type — role-based food swapping
- Localized (en/uk/ru/es) and installable as a PWA with offline reads and queued writes

## Tech stack

- **Frontend** — Next.js (App Router), TypeScript, Tailwind CSS v3, ShadCN, `next-intl`, TanStack
  Query/Virtual
- **Backend** — NestJS, Drizzle ORM, PostgreSQL — sole owner of the database and business logic (see
  [ADR-001](docs/decisions.md)); the frontend never touches Drizzle/Postgres directly
- **Photo analysis worker** — Python, FastAPI, OpenCV, MediaPipe — internal-only, consumes jobs from
  a plain Redis list/stream (not BullMQ, see [ADR-003](docs/decisions.md))
- **Storage** — MinIO, private bucket, presigned URLs both ways (see [ADR-002](docs/decisions.md))
- **Auth** — delegated entirely to the hub's existing SSO (shared `.blonskyi.dev` session cookie),
  validated by the frontend and forwarded to the backend as trusted headers
- **Monorepo** — single pnpm workspace (`backend/`, `frontend/`)

## Local development

### Prerequisites

- Node.js 24+
- pnpm
- A local PostgreSQL instance

### Setup

```bash
git clone git@github.com:mykola-blonskyi/fitness.git
cd fitness
pnpm install

# Backend: point at a local Postgres database
cd backend
cp .env.example .env   # fill in DATABASE_URL (any local throwaway database)
pnpm db:generate        # generate a migration from src/db/schema.ts
pnpm db:migrate         # apply it
cd ..

pnpm dev   # starts both apps in parallel: backend on :3001, frontend on :3000
```

Health checks once running: `curl localhost:3001/health` (backend), `curl localhost:3000/en/health`
(frontend).

### Available commands

Run from the repo root with `pnpm --filter backend <script>` / `pnpm --filter frontend <script>`,
or `pnpm dev` / `pnpm build` to run both at once:

| Script | Backend | Frontend |
|---|---|---|
| Dev server | `dev` (`start:dev`) | `dev` |
| Build | `build` | `build` |
| Lint | `lint` | `lint` |
| Format | `format` | — |
| Unit tests | `test` | — |
| E2E tests | `test:e2e` | — |
| Drizzle | `db:generate`, `db:migrate`, `db:studio` | — |

Frontend `test` runs Vitest, but no test files exist yet (`passWithNoTests: true` — see
`reports/audits/2026-08-16-project-review.md` for the coverage gap this leaves open).

## Testing

Current coverage is thin — see `reports/audits/2026-08-16-project-review.md` for specifics (in
short: the `IdentityGuard`/`UsersController`/`DailyLogsController` and the entire frontend have no
tests yet; the one exception is `backend/src/scripts/seed-exercises.spec.ts`, which does unit-test
its category-mapping logic).

Planned seams (agreed during spec grilling, not yet implemented beyond scaffolding defaults):

- **Backend** — integration tests against a real test Postgres (Testcontainers), hitting the actual
  NestJS HTTP API — no mocking Drizzle.
- **Photo analysis worker** — tests that feed real fixture images through the actual job-consumer
  function and MediaPipe pipeline, not mocked.
- **Frontend** — Playwright E2E against a running app and real backend, covering full user-facing
  flows rather than mocking API calls.

## Architecture & design docs

- [docs/architecture.md](docs/architecture.md) — components, data flow, deployment topology
- [docs/decisions.md](docs/decisions.md) — ADRs for every hard-to-reverse design/implementation call
- [knowledge/domain-model.md](knowledge/domain-model.md) — entities and relationships
- [knowledge/business-rules.md](knowledge/business-rules.md) — resolved business rules
- [knowledge/glossary.md](knowledge/glossary.md) — canonical terminology
- [plans/current.md](plans/current.md) — phased implementation plan
- [plans/backlog.md](plans/backlog.md) — deferred/future work

## Issue tracking

Specs and implementation tickets live in [Plane](https://plane.blonskyi.dev/blonskyi/projects/a36feeea-ab0c-4aaf-8356-d4bdb7d8ae87/issues/)
(workspace `blonskyi`, project `FITNESS` — see [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md)).
Specs describe a feature end-to-end and group their tickets via a Plane Module; tickets are the
vertical-slice breakdown of each spec, in dependency order (`blocked_by` relations).

## Deployment

Live at [fitness.blonskyi.dev](https://fitness.blonskyi.dev) via Coolify, on the same VPS as the
hub and the other subdomain projects, sharing the Postgres instance. Docker Compose, with a
migration-before-deploy gate (see [ADR-005](docs/decisions.md)) — a failed migration blocks the
deploy and leaves the previous version running.
