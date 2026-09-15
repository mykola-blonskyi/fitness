---
id: FITNESS-27
title: "Food catalog seed script"
state: Done
state_group: completed
priority: high
labels: [ready-for-agent]
module: "Diet Engine"
parent: FITNESS-5
created: 2026-08-15
updated: 2026-08-17
plane_id: e9961a06-15a2-4386-9b1e-93595e798cee
---

# FITNESS-27: Food catalog seed script

### Parent

FITNESS-5 — Spec: Diet Engine

### What to build

One-time curated import from Open Food Facts/USDA into food_calories, mapped to category/subcategory/role, with machine-translated names.

### Acceptance criteria

- [x] Running the script imports a curated subset of items from Open Food Facts and USDA FoodData Central
- [x] Each imported item is mapped to this project's category/subcategory/role taxonomy and marked is_verified=false
- [x] Per-locale names (en/uk/ru/es) are generated via the translation API and stored, also unverified
- [x] The script can be re-run to add more items without duplicating existing ones

### Blocked by

#1 App scaffolding + Drizzle/Postgres wiring
