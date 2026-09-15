---
id: FITNESS-63
title: "Add drag-and-drop as an alternative reorder interaction"
state: Done
state_group: completed
priority: none
labels: [ready-for-agent]
module: "Drag-and-Drop Meal Reordering"
parent: FITNESS-59
created: 2026-09-03
updated: 2026-09-04
plane_id: 8cf6c5fc-47be-4b32-9336-f8816d4087b4
---

# FITNESS-63: Add drag-and-drop as an alternative reorder interaction

### Parent

FITNESS-59

### What to build

A user can drag a meal into a new position as an alternative to the up/down buttons. Dragging calls the same reorder contract the buttons already use, so both interactions produce identical results.

### Acceptance criteria

- [x] A user can drag a meal to a new position in the diet's display order
- [x] Dragging calls the same reorder endpoint the up/down buttons use, with no separate backend path
- [x] The up/down buttons remain available and functional alongside drag-and-drop
- [x] Reordering via drag produces the same result (display order, relabeled meal numbers, unchanged macros) as reordering via buttons

### Blocked by

FITNESS-59's button-reorder ticket (reuses its backend contract entirely)
