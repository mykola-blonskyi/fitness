---
id: FITNESS-59
title: "Spec: Drag-and-Drop Meal Reordering"
state: Done
state_group: completed
priority: none
labels: [spec, ready-for-agent]
module: "Drag-and-Drop Meal Reordering"
parent: null
created: 2026-09-03
updated: 2026-09-04
plane_id: 604a421c-746e-4cfc-b5b8-a49e4cb177c1
---

# FITNESS-59: Spec: Drag-and-Drop Meal Reordering

### Problem Statement

A generated diet's meals are shown in the fixed order the generation algorithm assigned them, with no way for the user to rearrange that sequence to match how they actually want to view or think about their day.

### Solution

Let users reorder a diet's meals — via drag-and-drop, with an accessible up/down-button alternative alongside it — purely as a display/sequencing preference. Reordering changes only which position a meal's existing food is shown in; it never changes the food itself or its already-computed macros. Because a diet is now a persistent record across its active period (see the diet-validity-period spec), a reorder made today keeps applying for as long as that diet stays current.

### User Stories

1. As a user, I want to drag a meal into a different position within my diet, so that the displayed order matches how I actually plan to eat that day.
2. As a user who prefers not to (or cannot) drag, I want up/down buttons as an alternative way to reorder meals, so that reordering is accessible regardless of input method.
3. As a user, I want the meal number labels ("Meal 1", "Meal 2", …) to update immediately after I reorder, so that the numbering always reflects the current display sequence.
4. As a user, I do not want reordering to change the food or macros of any meal, so that a purely cosmetic reordering never surprises me with a different nutritional profile.
5. As a user, I want my reorder to stick around the next time I view my diet, so that I don't have to redo it every time I open the app.
6. As a user, I want my reorder to keep applying for as long as my current diet stays active, so that it isn't wiped out by simply viewing my diet on a different day.
7. As a user, I want Reroll and Swap on individual food items to keep working exactly as before after I've reordered meals, so that reordering doesn't interfere with my other existing ways of adjusting my diet.
8. As a developer, I want a meal's underlying position-driven macro target (the value that drove how much carb/fat/protein it was generated with) to remain fixed and independent of its display position, so that Reroll/Swap on a reordered meal still sizes food against the target it was actually generated for.
9. As a developer, I want the reorder action to follow this codebase's existing reorder convention (a full, exact-set replacement list validated and applied in one transaction), so that this feature doesn't introduce a second, inconsistent reordering pattern.

10. As a developer, I want to introduce whatever frontend tooling drag-and-drop requires cleanly, since no such tooling exists in this codebase today, and to keep the button-based path free of that dependency.

11. As a QA/developer, I want a reorder request containing a partial list, duplicate entries, or ids that don't belong to the current diet to be rejected, matching how the equivalent existing reorder feature guards against malformed input.

### Implementation Decisions

- The diet-generation slot each meal was created for (the stable value driving its macro taper target) is a separate field from the meal's display position. Only display position is ever written by a reorder; the generation slot never changes after a diet is generated, and Reroll/Swap continue to size against the generation slot, not the display position.
- Reordering operates on a diet's existing meal records directly and persists there — since a diet is now one stable record across its active period, this requires no separate "preference" storage; the reorder simply lives on that diet's own data until the diet is regenerated (see the diet-validity-period spec).
- The reorder endpoint follows this codebase's established reorder convention: the client sends the full, reordered list of that diet's meal identifiers; the server validates it as an exact match of the diet's existing meals (rejecting partial lists, duplicates, or foreign ids) and applies the new display positions in one transaction.
- The frontend gains both a drag-and-drop interaction and up/down buttons for the same reorder action — both paths call the same backend contract. Drag-and-drop requires introducing new frontend tooling (a drag-and-drop library plus a client component with its own interaction state), since the only existing reorder UI in this codebase today is a server-action-driven button pattern with no client-side drag support.

### Testing Decisions

- Good tests here assert on the external reorder contract: given a diet's current meal sequence and a new full ordering, the response reflects the new display order, each meal's macros/food are unchanged, and Reroll/Swap on any meal continue to size against that meal's original generation slot regardless of its current display position.
- **Primary seam**

  : the new reorder service method, tested the same way this codebase's one existing reorder feature (training-program exercise reordering) is tested — exact-match validation, transactional per-row update, and a full-list response.

- **Secondary seam**

  : the diet-display component's render test, extended to assert the rendered meal order (and renumbered labels) reflect display position, not generation slot.

- The button-based reorder path can reuse the same test seam as drag-and-drop, since both ultimately hit the same backend contract; only the input-triggering mechanism differs, which is a thin frontend concern.

### Out of Scope

- Any change to which food or macros a meal contains — reordering is purely a display-sequence change.
- A "remember my preferred order across future diet regenerations" feature — once a new diet is generated, any prior reorder no longer applies to it, since that's a fresh diet.
- The diet-validity-period change and the kcal/macro-scaling correction fix — each is its own separate spec; this spec depends on the former.

### Further Notes

This spec depends on the diet-validity-period spec (a diet must be a persistent, user-scoped record before "reorder persists for as long as the diet stays current" is meaningful). It also depends on the meal-position/taper spec (already published) having landed, since it introduces the stable per-meal generation slot this spec's display-position field is layered alongside.
