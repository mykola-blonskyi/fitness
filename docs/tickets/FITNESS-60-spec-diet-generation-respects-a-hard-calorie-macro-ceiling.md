---
id: FITNESS-60
title: "Spec: Diet Generation Respects a Hard Calorie/Macro Ceiling"
state: Done
state_group: completed
priority: none
labels: [spec, ready-for-agent]
module: "Diet Generation Respects a Hard Calorie/Macro Ceiling"
parent: null
created: 2026-09-03
updated: 2026-09-03
plane_id: 775570d8-9a66-4ff3-a7a9-9b015ae204cf
---

# FITNESS-60: Spec: Diet Generation Respects a Hard Calorie/Macro Ceiling

### Problem Statement

A generated diet's actual total calories and macros can diverge wildly from the calculated daily target — observed in production at roughly double the target (2463 kcal target vs. 4994 kcal actual; 153g carbs target vs. 657g carbs actual) — while some food items in the same generated day are assigned nutritionally meaningless portions (as little as 1 gram). Users are being handed diet guidance that doesn't reflect what was actually calculated for them.

### Solution

Generation and its drift-correction step are bounded by a hard rule: a day's total calories and each of protein/carbs/fat may equal the calculated target or fall up to 5% short of it, but must never exceed it. Portions that would compute to a nutritionally meaningless amount are dropped entirely rather than force-included at a token minimum. Drift correction is scoped to the meal it's correcting, capped in how much it can adjust any single item, and constrained to never fix one number by breaking another macro's own tolerance.

### User Stories

1. As a user, I want my generated diet's actual total calories to never exceed my calculated daily target by more than the stated tolerance, so that I can trust the number I was given.
2. As a user, I want the same guarantee for protein, carbs, and fat individually, not just for calories, so that a diet that looks right on calories doesn't secretly overshoot on carbs or fat.
3. As a user, I do not want to see a food item in my diet sized at an amount too small to matter nutritionally (like 1 gram of nuts), so that every listed item is meaningful.
4. As a user, I want a role that can't be filled with a meaningful portion to simply be left out of that meal, rather than included at a token size, so that my meal list only shows food that actually contributes.
5. As a developer, I want drift correction to operate within a single meal rather than pooling every meal's shortfall into one day-wide adjustment, so that a correction's effects stay local and predictable.
6. As a developer, I want a hard cap on how much any single food item's portion can be adjusted during correction, so that no one item can be inflated to absorb an entire shortfall on its own.
7. As a developer, I want correction to check all four totals (calories, protein, carbs, fat) against their own tolerance, so that a correction is rejected or reduced if it would fix one number by breaking another.
8. As a QA/developer, I want an automated test that would have caught the original production incident (a day's total macros diverging roughly 2x from target while individual items sit at a 1-gram floor), so that this class of bug can't silently reappear.
9. As a user with a diet using the carb-free-tail rule (from the meal-naming/tapering spec), I want the redistributed carb/fat budget from the excluded meals to still respect this same ceiling rule across the day, so that the two features compose correctly rather than one undermining the other.

### Implementation Decisions

- The ceiling rule replaces the previous symmetric tolerance: for calories and for each of protein/carbs/fat independently, the day's actual total must satisfy

  `target × 0.95 ≤ actual ≤ target`

  . Exceeding the target is never acceptable; falling short by up to 5% is.

- When a food role's computed portion would round below the existing minimum-gram floor, that role is skipped for that meal entirely rather than force-included at the floor amount. A meal can end up with fewer filled roles as a result.
- Drift correction is scoped per meal: each meal's own items absorb only that meal's own shortfall/overshoot, rather than pooling every meal's delta into one whole-day adjustment.
- Any single item's correction is capped (a bounded multiple of its pre-correction portion) rather than unbounded; if a meal's full correction can't be absorbed within that cap across its own items, the remainder is not forced through — the meal is allowed to land within the up-to-5%-short tolerance rather than being made to hit the target exactly at the cost of another macro's accuracy.
- Correction checks calorie, protein, carb, and fat tolerance together — a correction step that would satisfy the calorie ceiling while pushing another macro outside its own tolerance is not applied as-is.
- This composes with the carb-free-tail rule (meal-naming/tapering spec): the carb/fat budget those excluded meals would have carried is redistributed among the remaining meals' taper before correction ever runs, and the same ceiling rule applies to the day's total regardless of how many meals are carb-eligible.

### Testing Decisions

- Good tests here assert on the generation function's external output: given daily targets and a meal count, every meal's and the day's totals never exceed target and never fall more than 5% short, no item sits at a nutritionally meaningless portion, and (regression) a scenario shaped like the production incident (many small per-meal macro shares against calorie-dense candidates) no longer produces a day-wide macro blowout.
- **Primary seam**

  : the diet-generation function already used for the meal-naming/tapering spec (a separate, already-published spec touches the same file) — this spec's tests extend that same spec file with cases exercising the ceiling rule, the skip-instead-of-floor behavior, and the capped, per-meal, macro-aware correction pass, including a direct regression test shaped after the production incident.

- No new test seam is introduced; this fix lives entirely within the seam the meal-naming/tapering spec already establishes as primary for this area of the code.

### Out of Scope

- Any change to which foods are eligible for which role, or to the Food Role chain itself — this spec only changes portion-sizing and correction behavior.
- The meal-naming/tapering redesign and the diet-validity-period change — each is its own spec; this one is adjacent to, and composes with, the former.

### Further Notes

This is the direct fix for a real production incident, not a hypothetical: the observed diet totaled roughly double its calculated target with multiple items at a 1-gram floor. The regression test in this spec's Testing Decisions should be built directly from a scenario shaped like that incident.
