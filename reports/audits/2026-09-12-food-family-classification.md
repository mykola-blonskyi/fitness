# Audit Report

Date: 2026-09-12

Auditor: catalog owner

Audit Type: Food Family classification coverage (ADR-020 phase 1, FITNESS-70)

---

## Scope

Every row of `food_calories` in the development database after
`db:classify:food-families`. 631 rows, of which **242 carry a Food Family** and
389 do not. Production is covered by neither the migration nor the classification
run yet; see the Phase 1 deploy note in `plans/current.md`.

A row with no Family is never generated into a plan. It stays browsable and loggable
by hand, which is ADR-020's mechanism for keeping flours, offal, sausages,
confectionery, babyfood and branded retail products out of the pool.

---

## By Food Role

| Role | With Family | Without |
|---|---|---|
| beverage | 0 | 39 |
| complex_carb | 16 | 18 |
| dairy | 26 | 35 |
| fatty_protein | 29 | 54 |
| fruit | 40 | 38 |
| healthy_fat | 24 | 39 |
| lean_protein | 56 | 56 |
| plant_protein | 7 | 26 |
| saturated_fat | 4 | 7 |
| simple_carb | 4 | 15 |
| treat | 0 | 23 |
| vegetable | 36 | 39 |

## By import source

| Source | With Family | Without |
|---|---|---|
| (none) | 0 | 1 |
| open_food_facts | 0 | 146 |
| ru_kbju_table | 192 | 142 |
| usda | 50 | 100 |

Open Food Facts contributes nothing on purpose. Those rows are branded retail products
("Picnic Eggs", "Beurre planta"), which ADR-020 puts outside the pool as a group. The
single source-less row is a hand-created test item; a row with no source has never been
through a reviewed classification, so it is not guessed at.

## By Food Family

| Family | Rows |
|---|---|
| white_fish | 43 |
| casein_dairy | 23 |
| fruit | 23 |
| cooked_vegetable | 21 |
| berries | 17 |
| culinary_oil | 17 |
| poultry | 15 |
| salad_vegetable | 15 |
| nuts_seeds | 14 |
| porridge | 10 |
| eggs | 8 |
| red_meat | 7 |
| seafood | 7 |
| bread | 5 |
| grain_garnish | 5 |
| legume_protein | 5 |
| red_fish | 5 |
| fatty_fruit | 1 |
| starchy_vegetable | 1 |

---

## Findings

### High

- `starchy_vegetable` (1) and `fatty_fruit` (1) are effectively empty, and there is
  still no plain dry rice in the pool. Generation cannot be restricted to
  Family-carrying foods (FITNESS-72) until the curated staples set (FITNESS-71)
  fills them.
- `white_fish` is a default bucket rather than a set of substitutes. It spans
  0.4-30.7 g fat and 67-331 kcal per 100 g, because `red_fish` keys off five
  salmonid names and every other finfish falls through to it. Cod and sea eel are
  in the same Family. Once Phase 2 offers swaps within a Family, that is a
  four-fold calorie substitution unless the swap also filters on Role or the
  Family is split.

### Medium

- `grain_garnish` (5), `legume_protein` (5), `bread` (5) and `red_fish` (5) are thin
  enough that a no-repeat-within-a-day rule will exhaust them across a five-meal day.
- `plant_protein` sits at 5 of 33 rows classified. The rest are pulses filed under
  other roles, which the Phase 1 reclassification bullet addresses.
- The USDA prepared-dish filter rejects on substrings, so it over-rejects. Pine nuts
  (on `dried`) and snap beans (on `snap`) were each recovered by hand into
  `food-families.json`. Expect more of these as the staples set lands.

### Low

- `beverage` (0 of 39) and `treat` (0 of 23) are intentionally empty and need no rule.

---

## Next Steps

1. Deploy the migration to production via Coolify, then run the classification there
   with `node dist/scripts/classify-food-families.js`; the image carries no ts-node.
2. Author the curated staples set (FITNESS-71) against the thin families above.
3. Re-run this audit after the staples land, before FITNESS-72 restricts generation.
