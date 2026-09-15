---
id: FITNESS-62
title: "Reorder meals via up/down buttons"
state: Done
state_group: completed
priority: none
labels: [ready-for-agent]
module: "Drag-and-Drop Meal Reordering"
parent: FITNESS-59
created: 2026-09-03
updated: 2026-09-04
plane_id: 45d2c714-49a6-4fca-9771-00174997e662
---

# FITNESS-62: Reorder meals via up/down buttons

### Parent

FITNESS-59

### What to build

A user can reorder their diet's meals using up/down buttons. The new display order is separate from each meal's generation slot (the stable value driving its macro taper target, introduced by the meal-naming/tapering work) — reordering only changes what's shown where, never a meal's food or macros. The reorder is saved on the diet's own record and is still in effect the next time the diet is viewed.

### Acceptance criteria

- [x] Each diet meal has a display-order value independent of its generation slot
- [x] A reorder endpoint accepts the full, exact-set list of a diet's meal identifiers in the desired order, rejects partial lists/duplicates/foreign ids, and applies the new display order in one transaction — matching this codebase's existing training-program-exercise reorder convention
- [x] Up/down buttons in the diet UI let a user move a meal within the display order
- [x] Meal number labels ("Meal 1", "Meal 2", …) re-render according to display order after a reorder
- [x] A reorder persists and is still reflected the next time the diet is viewed
- [x] Reroll and Swap on any meal continue to size food against that meal's generation slot, unaffected by its current display position

### Blocked by

FITNESS-58 (diet must persist across a period for a reorder to mean anything), FITNESS-57 (needs the generation-slot field this ticket's display-order field sits alongside)
