# Audit Report

Date: 2026-08-16

Auditor: Claude (architect + developer lenses, via 3 parallel code/doc audits + direct ticket/CI/infra checks)

Audit Type: Full project review — documentation, architecture, backend, frontend, delivery state, infrastructure posture

---

## Scope

Everything in `~/workspace/fitness`: `docs/`, `knowledge/`, `plans/`, root `CLAUDE.md`/`README.md`, the NestJS `backend/`, the Next.js `frontend/`, current Plane ticket state (33 tickets), recent CI history, and the live Coolify deployment/VPS resource state. Each finding below is tagged **[Architect]** (system design, delivery risk, infra) or **[Dev]** (code-level correctness/quality) — several span both.

---

## Findings

### Critical

- **[Architect+Dev] The entire auth model rests on one unverified trust boundary with no defense-in-depth.** `IdentityGuard`/`parseIdentity` (`backend/src/identity/parse-identity.ts:7-21`) accepts `x-user-id`/`x-user-email` from any request with **zero cryptographic verification** — no HMAC, no signature, not even UUID-format validation. This is intentional by design (ADR-001: trust is enforced by Docker network isolation, not application code), and it's a reasonable default *given* that isolation holds. But there is currently no backup layer — a misconfigured Compose file, a debug port left open, or a future network change would let anyone impersonate any user by setting two headers, with nothing in the code to catch it. `UsersController`/`DailyLogsController` correctly never accept a foreign user id in a route, which limits blast radius to identity spoofing rather than direct object reference — but spoofing itself is trivial without the network boundary holding.

### High

- **[Dev] Zero test coverage on the auth boundary and both real business modules.** Only two meaningful spec files exist in the whole backend: `seed-exercises.spec.ts` (genuinely good — unit tests the category-mapping logic) and the untouched Nest-starter `app.controller.spec.ts` (still asserts "Hello World"). `IdentityGuard`, `parseIdentity`, `UsersController`/`UsersService`, `DailyLogsController`/`DailyLogsService`, and both mappers have **no tests at all**. `test/app.e2e-spec.ts` boots the full `AppModule` against a real DB just to hit `GET /` — it never touches `/users/me` or `/daily-logs/:date`. Given the Critical finding above, the guard is the single most important thing in this codebase to have tests for, and it has none.
- **[Dev] Frontend has no test coverage whatsoever.** `vitest.config.ts` explicitly sets `passWithNoTests: true` with a comment acknowledging no component tests exist. `npm test` currently passes trivially with zero assertions.
- **[Dev] `clearWeight` Server Action has no error handling at all** (`frontend/src/features/daily-log/actions.ts`) — inconsistent with its sibling `setWeight`, which at least catches into a generic string. An `ApiError` here propagates uncaught out of a Server Action, surfacing as a raw framework error instead of a graceful message.
- **[Architect] Core project docs actively misrepresent current state.** Verified directly: `README.md:6-9` says *"Status: early implementation... Project scaffolding (FITNESS-7) is the first ticket in progress"*; `CLAUDE.md`'s Current State section says *"CI/CD (FITNESS-8) is in progress"*. Both are wrong — FITNESS-7, 8, 9, 10, 14, and 16 are all merged and Done (6 of 33 tickets). `plans/current.md` has 20 checklist items and **0 checked**, despite Phase 1 and part of Phase 2 being demonstrably complete. Anyone (including a future agent session) reading these gets a materially wrong picture of where the project actually stands.
- **[Dev/Architect] No rate limiting on an internet-facing API.** No `@nestjs/throttler`, no `helmet`. The only defense against abuse is whatever Cloudflare/Traefik enforces at the edge — not verified as part of this audit, and nothing in the app itself backs it up.

### Medium

- **[Dev] Frontend error handling has no consistent pattern.** `onboarding/actions.ts` and `settings/actions.ts` both catch `ApiError` and discard it into a generic string (losing the real status/message); `diary/page.tsx` is the *only* call site that correctly inspects `ApiError.status` to distinguish an expected 404 from a real failure; `settings/profile/page.tsx` and the home page call `apiFetch` with no error handling at all, relying entirely on the framework's default error boundary.
- **[Dev] `proxy.ts`'s health-check bypass is broader than what's actually used.** It matches any path ending in `/health` (`proxy.ts:35`), but the real health page only exists at `[locale]/health`, and the Docker healthcheck correctly targets `/en/health` specifically (verified in `docker-compose.yml:58`) — so this is **not currently broken in production**. But if anything else ever probes bare `/health` (an uptime monitor, a future Cloudflare healthcheck), it'll hit the `[locale]` dynamic route instead, render the home page with no identity headers injected, and likely 500 rather than return "ok". Worth tightening the match now while it's cheap, rather than after something else starts probing it.
- **[Dev] `hasCompletedProfile`'s fetch has no try/catch** (`proxy.ts`), unlike `resolveIdentity`, which deliberately swallows fetch errors with a comment explaining why. If `BACKEND_URL` is ever briefly unreachable, this throws unhandled inside `proxy()` — a hard 500 instead of the graceful degradation the sibling function was designed for.
- **[Dev] No DB indexes on `dailyLogs.userId` or `exercises.category`** — harmless at current scale, but both are the obvious filter columns for their tables and worth adding before either grows.
- **[Dev] Backend `tsconfig.json` isn't fully strict** — `noImplicitAny` is off, no `"strict": true`, only `strictNullChecks` is on. Looser type safety than typical for a project built from scratch this recently.
- **[Architect] Three doc files are empty, orphaned templates cited as sources of truth.** `docs/TODO.md` and `plans/backlog.md` are blank placeholders despite `CLAUDE.md` listing them as authoritative; `docs/onboarding.md` is a fully unfilled template that isn't even referenced from `CLAUDE.md`'s own source-of-truth list — dead scaffolding nobody is maintaining.
- **[Dev] Duplicated label maps.** `GOAL_LABELS`/`ACTIVITY_LABELS` are copy-pasted verbatim between `OnboardingForm.tsx` and `ProfileForm.tsx` — will silently drift, especially once i18n lands and these need translation.
- **[Dev] Non-null env assertions (`process.env.X!`) fail at first request, not at boot** (`proxy.ts`, `hub-identity.ts`) — a missing env var surfaces as a cryptic runtime error on whatever request happens to hit it first, rather than a clear startup failure.

