# Work Summary

Period: 2026-09-15

Owner: Mykola Blonskyi

Scope: implement ADR-023 in `backend/src/diets/`, delivered as the three
stacked PRs the ADR's mirror entry names.

| PR | What |
|---|---|
| #118 | Favorites narrow the macro slot; casein prefers the last meal |
| #119 | A role carrying none of its macro falls through to the next |
| #120 | Role `dairy` joins the protein chain |

All three merged and deployed on 2026-09-15.

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

- [ ] Nothing from this ADR. Two items it listed as not-done remain open:
  branded scans without a Food Family stay unusable, and `affectsGeneration`
  still tests only `familyId != null`, so it keeps telling the user that
  items count when generation cannot reach them. That marker matters more
  after #120, since `dairy` became reachable while `fruit` did not.

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

**Fruit was held back, dairy was not.** The ADR's third PR was planned as
"dairy and fruit joining the chains". Dairy had an unambiguous home, since
#118 had already made the protein slot a Category-filtered pool and `dairy`
sits in the animal set. Fruit did not. The carb chain is a walk that stops at
the first role with an eligible candidate, and `complex_carb` always has one,
so appending fruit there would be reached essentially never. Unioning the carb
pool instead would let an apple be the carb of any meal on macro fit alone.
Put to the owner as a product call; the answer was to defer fruit to ADR-020
phase 2's dinner Archetype, which already specifies "slow protein + fruit".

**The casein rule shipped inert and was switched on two PRs later.** #118 added
the Meal Affinity with passing unit tests, but every `casein_dairy` row carries
Role `dairy` and no chain contained it, so nothing in production reached the
rule. #120 is what made it live. Worth recording because the tests were green
throughout and told us nothing about reachability.

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
- Role `fruit` stays ungeneratable, and with it sixteen curated staples.
  Deferred deliberately, not overlooked.
- `affectsGeneration` still reports unreachable items as counting, which is
  now the largest honesty gap left in this area.
