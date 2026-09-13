# Salad composition: bulk versus accent (FITNESS-75)

Date: 2026-09-13. Branch `FITNESS-75`, measured against `2562001`.

## Read this before comparing against the 2026-09-12 baseline

`reports/audits/2026-09-12-diet-quality-baseline.md` is **not** comparable to the
numbers here. It was taken at `ce30a43` against a catalog of 430 generation
candidates, 176 of them carrying a Food Family. The database measured here holds
288 before the change and 296 after, 221 and 226 with a Family. Different pool,
different numbers. This report therefore carries its own before-half.

## Method

`backend/src/scripts/diet-quality-harness.ts`, 300 menus per meal count, two
profiles, two pools. Every figure is the mean of five seeds (20260912, 11111,
22222, 33333, 44444) via the new `SEED` environment override.

Five seeds rather than one because `seededPick` is a single stream shared by
every pick in a menu. Changing how many times `pick` is called for free items
shifts every draw after it, so base and candidate are two independent samples
rather than a paired comparison. Measured on unchanged code, one seed to the
next moves the moderate profile's mean absolute carb delta by 0.3 to 0.7 g and
the 310P profile's by 0.6 to 1.5 g. A single-seed threshold tighter than that is
measuring the generator's PRNG.

The before-half runs `2562001` with one line changed, the `SEED` override, and
reproduces `reports/audits/2026-09-12-diet-quality-baseline.md`'s successor
`scratchpad/baseline-2562001.txt` exactly at the default seed.

One correction was applied to the scratch database before either half ran.
`Картофель молодой` was still Role `vegetable` there, which `#98` had moved to
`complex_carb`/`starchy_vegetable`; the database had not been reclassified since.
Both halves were re-run after fixing it, so the only catalog difference between
them is this change's own: eight authored accent staples, two onions moved to
`accent_vegetable`, three RU duplicates given no Family.

Two new harness columns carry AC4. `salads` counts meals served a Free Food,
`lt2bulk` those with fewer than two bulk items, `accent` those with an accent
item.

## Before: 2562001, five-seed means


### moderate 180P / whole catalog

| meals | dP | dC | dF | absP | absC | absF | wP | wC | wF | over | repDays | wRep | famDays | wFam | empty |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 3 | -0.40 | 1.50 | -0.58 | 0.72 | 2.46 | 0.72 | 11.16 | 21.62 | 4.74 | 0 | 0 | 1 | 0 | 2 | 0 |
| 4 | -0.12 | 3.20 | -0.98 | 1.58 | 4.10 | 1.08 | 14.74 | 23.58 | 4.96 | 0 | 0 | 1 | 0 | 2 | 0 |
| 5 | 0.10 | 2.82 | -0.46 | 1.06 | 3.06 | 0.64 | 9.36 | 16.12 | 5.14 | 0 | 0 | 1 | 0 | 2 | 0 |
| 6 | -0.14 | 2.62 | -0.34 | 0.76 | 2.76 | 0.58 | 6.08 | 13.80 | 5.14 | 0 | 0 | 1 | 0 | 2 | 0 |

### moderate 180P / Family-carrying only

| meals | dP | dC | dF | absP | absC | absF | wP | wC | wF | over | repDays | wRep | famDays | wFam | empty |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 3 | -0.62 | 2.84 | -0.54 | 0.78 | 3.38 | 0.70 | 11.14 | 23.18 | 5.14 | 0 | 0 | 1 | 0 | 2 | 0 |
| 4 | -0.80 | 5.48 | -0.92 | 0.98 | 5.70 | 1.04 | 9.32 | 23.84 | 5.98 | 0 | 0 | 1 | 0 | 2 | 0 |
| 5 | -0.22 | 3.72 | -0.76 | 1.08 | 3.92 | 0.94 | 8.92 | 17.62 | 5.60 | 0 | 0 | 1 | 0 | 2 | 0 |
| 6 | -0.02 | 3.14 | -0.44 | 0.96 | 3.18 | 0.64 | 8.82 | 14.32 | 5.44 | 0 | 0 | 1 | 0 | 2 | 0 |

### ADR-019 310P / whole catalog

| meals | dP | dC | dF | absP | absC | absF | wP | wC | wF | over | repDays | wRep | famDays | wFam | empty |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 3 | -11.18 | -50.64 | -13.18 | 11.18 | 50.64 | 13.18 | 21.94 | 84.08 | 22.06 | 0 | 0 | 1 | 0 | 2 | 0 |
| 4 | -12.72 | -46.02 | -14.02 | 12.72 | 46.02 | 14.02 | 31.28 | 78.52 | 22.12 | 0 | 0 | 1 | 0 | 2 | 0 |
| 5 | -11.94 | -45.50 | -14.86 | 11.94 | 45.50 | 14.86 | 25.70 | 66.14 | 22.40 | 0 | 0 | 1 | 0 | 2 | 0 |
| 6 | -11.82 | -42.72 | -14.92 | 11.82 | 42.72 | 14.92 | 23.58 | 62.42 | 21.32 | 0 | 0 | 1 | 0 | 2 | 0 |

