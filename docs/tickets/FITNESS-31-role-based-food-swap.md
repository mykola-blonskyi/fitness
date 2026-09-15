---
id: FITNESS-31
title: "Role-based food swap"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: "Diet Engine"
parent: FITNESS-5
created: 2026-08-15
updated: 2026-08-23
plane_id: 719f12b7-f785-4da7-a5a6-ae7552c3016d
---

# FITNESS-31: Role-based food swap

### Parent

FITNESS-5 — Spec: Diet Engine

### What to build

Let a user swap one Diet Item for another Food Item sharing the same Food Role.

### Acceptance criteria

- [x] A Diet Item can be swapped for another Food Item sharing the same Food Role
- [x] The swap is rejected if the replacement would violate an active Food Preference
- [x] Swapping updates the Diet's totals to reflect the new item's macros/calories

### Blocked by

#24 Diet generation (greedy heuristic)
