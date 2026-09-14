# Autonomous run, 2026-09-13

Operator stepped away with the instruction: "take all available tasks, use subagent and git
worktrees ... keep going until the migration check reports zero old callers."

## Exit condition: no referent

The stated predicate could not be adopted. There is no migration in flight and no caller-counting
check in either project. Verified exhaustively before starting work:

| Search | Result |
| --- | --- |
| `@deprecated`, `legacy`, `TODO: migrate` across `backend/src`, `frontend/src`, `worker` | zero hits |
| Caller-counting script in any `package.json` | none; checks are `check:i18n`, `lighthouse:pwa`, lint, format, test, `db:*` |
| `.github/workflows/ci.yml` | two `migrat` hits, both comments about the Docker entrypoint running DB migrations pre-traffic |
| Plane FITNESS project, 76 items | no migration/caller ticket |
| Plane TODO project, 65 items | no migration/caller ticket; only TODO-63 and TODO-65 open |
| `todo-worktrees/hub-callers` branch | zero divergence from `origin/main`, a dead worktree |

The phrase most likely came from the poteto skill's own principle name, "Migrate Callers Then Delete
Legacy APIs", rather than from work in either repo. The predicate was reported as unmet-by-absence
rather than substituted, relaxed, or invented.

## Substituted predicate

Every FITNESS work item in `Todo` state is either delivered or explicitly escalated. `Backlog` items
are out of scope per `docs/agents/issue-tracker.md`, which permits taking only `Todo`.

## Environment findings

- **No JavaScript runtime exists on this host.** No node, npm, pnpm, npx, nvm, volta, fnm or bun.
  The documented `pnpm install` / `pnpm test` commands cannot run directly. Docker is present and
  working, so all verification was routed through `node:22-alpine` containers with the repo
  bind-mounted. Baseline confirmed green that way: 29 suites, 235 tests.
- **CI cannot verify anything either.** GitHub Actions billing is still failing, no workflow run
  since 2026-09-03. Container-based local verification is currently the only proof available.
- `CLAUDE.md` claimed every FITNESS item was Done or Cancelled. That was stale. Six items were open.

## Queue as found

| Ticket | State | Disposition |
| --- | --- | --- |
| FITNESS-72 (high) | Todo | Taken. Worktree `fitness-worktrees/FITNESS-72`, claimed In Progress in Plane. |
| FITNESS-76 (urgent) | Todo | **Escalated, not run.** See below. |
| FITNESS-70, FITNESS-71 | In Progress | Left open deliberately. See below. |
| FITNESS-69, FITNESS-75 | Backlog | Not eligible. |

## FITNESS-76 escalated rather than executed

FITNESS-76 is a production data mutation, not a code change. It runs
`node dist/scripts/classify-food-families.js` against the production database as a release gate.
Autonomous policy pauses for irreversible writes: deploys, production data changes, deletions. This
is one. It is left for the operator with the dry-run step noted as the safe first move.

## FITNESS-70 and FITNESS-71 left In Progress

Both shipped code (PRs #90 and #95, merged). Both carry an unmet acceptance criterion:
FITNESS-70 requires the migration applied to production, FITNESS-71 requires the staples seeded to
production. FITNESS-76 states every `food_calories.family_id` in production is still null, which
proves neither production step ran. Closing either as Done would record a completion that did not
happen, so both were left open. This is the same blocker as FITNESS-76 and clears with it.

## FITNESS-72 outcome

Delivered as PR #98, branch `FITNESS-72`, not merged. One commit, 6 files, +152/-9.

Implementation was delegated to a subagent in the isolated worktree; the diff was reviewed here
rather than accepted on the subagent's summary. Two things changed on review.

**Correctness check on the role backfill.** The pass now writes `role_id` via
`ids.roleIds.get(row.role)!`. That non-null assertion is only safe if every role name reaching it
exists in the map. Verified: `role_id` is `.notNull()`, `foodRoles` is joined with `innerJoin` so
`currentRole` is never null, `roleIds` is built from the canonical `ROLES` list, and all three
values `resolveRoleOverride` can return (`complex_carb`, `plant_protein`, `healthy_fat`) are in it.
Safe, and it matches the existing idiom at `seed-food-catalog.ts:652`.

**Comment pass, per the CLAUDE.md requirement to run one over a subagent's diff.** Four cuts. A
comment in `diets.service.ts` restated `schema.ts:315` almost verbatim, against the "one rule, one
home" rule, reduced to a single line naming the scope distinction. A five-line paragraph in
`food-families.ts` explained a map literal that speaks for itself, cut to the two lines covering the
olive/avocado exception, which is the only non-obvious part. The `classify-food-families.ts` header
had grown from five lines to seven, restored to its original shape with `role_id` added. A comment
in `swap-candidates.spec.ts` restated its own test name, deleted. Net effect of the pass was 9 lines
removed; tests stayed green afterwards.

**AC 3 is half-covered on purpose.** The criterion asks for a test that a familyless food is "still
browsable and loggable". No such test was written. Every test here mocks the Drizzle chain, so a
mocked `where()` returns its canned rows whatever the predicate is; a test asserting browse still
returns the row would pass even if a family filter were added to `list()`. That is theatre, not a
guard. Verified by inspection instead: `food-items.service.ts` never references family. A real guard
needs an integration test against a live database, and `backend/test/` holds one e2e spec with no
database wiring, so that harness is its own piece of work. Flagged on the PR and the ticket.

**Found, out of scope, not fixed.** `pickRerollReplacement` queries `food_calories` directly and is
not Family-filtered, so a food with no Family can still be offered as a same-role swap replacement.
Same class of bug as the one this ticket fixes; ADR-020 scopes the restriction to generation.

## Final state

- PR #98 open, unmerged, no CI (Actions billing). Verified locally in-container at 30 suites / 241 tests.
- FITNESS-72 still In Progress in Plane with the PR linked, per the tracker's rule that merging is a human action.
- No further work is safely automatable. FITNESS-76 and the production ACs on FITNESS-70/71 all gate on the same operator-run production classification pass.