### ADR-019 310P / Family-carrying only

| meals | dP | dC | dF | absP | absC | absF | wP | wC | wF | over | repDays | wRep | famDays | wFam | empty |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 3 | -11.72 | -51.88 | -14.22 | 11.72 | 51.88 | 14.22 | 20.50 | 83.24 | 22.80 | 0 | 0 | 1 | 0 | 2 | 0 |
| 4 | -13.84 | -45.16 | -15.02 | 13.84 | 45.16 | 15.02 | 32.14 | 76.40 | 23.56 | 0 | 0 | 1 | 0 | 2 | 0 |
| 5 | -12.70 | -44.60 | -15.78 | 12.70 | 44.60 | 15.78 | 28.72 | 66.04 | 23.64 | 0 | 0 | 1 | 0 | 2 | 0 |
| 6 | -12.22 | -44.22 | -16.22 | 12.22 | 44.22 | 16.22 | 23.80 | 62.66 | 23.00 | 0 | 0 | 1 | 0 | 2 | 0 |

## After: FITNESS-75, five-seed means


### moderate 180P / whole catalog

| meals | dP | dC | dF | absP | absC | absF | wP | wC | wF | over | repDays | wRep | famDays | wFam | empty | salads | lt2bulk | accent |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 3 | -0.42 | 1.38 | -0.66 | 0.76 | 2.52 | 0.78 | 11.40 | 20.56 | 4.96 | 0 | 0 | 1 | 0 | 2 | 0 | 900 | 0 | 900 |
| 4 | -0.04 | 2.90 | -1.10 | 1.62 | 4.12 | 1.22 | 15.36 | 23.66 | 5.46 | 0 | 0 | 1 | 0 | 2 | 0 | 1200 | 0 | 1200 |
| 5 | 0.14 | 2.74 | -0.66 | 1.24 | 3.24 | 0.84 | 10.58 | 17.42 | 5.02 | 0 | 0 | 1 | 0 | 2 | 0 | 1500 | 0 | 1500 |
| 6 | -0.34 | 2.66 | -0.36 | 0.68 | 2.80 | 0.62 | 6.98 | 13.44 | 4.94 | 0 | 0 | 1 | 0 | 2 | 0 | 1800 | 0 | 1800 |

### moderate 180P / Family-carrying only

| meals | dP | dC | dF | absP | absC | absF | wP | wC | wF | over | repDays | wRep | famDays | wFam | empty | salads | lt2bulk | accent |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 3 | -0.68 | 2.76 | -0.62 | 0.84 | 3.44 | 0.80 | 11.70 | 22.86 | 5.26 | 0 | 0 | 1 | 0 | 2 | 0 | 900 | 0 | 900 |
| 4 | -0.80 | 5.36 | -0.94 | 0.98 | 5.72 | 1.04 | 8.80 | 21.52 | 5.98 | 0 | 0 | 1 | 0 | 2 | 0 | 1200 | 0 | 1200 |
| 5 | -0.40 | 3.88 | -0.98 | 1.30 | 4.28 | 1.12 | 9.98 | 17.64 | 6.16 | 0 | 0 | 1 | 0 | 2 | 0 | 1500 | 0 | 1500 |
| 6 | -0.20 | 3.04 | -0.58 | 0.92 | 3.18 | 0.78 | 7.36 | 14.10 | 5.88 | 0 | 0 | 1 | 0 | 2 | 0 | 1800 | 0 | 1800 |

### ADR-019 310P / whole catalog

| meals | dP | dC | dF | absP | absC | absF | wP | wC | wF | over | repDays | wRep | famDays | wFam | empty | salads | lt2bulk | accent |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 3 | -11.42 | -52.18 | -13.44 | 11.42 | 52.18 | 13.44 | 20.52 | 82.62 | 22.10 | 0 | 0 | 1 | 0 | 2 | 0 | 900 | 0 | 900 |
| 4 | -12.62 | -48.08 | -13.80 | 12.62 | 48.08 | 13.80 | 31.32 | 76.10 | 22.26 | 0 | 0 | 1 | 0 | 2 | 0 | 1200 | 0 | 1200 |
| 5 | -12.46 | -49.14 | -14.86 | 12.46 | 49.14 | 14.86 | 27.74 | 72.32 | 22.24 | 0 | 0 | 1 | 0 | 2 | 0 | 1500 | 0 | 1500 |
| 6 | -12.02 | -45.88 | -14.54 | 12.02 | 45.88 | 14.54 | 23.84 | 66.06 | 20.24 | 0 | 0 | 1 | 0 | 2 | 0 | 1800 | 0 | 1800 |

### ADR-019 310P / Family-carrying only

