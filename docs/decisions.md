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
