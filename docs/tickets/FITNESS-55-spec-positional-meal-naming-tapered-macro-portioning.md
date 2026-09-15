---
id: FITNESS-55
title: "Spec: Positional Meal Naming & Tapered Macro Portioning"
state: Done
state_group: completed
priority: none
labels: [spec, ready-for-agent]
module: "Positional Meal Naming & Tapered Macro Portioning"
parent: null
created: 2026-09-03
updated: 2026-09-03
plane_id: 7d44db06-e730-4698-aafa-d10f502be3ad
---

# FITNESS-55: Spec: Positional Meal Naming & Tapered Macro Portioning

### Problem Statement

The meal-count feature exposes confusing, incorrect meal names to users and rests on an internally inconsistent diet-generation model. Users choose how many meals they eat per day (currently 1–20, per today's ADR-015), and the app labels each slot Breakfast/Lunch/Dinner/Snack, cycling through those four names again ("Breakfast 2", "Lunch 2"…) once the count exceeds 4. This produces genuinely wrong labels — at meal_count=5 the last meal of the day is called "Breakfast 2," not "Dinner" — and the same round-robin logic can place "Snack" as the very last meal at certain counts instead of between two other meals, contradicting what a snack is supposed to be. There is no way to reason from the generated labels about which meal is "the light one" or "the last one," and the naming scheme breaks down entirely past 4 meals.

### Solution

Replace semantic meal-type naming (breakfast/lunch/dinner/snack) with purely positional numbering ("Meal 1", "Meal 2", …, "Meal N") everywhere the app shows or stores meal identity. Underneath the naming, replace the round-robin meal-type cycle with a single, position-driven portioning rule: every meal gets an equal share of the day's calories, and carbohydrate/fat grams taper down linearly as the day progresses (the first meal gets the largest carb/fat share, the last meal the smallest), with protein filling in whatever is left of each meal's fixed calorie share. This reproduces the everyday intuition that "dinner" is the lightest meal on carbs/fat, without a fragile type-cycling scheme, and removes the "snack must not be first/last" problem entirely since there is no smaller-portion tier left to place. The user-configurable meal-count range is reduced from today's 1–20 back to 1–6, removing the large-N ambiguity that produced these bugs in the first place.

### User Stories

1. As a user setting up my profile, I want to choose how many meals I eat per day (1–6), so that my diet plan matches my actual eating pattern.
2. As a user, I want my chosen meal count to default to 3 if I have not set one, so that new users get a sensible starting point without extra setup.
3. As a user viewing my generated diet, I want each meal section labeled "Meal 1," "Meal 2," etc. in my own language, so that meal names read naturally in Ukrainian/Russian/Spanish as well as English.
4. As a user, I want the last meal of my day to always be the lightest on carbs and fat, so that it matches common dietary guidance about lighter evening eating.
5. As a user, I want every meal in my day to carry roughly equal calories, so that no single meal is disproportionately large or small.
6. As a user with a higher meal count (e.g. 6), I want each meal's carb/fat share to decrease smoothly from meal 1 to meal 6, so that the tapering feels gradual rather than an arbitrary cutoff.
7. As a user, I do not want to see "Breakfast 2" or any repeated/duplicated meal-type label, so that my diet plan reads clearly regardless of how many meals I have chosen.
8. As a developer, I want the diet-generation code to store only a meal's position (not a meal-type/occurrence pair), so that the schema does not carry a redundant, derivable field that can drift out of sync with position.
9. As a developer, I want meal role (main vs. dinner-equivalent) computed on the fly from position and total meal count rather than persisted, so that changing the taper algorithm later does not require a data migration.

10. As a developer, I want the existing Food Role chain (protein/carb/vegetable/fat picks per meal) to remain unchanged, so that this refactor does not regress food-selection quality.

11. As an existing user whose profile currently has a meal_count above 6 (from testing the prior 1–20 range), I want my meal count silently clamped to 6, so that my profile stays valid without requiring action from me.

12. As a developer, I want to avoid writing migration/backfill logic for historical diet_items rows, so that this change ships without unnecessary complexity, given the negligible amount of existing data.

13. As a user, I want to keep setting meal count via the Settings/Profile form exactly as I do today, so that this change does not alter my existing workflow beyond the range and labels.

14. As a user, I want the meal-count selector to no longer show a per-type breakdown like "6 — 2 Breakfast, 2 Lunch, 1 Dinner, 1 Snack," so that the option list does not reference meal types that no longer exist.

15. As a translator/localizer, I want a single translation key for the numeric meal label (e.g. "Meal {number}"), so that I do not need four separate meal-type strings times four locales.

16. As a QA/developer, I want the diet-generation function's output independently verifiable against the fixed daily protein/carb/fat targets (summed across all meals), so that the taper redistribution never silently changes how much the user is told to eat in a day.

17. As a user with meal_count=1, I want my single meal to receive the full day's calorie and macro targets, so that a 1-meal day is not shortchanged by taper math that assumes multiple meals.

18. As a developer, I want the round-robin logic and the fixed 4-value meal-type enum removed from the codebase, so that no leftover code references a design that has been fully superseded.

19. As a developer, I want ADR-015 formally superseded by a new ADR documenting this decision, so that future readers understand why the meal-count range and naming scheme changed twice in one day.

### Implementation Decisions

- **Schema**

  : on

  `diet_items`

  , drop the

  `meal_type`

  enum column (breakfast/lunch/dinner/snack) and the

  `meal_occurrence`

  integer column; add a

  `meal_position`

  integer column (1-based, not null).

  `order_index`

  becomes scoped within

  `meal_position`

  instead of the old

  `(meal_type, meal_occurrence)`

  pair. Drop the underlying

  `meal_type`

  pg enum type if nothing else references it.

- **users.meal_count**

  : keep the column; tighten the valid range from 1–20 back to 1–6 in both the backend DTO validation and the frontend zod schema/constant. Add a one-time backfill clamping any existing value above 6 down to 6.

- **Meal-slot generation**

  : remove the fixed 4-value meal-type enum and its round-robin assignment function; a meal "slot" becomes nothing more than its 1-based position among

  `meal_count`

  total meals for that day.

- **Macro-taper function**

  : introduce a function that, given a meal's position

  *i*

  and the day's total meal count

  *N*

  , weights that meal's carb and fat share proportionally to

  `(N − i + 1)`

  , normalized so weights across all

  *N*

  positions sum to 1, then multiplies by the day's total carb grams and total fat grams respectively. Every meal's calorie share is

  `dailyCalories / N`

  , unchanged by position. Each meal's protein grams are whatever remains of that meal's fixed calorie share once its carb/fat calories are subtracted.

- **Diet-generation consumer**

  : the generation logic pulls each meal's carb/fat/protein targets from the new taper function (keyed on position and count) instead of splitting evenly across four meal types. The existing Food Role chain (protein/carb/vegetable/fat candidate picks) is unchanged — it already applies uniformly regardless of meal type today.

- **API contract**

  : the generated-diet response replaces each item's

  `mealType`

  +

  `mealOccurrence`

  fields with a single

  `mealPosition`

  integer.

- **Diet display**

  : meal sections group by

  `mealPosition`

  alone (no more compound type+occurrence key); section headings render a single translated "Meal {position}" label.

- **Profile form**

  : the meal-count selector's per-option breakdown text (e.g. "2 Breakfast, 2 Lunch…") is removed; options show a plain count.

- **Translations**

  : retire the

  `Diet.mealTypes.*`

  and

  `ProfileFields.mealTypes.*`

  namespaces (breakfast/lunch/dinner/snack × 4 locales) in favor of one interpolated key (e.g. "Meal {number}") reused everywhere a meal label appears, translated across en/uk/ru/es.

- **ADR**

  : add a new ADR to this repo's decisions doc superseding ADR-015, recording why round-robin type-cycling was replaced with position-based equal-calorie/tapered-macro portioning and why the count range reverted to 1–6. Full rationale/alternatives-considered narrative goes to this project's external docs mirror per its existing docs policy; the in-repo ADR stays to the final decision only.

- **Domain docs**

  : update this project's domain-model and business-rules docs to replace the "round-robin past 4 meal types" rule with the new position-based equal-calorie/tapered-macro rule.

### Testing Decisions

- Good tests here assert on the diet-generation function's external output (given a meal count and daily calorie/macro targets, what items and per-meal macro/gram values come back) — not on the internal taper-weight arithmetic in isolation — so refactoring the weighting formula later does not break tests as long as the observable output stays correct.
- **Primary seam**

  : the diet-generation function in this project's greedy-heuristic module — the single existing entry point that already exercises meal-count-driven behavior end to end. Its existing spec file already contains round-robin-specific cases (a "round-robins meal type past 4" case and a dish-repeat-avoidance case) which should be replaced with position-based equivalents: assert item count per day equals meal_count, assert macros/calories summed across all items reconcile to the daily targets, and assert carb/fat grams decrease monotonically with increasing meal position while per-meal calories stay equal.

- The existing standalone unit test for the old round-robin slot-mapping function is retired along with the function itself — once meal position replaces meal type, that surface folds entirely into the primary seam above rather than warranting its own unit test.
- **Secondary seam**

  (frontend, presentational only): the existing diet-menu component render test already renders the diet list and asserts on rendered section headings; its repeated-occurrence assertions ("Breakfast", "Breakfast 2", "Dinner") are replaced with position-based ones ("Meal 1", "Meal 2", "Meal 3"). No new test infrastructure is introduced — this is a drop-in replacement within an already-existing render test.

- The profile form's per-option breakdown text generator is being deleted, not modified, so no test debt is created there (it has no existing test today).

### Out of Scope

- Fixing the pre-existing portion-scaling bug observed while testing this area (generated diet totals diverging roughly 2x from the calculated daily target, with some role-slots receiving near-zero-gram portions) — tracked separately, not part of this spec.
- Any change to the Food Role chain composition (protein/carb/vegetable/fat picks per meal) — unchanged by this spec.
- Raising or otherwise revisiting the meal-count ceiling beyond 6.
- Backfilling or migrating historical diet_items rows to the new position-based shape, given the negligible amount of existing data.
- Any UI redesign of the Diet page beyond label and grouping changes (layout, calorie/macro summary cards, Reroll/Swap behavior all stay as-is).

### Further Notes

This spec directly supersedes ADR-015 ("meal_count past 4 repeats meal types via a stored occurrence column"), which shipped the same day this spec was written and is the root cause of the bugs motivating this change (last meal not always dinner-equivalent; snack landing in a terminal position).

A separate, more severe bug was observed on the live Diet page while testing this area: generated diet totals diverging roughly 2x from the calculated daily target, with some role-slots receiving ~1g degenerate portions (e.g. 1g of rice, 1g of nuts). This is not part of this spec's scope and should be tracked and prioritized as its own ticket, since it represents users being given genuinely wrong calorie/macro guidance independent of the meal-naming issue addressed here.
