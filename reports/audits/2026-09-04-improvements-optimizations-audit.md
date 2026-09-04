# Audit Report

Date: 2026-09-04

Auditor: Claude, via 4 parallel subagent audits (backend, frontend, database/schema, architecture) plus direct verification

Audit Type: Improvements/optimizations review — follow-up to `2026-08-16-project-review.md`, scoped to what changed since (18 commits: diet-generation overhaul across FITNESS-56/57/61/64, i18n, favorites, home dashboard)

---

## Scope

Everything in `~/workspace/fitness`: NestJS `backend/` (esp. `diets/`, `calorie-targets/`, `db/schema.ts`), Next.js `frontend/`, `docs/`/`knowledge/`/`plans/`. Each subagent read the prior audit first and was told to report only new findings, or unfixed prior findings explicitly flagged as still-open. Security/auth topics were out of scope except where a finding is genuinely new or newly urgent.

---

## Findings

### Critical

- **[Architecture] Auth boundary still has zero tests — unfixed since the prior audit.** `backend/src/identity/{identity.guard.ts,parse-identity.ts}` has no `.spec.ts`. Notably, diet-generation logic now has 5 solid unit-test files (`greedy-heuristic`, `diet-preference-exclusions`, `diet.types`, `swap-candidates`, `favorite-restriction`) proving the pure-function testing pattern works well in this codebase — it just hasn't been applied to the one path that matters most (ADR-001 header-trust auth, no cryptographic backstop).

### High

- **[Backend] Sequential per-role DB queries in diet generation.** `diets/diets.service.ts:114-146` — `findCandidatesByRole` loops over all 8 roles and issues a separate `await db.select()` per role on every `generate()` call. Fix: one query with `inArray(roleId, ...)` + the existing `notInArray` exclusions, grouped by role in memory.
- **[DB] `diets` has no index on `userId`/`(userId, createdAt)`.** `db/schema.ts:395-411`. Diet rows are append-only (regenerate always inserts, never updates/deletes — by design), so this table grows unboundedly and `findCurrent`/`findOwnedDiet` (`diets.service.ts:288-311`) will degrade to full-scan-plus-sort as history accumulates. Add `index().on(userId, createdAt.desc())`.
- **[DB] `dailyLogs.userId` still missing an explicit index — unfixed since prior audit.** `getWeightTrend`'s range scan and `findLatestWeighIn`'s `ORDER BY` (`daily-logs.service.ts:26-146`) need confirmation the existing `unique(userId, date)` constraint's column order actually serves them; if not, add `(userId, date desc)`.
- **[DB] `exercises.category` still missing an index — unfixed since prior audit.**
- **[DB] `dietItems.dietId` has no index.** Three hot paths (`buildResponse`, swap-totals recompute, item lookup — `diets.service.ts:388,446,513`) full-scan this table on every diet read/swap.
- **[DB] No FK column in the schema is indexed** except one partial-unique index (`photo_sessions_one_baseline_per_user`). Postgres doesn't auto-index FKs. Low risk today; will degrade linearly with growth. Prioritize `foodPreferences.userId` (hit on every diet generate/swap) and `workoutSets.workoutLogId`.
- **[Architecture] `README.md` has re-drifted — regressed past the prior fix.** Lines 6-9 now claim diet engine, progress photos, i18n, and PWA offline support are "designed... but not yet built." All are shipped and in production. Worth a one-line PR-checklist reminder rather than another ad hoc fix, since this is the second time it's drifted.
- **[Architecture] VPS capacity check is now overdue, not just a future risk.** The prior audit flagged tight headroom (~1.4GB free) and recommended a check "before" the Python/MediaPipe worker phase started. That worker is now live in production `docker-compose.yml`. Verify actual current usage now.
- **[Frontend] Sequential fetch waterfalls in two Server Components** that should match the `Promise.all` pattern already used correctly elsewhere (`diet/page.tsx`, `food/page.tsx`, home `page.tsx`): `diary/page.tsx:50-55` (three independent fetches run serially) and `workouts/[id]/page.tsx:30-31`.

### Medium

