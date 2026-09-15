---
id: FITNESS-16
title: "Exercise catalog seed script"
state: Done
state_group: completed
priority: high
labels: [ready-for-agent]
module: "Training Programs & Workout Tracking"
parent: FITNESS-2
created: 2026-08-15
updated: 2026-08-16
plane_id: 90b42fac-f27b-411c-a0db-0141d0ed7bf4
---

# FITNESS-16: Exercise catalog seed script

### Parent

FITNESS-2 — Spec: Training Programs & Workout Tracking

### What to build

One-time curated import from wger/ExerciseDB into the exercises table, with category mapping and machine-translated per-locale names.

### Acceptance criteria

- [x] Running the script imports a curated subset of exercises from wger/ExerciseDB
- [x] Each imported exercise is mapped to this project's category enum and marked is_verified=false
- [x] Per-locale names (en/uk/ru/es) are stored, also unverified — sourced from wger's own native translations rather than a fresh machine-translation API, since wger already covers exactly these locales (see knowledge/business-rules.md)
- [x] The script can be re-run to add more items without duplicating existing ones

### Blocked by

#1 App scaffolding + Drizzle/Postgres wiring
