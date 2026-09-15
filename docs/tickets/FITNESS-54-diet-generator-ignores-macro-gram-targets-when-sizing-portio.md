---
id: FITNESS-54
title: "Diet generator ignores macro-gram targets when sizing portions"
state: Done
state_group: completed
priority: high
labels: [ready-for-agent]
module: "Diet Engine"
parent: FITNESS-5
created: 2026-08-31
updated: 2026-09-03
plane_id: 45d2d3e7-2b00-4d60-b1d5-c1da0804f8a1
---

# FITNESS-54: Diet generator ignores macro-gram targets when sizing portions

### Parent

FITNESS-5 — Spec: Diet Engine

### What's wrong

The greedy-heuristic generator (`diets/greedy-heuristic.ts`) sizes every role-slot's `weight_grams` purely off the item's own calorie density (`gramsForCalories`), split evenly across that meal's role-slots. It never looks at the macro-gram targets (protein_g/carbs_g/fat_g) computed by `mifflin_v1` at all. The only correction pass (ADR-011) adjusts calories only, letting protein/carbs/fat drift as a side effect. Real-world result: a target of 310g protein / 153g carbs / 68g fat generated a diet with 158g protein / 152g carbs / 127g fat — calories landed within tolerance, protein came in at roughly half target.

### Fix direction

Macro-driven sizing: size each role-slot's item toward its macro-gram share first (protein-role items sized off the protein target ÷ that item's `proteinPer100g`, carb-role off the carb target ÷ `carbsPer100g`, fat-role off the fat target ÷ `fatPer100g`) instead of the current equal-calorie-split. The vegetable role slot, which contributes negligible macros, keeps calorie/portion-based sizing. Re-run the existing calorie-tolerance correction pass afterward, but adjust non-protein items first so it does not undo protein accuracy.

### Acceptance criteria

- [x] Generated diet's total protein/carbs/fat land within the same ~5% tolerance already used for calories, not just calories alone
- [x] Portion sizing for protein/carb/fat role-slots is driven by that macro's gram target and the candidate's per-100g macro density, not an even calorie split
- [x] The existing calorie-tolerance correction pass still runs and adjusts non-protein items first so it does not undo protein accuracy
- [x] greedy-heuristic.spec.ts covers a case with a high-protein target and asserts the generated macros land within tolerance, not just calories
- [x] ADR-011 gets a dated correction entry (plus the obsidian mirror per docs policy) documenting the change from "protein/carbs/fat move proportionally" to macro-targeted sizing

### Blocked by

(none)