- **[Backend] Duplicate algorithm-row fetch per `generate()` call.** `ALGORITHM_CODE = 'mifflin_v1'` is defined twice (`calorie-targets.service.ts:16`, `diets.service.ts:34`) and each independently queries the same `dietCalculationAlgorithms` row. Have one service expose what it already fetched.
- **[Backend] Duplicated algorithm-lookup-by-id block**, byte-for-byte identical in `findCurrent` (`diets.service.ts:296-301`) and `swapItem` (`:475-480`) — extract to a private helper.
- **[Backend] `pickRerollReplacement` over-fetches vs. its sibling `findCandidatesByRole`** — pushes exclusions into JS instead of SQL `WHERE` like the other candidate-fetch path. Inconsistent, and a real over-fetch once a role holds hundreds of items.
- **[DB] Favorite Food Items queries scan `foodPreferences` by `userId` twice independently** (`getExclusionTargets`, `getFavoriteFoodItemIds`) instead of one shared query split by `type`. Minor duplicate I/O, not a correctness issue.
- **[DB] `diets` history has no bound or archival strategy** — pairs with the missing-index finding above as the main long-term growth risk in the schema.
- **[Architecture] `plans/current.md` has one stale unchecked item** ("Progress gallery grouped by date, baseline comparison") that actually shipped (FITNESS-25). Otherwise this file is well-maintained now, a big improvement over the prior audit's 0/20.
- **[Architecture] `docs/TODO.md` and `plans/backlog.md` remain empty placeholders — still unfixed**, despite `CLAUDE.md` citing them as authoritative.
- **[Architecture] Frontend hand-mirrors backend diet DTOs with no compile-time enforcement.** `frontend/src/features/diet/actions.ts` manually re-declares response types with `// Mirrors backend/...` comments. Disciplined today (business logic itself doesn't leak — confirmed no duplication in `worker/` either), but nothing catches drift if the comment goes stale, and diet DTOs have changed shape repeatedly. Worth generating frontend types from backend DTOs once the shape stabilizes.
- **[Architecture] Diet-generation logic is churning faster than it's settling.** ADR-011 has had 3 corrections in under 2 weeks; ADR-015 was superseded by ADR-016 the same day it was written. Churn is well-contained to `diets/greedy-heuristic.ts` + `diet.types.ts`, but an end-to-end integration test across full generation (not just per-function units) would catch regressions the unit tests can't.
- **[Frontend] Full i18n message catalog shipped to every client page.** `[locale]/layout.tsx` wraps the app in `NextIntlClientProvider` with no `messages` scoping, so next-intl serializes the entire locale file (584 lines, all namespaces) to every route's client bundle, even though individual client components (`SwapPicker`, `DietItemActions`, `ProfileFields`) each need one or two namespaces. Compounds as i18n coverage grows.
- **[Frontend] Home dashboard makes 7 independent backend round trips per load.** Correctly parallelized via `Promise.all`, but still 7 separate NestJS requests to render one page. Worth a `/dashboard/summary` aggregate endpoint once more cards land.

### Low

- **[Backend] `correctMeal`'s O(n²) recompute** in `greedy-heuristic.ts:236-259` — negligible at ~4 items/meal, worth a running-totals accumulator only if meal role chains grow.
- **[DB] Migration hygiene is clean** (22/22 journal entries match SQL files with snapshots); `foodPreferences.targetId` polymorphic FK is a deliberate, documented tradeoff, not a new issue.
- **[Architecture] CI still has no real-Postgres integration test** — unchanged from prior audit, low urgency at current scale.
- **[Frontend] Three cheap items from the prior audit remain unfixed:** `proxy.ts:36`'s health-check path still matches any path ending in `/health` instead of the exact route; `hasCompletedProfile` (`proxy.ts:22-31`) still has no try/catch unlike its sibling `resolveIdentity`; non-null env assertions in `proxy.ts`/`hub-identity.ts` still fail at first request rather than at boot.
- **[Frontend] `docs/architecture.md` lists TanStack Query as part of the stack, but it's not an actual dependency** — no `useQuery`/`useMutation`/`QueryClient` anywhere in `frontend/src`. Not a defect (Server Components/Actions cover the need), but the doc should reflect what's actually adopted.

---

## Recommendations

### Immediate

- Add the missing indexes in one migration: `diets(userId, createdAt desc)`, `dietItems(dietId)`, `exercises(category)`, `foodPreferences(userId)`, and confirm/fix `dailyLogs`'s trend-query index.
- Collapse `findCandidatesByRole`'s 8 sequential queries into one `inArray` query.
- Wrap `diary/page.tsx` and `workouts/[id]/page.tsx`'s independent fetches in `Promise.all`, matching the pattern already used elsewhere.
- Re-sync `README.md`'s status section with reality (second time it's drifted — consider a PR checklist item).
- Dedupe the `ALGORITHM_CODE` constant and the two algorithm-lookup-by-id blocks in `diets.service.ts`.
- Fix the three still-open cheap frontend items: `proxy.ts` health-path match, `hasCompletedProfile` try/catch, env-assertion-at-boot.

### Short Term

- Write tests for `IdentityGuard`/`parseIdentity` — still the top-priority gap; the diet module's unit-test pattern is a ready template.
- Verify current VPS resource headroom now that the photo-analysis worker is live in production.
- Add an end-to-end integration test across full diet generation, given the pace of correction (3 ADR revisions in under 2 weeks).
- Add indexes on the remaining unindexed FK columns as a blanket pass.
- Scope next-intl `messages` per route/layout instead of shipping the full catalog to every client page.

### Long Term

