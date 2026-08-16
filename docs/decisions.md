# Architecture Decisions

---

## ADR-001: NestJS owns the database; Next.js is a pure frontend

Date: 2026-08-15

Status: Accepted

### Context

The grooming note listed both NestJS (backend) and Next.js Server Actions + Drizzle as ways to reach the database. Two write paths to the same schema is a real architectural fork, not a detail — it affects where business logic lives, how the photo-analysis worker integrates, and how auth is enforced.

### Decision

NestJS is the sole owner of Drizzle/Postgres and all business logic (diet calculation, photo-analysis orchestration, catalogs). Next.js never touches the database directly — no Server Actions call Drizzle. All frontend reads/writes go through the NestJS API.

### Alternatives Considered

- Next.js Server Actions + Drizzle only, no NestJS: simpler single-deployable, but couples business logic to the web framework and gives the Python worker no clean backend to write results back to.
- Split by concern (NestJS for complex domains, Server Actions for simple CRUD): two things touching the same schema, more moving parts for a solo project to maintain.

### Consequences

Every mutation has one code path and one place to enforce authorization/business rules. Adds one more service to deploy/run compared to a Next.js-only design, but matches the pattern already used by other `*.blonskyi.dev` projects.

---

## ADR-002: Progress photos are stored in a private MinIO bucket

Date: 2026-08-15

Status: Accepted

### Context

`progress_photos.image_url` needed a concrete access model. These are personal body/progress photos — sensitive by nature — and the default "just store a URL" approach could easily end up being a permanent public link if not decided explicitly.

### Decision

The MinIO bucket is private. The database stores an object key, not a public URL. The backend generates a short-lived presigned GET URL per authenticated request, after verifying the requester owns the photo — mirroring the presigned-PUT pattern already used for uploads.

### Alternatives Considered

- Public bucket with a permanent URL: simpler (no presigning on read, works directly in `<img>` tags), but anyone with the URL could view someone's progress photos indefinitely.

### Consequences

Every photo read requires a backend round-trip to mint a presigned URL (can't just hardcode/cache a permanent image URL). This is the correct trade-off for sensitive personal data.

---

## ADR-003: Cross-language photo-analysis queue uses plain Redis primitives, not BullMQ

Date: 2026-08-15

Status: Accepted

### Context

The initial plan named "Redis-based queue (BullMQ)" without accounting for the fact that BullMQ is a Node.js-only library with no maintained Python client — but the consumer of these jobs is the Python/FastAPI analysis worker.

### Decision

NestJS and the Python worker communicate over a plain Redis list or stream (`LPUSH`/`BRPOP` or `XADD`/`XREADGROUP`) with a JSON payload (`{ photoId, objectKey, pose }`). NestJS may still use BullMQ internally for its own scheduling/retry needs, but the cross-language contract is always a plain Redis primitive that both `ioredis` and `redis-py` can speak natively.

### Alternatives Considered

- HTTP callback instead of Redis (NestJS calls the FastAPI worker synchronously, or vice versa): avoids any Python-Redis coupling, but loses the async decoupling that's the whole point of a queue — the worker would need to be up and responsive at call time.

### Consequences

No unofficial/unmaintained BullMQ-Python bridge library in the dependency tree. Slightly more manual plumbing (defining and versioning the JSON job schema by hand) than a framework-provided queue would give.

---

## ADR-004: Daily Log is decoupled from weigh-in

Date: 2026-08-15

Status: Accepted

### Context

The original schema required `diary_entries.weight` NOT NULL, and progress photos, diets, and workout logs all pointed at that same row. This meant no daily activity of any kind could be logged without also entering a body weight that day — a real constraint on core UX, not just a naming detail, and one that's expensive to unwind once other tables and application code depend on the NOT NULL assumption.

### Decision

Rename the concept to Daily Log, keyed by `(user_id, date)` with `weight` nullable. Progress photos, diets, and workout logs attach to the Daily Log regardless of whether a weight was recorded that day.

### Alternatives Considered

- Keep weight required: simpler schema, but doesn't match how people actually use a fitness app (workouts happen far more often than weigh-ins).

### Consequences

Diet generation and any weight-trend logic must explicitly handle days with no weight value (skip or carry-forward from the last known weigh-in) rather than assuming every Daily Log has one.

---

## ADR-005: Migrations run at container boot, not as a separate CI step

Date: 2026-08-15

Status: Accepted

### Context

FITNESS-8's original ticket description assumed "pushing to main runs `drizzle migrate` against the shared Postgres instance before deploy" as a distinct CI job. But GitHub Actions runners have no network path to the production Postgres instance (it's only reachable from inside Coolify's private network), so a CI-level migration step can't actually reach it without exposing the database publicly — not something to do for a shared instance backing multiple pet projects.

### Decision

The backend's own Docker container runs the migration as its entrypoint, before starting the server: `drizzle-kit migrate && node dist/main` (see `backend/Dockerfile`). CI's `deploy` job only triggers a Coolify webhook; Coolify builds and starts the container, and the container migrates itself against whatever `DATABASE_URL` Coolify injects.

### Alternatives Considered

- A dedicated CI migration step: would require exposing the production Postgres instance to GitHub Actions runners, or running self-hosted runners inside the same private network — meaningfully more infrastructure for no real benefit over letting the container that already has network access do it.
- SSH into the VPS and run migrations manually from CI: possible, but couples the pipeline to a specific host/credential rather than to Coolify's own deploy mechanism, and doesn't compose with Coolify's health-check-gated rollout.

### Consequences

A failed migration crashes the new container before it ever calls `app.listen()`, so it never passes Coolify's healthcheck — Coolify's own rolling-deploy behavior then leaves the previous, still-healthy container running rather than cutting over. This is how "a failed migration blocks the deploy and leaves the previous version running" is actually satisfied, not by a separate gate. `drizzle-kit` had to move from `devDependencies` to `dependencies` in `backend/package.json` so the CLI is present in the production image (`pnpm deploy --prod` strips devDependencies) — same reason `todolist` keeps `prisma` itself, not just `@prisma/client`, in its own `dependencies`.

The first real deploy (2026-08-16) hit exactly this failure mode for an unrelated reason: Postgres 15+ doesn't grant `CREATE` on the `public` schema to a freshly created role by default, so `fitness_app` could connect but not create the migrations table — the container crash-looped with no clear error (the drizzle-kit CLI's spinner swallowed it) until `GRANT ALL ON SCHEMA public TO fitness_app;` was applied on the shared instance. See `my-projects/docs/runbooks.md` ("New app crash-loops on first deploy") — this is a one-time grant needed for any new app database on the shared Postgres, not specific to this repo.

