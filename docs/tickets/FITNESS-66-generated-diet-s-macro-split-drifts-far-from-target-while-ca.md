---
id: FITNESS-66
title: "Generated diet's macro split drifts far from target while calories match (carbs starved, fat over)"
state: Done
state_group: completed
priority: high
labels: []
module: null
parent: null
created: 2026-09-04
updated: 2026-09-04
plane_id: faf30814-cf97-4efe-9300-99c4b7fea824
---

# FITNESS-66: Generated diet's macro split drifts far from target while calories match (carbs starved, fat over)

Calories converge correctly on the daily target (FITNESS-64 fixed the ceiling), but the realized protein/carb/fat split can diverge sharply from the target macros even though total calories are on point. Reported case: target 310P/153C/68F (2463 kcal) generated as 210P/50C/150F (2455 kcal) - carbs 67% under target, fat >2x target.

**Root cause** (`backend/src/diets/greedy-heuristic.ts`): `correctMeal`/`shrinkOrder` only corrected toward the meal's *calorie* target, always shrinking in a fixed priority order (carbs -> fat -> vegetable -> protein last-resort, see FITNESS-64) with no check against the day's actual protein/carb/fat targets - and the fat/carb roles were sized to their *full* target independent of any other role's incidental content, so a protein source's own fat rode free on top of the fat role's own target instead of counting against it.

**Fix shipped**: (1) `remainingMacroGrams` sizes the carb/fat roles against what's left of their target after earlier roles' incidental content, instead of the full target; (2) `macroGroupOrder` replaces the fixed carb-always-first shrink/grow priority with one that shrinks/grows whichever of carb/fat is actually furthest from its own target; (3) `shrinkMacroToTarget` adds a meal-scoped ceiling pass for carbs/fat individually (never touching protein) on top of `correctMeal`'s calorie-only pass.

**Known limitation, accepted rather than chased further**: this narrows the drift for realistic (non-isolated) foods but does not achieve FITNESS-64's stricter `target*0.95 <= actual <= target` bound for carbs/fat specifically - that bound was only ever exercised by FITNESS-64's isolated-macro test fixtures, and is not generally attainable with real composite foods at a protein target this high relative to the fat budget (a lean protein source's own incidental fat alone can approach the whole fat budget, and `shrinkMacroToTarget` deliberately won't touch protein to force it down further - see the function's own comment). The new regression test documents the achieved improvement (reproduction case: was carbs 102g/fat 95g, now within the test's looser bounds) rather than claiming full convergence with FITNESS-64's bound. A follow-up would need a proper day-level macro optimizer, not a bigger version of this meal-scoped heuristic.

### Acceptance criteria

- [x] Generated diet's total protein/carbs/fat land within a reasonable tolerance of the daily targets, not just total calories
- [x] Regression test in greedy-heuristic.spec.ts reproducing this case (2463 kcal / 310P/153C/68F, mealCount 5) and asserting macro totals stay within tolerance of target
- [x] FITNESS-64's calorie-ceiling guarantee still holds after the fix (see the dedicated regression test proving shrinkMacroToTarget can't reopen it - it only ever reduces)