### Low

- **[Dev] `SetWeightDto` has `@Min(0.1)` but no `@Max`**, unlike `CreateUserDto.height` which bounds both ends — minor validation inconsistency, not a real vulnerability. The `:date` route param is also validated via a hand-rolled regex instead of the DTO/Pipe mechanism used everywhere else in the codebase.
- **[Architect/Dev] Both `README.md` files (backend and frontend) are unedited framework boilerplate** — Nest CLI and create-next-app defaults, no project-specific content.
- **[Dev] No shared UI primitives on the frontend** — `shared/ui/components/` is an empty `.gitkeep`. All three form components duplicate the same Tailwind input/label/button markup inline. Not a problem yet at 3 forms; will be by the 5th.
- **[Architect] Docker images are somewhat heavy for the app's current size** (471MB backend / 386MB frontend) — not urgent, worth a look at layering as the app grows.

---

## Recommendations

### Immediate

- Fix the stale docs: update `README.md`'s status line, `CLAUDE.md`'s Current State section, and check off `plans/current.md`'s completed items to match reality (6 tickets Done). Cheap, and `CLAUDE.md` already says to do this — it just hasn't happened.
- Add a `try/catch` to `clearWeight`'s Server Action (one-line fix for a real uncaught-error path).
- Wrap `hasCompletedProfile`'s fetch in a try/catch matching `resolveIdentity`'s established graceful-degradation pattern.
- Tighten `proxy.ts`'s health-check path match from "ends with `/health`" to the exact expected path.

### Short Term

- Write tests for `IdentityGuard`/`parseIdentity` first — it's the security boundary and currently the least-verified code in the repo — then `UsersController`/`DailyLogsController`/services.
- Add `@nestjs/throttler` as an application-layer backstop against abuse, independent of whatever the edge/proxy already does.
- Standardize frontend Server Action error handling behind one shared helper instead of three different ad hoc patterns.
- Add indexes on `dailyLogs.userId` and `exercises.category`.
- Turn on full TypeScript `strict` mode on the backend while the codebase is still small enough that it's cheap to fix what surfaces.

### Long Term

- Consider a lightweight cryptographic backstop for the header-trust model (e.g. a shared HMAC secret verified in `IdentityGuard`) as real defense-in-depth, rather than relying solely on network isolation holding forever.
- Before building the Python photo-analysis worker + Redis + MinIO wiring (FITNESS-22/23/24), reassess actual VPS headroom — it had only ~1.4GB free at the time of this audit, already running Hub, Plane's full stack, todolist, and fitness on one box. That stack is genuinely heavy (OpenCV/MediaPipe); worth a capacity check or a resource plan before that phase starts, not after it doesn't fit.
- Extract shared UI primitives (`Input`/`Button`/`Select`) once a 4th form appears, before the Tailwind-duplication pattern compounds further.
- Either fill in or delete `docs/onboarding.md`, `docs/TODO.md`, `plans/backlog.md` — orphaned templates erode trust in the "docs are the source of truth" convention the rest of the project actually follows well.

---

## Overall Assessment

The parts of this project that are built are built well: the module structure is consistent, ADRs are genuinely used to record real trade-offs (not just theater), the CI/CD pipeline is fast and green, ticket hygiene in Plane is unusually disciplined for a solo project, and this session's own error-tracking design work (ADR-006) shows the right instinct — real constraints (VPS RAM) driving real decisions, not defaults. The two things that actually need attention are the auth boundary (currently unverified in code, entirely dependent on infrastructure holding) and the near-total absence of tests on exactly the code that boundary protects. Neither is an emergency at today's traffic level, but both are cheap to fix now and expensive to retrofit later.

The one standing strategic question worth keeping in view — not a defect, since it's an explicit, already-documented choice (`docs/architecture.md:13`, "full scope built in one pass, not phased as an MVP") — is that a fair amount of the *planned* architecture (polyglot Next+Nest+Python microservices, a custom Redis cross-language queue, MinIO, 4-locale i18n with a translation pipeline, an offline-write-queue PWA sync engine) is substantial infrastructure for a single-developer project on one already-tight VPS. It's a deliberate bet, not an accident — worth revisiting only if the VPS capacity check above says it needs to be.

---

## Action Plan

- [ ] Sync `README.md`, `CLAUDE.md` Current State, and `plans/current.md` with actual ticket state
- [ ] Add `try/catch` to `clearWeight` Server Action
- [ ] Add `try/catch` to `hasCompletedProfile`'s fetch in `proxy.ts`
- [ ] Tighten `proxy.ts`'s `/health` path match
- [ ] Write tests for `IdentityGuard`/`parseIdentity`
- [ ] Write tests for `UsersController`/`UsersService` and `DailyLogsController`/`DailyLogsService`
- [ ] Add `@nestjs/throttler`
- [ ] Standardize frontend Server Action error handling
- [ ] Add DB indexes on `dailyLogs.userId`, `exercises.category`
- [ ] Enable full TypeScript `strict` mode on backend