---

## ADR-006: Error tracking is Sentry SaaS, one org shared across pet projects, UUID-only PII

Date: 2026-08-16

Status: Accepted

### Context

The app had no error-tracking layer at all — a crash in production was only visible if someone happened to notice broken behavior or went looking at container logs. Fixing that raised several coupled questions at once: which tool, whether to self-host it, whether to share infrastructure with the user's other pet projects the way Postgres already is, and — since this app handles real health data (weight, date of birth, goals) — how much of that data a third-party SaaS should ever see.

### Decision

**Tool**: Sentry SaaS, free tier. Self-hosting was considered and rejected — full Sentry OSS needs Kafka + ClickHouse + Postgres + Redis + Zookeeper (realistically 16GB+ RAM), and the VPS had only ~1.4GB free at evaluation time. Even the lighter self-hosted alternative (GlitchTip) would still compete for RAM/disk on an already-loaded box. Beyond the resource math: an error tracker living on the same VPS as the app can't report the app is down if the VPS itself is degraded — which is exactly what happened during this project's Cloudflare SSL outage (see `my-projects/docs/runbooks.md`). Off-box error tracking stays reachable precisely when it matters most.

**Org structure**: one Sentry org shared across the user's `*.blonskyi.dev` pet projects, with fitness as its own project inside that org — mirrors the existing shared-Postgres-instance pattern. The free tier's ~5k-events/month quota is pooled per-org, not per-project, so a noisy bug in one app can eat into another's budget; accepted as a real but low-probability risk given how low-traffic these personal projects are, revisitable by splitting into a dedicated org later if it ever actually bites.

**Scope**: backend (`@sentry/nestjs`) and frontend (`@sentry/nextjs`, client- and server-side) only. One-off scripts (e.g. `backend/src/scripts/seed-exercises.ts`) are excluded — they're run interactively and watched, so a crash is already visible without a reporting layer. Active in production only, never during local `pnpm dev`, so local testing doesn't consume the shared org's quota.

