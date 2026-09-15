---
id: FITNESS-74
title: "Free Foods: uncounted vegetables plus a calorie allowance"
state: Done
state_group: completed
priority: high
labels: []
module: "Menu Composition (Archetypes & Food Families)"
parent: FITNESS-69
created: 2026-09-11
updated: 2026-09-13
plane_id: 0d882870-a090-4886-8947-e8593490f104
---

# FITNESS-74: Free Foods: uncounted vegetables plus a calorie allowance

Non-starchy vegetables (raw and cooked) are listed in the plan but not counted: fixed nominal portions — bulk ~80 g, accents like onion, garlic and herbs ~15 g — excluded from the macro fit and from the Diet's displayed totals. Potato and sweet potato are carbs and stay counted.

A flat ~120 kcal vegetable allowance is subtracted from the day's calorie target before fitting, so the plan under-reports its own lines but not the day.

Expected side effect: the +12 g carb overshoot ADR-019 measured at 4-6 meals came from the vegetable floor and should disappear once the fit stops chasing salad.

**Acceptance criteria**

- [x] Vegetables carry fixed nominal portions and are excluded from the fit and from Diet totals
- [x] The vegetable allowance is subtracted from the calorie target before fitting
- [ ] A salad is three items, at least two of them bulk, biased toward favorites
- [x] Measured: macro deltas at meal counts 3-6 are no worse than ADR-019's, with the carb overshoot gone
- [x] The UI states that vegetables are not counted

Part of ADR-020 phase 1 — see `plans/current.md`.

---

## Comments

### 2026-09-12

Branch `FITNESS-74` is pushed, stacked on `FITNESS-73`, which must merge first. No PR yet: `gh` is not installed on the VPS.

**Deploy gate.** The Food Family classification pass must run in production before or with this release. Every production `food_calories.family_id` is null and this branch deletes the 100g vegetable floor, so an unclassified catalog yields diets with no vegetables at all.

**Two deviations from this ticket, both deliberate.** The allowance is exact rather than a flat ~120 kcal, because three nominal portions measure 42-50 kcal per meal and a flat 120 under-prices the day from 4 meals up (302 at 6) while the calorie target is a hard ceiling. And AC3's 80g/15g bulk-vs-accent split is not built: no attribute separates onion and parsley from tomato, both sit in salad_vegetable, so it needs FITNESS-71's staples data.

**AC3's favourites bias is a product call.** It contradicts ADR-014's hard filter, which with a three-item salad repeats one vegetable. Left unchanged.

**AC4 measured** (300 menus, seed 20260912, plate basis, before -> after): absolute carb delta 5.2/11.9/10.6/10.0 -> 0.8/2.3/2.9/2.7 at 3-6 meals; protein and fat improve at every count; zero menus over the ceiling.

Also fixed: swap and reroll now refuse a Free Food, which previously could leave a counted food eaten uncounted.

### 2026-09-13

PR open: [#97](https://github.com/mykola-blonskyi/fitness/pull/97), rebased onto main after FITNESS-73 and FITNESS-71 landed.

**AC4 measured** on the post-staples catalog (288 candidates, 221 with a Family; 300 menus, seed 20260912, whole-plate basis). Absolute deltas before -> after: protein 1.2/3.4/2.1/1.9 -> 0.8/0.9/1.2/0.9; carbs 6.2/11.7/11.2/10.2 -> 3.5/5.2/3.6/3.1; fat 1.8/3.3/3.2/2.6 -> 0.8/1.1/0.9/0.7 at 3-6 meals. Zero menus over the calorie ceiling. Every cell improves; the carb overshoot is substantially reduced, not zero.

**Deploy gate.** The classification pass must run in production before or with this release. family_id is null there and this branch deletes the 100g vegetable floor, so an unclassified catalog yields diets with no vegetables at all.

**AC3 partially deferred.** Three-item salads are in. The 80g/15g bulk-vs-accent split is not: the new food-staples.json carries family, role, macros and locale names but no portion attribute, so nothing separates parsley from tomato. The favourites bias is also untouched, since it contradicts ADR-014's hard filter.

**CI could not run** - no GitHub Actions workflow has executed since 2026-09-03 (billing). All gates were run locally in the project's node:24-slim image: backend 235 tests / 29 suites, frontend 133 / 19, tsc, eslint, prettier and i18n parity all clean.

Left In Progress: merge is a human step.
