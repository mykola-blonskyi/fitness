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

**Post-implementation finding (2026-08-17)**: frontend source-map upload silently produced empty releases in production for a while after this ADR was implemented, despite `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` all being correctly configured — two compounding bugs, found by reproducing the exact Coolify build directly on the VPS rather than relying on its build log (which doesn't capture `docker compose build` output at all, regardless of the Sentry plugin's own `silent` setting): (1) `next.config.ts`'s `silent: !process.env.CI` stayed `true` on every Coolify build since Coolify never sets `CI=true`, hiding the plugin's own errors — fixed by keying `silent` off `SENTRY_AUTH_TOKEN`'s presence instead; (2) Coolify's `SOURCE_COMMIT` isn't reliably populated on every deploy, and an empty (not unset) `SENTRY_RELEASE` makes `sentry-cli` hard-reject the upload outright — fixed with a build-time timestamp fallback so an upload never fails over this. Separately, `node:slim` ships with no CA certificates, so `sentry-cli`'s HTTPS calls failed TLS verification in the actual Docker build even after both of the above were fixed — a local (non-Docker) build never surfaces this, since the host OS supplies its own trust store. All three fixes landed together; a release with a version Sentry has already seen (even an empty one from before these fixes) is silently skipped on upload, not retried — a real content or version change is needed to force a fresh attempt.

**Post-implementation finding (2026-08-20)**: a code review caught that the "Email... never reach Sentry" guarantee above was violated in practice, not just at risk — `apiFetch` (`frontend/src/shared/libs/api-client.ts`) sends a real `x-user-email` header on every backend request, and neither side's Sentry config scrubbed `event.request.headers` before this fix. The backend's `requestDataIntegration({ include: { data: false } })` only strips the body; the frontend's `beforeSend`/`beforeSendTransaction` stripped `.data`/`.cookies` but not `.headers`. Fixed by explicitly deleting `event.request?.headers` in both `beforeSend` and `beforeSendTransaction` on both sides (`backend/src/instrument.ts`, `frontend/src/shared/libs/sentry-shared.ts`) — the same "both pipelines, not just one" lesson the source-map finding above already recorded for a different field. Same pass also fixed the backend's `SENTRY_RELEASE` to fall back to `undefined` rather than an empty string when Coolify's "Include Source Commit" toggle is off, mirroring the frontend's existing timestamp fallback.

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

---

## ADR-008: Zustand is the standard tool for cross-component/outside-React client state, adopted when FITNESS-13 needs it

Date: 2026-08-17

Status: Accepted

### Context

The frontend currently has zero client-side state management of any kind — no Context, no TanStack Query (listed in `docs/architecture.md`'s intended stack but never installed or used), no Zustand. Every page today is server-centric: Server Components fetch via `apiFetch` directly, Server Actions mutate and `revalidatePath`. Nothing currently needs a global client store.

The concrete trigger raised in this session is `knowledge/business-rules.md`'s offline write-queue rule (FITNESS-13): "Writes queue in IndexedDB and flush to the NestJS API in order once connectivity returns." This is qualitatively different from anything TanStack Query would solve (server-data caching) — it's client-only state (a queue of not-yet-synced local writes) that must survive page reloads while offline and be driven by a browser `online` event, not a component lifecycle.

Resolving *how* a queued write eventually reaches the backend also surfaced a real architectural question: per ADR-001, the frontend never calls the NestJS backend directly from client-side code — only server-side code (Server Components/Actions) does, using trusted identity headers Next's `headers()` provides. A queued-while-offline write needs to make a network call from the *browser* once back online, which is a different code path than anything the app has today.

### Decision

**Zustand is adopted specifically to build FITNESS-13's offline write-queue** — not installed preemptively, and not a general replacement for local component state. The queue is a Zustand store using the `persist` middleware with a custom IndexedDB storage adapter (e.g. `idb-keyval` — Zustand's `persist` defaults to `localStorage`, which doesn't satisfy the business rule's explicit IndexedDB requirement).

