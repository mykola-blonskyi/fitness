---
id: FITNESS-45
title: "Workout-set weight input rejects most valid values (step/min grid mismatch)"
state: Done
state_group: completed
priority: high
labels: [ready-for-agent]
module: null
parent: null
created: 2026-08-25
updated: 2026-08-27
plane_id: 3929dd2b-197c-4161-aeb8-f6e3b35a63d5
---

# FITNESS-45: Workout-set weight input rejects most valid values (step/min grid mismatch)

### What happened

The workout-set weight input rejected almost any realistic entered value with a native browser validation error ("the two nearest valid values are X.6 and X.1"), because it combined `min={0.1}` with `step="0.5"` — the browser's step-grid is offset from 0 by the min, landing on .1/.6 boundaries that almost no real weight lands on.

### Fix

Changed both the workout-set weight input and the daily-log body-weight input (same class of issue, milder) to `step="any"`, removing the native step-grid restriction entirely — the actual validation (min 0.1, reported by zod/backend) is the sole source of truth now.

### Acceptance criteria

- [x] Any decimal weight value (e.g. 62.5, 105, 22.3) can be entered and submitted on the workout-set weight field without a native validation error
- [x] Same for the daily-log body-weight field
