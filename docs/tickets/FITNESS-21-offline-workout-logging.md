---
id: FITNESS-21
title: "Offline workout logging"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: "Training Programs & Workout Tracking"
parent: FITNESS-2
created: 2026-08-15
updated: 2026-08-27
plane_id: 910bd0ee-9abb-4ca6-8c20-6dc5d22b6f5f
---

# FITNESS-21: Offline workout logging

### Parent

FITNESS-2 — Spec: Training Programs & Workout Tracking

### What to build

Wire workout-set logging into the offline write-queue so a set can be logged at the gym with no signal.

### Acceptance criteria

- [x] Active programs, the exercise catalog, and recent workout logs remain viewable with the network disabled
- [x] A workout set logged while offline is queued and appears in the log locally
- [x] Reconnecting flushes the queued set(s) to the server automatically, in the order they were logged
- [x] The offline/syncing/synced indicator reflects the actual queue state throughout

### Blocked by

#14 Workout logging (online), #7 Offline write-queue + sync + indicator