**Sync replays through the existing Server Actions**, not a new backend-facing pathway: the queue stores enough data to call the same Server Action already used for the online write path (e.g. a future `logWorkoutSet`), and an `online` event listener drains the queue by calling those Server Actions directly, in order, once connectivity returns. This reuses the app's one existing mutation pattern rather than inventing a second one (a new Route Handler mirroring `apiFetch`'s trusted-header forwarding was considered and rejected for this reason).

**Standing heuristic for all future work**, not just this ticket: reach for Zustand when state needs to be read or written across a **non-parent-child boundary** (siblings, or a component far down the tree from where the state logically lives) **or needs to persist/be read outside the React tree entirely** (like the offline queue, driven by a browser event listener, not a component). Plain `useState`/`useReducer`/Context stays the default for anything a single component or its direct children own — form field state, a dropdown's open/closed flag, a wizard's current-step state — even when that component is otherwise complex. Global store only once prop-drilling or Context re-render cost is an actual problem, not preemptively.

### Alternatives Considered

- Installing Zustand now, ahead of any concrete need: rejected — nothing currently requires it, and premature adoption invites premature use for things plain React state already handles.
- A new Route Handler for offline-queue sync, mirroring `apiFetch`'s identity forwarding: rejected — a second mutation pathway alongside Server Actions that doesn't exist anywhere else in this app, for no benefit over just calling the Server Action directly from client code (which already works today for any `onClick`-style invocation).
- Zustand's default `localStorage` persistence: rejected — doesn't satisfy the business rule's explicit IndexedDB requirement; needs a custom storage adapter.
- Treating Zustand as the default tool for any "complicated" component: rejected — React's own `useState`/`useReducer`/Context already handle plenty of local complexity (a form's own state, a wizard confined to one component tree) without a global store; reaching for Zustand by default rather than by the boundary-crossing heuristic above would be introducing a new pattern where an existing, adequate one still works.

### Consequences

TanStack Query's place in the stack is unaffected by this decision — it remains listed as intended but unadopted, and this ADR doesn't resolve whether/when it gets adopted (that's a server-data-caching question, orthogonal to Zustand's client-only-state role here). The heuristic in this ADR is the standing rule for upcoming complex UI — the Training Program builder (FITNESS-18, likely multi-step) and catalog browse/search UIs (FITNESS-17 exercise, FITNESS-28 food, where filter state may be shared between sibling components) are the next places it's likely to actually get exercised, not necessarily FITNESS-13 alone.

---

## ADR-009: ShadCN is deferred; forms use shared raw-Tailwind primitives instead

Date: 2026-08-20

Status: Accepted

### Context

`docs/architecture.md` lists ShadCN as part of the intended frontend stack, but every form shipped so far (Onboarding, Profile, Weight, Create Food Item) plus the header uses hand-rolled `<input>`/`<select>`/`<button>` elements styled directly with Tailwind classes. Unlike TanStack Query, which ADR-008 already records as "listed as intended but unadopted," this divergence had no documented rationale anywhere — flagged as an undocumented standards violation by a code review.

### Decision

**Defer ShadCN**, same status as TanStack Query: listed in the intended stack, not yet installed, not yet needed. The four forms shipped so far are plain field lists (text/number/select) with no interaction complexity ShadCN would meaningfully help with. In the same change that raised this gap, the actual duplication across those forms (repeated error markup, repeated field blocks) was addressed directly with two small shared components (`FieldError`, `ProfileFields`) rather than pulling in ShadCN to solve it.

**Trigger for revisiting**: adopt ShadCN as one deliberate migration — not form-by-form — once a form needs a primitive that's genuinely hard to hand-roll correctly (`Combobox`, `Popover`-based date picker, a `Dialog`-driven multi-step flow), which the Training Program builder (FITNESS-18) is the most likely candidate to need first.

### Alternatives Considered