**Signal vs. noise**: only unhandled exceptions and 5xx-class errors are reported. Deliberately-thrown 4xx `HttpException`s (validation rejections, 404s like the Daily Log page's "no entry yet" case, 401/403 from the identity guard) are never sent — they're expected control flow, not bugs, and reporting them would just train the user to ignore Sentry.

**PII policy**: only the user's UUID (already-trusted `x-user-id`) is attached as Sentry `user` context. `sendDefaultPii` is disabled; request bodies are scrubbed from events. Email, IP address, and payload contents (which could include a weight value or date of birth) never reach Sentry.

**Alerting**: Sentry's own built-in email notifications. No relay into the Telegram bot used for uptime alerts — that would be new infrastructure to maintain for a consolidation that isn't worth it until email alerts have actually proven insufficient.

Events are tagged with the deploying commit SHA as the Sentry release (CI already has it), and frontend source maps are uploaded at build time via a Sentry auth token so stack traces resolve to real source.

### Alternatives Considered

- Full self-hosted Sentry OSS: rejected on resource grounds (see above).
- GlitchTip (self-hosted, Sentry-protocol-compatible): still competes for RAM/disk with everything else already running on the VPS; revisitable later if the SaaS free tier's event quota ever becomes the actual constraint, since the same SDKs would work unmodified.
- A dedicated Sentry org just for fitness: avoids the shared-quota risk entirely, but adds a second account/login to manage for a risk judged unlikely to materialize in practice.
- Attaching email to Sentry's user context: would make support/debugging slightly easier, but puts a real person's email in a third-party tool by default rather than as a deliberate choice — rejected.
- Relaying alerts through the existing Telegram bot: more consolidated, but Sentry has no native Telegram integration, so it means building and maintaining a webhook relay — deferred until email alerts prove insufficient.

### Consequences

General log management (structured application logs, aggregation, retention) was explicitly scoped out of this decision — it's a separate, larger piece of work with its own tradeoffs (storage, retention policy, query tooling), not something to bundle in as an afterthought. The Python photo-analysis worker (FITNESS-22/23/24, not yet built) isn't covered by this ADR; whether it gets Sentry too is a decision for whenever that work starts. Because the shared org's quota is pooled across all pet projects, a runaway error loop in any one of them is now everyone's problem — worth remembering if alerts suddenly go quiet or Sentry starts dropping events.

---

## ADR-007: App header uses a nav menu, not breadcrumbs; account menu is identity-only, no sign-out

Date: 2026-08-17

Status: Accepted

### Context

Every other `*.blonskyi.dev` subdomain app (`todolist`, the Hub itself) uses a breadcrumb-style header (`Hub brand → app name`), so that was the starting assumption for fitness too. But `todolist` is a single-feature app — lists and tasks, nothing else — so a breadcrumb back to the Hub is essentially all the navigation it needs. Fitness has several genuinely separate top-level sections (Training, Diary, Diet, Photos, Settings, per `docs/architecture.md`) that a user needs to move *between*, not just track depth within — breadcrumbs answer "where am I," not "where can I go." Also surfaced while designing this: fitness has no shared UI component yet (`shared/ui/components/` was an empty placeholder), no theming infrastructure beyond OS-level `prefers-color-scheme`, and no i18n routing (FITNESS-11 not started) — so a header that copied `todolist`'s locale switcher and theme toggle wholesale would be gluing three separate pieces of unbuilt infrastructure onto one ticket.

Separately: an account menu naturally wants a sign-out action, but fitness has no way to offer one. The Hub's actual sign-out (`my-projects/src/features/auth/actions/logout.ts`) is a Server Action bound to the Hub's own Auth.js session — invokable only from a form rendered inside the Hub's own UI. Unlike login, which has a clean public URL fitness already redirects to (`${API_URL}/${locale}/login?callbackUrl=...`), there is no equivalent public sign-out URL. Fitness clearing the shared `.blonskyi.dev` cookie itself was considered and rejected — it works technically, but contradicts ADR-001's whole premise that the frontend only *validates* auth, never owns it, and would duplicate logic that should exist in exactly one place.

### Decision

The header is a **nav menu**, not a breadcrumb trail — it lists links to fitness's own top-level sections, scoped to **only what's actually built** (currently Diary and Settings), growing as each feature ships its first real page rather than showing dead links to unbuilt sections. It renders on every route except `/onboarding`, which is a distinct, focused flow exempted the same way it's already exempted from the profile-completion gate elsewhere.

The account menu is **identity-only** — the user's name/email as plain text, no dropdown (nothing in it needs interactivity), no settings link (already in the nav menu, no reason to duplicate it), and **no sign-out**, dropped entirely rather than worked around.

Locale switching and theme toggling are **out of scope for this header entirely** — not even rendered as disabled placeholders. They belong to FITNESS-11 (i18n routing) and a new, not-yet-created theming ticket (`next-themes` plus restructuring `globals.css` from pure `prefers-color-scheme` to class-based dark mode), respectively, and get added to the header once those tickets actually exist and land.

### Alternatives Considered

- Breadcrumb trail matching `todolist`/the Hub: rejected — doesn't serve fitness's actual navigation need (jumping between sibling sections), which a breadcrumb-only header can't do at all.
- One large ticket bundling the header with next-intl routing and next-themes/dark-mode CSS: rejected — breaks vertical-slice discipline, turns "add a header" into three tickets' worth of infrastructure under one name.
- Showing all five intended top-level sections now with unbuilt ones disabled/grayed: rejected — a nav item pointing at nothing for months is worse UX than a shorter menu that grows honestly, and costs nothing to extend later.
- A public logout route added to the Hub (`my-projects`) that fitness could redirect to, mirroring login: not rejected outright, but explicitly deferred — it's cross-repo work outside this ticket, and every subdomain app will eventually hit this same gap, not just fitness, so it's worth deciding deliberately later rather than bolting on here.
- Fitness clearing the shared auth cookie itself to implement its own sign-out: rejected, contradicts ADR-001.

### Consequences

The header ships without sign-out, which is a real, visible gap for a personal-data app until the Hub exposes a public logout mechanism — worth tracking as follow-up work, potentially its own ADR on the Hub side once more than one subdomain app needs it. The nav menu's "only what's built" scoping means it needs a small manual addition every time a new top-level section ships its first page — a cheap, one-line cost each time, not a one-time setup burden. Per-page breadcrumb depth was explicitly considered and dropped in favor of the nav menu, so if a future page hierarchy ever gets deep enough that "where am I" becomes a real problem again (e.g. nested Training Program → Workout → Set detail pages), that's a separate, later decision, not something this ADR's nav menu already solves.
