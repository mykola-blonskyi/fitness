---
id: FITNESS-65
title: "Exercise picker silently drops exercises past the 100-item page cap"
state: Done
state_group: completed
priority: medium
labels: []
module: null
parent: null
created: 2026-09-04
updated: 2026-09-04
plane_id: adc41892-a1a7-4ec5-82bc-9c68d3d3505e
---

# FITNESS-65: Exercise picker silently drops exercises past the 100-item page cap

The training/workouts exercise pickers (`training/[id]/page.tsx`, `workouts/[id]/page.tsx`) fetched `/exercises?limit=100` into a plain `<select>`, which is the backend's hard cap (`ListExercisesDto`: `@Max(100)`). The catalog has 832 rows, so once exercises get verified through the admin queue, the picker silently shows only the first 100 and drops the rest, with no pagination, search, or indication that more exist.

**Fix shipped**: replaced the plain `<select>` with a search-driven picker (`ExercisePicker`, modeled on the existing `features/diet/components/SwapPicker.tsx` pattern) - a debounced search input against `/exercises?search=`, capped at 100 results per query with a "refine your search" hint if a query still returns exactly 100. This is the "in-picker search" option named in the original AC, verified end-to-end in a browser against the real 832-row catalog (search, filter, select, submit all confirmed working).

An earlier draft of this fix instead did a server-side loop fetching the whole catalog into the same plain `<select>` - rejected in review for bad mobile UX (830+ options), sequential-round-trip latency (9+ requests before first render), and no circuit breaker. The search-driven picker replaces that approach entirely.

Incidentally found and separately filed: FITNESS-67, a pre-existing crash on `/workouts/[id]` (unrelated to this fix, reproduces on unmodified main).

### Acceptance criteria

- [x] Exercise picker (training and workouts forms) can reach exercises beyond the first 100 - via an in-picker search against `/exercises?search=`
- [x] Behavior verified with a catalog of >100 verified exercises (832), not just against the current (previously 0-verified) dev data