| meals | dP | dC | dF | absP | absC | absF | wP | wC | wF | over | repDays | wRep | famDays | wFam | empty | salads | lt2bulk | accent |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 3 | -11.88 | -53.48 | -14.48 | 11.88 | 53.48 | 14.48 | 19.86 | 82.56 | 21.94 | 0 | 0 | 1 | 0 | 2 | 0 | 900 | 0 | 900 |
| 4 | -13.96 | -46.26 | -14.58 | 13.96 | 46.26 | 14.58 | 32.88 | 73.68 | 23.04 | 0 | 0 | 1 | 0 | 2 | 0 | 1200 | 0 | 1200 |
| 5 | -12.84 | -47.00 | -15.20 | 12.84 | 47.00 | 15.20 | 26.22 | 67.64 | 22.04 | 0 | 0 | 1 | 0 | 2 | 0 | 1500 | 0 | 1500 |
| 6 | -12.42 | -47.28 | -15.80 | 12.42 | 47.28 | 15.80 | 24.48 | 65.74 | 22.26 | 0 | 0 | 1 | 0 | 2 | 0 | 1800 | 0 | 1800 |

## Verdict against the six AC5 criteria

| # | Criterion | Result |
|---|---|---|
| 1 | `over` and `empty` are 0 everywhere | **Pass.** 0 in all 80 rows, both halves. |
| 2 | `repDays`/`wRep` no worse than baseline | **Pass.** 0 and 1 in every row, unchanged. |
| 3 | `famDays`/`wFam` exactly unchanged | **Pass.** 0 and 2 in every row, so protein picking did not move. |
| 4 | Each mean absolute delta within +0.5 g | **Pass on the moderate profile** (worst +0.36 g, carbs at 5 meals, Family-carrying pool). **Fail on the 310P profile** (worst +3.64 g, carbs at 5 meals, whole catalog). |
| 5 | Sum of the three within +1.0 g at every meal count | **Pass on the moderate profile** (worst +0.76 g at 5 meals, Family-carrying pool; +0.56 g whole catalog). **Fail on the 310P profile** (+0.78 to +4.16 g). |
| 6 | `lt2bulk` is 0 everywhere | **Pass.** 0 across 108,000 measured salads, and every one of them carried an accent. |

## The moderate profile, criterion 5

| meals | sum of the three mean absolute deltas, whole catalog | Family-carrying only |
|---|---|---|
| 3 | +0.16 | +0.22 |
| 4 | +0.20 | +0.02 |
| 5 | **+0.56** | **+0.76** |
| 6 | -0.00 | +0.10 |

Meal count 5 is the one that moves, in all five seeds rather than one, so it is
an effect and not noise. The mechanism is arithmetic: replacing an 80 g bulk item
with a 15 g accent takes about 65 g of free vegetable off the meal, so less is
subtracted from the day's targets before the fit and the counted items carry more.
Meal count 5 feels it most because its carb-free tail leaves one fewer carb slot
to absorb the difference.

0.76 g against a 300 g carb and 180 g protein day is a quarter of a percent, the
calorie ceiling stays clean, and what it buys is a salad with an onion in it
rather than three undifferentiated 80 g vegetables. That is a product tradeoff
and it belongs to a reviewer, not to this report.

## The 310P profile, where criteria 4 and 5 fail

| meals | sum, whole catalog | sum, Family-carrying only | seed spread on the baseline |
|---|---|---|---|
| 3 | +2.04 | +2.02 | 1.3 to 1.5 |
| 4 | +1.74 | +0.78 | 1.0 to 1.5 |
| 5 | +4.16 | +1.96 | 0.6 to 1.5 |
| 6 | +2.98 | +2.84 | 0.7 to 0.8 |

This is outside seed noise and is reported as a failure rather than rounded away.

The 310P profile is ADR-019's deliberately extreme case: a 310 g protein target
that no portion of any one food can carry, which already misses carbs by 42 to 52 g
before this change. Those misses are why it fails. A profile that cannot reach its
targets has no headroom, so the 65 g of vegetable the accent slot removes from each
meal cannot be absorbed by growing the counted items and shows up almost one for one
as a larger shortfall. The same 65 g costs the moderate profile a tenth as much,
because there the fit has room to move.

Relative to the miss it already carries, the change makes that profile 2 to 8
percent worse. Whether that matters depends on whether a target nobody can hit is
worth protecting; the moderate profile is the one the 2026-09-12 audit established
as comparable, and it passes.

## Reproducing this

```
export DATABASE_URL=postgres://scratch:scratch@fitness-scratch-db:5432/fitness_scratch
pnpm --filter backend db:seed:food-staples
pnpm --filter backend db:classify:food-families
for sd in 20260912 11111 22222 33333 44444; do
  SEED=$sd pnpm --filter backend exec ts-node -r tsconfig-paths/register \
    src/scripts/diet-quality-harness.ts 300
done
```
