---
id: FITNESS-69
title: "Spec: Menu Composition (Archetypes & Food Families)"
state: Backlog
state_group: backlog
priority: none
labels: [spec]
module: "Menu Composition (Archetypes & Food Families)"
parent: null
created: 2026-09-11
updated: 2026-09-11
plane_id: a9b56a70-a61a-4781-907a-c2ea72fce894
---

# FITNESS-69: Spec: Menu Composition (Archetypes & Food Families)

Generated plans hit their macro targets (ADR-019) and still read as nonsense: a real 4-meal plan came out as *cod 340 g + rice 106 g + cabbage 163 g + walnuts 33 g*, then *cod 393 g + cucumber 96 g + almonds 18 g*, then *cod 410 g + tomato 96 g + olive oil 3 g*.

**Three causes.** (1) A meal has no shape — the same four role-slots filled independently, with breakfast, lunch and dinner as the same object. (2) The pool is uncurated: the `complex_carb` pool is 34 rows, a third of them flours, crackers and branded French bread, with no plain dry rice in it at all; `lean_protein` offers beef brains, frankfurters and "Potato salad with egg"; `vegetable` offers vegetable chips, babyfood carrots and garlic. (3) Role is doing two incompatible jobs — the right grain for "exclude complex carbs", far too coarse to decide that oatmeal substitutes for rice.

**Target model** (from the plan the owner actually eats): breakfast = 50 g oatmeal + 70 g berries + 3 eggs; main = 50 g rice/buckwheat + 150 g chicken/turkey + a salad of tomato, cucumber and onion + 2 spoons of olive oil; dinner = 100 g cottage cheese + 60 g greek yogurt + 1 apple.

A **Meal Archetype** (breakfast / main / dinner, assigned positionally) lists **Meal Slots**; each Slot draws from a **Food Family**, a new taxonomy level below Subcategory that becomes the unit of interchangeability for slots, swaps and favorites. A food with no Family is never generated. Non-starchy vegetables become **Free Foods** — listed, fixed-portioned, uncounted — paid for by a flat ~120 kcal allowance subtracted from the calorie target before fitting. ~50-80 foods carry a **Serving** ("3 eggs", "2 spoons"). Meals keep their numeric "Meal N" labels.

**Phases.** 1 — the pool and the picking rules (this module's tickets). 2 — the shape of a meal: Archetypes, Slots, grouped multi-item slots, Servings, Archetype macro weights replacing ADR-016/019's taper, swap retargeted to Family. 3 — variants, profile settings, meal-level reroll, `meal_count` 3-6.

Full decision: `docs/decisions.md` ADR-020. Vocabulary: `knowledge/glossary.md` (Meal Archetype, Meal Slot, Food Family, Serving, Free Food). Plan: `plans/current.md`. Rationale and rejected alternatives: the obsidian mirror.
