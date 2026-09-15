---
id: FITNESS-20
title: "Workout logging (online)"
state: Done
state_group: completed
priority: high
labels: [ready-for-agent]
module: "Training Programs & Workout Tracking"
parent: FITNESS-2
created: 2026-08-15
updated: 2026-08-27
plane_id: fe399dfe-4e13-4079-b711-10d61411ccb1
---

# FITNESS-20: Workout logging (online)

### Parent

FITNESS-2 — Spec: Training Programs & Workout Tracking

### What to build

Let users start a Workout Log (from a program or ad hoc) and log sets, with history immune to later program edits.

### Acceptance criteria

- [x] A Workout Log can be started from an active Training Program or created ad hoc
- [x] Sets can be logged with weight+reps for non-cardio exercises or duration for cardio-category exercises
- [x] Editing or archiving the source Training Program after a workout was logged does not alter that Workout Log's history
- [x] Past Workout Logs are listed by date

### Blocked by

#13 Multiple concurrent active programs, #8 Daily Log + weight logging
