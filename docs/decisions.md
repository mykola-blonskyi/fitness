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
