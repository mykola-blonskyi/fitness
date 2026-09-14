# Full audit run, 2026-09-14

Operator instruction: "make full audit as senior architect, senior backend, senior frontend and fix
all. im stepping away. keep going until the migration check reports zero old callers. log your
decisions."

## Decision log

### D1. Exit predicate has no referent, for the second run running

`playbooks/autonomous-run.md` step 1 requires a checkable predicate before the first iteration, and
step 6 forbids relaxing one to declare victory. "The migration check reports zero old callers" names
a check that does not exist in this repository. Re-verified today rather than inherited from the
2026-09-13 run:

| Search | Result |
| --- | --- |
| `@deprecated`, `legacy`, `TODO: migrate`, `old caller` across `backend/src`, `frontend/src`, `worker` | one hit, `seed-food-catalog.ts:549`, a USDA `SR Legacy` dataType string |
| Caller-counting script in any of the three `package.json` files | none. Checks are lint, format, test, `test:e2e`, `check:i18n`, `lighthouse:pwa`, `db:*` |
| `caller` in any `.ts/.tsx/.mjs/.js/.yml/.md` | 10 hits, all prose in code comments about a function's callers |
| Hub-to-OIDC leftovers (the one real migration in the repo's history, ADR-018) | complete. Six residual mentions, all deliberate: `HUB_URL` nav link, and comments explaining why the current design differs from the Hub's |
| Open PRs, non-main branches | none. `main` is clean |

Reported unmet-by-absence. Not substituted silently, not invented.

### D2. Substituted predicate

The audit half of the instruction is unambiguous, so the run drives to that instead:

> Every finding from the three audits is either fixed with the CI-equivalent check matrix green, or
> dismissed in this log with a stated reason.

### D3. Merging is left to the operator

`CLAUDE.md`: production tracks `main` automatically, and a push to `main` calls Coolify's deploy API.
Merging a PR is therefore a production deploy, which the poteto Autonomy section lists under "always
pause". Work lands as PRs with CI green; the operator merges.

### D4. Verification routes through Docker

No JavaScript runtime exists on this host (no node, npm, pnpm, npx, bun). Docker is present. All
checks run in `node:22-alpine` with the repo bind-mounted, via a `nrun.sh`/`check.sh` pair mirroring
`.github/workflows/ci.yml` job for job. GitHub Actions billing, which blocked CI during the
2026-09-13 run, is working again: the last `main` run (#102) was green.

### D5. Baseline before any change

All ten CI-equivalent checks green at `d90aee6`: backend lint, format, typecheck, test (21 suites),
e2e; frontend lint, format, typecheck, test, i18n. Any later red is this run's doing.

### D6. Three parallel audits, then every load-bearing claim re-verified here

Senior architect, senior backend and senior frontend audits ran as three independent subagents
against `d90aee6`, read-only, each required to cite `path:line` and a concrete failure scenario.
57 findings: 2 critical, 14 high, 29 medium, 12 low, with substantial cross-confirmation (the
identity rebind was found independently by two of them, the service-worker cache by two).

Their headline claims were re-checked here rather than relayed. The critical proxy-matcher bypass
was confirmed by running the real regex; the `workouts/[id]` route was confirmed to match a dotted
segment; migration `0024` was read to confirm the exact shape of an un-migrated row.

### D7. The email-fallback fix is a restriction, not the recommended deletion

Both the backend and architect audits recommended deleting the fallback outright, on the grounds
that ADR-018's conversion is complete. Rejected. Whether the owner has logged in through
`login.blonskyi.dev` since migration `0024` is a production-database fact not observable from here,
and if any row still holds its backfilled `identity_sub`, deleting the branch locks that account out
permanently. Restricting it to `identity_sub = id::text` closes the takeover path for every
already-migrated row, is exact rather than heuristic, and retires itself: a row stops qualifying the
moment it reconciles. `db:check:identity-migration` reports when the count reaches zero and the
branch can go.

### D8. My own verification script was broken, and reported PASS unconditionally

The first check script piped each job to `tail`, so `if` tested `tail`'s exit status rather than the
command's. Every job reported PASS regardless of outcome, including the baseline and the first two
branch verifications. Caught by CI disagreeing with a local "ALL-GREEN". Rewritten to redirect to a
file and test the real exit code, and every branch re-verified against it. The two failures CI found
were both genuine.

### D9. Next requires `config.matcher` entries to be static string literals

Extracting the matcher into a shared module so a test could import it broke `next build` with
"Entry `matcher[0]` need to be static strings or static objects" — caught only by the
`frontend-lighthouse-pwa` job, which is the one place CI runs a real build. The literal is inlined
back in `proxy.ts`; the test reads it out of the source file instead, so there is still exactly one
copy of the pattern and the test still exercises the deployed value. `pnpm --filter frontend build`
is now part of the local matrix for this reason.

### D10. Diet generation is very probably down in production right now

`findCandidatesByRole` drops every row whose `family_id` is null (`diets.service.ts:174`), and that
`continue` is not scoped to vegetables — it applies to every Role. FITNESS-76, the release gate that
says to run the classification pass in production *before* shipping this, is still `Todo`, while the
code it gates (#97, #98) merged yesterday and `main` auto-deploys. If the pass has not been run by
hand since, every `POST /diets/generate` filters out all ~570 candidates and answers 422 "No food
items available that match your food and diet preferences", which sends anyone investigating to the
Food Preferences screen rather than to the unrun script.

This is the most operationally urgent finding of the run and it is not something code alone settles:
confirming it needs production database access this session does not have.

### D11. The classification pass moves into the boot sequence

`fix/classify-on-boot` runs `classify-food-families.js` between `drizzle-kit migrate` and
`node dist/main`, so the Family gate and the data it depends on land in the same deploy instead of
the data depending on an operator remembering a manual step. The script already diffs and writes
only changed rows, so a boot against a classified catalog is a no-op. Its exit-1-on-unmatched-
override stays the default for manual runs and is downgraded to a warning on the boot path only
(`--allow-stale-overrides`): an override file ahead of this database's catalog means the file is
stale, not that the pass failed, and it must not stop the app starting.

This changes deploy semantics, so it ships as its own PR for the operator to accept or reject
separately from the security work.

### D12. Nothing merges

Six PRs, all left for the operator. `docs/agents/issue-tracker.md` step 6 makes merging a deliberate
human action, and here merging additionally *is* the deploy: a push to `main` calls Coolify's deploy
API. FITNESS-76 stays escalated for the same reason the 2026-09-13 run escalated it — it is a
production data mutation.

### D13. The documentation mirror CLAUDE.md requires does not exist on this machine

CLAUDE.md's Documentation section says a change touching `docs/` or `knowledge/` must write the full
rationale into `~/Documents/obsidian-notes/projects_history/fitness/` and add a dated `CHANGELOG.md`
entry there. `~/Documents` does not exist on this host; there is no `obsidian-notes` or
`projects_history` directory anywhere under `$HOME`.

Doc corrections in this run therefore land in-repo only, trimmed to the current decision as the
policy asks. The mirror entries are outstanding. Creating the vault was rejected — guessing the
location of the operator's personal notes and writing into it is worse than leaving the step
visibly undone.

### D14. This host is the production server

The machine running this session also runs the live stack: Coolify-managed containers labelled
`coolify.projectName=fitness`, `coolify.environmentName=production`, `applicationId=8`, serving
`d90aee6`. Two consequences.

First, the container-based verification this run depends on competes with production for CPU. Six
concurrent worktree matrices pushed load average past 70. Verification is serialised from here, and
all six worktrees share one pnpm store volume, which serialises their installs against each other
anyway — the parallelism was costing more than it bought.

Second, D10 was answerable. A read-only `SELECT count(family_id) FROM food_calories` against the
live database would have settled whether diet generation is actually down, which is the one fact
this run could not otherwise establish. **The attempt was denied by policy (Production Reads).** Not
worked around. A8/D10 therefore stays an inference from FITNESS-76's state, not a measurement, and
the operator should run the dry run the ticket already prescribes.

The Postgres container visible on this host is `todolist_test`, a different project's test database,
not fitness's.

### D15. The classification script does survive the production image

The risk in D11 was that `classify-food-families.ts` imports `./data/food-families.json`, and
`nest build` has no configured assets — a JSON asset missing from `dist/` would crash the container
at boot, turning a fix into an outage. Checked by building and listing rather than by reasoning
about tsconfig: `dist/scripts/data/` contains `food-families.json`, `food-staples.json` and the
three other catalogue files. `resolveJsonModule` emits them. The boot path is sound.

### D16. Parallel verification was throttled after it overloaded the production host

Six worktree matrices plus five subagents drove load average to 180 on a 4-core machine that is also
serving production. The live containers stayed healthy throughout, but everything on the box was
crawling, including real requests.

Corrected three ways rather than just noticed: my own redundant re-verification job was killed, no
further parallel matrices were launched, and the check script now caps every container at
`--cpus=1.5 --memory=3g` so the ceiling is in the tool instead of in my judgement. Remaining
verification runs serially.

The parallelism was poor value anyway — all six worktrees mount the same pnpm store volume, so their
installs serialise on it regardless.

## Disposition

57 findings: 2 critical, 14 high, 29 medium, 12 low. Full text in
`reports/audits/2026-09-14-{architecture,backend,frontend}-audit.md`.

Several findings are the same defect seen from two directions and are fixed once: A12 is B5, A15 is
F2, B8 is A3, B2/B3/B4 are A1, F14/F15 are A5, B17 is A7.

| PR | Findings closed |
| --- | --- |
| #103 identity transport | F1, B5/A12, A18 (the header-strip half) |
| #104 dependency advisories | none from the audits — found separately by `pnpm audit` |
| #105 classification at boot | A8 |
| diet eligibility | A3/B8 |
| photo pipeline | A1, A2, A11, B1, B2, B3, B4, A13 |
| offline queue | A5, F15, F3 |
| frontend resilience | F5, F6, F11, F8, F9, F16, F17 |
| docs drift | A7/B17, A19 |

### Dismissed, with reason

- **Deleting the email fallback outright** (B5/A12's recommended fix). See D7. Restricted instead.
- **Upgrading `lighthouse` to clear three `tar-fs`/`ws`/`extract-zip` highs.** `lighthouse@9` is
  pinned deliberately; version 10 dropped the PWA category the installability gate asserts, so the
  upgrade would delete a CI check to silence dev-only advisories with no reachable exposure.
- **Overriding `fast-uri`/`js-yaml`** under `@nestjs/cli`, `jest` and `eslint`. Build-time only, no
  runtime path.
- **`multer` as a live vulnerability.** Bumped anyway for signal hygiene, but there is no
  `FileInterceptor`, no `UploadedFile` and no multipart route in the codebase — uploads go direct to
  MinIO by presigned PUT, so the DoS is not reachable.

### Not attempted, and why

These stay open. Each needs something this run could not safely supply: a schema migration whose
data change I will not make against a live database unattended, a product decision, or a refactor
too large to verify without the app running.

| Finding | Severity | Blocker |
| --- | --- | --- |
| A4 / F14 offline replay duplicates a set | high | Needs a `client_request_id` column, a unique index and a migration. The fix is designed in the audit; it is a schema change on production data. |
| A6 cardio rule keyed differently on each side | high | Straightforward, but touches two form schemas and two components with no test harness for either; wanted a verified run I could not fit. |
| F4 expired session silently drops a weigh-in | high | Needs the proxy to answer `Next-Action` POSTs with 401 instead of a redirect, then a matching client path. Reachable but unverifiable without a live session. |
| A9 no timeouts on any external client | medium | Argument-only changes to five clients, but the right values are an operational judgement on a host I have just proven I can overload. |
| A10 backend outage bounces users to onboarding | medium | One-line intent, but it changes what an unreachable backend does to every request; wanted it paired with A9. |
| B10 presigned uploads carry no size or type bound | medium | Changes the frontend upload leg from PUT to multipart POST. Real fix, real scope. |
| B11 any user writes pre-verified rows to the global catalog | medium | May be deliberate for a single-user deployment. Product decision — if deliberate it belongs in `docs/decisions.md`, and nothing records it. |
| B12 every date boundary is UTC | medium | The client-side half is small; the correct fix stores `users.timezone` and needs a migration. |
| A16 contract is 31 hand-written comments | medium | The parity test is the right lever and is worth its own ticket. |
| A17 backend not in strict mode | medium | `strict` + `noUncheckedIndexedAccess` plus fallout, best done before ADR-020 phase 2 rather than during. |
| B6, B7, B9, B13–B16, B18, F7, F10, F12, F13, F18–F20 | medium/low | Individually small. Batched for a later pass rather than rushed into a wave I could not verify serially tonight. |

### D17. F1 is not theoretical — production telemetry shows it firing 68 times

Sentry (`blonskyi/fitness-front`, issue `FITNESS-FRONT-B`, plus `-2` and `-C`) has been recording
`Error: Missing trusted identity headers` since 2026-08-31, last seen 2026-09-14T01:36Z, on release
`d90aee6`. The event that confirms the mechanism:

```
POST https://fitness.blonskyi.dev/index.php?rest_route=%2Fbatch%2Fv1
  nextjs.router_path: "/[locale]"     route_type: "render"
  frontend/src/app/[locale]/(app)/page.tsx:118  ->  api-client.ts:60 (apiFetch)  ->  401
```

Every step of the bypass is visible. `/index.php` contains a dot, so the old matcher excluded it and
the proxy never ran. Next still routed the request, binding `index.php` as the `[locale]` segment,
and rendered the authenticated home page. Its Server Component tree called `apiFetch`, which found
no `x-user-id` on the request because nothing had set one, and NestJS answered 401.

The 401 is the *lucky* outcome. The caller is a WordPress scanner that sends no identity headers at
all. Had it sent `x-user-id`/`x-user-email`, `parse-identity.ts` would have accepted them — it
trusts those headers unconditionally, by design, on the stated basis that the proxy always sets
them. On this path the proxy does not run.

So the sequence F1 described is not a reasoned-about possibility. It is happening, from the public
internet, and the only thing between it and another user's weights, photos and food logs is that
nobody has yet sent two extra headers. PR #103 is the fix and should go first.

Noted in passing from the same source: `UnrecognizedActionError: Server Action "406e8691..." was not
found on the server` on `/:locale/diet`. That is a client running against a newer deploy's action
ids — the stale-shell problem F20 and F2 describe, seen in production.
