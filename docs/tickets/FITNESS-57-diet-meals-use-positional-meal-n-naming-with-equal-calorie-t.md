---
id: FITNESS-57
title: "Diet meals use positional Meal N naming with equal-calorie, tapered-macro portioning"
state: Done
state_group: completed
priority: none
labels: [ready-for-agent]
module: "Positional Meal Naming & Tapered Macro Portioning"
parent: FITNESS-55
created: 2026-09-03
updated: 2026-09-03
plane_id: 6c045479-7c88-4067-a73e-7c486ee33bfe
---

# FITNESS-57: Diet meals use positional Meal N naming with equal-calorie, tapered-macro portioning

### Parent

FITNESS-55

### What to build

Replace the breakfast/lunch/dinner/snack round-robin naming scheme with pure positional numbering ("Meal 1"…"Meal N", translated per locale) everywhere a generated diet's meals are shown or stored. Diet generation gives every meal an equal share of the day's calories; carbohydrate and fat grams taper down linearly by position among the carb-eligible meals (meal 1 gets the largest carb/fat share); protein fills whatever remains of each meal's fixed calorie share. Once meal count is 3 or more, the last meal is carb-free and low-fat (protein/casein plus optionally vegetables only, no carb-role food at all); once meal count exceeds 3, the last two meals both are. The carb/fat those excluded meals would otherwise have carried is instead distributed among the remaining (non-tail) meals' taper. The schema drops the old meal_type/meal_occurrence columns in favor of a single meal_position integer, computed fresh at generation time rather than persisted as a separate category. The profile form's per-option meal-type breakdown preview text is removed. A new ADR supersedes today's ADR-015, and the domain-model/business-rules docs are updated to describe the new rule.

### Acceptance criteria

- [x] A generated diet's meal sections are labeled "Meal 1"/"Meal 2"/…/"Meal N" in the user's locale, never Breakfast/Lunch/Dinner/Snack
- [x] Every meal in a generated diet carries equal calories (day's total ÷ meal count)
- [x] Among carb-eligible meals, carb and fat grams decrease monotonically by position; protein grams increase to compensate
- [x] For meal_count ≥ 3, the last meal has no carb-role food at all (no rice/potato/etc.) and minimal fat; for meal_count > 3, the last two meals both do
- [x] For meal_count 1–2, no carb-free-tail rule applies — every meal follows the normal taper
- [x] The carb/fat grams the tail meals would otherwise have carried are redistributed across the remaining meals' taper, not simply dropped from the day's total
- [x] diet_items no longer has meal_type or meal_occurrence columns; a single meal_position integer replaces them
- [x] The Food Role chain is unchanged for non-tail meals; tail meals (per the rule above) omit the carb role and minimize the fat role
- [x] The profile form's meal-count selector no longer shows a per-type breakdown (e.g. "2 Breakfast, 2 Lunch…")
- [x] A new ADR documents this decision (including the carb-free-tail rule and its rationale) and marks ADR-015 as superseded
- [x] knowledge/domain-model.md and knowledge/business-rules.md reflect the new position-based rule, including the carb-free tail

### Blocked by

FITNESS-56