- Adopt ShadCN now, retrofit the four existing forms: rejected — the existing raw markup already works correctly and accessibly for plain text/number/select fields; a retrofit here is churn with no functional benefit, not a fix for an actual problem.
- Drop ShadCN from `docs/architecture.md`'s intended stack entirely: rejected — future forms (multi-step wizards, comboboxes, date pickers) are a better bet built on tested accessible primitives than hand-rolled from scratch; keeping it listed as intended (not adopted) keeps that option open and documented, same pattern as TanStack Query.

### Consequences

Keep extracting plain shared components (`FieldError`, `ProfileFields`, and similar) for now rather than reaching for ShadCN piecemeal — a partial adoption (some forms ShadCN, some raw Tailwind) would be a worse inconsistency than the current uniform-raw-Tailwind state. When the trigger condition above is hit, migrate deliberately rather than only using ShadCN for the one new form that needed it.

---

## ADR-010: mifflin_v1 calorie/macro calculation — formula constants and code/DB split

Date: 2026-08-20

Status: Accepted

### Context

FITNESS-26 needed a real, versioned calorie/macro-target algorithm (`mifflin_v1`, per `knowledge/glossary.md`'s already-documented `diet_calculation_algorithms` entity), but neither `knowledge/business-rules.md` nor the Diet Engine spec pin down the actual numbers — activity multipliers, a goal-based calorie adjustment, a macro split, or a safety floor. These are real product decisions, not derivable from existing docs, and picking them silently inside a PR would leave no record of why.

### Decision

**BMR**: standard Mifflin-St Jeor equation — `10×weight(kg) + 6.25×height(cm) − 5×age(yr) + 5` (male) or `−161` (female).

**Activity multiplier**: the standard Harris-Benedict/Mifflin activity scale, which conveniently already matches this app's `activity_level` enum names exactly: sedentary 1.2, light 1.375, moderate 1.55, active 1.725, very_active 1.9.

**Goal adjustment**: applied to TDEE (BMR × activity multiplier) — weight_loss −500 kcal/day (~0.45 kg/week, a commonly recommended moderate rate), maintenance 0, muscle_gain +300 kcal/day (a modest surplus to limit fat gain while bulking).

**Safety floor**: calories never computed below 1200 kcal/day regardless of goal — a commonly cited absolute floor, clamped rather than silently allowed to go lower for a low-BMR + aggressive-deficit combination.

**Macro split**: protein 2.0 g/kg bodyweight (within the evidence-based 1.6–2.2 g/kg range for general fitness/recomposition goals, applied uniformly across all three goals to keep the formula simple), fat 25% of total calories, carbs the remainder — clamped at 0 rather than rebalanced if protein+fat alone would exceed a floor-clamped calorie target (a synthetic edge case only reachable by unrealistic bodyweight/height/age combinations, not a realistic profile — see `mifflin-v1.spec.ts`'s "never returns negative carbs" test).

**Code/DB split**: `diet_calculation_algorithms` (migration `0005_first_wild_pack.sql`) stores only `code`/`name`/`description`/`formula` — display and audit metadata, matching `knowledge/business-rules.md`'s "formula is documentation only" rule. The actual math is `calorie-targets/algorithms/mifflin-v1.ts`, a pure function registered under the same `code` string in `calorie-targets/algorithm-registry.ts`. The one required `mifflin_v1` row is seeded via a data migration (`0006_seed_mifflin_v1_algorithm.sql`), not a manual `pnpm db:seed:*` script like the food/exercise catalogs — unlike those (optional, large, externally-sourced import data), the calorie-target feature can't function without this single row, so it belongs behind the mandatory migrate-at-boot gate (ADR-005), not a step someone could forget to run after a fresh deploy.

**No `diets`/`diet_items` tables yet**: FITNESS-26's scope is the target calculation only — display, not persistence. FITNESS-30 (Diet generation) is the ticket that will add `diets`/`diet_items` and give them an FK to `diet_calculation_algorithms` for `calculation_metadata` audit snapshots; adding those tables now would be speculative for a feature not yet built.

### Alternatives Considered

- Goal-dependent protein targets (e.g. higher during weight_loss to preserve muscle in a deficit): rejected for v1 — a single fixed 2.0 g/kg keeps the formula simple and auditable; a future `adaptive_v1` algorithm code is the natural place for that refinement if it's ever wanted, without touching `mifflin_v1` once shipped.
- Storing the formula as a DB-evaluated expression: rejected — already settled by `knowledge/business-rules.md`'s "formula is documentation only" rule; this ADR just supplies the actual constants that rule left unspecified.
- Skipping the `diet_calculation_algorithms` table entirely and keeping display metadata only in code: rejected — the domain model and glossary already treat this as a first-class entity with those exact fields, and a DB row is what a future `GET` of "which algorithms exist" would query without a code deploy.

### Consequences

Changing any of these constants (multipliers, goal adjustment, floor, macro split) is an edit to `mifflin-v1.ts` plus its spec — the DB row's `formula` text should be updated in the same change so the human-readable description doesn't drift from what the code actually computes, even though the two are never mechanically linked.

---

## ADR-011: Greedy diet generator — required-role set, portion scaling, and where meal count lives

Date: 2026-08-22

Status: Accepted

### Context

FITNESS-30 needed to turn `knowledge/business-rules.md`'s "Diet menu generation is a greedy heuristic" description into actual code: "For each meal, pick one Food Item per required Food Role, then scale portion size to hit that meal's calorie share; adjust the largest items if the day's total drifts outside tolerance (~±5%)." That sentence leaves several concrete choices unmade — which Food Roles are "required" per meal, how a day's calorie target splits across meals, exactly how the tolerance adjustment picks which items to nudge, and where "the user's configured meal count" (this ticket's acceptance criteria) is actually stored, since no such field existed anywhere in the schema or domain docs. Same situation ADR-010 already flagged for `mifflin_v1`: real product decisions, not derivable from existing docs, that shouldn't be picked silently inside a PR.

### Decision

**Meal count lives on `users.meal_count`** (integer, 1–4, default 3), not a per-request parameter — it's a profile setting like `goal`/`activity_level` that already influences algorithm behavior the same way, editable through the existing `CreateUserDto`/`UpdateUserDto`/`PATCH users/me` pattern rather than a new endpoint. Default 3 (breakfast/lunch/dinner) rather than all 4, so a user who never touches the setting doesn't get an unrequested snack slot.

**Required Food Role set per meal**: every meal (regardless of which of the 4 slots it is) uses the same four macro-group slots — a protein role, a carb role, `vegetable`, and a fat role — so a generated meal is always a balanced plate rather than e.g. four protein sources. Each macro group is a fallback chain, tried in order until a role has an eligible candidate after Food Preference exclusion: protein `lean_protein → fatty_protein → plant_protein`, carb `complex_carb → simple_carb`, fat `healthy_fat → saturated_fat`, vegetable has no fallback (single role). A macro group with zero eligible candidates across its whole chain (e.g. every fat-role item excluded) is simply skipped for that meal rather than erroring — only a day with *zero* candidates across every role entirely fails generation (`UnprocessableEntityException`).

**Meal calorie split**: the day's target divides evenly across the active meal count (`targetCalories / mealCount`), then evenly again across that meal's picked items. No weighted split (e.g. a smaller breakfast share) — nothing in the business rule or domain docs specifies meal-to-meal weighting, and even split is the simplest thing that satisfies "close enough."

**Tolerance adjustment**: applied to total calories only, on the largest-calorie items first (sorted descending, nudging each one's `weight_grams` by the outstanding delta until the day is back within ±5% or items run out) — matches the business rule's literal wording ("adjust the largest items"). Protein/carbs/fat aren't independently tolerance-corrected; they move proportionally with whatever grams change happens during the calorie adjustment. The per-meal role diversity above is what keeps macros in the right ballpark, not a second correction pass — same "close enough" simplification ADR-010 already accepted for `mifflin-v1.ts`'s `carbsG` clamp.

**Persistence shape**: `diets` stores the day's totals (`total_calories`/`total_protein`/`total_carbs`/`total_fat`) plus `calculation_metadata` (a JSON snapshot of the target inputs/outputs used at generation time), matching the domain model. `diet_items` stores only `weight_grams`/`meal_type`/`order_index` — no per-item calories/macros — those are derived at read time from `weight_grams × the Food Item's per-100g values`, the same derive-don't-store convention `user.mapper.ts` already uses for age.

**Pure function split**: `diets/greedy-heuristic.ts` is a pure function (`generateDietItems`) with no I/O — `diets.service.ts` does all the DB work (candidate queries, exclusion lookups, persistence) and hands the algorithm plain data, mirroring `calorie-targets/algorithms/mifflin-v1.ts`'s split so the algorithm itself is unit-testable without a database, same as this repo's existing test-coverage pattern (no integration-test seam exists yet per the CI workflow's `backend-test` job comment).

**Diet Preferences are a second exclusion source, merged with Food Preferences**: `knowledge/domain-model.md`'s Diet Preference entity says it's "used as an additional filter during diet generation," but neither it nor `knowledge/business-rules.md` says which category/role taxonomy nodes each diet type (vegetarian/vegan/keto/paleo) actually excludes — another real product decision this ticket has to make, not derivable from existing docs. `diets/diet-preference-exclusions.ts` is a pure, table-driven mapping: vegetarian excludes the `meat`/`fish` categories (lacto-ovo — dairy/eggs stay allowed); vegan additionally excludes `dairy`/`eggs`; keto excludes the `grains`/`legumes` categories plus the `complex_carb`/`simple_carb` roles; paleo excludes `grains`/`legumes`/`dairy`. `diets.service.ts` resolves a user's active Diet Preferences (via the existing `DietPreferencesService.list`, reused rather than re-queried) to category/role ids and unions them into the same `ExclusionTargets` shape `FoodPreferencesService.getExclusionTargets` already produces, so `findCandidatesByRole`'s single candidate query enforces both filters at once rather than needing two separate filtering passes.

### Alternatives Considered

- Meal count as a per-request parameter to the generate endpoint instead of a stored profile field: rejected — the acceptance criteria's "the user's *configured* meal count" reads as a persistent setting, and a stored field means clients don't have to remember and resend it on every regeneration.
- A different required-role set per meal type (e.g. a lighter snack with just one role): rejected for v1 — adds real complexity (per-meal-type role tables) for a recommendation feature that already has explicit "close enough" cover from the business rules; a uniform 4-role plate per meal is simpler and still balanced.
- Independently tolerance-correcting protein/carbs/fat alongside calories: rejected — the business rule only describes a calorie-driven adjustment ("adjust the largest items if the day's total drifts"); adding a separate macro-rebalancing pass is scope the ticket and business rule don't ask for.
- Storing per-item calories/macros on `diet_items` directly: rejected — the domain model only lists `weight_grams`/`meal_type`/`order_index` for Diet Item, and deriving from the joined Food Item at read time avoids a second source of truth that could drift if a Food Item's macros are ever corrected after items were generated.
- Filtering Diet Preferences as a separate pass after the Food Preference candidate query, instead of merging into the same `ExclusionTargets`: rejected — two independent filtering passes over the same candidate rows is more code for no behavioral difference, since both are just "exclude candidates matching this taxonomy node" at bottom.

### Consequences

Changing the required-role set or fallback chains is an edit to `diets/diet.types.ts`'s `MEAL_ROLE_CHAINS` plus `greedy-heuristic.spec.ts` — isolated from `diets.service.ts`'s DB-glue code. Because meal count is a stored profile field with no UI to edit it yet (this ticket is backend-only), every user effectively gets the default (3) until a future ticket adds that control to Settings — worth tracking as a follow-up gap, not a blocker for this ticket's backend-only scope.