- Decide an archival/prune strategy (or an `isCurrent` flag) for the append-only `diets` history table before it becomes a performance problem.
- Consider generating frontend diet DTO types from the backend instead of hand-mirroring them.
- Consider a `/dashboard/summary` aggregate endpoint once the home dashboard grows past its current 7 parallel calls.
- Fill in or delete `docs/TODO.md` and `plans/backlog.md`; correct `docs/architecture.md`'s TanStack Query listing.

---

## Overall Assessment

Most of the prior audit's findings are genuinely fixed: frontend Server Action error handling is now consistent behind a shared helper, shared UI primitives exist, and frontend test coverage went from zero to 17 files including component tests. The diet-generation feature — the area of heaviest recent activity — is well-unit-tested and its business logic doesn't leak across service boundaries. The two things now most worth attention are the same *class* of gap as before, just relocated: the auth boundary is still the single most important untested code path in the repo, and the newer diet/favorites tables reproduce the missing-index pattern the prior audit already flagged elsewhere. Neither is urgent at current traffic, but both are cheap now and compound with data growth. The diet-generation module's rapid iteration (multiple corrections in under two weeks) is being managed well at the unit level but would benefit from one integration test covering a full generation run before the next feature builds on top of it.

---

## Action Plan

- [x] Add indexes: `diets(userId, createdAt)`, `dietItems(dietId)`, `exercises(category)` — plus `foodCalories(roleId/categoryId/subcategoryId)`, the actual hottest generation-time filter columns the backend audit flagged (migration `0022_low_the_enforcers.sql`). `dailyLogs`/`foodPreferences` turned out to already be served by existing composite-unique indexes whose leading column is `userId` (Postgres leftmost-prefix rule) — no redundant index added there.
- [x] Collapse `findCandidatesByRole`'s per-role queries into one `inArray` query
- [x] Parallelize fetches in `diary/page.tsx` and `workouts/[id]/page.tsx` with `Promise.all`
- [x] Re-sync `README.md` status section with reality
- [x] Dedupe `ALGORITHM_CODE` constant and the two algorithm-lookup-by-id blocks (`CalorieTargetResponse.algorithm` now carries `id`, so `generate()` reuses the row `computeForUser()` already fetched instead of a second lookup; `findCurrent`/`swapItem` share a new `getAlgorithmById` helper)
- [x] Fix `proxy.ts` health-path match, `hasCompletedProfile` try/catch, env-assertion-at-boot (`requireEnv` helper)
- [x] Write tests for `IdentityGuard`/`parseIdentity` (18 tests, `src/identity/*.spec.ts`)
- [x] Verify current VPS resource headroom with the worker live — checked directly: 3.7GB available RAM of 7.6GB, 13GB free disk (35%). Healthy; the original capacity concern hasn't materialized.
- [x] Add an integration test across full diet generation — and it immediately caught a real bug, see **new Critical finding** below.
- [x] Add indexes on remaining unindexed FK columns (`trainingPrograms.userId`, `programExercises.trainingProgramId`, `workoutLogs.dailyLogId`, `workoutSets.workoutLogId`/`exerciseId`, `progressPhotos.dailyLogId`, `dietItems.foodItemId`)
- [ ] Scope next-intl messages per route — **deferred**, not attempted. A correct fix needs per-route-group `NextIntlClientProvider` scoping (the root layout has no way to know which namespaces a given page's client components need), which risks silently breaking translations in production if a namespace is missed, with no test coverage that would catch it. Recommend a dedicated follow-up rather than folding into this sweep.
- [ ] Decide archival/prune strategy for `diets` history — **deferred, needs a product decision**. `schema.ts`'s own comment states diet history being kept forever is an intentional design choice ("regenerating always inserts a new row... older Diets kept as history"), not an oversight — implementing archival would reverse that decision, not fix a bug. Flagging for your call, not implementing unilaterally.

### New finding, surfaced by the integration test added above

- **[Critical] Protein (and likely carbs/fat) can exceed their own ceiling even though calories don't.** `docs/decisions.md`'s FITNESS-64 correction states calories *and* each of protein/carbs/fat independently must never exceed target. In practice, `correctMeal` (`greedy-heuristic.ts`) only ever corrects toward the meal's *calorie* delta — a non-protein-role candidate's own incidental protein (e.g. a vegetable with nonzero `proteinPer100g`, which is realistic for real food) is never weighed against the protein ceiling during initial sizing, and no correction pass triggers if a meal's calories are within target even when its protein isn't. Reproduced with a realistic multi-role candidate pool at mealCount 4-6: protein landed at 211g against a 165g target (+28%). Left as a documented TODO in the new `diet-generation.integration.spec.ts` rather than fixed inline — this is the most actively hand-tuned algorithm in the codebase (3 ADR corrections in under 2 weeks), and the right correction strategy (correct whichever metric is most over, extend `shrinkTowardDelta` to target a specific metric, etc.) is a real design decision, not a mechanical fix.
