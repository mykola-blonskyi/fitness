---
id: FITNESS-56
title: "Meal-count range reverts to 1-6, default 3, with existing-data clamp"
state: Done
state_group: completed
priority: none
labels: [ready-for-agent]
module: "Positional Meal Naming & Tapered Macro Portioning"
parent: FITNESS-55
created: 2026-09-03
updated: 2026-09-03
plane_id: 8fe7d631-1ab8-44f7-9025-e7f75aeb3983
---

# FITNESS-56: Meal-count range reverts to 1-6, default 3, with existing-data clamp

### Parent

FITNESS-55

### What to build

Revert the meal-count setting's valid range from today's 1–20 (ADR-015) back to 1–6, in both backend validation and the frontend form. Existing profiles with a stored meal count above 6 are clamped down to 6. Default stays 3 for profiles that have not set a value.

### Acceptance criteria

- [x] Backend rejects a meal-count value outside 1–6 (was 1–20)
- [x] Frontend Settings/Profile form's meal-count selector only offers 1–6
- [x] A migration clamps any existing users.meal_count value above 6 down to 6
- [x] A new profile with no meal-count set still defaults to 3

### Blocked by

None (can start immediately)
