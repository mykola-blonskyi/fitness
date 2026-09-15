---
id: FITNESS-52
title: "Diet menu UI + hold-calories swap/reroll"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: "Diet Engine"
parent: FITNESS-5
created: 2026-08-30
updated: 2026-08-31
plane_id: b8dc98c1-4351-4ba8-ab07-a83751113630
---

# FITNESS-52: Diet menu UI + hold-calories swap/reroll

### Parent

FITNESS-5 — Spec: Diet Engine

### What to build

Surface the diet generation FITNESS-30/31 already built on the backend. The `/diet` page today shows only calorie/macro *targets* — there is no way to generate, view, regenerate, or swap items in a menu (`DietsService` / `DietsController` exist but nothing in the frontend calls them). Build the menu UI (today only — the page is not date-aware) plus the small backend additions the swap picker needs: a Role filter on `GET /food-items`, and a swap that rescales the replacement's grams to hold the swapped item's calorie contribution, with an optional `foodItemId` so an omitted body means "reroll".

### Acceptance criteria

- [x] The /diet page shows a "Generate menu" action when today has no Diet, and once one exists shows the menu: Food Items grouped by meal (breakfast/lunch/dinner/snack), each with its portion in grams and derived calories/macros, plus the day's calorie/macro totals
- [x] A "Regenerate" action produces a fresh menu (new Diet row, discarding any prior swaps) behind a confirmation step
- [x] Each menu item offers "reroll" (replace with a random valid same-Role Food Item) and "swap" (choose a specific same-Role Food Item from a picker); both preserve that item's calorie contribution by rescaling grams, so the day's total calories stay on target
- [x] GET /food-items accepts a Role filter, used to populate the swap picker
- [x] Generation failing because no Food Items match the user's active Food/Diet Preferences shows an actionable message linking to Preferences settings
- [x] CaloriesInfo shows the resolved weigh-in in its own logged unit, not always "kg"

### Notes

Swap changing from keep-grams to hold-calories is a correction to ADR-011 — record it (dated line on ADR-011 plus the obsidian mirror per the docs policy). No schema change: `diet_items.weight_grams` already varies per item.

### Blocked by

(none — #30, #31 are Done)
