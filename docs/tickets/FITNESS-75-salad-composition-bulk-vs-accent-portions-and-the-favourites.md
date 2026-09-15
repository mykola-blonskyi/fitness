---
id: FITNESS-75
title: "Salad composition: bulk vs accent portions, and the favourites rule"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: "Menu Composition (Archetypes & Food Families)"
parent: FITNESS-69
created: 2026-09-13
updated: 2026-09-13
plane_id: 97cbf276-cb57-43bf-94d5-b28fc3527c0c
---

# FITNESS-75: Salad composition: bulk vs accent portions, and the favourites rule

Split out of FITNESS-74, which shipped three-item salads at a single 80 g portion. Two parts of its third acceptance criterion could not be built and are not blocked on effort, they are blocked on a decision and on data.

**Bulk versus accent needs an attribute that does not exist.** ADR-020 wants bulk items at ~80 g and accents like onion, garlic and herbs at ~15 g. Nothing separates them today: green onion and parsley sit in `salad_vegetable` beside tomato and cucumber, and the curated `food-staples.json` from FITNESS-71 carries family, category, subcategory, role, macros and locale names but no portion tier. Either a Food Item gains the attribute, or the Family splits.

**The favourites wording contradicts ADR-014.** AC3 said "biased toward favorites", but `restrictToFavorites` is a hard filter by ADR-014 and business-rules.md. With a three-item salad a hard filter collapses the pool and repeats one vegetable across the day. Either ADR-014 softens to a bias for this slot, or AC3's wording was wrong. That is a product call.

- [x] Decide and record how bulk versus accent is carried (Food Item attribute, or a Family split)
- [x] Decide whether ADR-014's hard favourite filter softens to a bias for the salad slot
- [x] Accents are served at the smaller nominal portion, bulk at the larger
- [x] At least two of the three salad items are bulk
- [ ] Measured: macro deltas and ceiling breaches no worse than the FITNESS-74 baseline

Part of ADR-020 — see `plans/current.md`.

---

## Comments

### 2026-09-13

Delivered as PR #99, branch `FITNESS-75`, 9 commits, not merged. No CI, since Actions billing is still failing. Verified locally in a container instead: 30 suites / 248 tests, `tsc` clean, prettier clean, re-run independently of the implementer rather than taken from its summary.

**AC1.** Bulk versus accent is carried by a new Food Family, `accent_vegetable`, at 15 g. Three designers worked this independently and all three argued the Food Item column in its strongest form first, as a per-food `free_portion_grams` rather than a boolean, and all three rejected it. A column makes `{ family: poultry, freePortionGrams: 15 }` representable, needs a class rather than a gram threshold to express AC4, and opens a second classification axis production must populate when it has not run the first one yet. Recorded as ADR-021.

**AC2.** ADR-014 is *not* softened to a bias. The restriction stays hard and the grouping key changes from Role to Family, which is the narrowing ADR-020 already recorded and `plans/current.md` had parked in phase 2. It is pulled into phase 1 because the two changes are one change: a bulk/accent split on a Role-keyed filter gives a favouriting user six identical single-item salads.

This fixed a live defect on `main`, not a hypothetical. One favourited vegetable collapsed Role `vegetable` to one item, `pickFreeItems` broke out after the first draw, and the day-level fallback handed the same item back every meal. A plan went from 18 vegetable portions a day to 6, all the same food. There is now a regression spec that was written red before the fix.

**AC3, AC4.** Accents at 15 g, bulk at 80 g, from one registry where grams and class cannot disagree. The salad is a slot table of two bulk-only draws plus one accent-preferred, so AC4 holds by construction rather than on average. Measured 0 salads under two bulk across 108,000.

**AC5 is the one that needs your ruling.** It passes on the moderate profile, worst +0.76 g on the summed mean absolute macro miss against a +1.0 g threshold. It **fails** on the ADR-019 310P profile, worst +4.16 g at five meals, against a measured seed spread of 0.6 to 1.5 g there, so it is outside noise. Moving an item from 80 g to 15 g subtracts 65 g less from the day targets, and that profile has no headroom because its macros already cost 2836 kcal against a 2463 kcal hard ceiling. Every hard guarantee holds: zero ceiling breaches, zero empty days, and repeat and protein-family figures exactly unchanged.

Also worth knowing: measurement method changed. The harness shares one PRNG stream across a menu, so a single-seed before/after is not a paired comparison and unchanged code alone moves the carb delta by 0.3 to 0.7 g. AC5 now runs five seeds and compares means, via a new `SEED` override. The committed 2026-09-12 baseline is not comparable to any of this, since it was taken against a 430/176 catalog and this one is 288/221, so the PR carries its own before-half in `reports/audits/2026-09-13-salad-composition.md`.

Left alone on purpose: leek stays bulk at 80 g; garlic and ginger were deliberately not authored as accents, since nobody eats 15 g of raw garlic in a salad; and with a days accents exhausted the third draw repeats an accent rather than falling through to a fresh bulk item, which ten accents against six meals makes unreachable.

Checkboxes stay unticked and this stays In Progress until the PR is merged, per the tracker rule that merging is a human action.

### 2026-09-13

Merged as `b52f3c0` (PR #99). Verified on `main` after the merge: 248 tests, `tsc` clean, and the e2e suite passes and exits on its own.

AC1 through AC4 are ticked. **AC5 is deliberately left unticked** even though this is being closed. It passes on the moderate profile at +0.76 g against a +1.0 g threshold, and it fails on the ADR-019 310P profile at +4.16 g against a seed spread of 0.6 to 1.5 g, so the failure is outside noise. Ticking it would record a measurement that did not hold. The merge is the acceptance of that trade, not a pass: the 310P profile is documented in the 2026-09-12 baseline as arithmetically impossible and carried for tail behaviour only, its macros costing 2836 kcal against a 2463 kcal hard ceiling, so it has no headroom to absorb the 65 g of vegetable the accent slot removes. Every hard guarantee held — zero ceiling breaches, zero empty days, and repeat and protein-family figures exactly unchanged.

The full before-and-after is committed at `reports/audits/2026-09-13-salad-composition.md`, five seeds per figure, carrying its own baseline because the 2026-09-12 one was measured against a different catalog and is not comparable.

Still owed: the long-form rationale that CLAUDE.md routes to `~/Documents/obsidian-notes/projects_history/fitness/`. That directory does not exist on this host, so ADR-021 landed in-repo only.
