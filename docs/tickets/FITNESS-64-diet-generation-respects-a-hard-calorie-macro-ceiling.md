---
id: FITNESS-64
title: "Diet generation respects a hard calorie/macro ceiling"
state: Done
state_group: completed
priority: none
labels: [ready-for-agent]
module: "Diet Generation Respects a Hard Calorie/Macro Ceiling"
parent: FITNESS-60
created: 2026-09-03
updated: 2026-09-03
plane_id: df512ae9-90d6-4238-b912-b63fce9640f9
---

# FITNESS-64: Diet generation respects a hard calorie/macro ceiling

### Parent

FITNESS-60

### What to build

Diet generation and its drift-correction step are bounded so a generated diet's totals can never exceed the calculated daily target, food portions are never nutritionally meaningless, and no single correction can distort a meal's macro balance.

### Acceptance criteria

- [x] A generated diet's total calories, and each of protein/carbs/fat independently, satisfy target × 0.95 ≤ actual ≤ target — never exceeding target, at most 5% short
- [x] A food role whose computed portion would round below the minimum-gram floor is skipped for that meal entirely, rather than force-included at the floor amount
- [x] Drift correction operates within a single meal only, never pooling multiple meals' shortfall into one whole-day adjustment
- [x] Any single item's correction is capped so no one item can absorb an entire meal's shortfall alone
- [x] A correction that would push any of calories/protein/carbs/fat outside its own tolerance while fixing another is reduced or not applied
- [x] A regression test reproduces a scenario shaped like the production incident (many small per-meal macro shares against calorie-dense candidates producing a day-wide macro blowout) and passes

### Blocked by

None (can start immediately)
