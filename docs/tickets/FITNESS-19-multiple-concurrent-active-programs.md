---
id: FITNESS-19
title: "Multiple concurrent active programs"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: "Training Programs & Workout Tracking"
parent: FITNESS-2
created: 2026-08-15
updated: 2026-08-24
plane_id: a2d795ce-cd6f-4fbf-856f-5e46f8b3249c
---

# FITNESS-19: Multiple concurrent active programs

### Parent

FITNESS-2 — Spec: Training Programs & Workout Tracking

### What to build

Let a user activate more than one Training Program at once, per ADR-004's correction of the one-to-one schema.

### Acceptance criteria

- [x] A user can activate more than one Training Program at the same time
- [x] The active-programs list shows all currently active programs, not just one
- [x] Deactivating one active program does not affect the others

### Blocked by

#12 Training Program builder
