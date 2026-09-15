---
id: FITNESS-72
title: "Restrict generation to foods that carry a Family, and reclassify the misfiled ones"
state: Done
state_group: completed
priority: high
labels: []
module: "Menu Composition (Archetypes & Food Families)"
parent: FITNESS-69
created: 2026-09-11
updated: 2026-09-13
plane_id: 18f808d3-415f-420a-b691-680478f7647d
---

# FITNESS-72: Restrict generation to foods that carry a Family, and reclassify the misfiled ones

Generation draws only from Food Items with a Family. No exclusion list is needed: flours, branded breads, offal, frankfurters, crackers, vegetable chips and babyfood simply never get classified, and sweets/beverages stop needing their special case.

Reclassification in the same pass: potato and sweet potato to role `complex_carb` / family `starchy_vegetable` (they are currently `vegetable`, so a salad can be potato); beans and lentils to `plant_protein`; olives to a fat. **Category is untouched** — browsing and "exclude all vegetables" must keep working.

Cooked duplicates of dry staples (e.g. "Amaranth grain, cooked") get no Family, so one canonical form per food survives.

**Acceptance criteria**

- [x] `findGenerationCandidatesByRole` filters on a non-null family
- [x] Potato/sweet potato, beans/lentils and olives reclassified by role and family, with category unchanged
- [ ] Test: a food with no family is never returned as a generation candidate but is still browsable and loggable
- [x] Test: a category-level exclusion still excludes potato

Part of ADR-020 phase 1 — see `plans/current.md`.

---

## Comments

### 2026-09-13

PR opened: [#98](https://github.com/mykola-blonskyi/fitness/pull/98) (branch `FITNESS-72`). Not merged.

AC 1, 2 and 4 are covered by tests. AC 3 is covered for the generation half only. The "still browsable and loggable" half is not unit-testable here: every test mocks the Drizzle chain, so a mocked `where()` returns canned rows regardless of predicate and would keep passing even if a family filter were added to `list()`. Verified by inspection instead (`food-items.service.ts` never references family). A real guard needs an integration test against a live DB, which this repo does not yet have.

Out of scope, noted: `pickRerollReplacement` is not Family-filtered, so a familyless food can still be offered as a same-role swap.

Verified in a node:22-alpine container (no JS runtime on the build host): 30 suites / 241 tests, lint and format clean. CI has not run, Actions billing is still failing.

### 2026-09-13

Shipped as PR #98, merged to `main` as `2562001`.

AC1, AC2 and AC4 are met. AC1 is enforced in `diets.service.ts` as a `familyName` guard inside the candidate loop rather than a SQL predicate; the effect is the same and the query already joins the family. AC4 is covered by `swap-candidates.spec.ts`, *excludes potato by category even though its role is now complex_carb*.

AC3 ships half. The generation half has a test. The *still browsable and loggable* half does not, and deliberately: these specs mock the Drizzle chain, so such a test would pass even if a Family filter were added to browse. Confirmed by inspection that `food-items.service.ts` never references family. The real guard needs a database-backed harness, split out as FITNESS-77.

Out of scope, found while working: `pickRerollReplacement` queries `food_calories` directly and is not Family-filtered, so a familyless food can still be offered as a same-role swap replacement. ADR-020 scopes the restriction to generation, so it was left alone.
