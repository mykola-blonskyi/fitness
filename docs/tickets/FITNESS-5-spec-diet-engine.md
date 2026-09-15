---
id: FITNESS-5
title: "Spec: Diet Engine"
state: Done
state_group: completed
priority: none
labels: [spec, ready-for-agent]
module: "Diet Engine"
parent: null
created: 2026-08-15
updated: 2026-09-03
plane_id: 49c7796c-c2da-409f-8856-b5626a355e17
---

# FITNESS-5: Spec: Diet Engine

### Problem Statement

Knowing your calorie target is only half the problem — translating that into an actual day of meals that fits your allergies, exclusions, and diet type is tedious to do by hand, and most calorie-tracking apps put the burden of tracking every bite on the user rather than proposing a plan they can just follow or swap.

### Solution

Given a user's profile and preferences, generate a full day's menu that hits their calorie/macro targets using only foods they can/will eat, split across their chosen number of meals. Users regenerate on demand, and can swap disliked foods for role-equivalent alternatives.

### User Stories

1. As a user, I want the app to calculate my daily calorie target from my weight, height, age, gender, activity level, and goal, so that I don't have to do the math myself.
2. As a user, I want my calorie target broken down into protein/carbs/fat targets, so that I know the composition, not just the total.
3. As a user, I want to generate a full day's menu that fits my calorie/macro targets, so that I don't have to plan meals manually.
4. As a user, I want to set how many meals I eat per day, so that the generated menu matches my actual eating pattern.
5. As a user, I want to declare food allergies, so that the generated menu never includes anything I'm allergic to.
6. As a user, I want to declare foods I simply don't want to eat, so that the menu respects my preferences even without a medical reason.
7. As a user, I want to exclude an entire category of food (e.g. all dairy), so that I don't have to exclude every dairy item individually.
8. As a user, I want to exclude just one specific food item (e.g. peanut butter, but not other nuts), so that a narrow dislike doesn't remove an entire food group I'm otherwise fine with.
9. As a user, I want to set a diet type (vegetarian, vegan, keto, paleo), so that the generated menu matches my dietary approach.

10. As a user, I want to regenerate my menu on demand, so that I can get a different set of options if I don't like what was suggested.

11. As a user, I want to see my most recently generated menu as "today's" menu without having to pick from a list, so that there's no ambiguity about which plan I'm following.

12. As a user, I want to see my previously generated menus, so that I can look back at what I've tried.

13. As a user, I want to swap a food item in my menu for another with the same nutritional role (e.g. swap chicken breast for turkey), so that I can adjust to what I have available without breaking the calorie/macro target.

14. As a user, I want each menu item's portion size shown in grams, so that I know exactly how much to prepare/eat.

15. As a user, I want each meal in the menu to show its calorie and macro breakdown, so that I understand how the day adds up.

16. As a user, I want to browse the food database by category (meat, vegetables, grains, etc.), so that I can understand what's available.

17. As a user, I want to search the food database by name, so that I can find a specific ingredient quickly.

18. As a user, I want to manually add a food item that isn't in the database, so that I can still plan around something specific to my diet.

19. As a user, I want the food database to show calories, protein, carbs, and fat per item, so that I can make informed choices.

20. As a developer/maintainer, I want imported (non-manual) food items marked as unverified until reviewed, so that data-quality issues from automated import don't silently become authoritative.

21. As a user, I want the food and menu content displayed in my chosen app language, so that ingredient names aren't just in English if I use the app in Ukrainian/Russian/Spanish.

22. As a user, I want a food item's name to still display (in English) even if its translation into my language hasn't been reviewed yet, so that I'm never shown a blank name.

### Implementation Decisions

- Entities per `knowledge/domain-model.md`: Food Item (`food_calories`) classified by Food Category → Food Subcategory → Food Role; Diet + Diet Item, linked to a Daily Log and a Diet Calculation Algorithm; Food Preference (polymorphic `target_type`/`target_id`); Diet Preference (diet type).
- **Calorie/macro calculation**: `diet_calculation_algorithms.formula` is documentation only — the real calculation is versioned backend code in a registry keyed by `code` (e.g. `mifflin_v1`, `adaptive_v1` — see `docs/decisions.md`/`knowledge/business-rules.md`). Each generated Diet stores `calculation_metadata` (inputs + outputs snapshot) for audit.
- **Diet generation trigger**: always manual (an explicit "Generate"/"Regenerate" action) — logging a new weight or changing preferences never auto-creates a Diet, only surfaces a "may be outdated" affordance in the UI.
- **Current diet resolution**: the most recently created `diets` row for a given Daily Log, by `created_at` — no `is_current` flag; older diets persist as history.
- **Generation algorithm**: a greedy heuristic, not a constraint solver — per meal, pick one Food Item per required Food Role, scale portion grams to hit that meal's calorie share, then adjust the largest items if the day's total drifts outside tolerance (see `knowledge/business-rules.md`). No new solver dependency.
- **Food Replacement / swap**: role-based only — two Food Items are interchangeable only if they share the same Food Role, regardless of Category/Subcategory.
- **Food Preferences**: `target_type` (category/subcategory/role/food_item) + `target_id` — a candidate Food Item is excluded if any of its own category/subcategory/role/id matches an active preference's target.
- **Food catalog import**: one-time curated seed script from Open Food Facts and USDA FoodData Central, mapping source categories into this schema's category/subcategory/role taxonomy via an explicit mapping table; inserted with `source` + `is_verified=false`. Per-locale names (uk/ru/es) are machine-translated at the same import step, also unverified until reviewed. Manual food creation is always available regardless of import state.

### Testing Decisions

- **NestJS seam**: integration tests (real test Postgres) covering calorie/macro calculation for representative profile combinations, diet generation respecting meal count + calorie/macro tolerance + active Food/Diet Preferences (including both category-level and item-level exclusions), current-diet resolution after multiple regenerations, and role-based swap producing a same-role replacement.
- **Next.js seam**: Playwright E2E — complete a profile, set preferences (including one allergy and one diet type), generate a menu, verify meals shown respect the meal-count setting and exclusions, swap one item, regenerate and confirm the "current" menu changes to the new one.
- **Import script**: tests asserting the Open Food Facts/USDA mapping produces schema-valid rows (category/subcategory/role assignment, `is_verified=false`) from fixture source payloads, not the live external APIs.

### Out of Scope

- Manual food-consumption logging / calorie counting of what was actually eaten (per the grooming note, this is a recommendation engine, not a tracker — users aren't required to log consumed food).
- A constraint-solver-based "optimal" menu (explicitly rejected in favor of the greedy heuristic — see `knowledge/business-rules.md`).
- Recipe instructions or meal prep guidance — only food items, portions, and macro/calorie breakdowns.
- Grocery list generation.

### Further Notes

Depends on Spec: Auth & User Profile (calculation inputs) and Spec: Body-Weight Diary (the Daily Log a Diet attaches to). Independent of Spec: Training and Spec: Progress Photos & Pose Analysis.
