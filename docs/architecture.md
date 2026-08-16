# Architecture

## Overview

fitness.blonskyi.dev — a fitness-tracking PWA: training programs/logs, a body-weight diary with progress photos, ML-based photo pose analysis, and a generated-diet recommendation engine. One of several `*.blonskyi.dev` subdomain pet projects sharing a Postgres instance and a common Hub-based auth system, deployed via Coolify.

See [[domain-model]] and [[business-rules]] for the domain layer this architecture serves.

---

## Goals

- Full scope built in one pass (training, diet, photo analysis, i18n, offline PWA) — not phased as an MVP
- Reuse existing subdomain-project conventions (auth, deployment, Postgres) rather than inventing new ones
- Keep the photo-analysis and diet-generation pipelines simple and dependency-light (no new infra beyond what's justified)

---

## System Components

### Frontend

Next.js (App Router), TypeScript, TailwindCSS, ShadCN, next-intl (en/uk/ru/es), TanStack Query, TanStack Virtual, service worker for PWA offline support.

Responsibilities:

- All UI rendering and client-side interaction
- Validates the Hub's shared auth cookie and forwards trusted identity headers to the backend (see Security below) — **no direct database access**, no Server Actions touching Drizzle/Postgres
- App-wide nav header (see [ADR-007](docs/decisions.md)) — a nav menu scoped to built sections, not a breadcrumb trail, since fitness has several sibling top-level sections a user moves *between* rather than a single hierarchy to track depth within. Renders everywhere except `/onboarding`; locale switching and theme toggling are deliberately not part of it yet
- Offline: caches active programs/exercises/recent logs for viewing; queues workout-set writes in IndexedDB and flushes them to the API in order once back online

Dependencies:

- NestJS API (all reads/writes go through it)
- Hub (`blonskyi.dev`) for auth validation

---

### Backend

NestJS, Drizzle ORM. **Sole owner of the database and business logic** — diet calculation, photo-analysis orchestration, food/exercise catalogs, training/workout domain logic.

Responsibilities:

- All Drizzle/Postgres access
- Generates presigned MinIO URLs for photo upload (client leg) and photo read (owner-only, short-lived — see Security)
- Enqueues photo-analysis jobs onto Redis; exposes an internal endpoint (or reads back) for worker results
- Trusts `x-user-id`/`x-user-email` headers forwarded by the frontend; never touches the auth cookie itself

Dependencies:

- Postgres (shared instance, this project's own tables)
- Redis (job queue)
- MinIO (photo storage)
- Hub Postgres (`project_access` grant, registered once during setup — see the `subdomain-app.md` boilerplate in `my-projects`)

---

### Photo Analysis Worker

Python, FastAPI, OpenCV, MediaPipe, NumPy. Internal-only service, not exposed to the frontend.

Responsibilities:

- Consumes photo-analysis jobs from a plain Redis list/stream (JSON payload: `{ photoId, objectKey, pose }`) — **not BullMQ**, which has no maintained Python client
- Reads the photo directly from MinIO using its own service credentials (no presigned URL needed for this internal, service-to-service leg)
- Pose detection, pose/alignment validation, landmark extraction; writes results back (status + JSON) either directly to Postgres or via a callback to NestJS
- Auto-retries a job a few times with backoff on transient failure before marking it permanently `failed`

Dependencies:

- Redis (job source)
- MinIO (photo read)
- Postgres or NestJS callback (result write)

---

### Integrations

External systems:

- Hub (`blonskyi.dev`) — shared authentication (Auth.js JWT cookie, validated by the frontend)
- MinIO (`s3.blonskyi.dev`) — object storage for progress photos, private bucket
- Open Food Facts / USDA FoodData Central — one-time curated seed import for the food catalog
- wger / ExerciseDB — one-time curated seed import for the exercise catalog
- A machine-translation API (e.g. DeepL/Google Translate) — used only at import time to seed per-locale food/exercise names, marked unverified for later review
- Plane (`plane.blonskyi.dev`, workspace FITNESS) — ticket tracking for implementation, outside the runtime system

---

## Data Flow

**Photo upload + analysis:**

1. Client requests an upload URL from NestJS.
2. NestJS generates a presigned MinIO PUT URL.
3. Client uploads the image directly to MinIO (bypasses the app server).
4. Client confirms upload completion to NestJS.
5. NestJS creates the `progress_photos` row (`analysis_status = pending`) and pushes a job onto the Redis queue.
6. The Python worker picks up the job, fetches the image from MinIO directly, runs pose/alignment analysis, writes results back.
7. Frontend polls/reads `analysis_status`; when reading the photo back, NestJS generates a short-lived presigned GET URL after checking ownership.

**Diet generation:** manual trigger only (see [[business-rules]]) → NestJS runs the greedy-heuristic generator against the user's profile, active Diet/Food Preferences, and the Food catalog → writes a new `diets` + `diet_items` row set, linked to the triggering Daily Log.

---

## Deployment

Docker Compose, deployed via Coolify (self-hosted) using a GitHub App for the private repo. On push to `main`: lint + tests (ESLint, Prettier, frontend/backend test suites) → build → `drizzle migrate` against the shared Postgres instance → deploy the new containers only if migration succeeds (see [[business-rules]] "Migrations are a mandatory pre-deploy gate"). Shares its Postgres instance and Coolify host with the user's other `*.blonskyi.dev` pet projects.

---

## Security

Authentication:

Reused, not reinvented — see the `todolist` project and `my-projects/boilerplates/subdomain-app.md`. The Hub issues an Auth.js JWT session cookie (`authjs.session-token`, domain `.blonskyi.dev`, httpOnly, `sameSite: lax`). The Next.js frontend decodes it with a shared `AUTH_SECRET` and calls `GET https://blonskyi.dev/api/auth/validate?project=fitness` for per-project authorization, then forwards trusted `x-user-id`/`x-user-email` headers to NestJS. NestJS is internal-only (private Docker network) and never validates the cookie itself.

Authorization:

Per-project access granted via the Hub's `project_access` table (registered once during project setup). Within the app, all data is scoped to the authenticated `user_id` — no cross-user data access.

Secrets Management:

`AUTH_SECRET` must match the Hub's byte-for-byte. MinIO/Redis/Postgres credentials and the translation-API key are environment variables, not committed. Same for the Sentry DSN and the build-time Sentry auth token used to upload frontend source maps (see [[decisions]] ADR-006) — the auth token is a CI/build secret, not a runtime one, and only needs upload-project-scoped access.

Photo privacy: the MinIO bucket for progress photos is **private**. No permanent public URLs are ever stored or served — see [[business-rules]] "Progress photos are private."

---

## Observability

Error tracking:

Sentry (SaaS, free tier) — see [[decisions]] ADR-006. One Sentry org shared with the user's other `*.blonskyi.dev` pet projects; fitness is its own project within that org. `@sentry/nestjs` on the backend and `@sentry/nextjs` on the frontend (client- and server-side), active in production only — never during local `pnpm dev`, so local testing doesn't consume the shared org's event quota. Only unhandled exceptions and 5xx-class errors are reported; deliberately-thrown 4xx `HttpException`s (validation, 404, 401/403) are not. Events carry only the user's UUID as Sentry `user` context — `sendDefaultPii` is disabled and request bodies are scrubbed, so email, IP, and payload contents (which could include health data like weight or date of birth) never reach the third-party service. Alerting is Sentry's own built-in email notifications; no additional relay (e.g. into the Telegram bot used for uptime alerts) for now. Events are tagged with the deploying commit SHA as the Sentry release, and frontend source maps are uploaded at build time so stack traces resolve to real source, not minified bundle positions. One-off scripts (e.g. `seed-exercises.ts`) are out of scope — they're run interactively and watched, so a crash is already visible without a reporting layer. The Python photo-analysis worker isn't built yet (FITNESS-22/23/24); whether it gets Sentry too is a decision for whenever that work starts.

General log management (structured application logs, aggregation, retention) is intentionally out of scope for now — a separate, deliberate decision when it's actually needed, not bundled into the error-tracking setup above.

Metrics:

Not yet decided.

Tracing:

Not yet decided.
