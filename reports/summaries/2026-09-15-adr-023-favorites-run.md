# Work Summary

Period: 2026-09-15

Owner: Mykola Blonskyi

Scope: implement ADR-023 (favorites narrow the macro slot; a Food Family can
prefer a meal position) in `backend/src/diets/`.

---

## Completed

- [x] Favorites narrow the macro slot, not the Food Family. The bias PR #112
  put inside `pick` is gone. Narrowing now runs on the slot's own pool, ahead
  of the day rules, so the density and fat-budget filters can no longer strip
  every favorite before the bias reads them.
- [x] Protein and carb narrow hard, round-robin, no per-item cap. Vegetable
  and fat narrow soft: a favorite serves twice, then the normal pool opens.
  `FAVORITE_NARROWING` holds the per-slot rule as a table.
- [x] A favorite is judged against a 2.0 protein fat budget instead of 0.7,
  still inside `eligibleCandidates` rather than around it.
- [x] `meal-affinity.ts`: `casein_dairy` prefers the last meal, every other
  Family has no entry. Preference only, never a block.
- [x] The protein pool is one pool across its whole role chain, filtered by
  Category. Legumes and nuts join once a diet type removes meat or fish.
- [x] Reroll narrows to favorites; explicit swap still offers the whole Role.
- [x] 302 backend tests pass, 12 of them new. Lint and Prettier clean.

---

## In Progress

- [ ] This is the third of the three stacked PRs the ADR's mirror entry
  names. The chain-tail `break` fix and `dairy`/`fruit` joining
  `MEAL_ROLE_CHAINS` are not done.

---

## Decisions

**The stop condition in the original instruction did not apply.** It named
"the migration check reports zero old callers". The only migration check in
this repo is `db:check:identity-migration`, which belongs to ADR-018 and
counts users who have not yet signed in through `login.blonskyi.dev`. It is
unrelated to diet generation and only a human signing in can move it. ADR-023's
own scope was used as the finish line instead.

**The protein chain became a union, not a chain.** ADR-023 states the protein
pool as a set of Categories, so first-non-empty-role-wins had to go. This is
the only change here that alters an omnivore's menu: `fatty_protein` now sits
in the same pool as `lean_protein` rather than behind it. The lean preference
survives through `PROTEIN_FAT_BUDGET_SHARE`, which is what actually prices
incidental fat. Called out because it is wider than the favorites work and
worth a second opinion.

**The old favorites spec was rewritten, not extended.** Its third case
asserted that a used-up favorite reopens the protein slot. ADR-023 reverses
exactly that, so the test was inverted rather than kept.

**`FoodCandidate.categoryName` is optional though the column is NOT NULL.**
Generation always sees a name. Optional only so the pure-function specs need
not thread a field they do not exercise.

**The ADR text ships with the code.** `docs/decisions.md`,
`knowledge/business-rules.md` and `knowledge/glossary.md` were already written
before this run and describe all five causes, including the two the other two
PRs own. They are in this branch because the ADR is the spec that makes the
diff reviewable, not because this PR implements all of it.

---

## Blockers

- None.

---

## Risks

- The omnivore protein pool widening is unmeasured. ADR-019 benchmarked
  macro accuracy over 300 randomised menus per meal count; that benchmark was
  not re-run here, so the effect of a wider protein pool on the reported
  ~4 g protein / ~7 g carb-fat misses is unknown.
- `MEAL_ROLE_CHAINS` is what ADR-020 phase 2 replaces with Archetypes and
  Slots. The protein-pool change lands inside a structure that is scheduled
  to be rewritten, which ADR-023 accepts explicitly.
- `casein_dairy` affinity is inert in production. Those rows carry Role
  `dairy`, which no `MEAL_ROLE_CHAINS` entry contains, so nothing reaches the
  rule until the second PR in the stack lands. It is unit-tested, not live.
- The chain-tail `break` bug is untouched here by design, one PR per change.
  It still applies to the carb and fat chains. The protein chain no longer
  walks role by role, so it is unaffected.
