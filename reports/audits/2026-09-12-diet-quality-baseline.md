# Audit Report

Date: 2026-09-12

Auditor: catalog owner

Audit Type: Generated-plan quality baseline, before ADR-020 phase 1 (FITNESS-71/72/73/74)

---

## Scope

Pre-change baseline captured from `main` at `ce30a43`, before any phase-1 picking or fitting
change, so every later measurement reads as old value against new value. Produced by
`backend/src/scripts/diet-quality-harness.ts`, which a reviewer re-runs:

```
export $(grep '^DATABASE_URL=' backend/.env)
npx ts-node -r tsconfig-paths/register src/scripts/diet-quality-harness.ts 300
```

300 randomised menus per meal count, reproducing ADR-019's stated methodology. Picking is
seeded, so the same code gives the same numbers. Measured against the real `fitness_dev`
catalog, read-only: 430 generation candidates, 176 of them carrying a Food Family.

Two target profiles and two candidate pools, because both turned out to matter.

---

## Baseline

Mean signed delta (dP/dC/dF) and mean absolute delta, in grams. `repDays` is days out of 300
that repeat a Food Item, `wRep` the worst repeat count, `famDays` days with more than two meals
from one protein Family, `wFam` the worst such count.

### Moderate profile, 2463 kcal / 180P / 300C / 60F

| pool | meals | dP | dC | dF | \|dP\| | \|dC\| | \|dF\| | repDays | wRep | famDays | wFam |
|---|---|---|---|---|---|---|---|---|---|---|---|
| whole catalog | 3 | -5.5 | 2.7 | -1.1 | 5.8 | 9.1 | 2.9 | 45 | 3 | 17 | 3 |
| whole catalog | 4 | -3.2 | 4.6 | -2.0 | 5.9 | 11.2 | 3.9 | 69 | 4 | 80 | 4 |
| whole catalog | 5 | -11.1 | 4.6 | -1.0 | 11.8 | 11.1 | 4.0 | 126 | 3 | 76 | 4 |
| whole catalog | 6 | -8.4 | 2.6 | -1.1 | 9.2 | 9.0 | 4.5 | 169 | 3 | 90 | 4 |
| Family only | 3 | 0.2 | 5.8 | -0.5 | 0.7 | 5.9 | 0.6 | 262 | 3 | 59 | 3 |
| Family only | 4 | 1.5 | 9.1 | -1.4 | 2.1 | 10.2 | 1.4 | 300 | 4 | 140 | 4 |
| Family only | 5 | -0.1 | 11.0 | -1.3 | 2.7 | 11.2 | 1.4 | 300 | 5 | 226 | 5 |
| Family only | 6 | -0.2 | 11.7 | -0.7 | 2.4 | 11.8 | 1.1 | 300 | 6 | 243 | 6 |

No menu at any meal count exceeded the calorie ceiling, and none generated nothing.

### ADR-019's extreme profile, 2463 kcal / 310P / 246C / 68F

Carried for tail behaviour only. This target is arithmetically impossible: its macros cost
2836 kcal against a 2463 kcal hard ceiling, a 373 kcal excess, so the shrink must cut roughly
that much and does it from carbs first. The resulting dC of -41 to -63 is the ceiling working,
not a fitting defect. Restricting the pool halves the protein miss (-26.8 to -14.1 at six
meals) but cannot fix the carb shortfall.

---

## Findings

### High

- **Restricting the pool to Family-carrying foods is worth roughly a four-fold accuracy gain,
  and it is what reproduces ADR-019's published numbers.** Mean absolute protein miss falls
  from 5.8-11.8 g to 0.7-2.7 g, and mean absolute fat miss from 2.9-4.5 g to 0.6-1.4 g. The
  worst protein miss falls from 53 g to 9-18 g. ADR-019 claims "protein within ~4 g and
  carbs/fat within ~7 g at meal counts 3-6", which the whole catalog does not deliver and the
  Family-carrying pool does. ADR-019 was measured against a clean pool, and the junk still in
  the catalog is what degrades it. This quantifies FITNESS-72.

- **FITNESS-73 must land before FITNESS-72, not after it as phase 1 currently lists them.**
  Shrinking the pool from 430 candidates to 176 makes repetition near-certain: days repeating
  a Food Item go from 169/300 to 300/300 at six meals, and the worst case goes from the same
  food in 3 meals to the same food in all 6. Days with more than two meals from one protein
  Family go from 90/300 to 243/300. Restricting the pool before the no-repeat rule exists
  would ship a visible regression.

- **FITNESS-74's cited "+12 g carb overshoot at 4-6 meals" reproduces only on the
  Family-carrying pool**, where dC is 9.1, 11.0 and 11.7 at meal counts 4, 5 and 6. On the
  whole catalog it is 4.6, 4.6 and 2.6. So FITNESS-74's AC4 measurement has to be taken against
  the Family-carrying pool to be comparable with the number the ticket quotes.

### Medium

- The vegetable floor is the suspected cause of the carb overshoot per FITNESS-74. The
  baseline is consistent with that: the overshoot grows with meal count (5.8 to 11.7 across
  3 to 6 meals), which is what a fixed per-meal floor multiplied by more meals would do.

- `plant_protein` has 7 Family-carrying candidates, `simple_carb` 4 and `saturated_fat` 4.
  Those are the pools a no-repeat rule will exhaust first, so they will exercise the fallback
  tiers.

---

## Next Steps

1. Re-run this harness on each phase-1 branch and compare against the table above.
2. Treat the Family-carrying pool rows as the baseline for FITNESS-74's AC4.
3. Re-order phase 1 so FITNESS-73 precedes FITNESS-72.
