---
id: FITNESS-24
title: "Real alignment analysis + retry semantics + retry UI"
state: Done
state_group: completed
priority: high
labels: [ready-for-agent]
module: "Progress Photos & Pose Analysis"
parent: FITNESS-4
created: 2026-08-15
updated: 2026-08-31
plane_id: c84546d1-888a-4b92-a605-e9bb300b28f5
---

# FITNESS-24: Real alignment analysis + retry semantics + retry UI

### Parent

FITNESS-4 — Spec: Progress Photos & Pose Analysis

### What to build

Replace the `analyze-alignment` stub with real MediaPipe alignment validation and landmark refinement, for a Progress Photo whose pose is already confirmed (checks are pose-specific — a front shot and a side shot validate different things) — add auto-retry-then-fail, and surface failure/retry to the user.

### Acceptance criteria

- [x] The worker's stub is replaced with real MediaPipe alignment validation, pose-specific per the photo's already-confirmed pose, and landmark refinement
- [x] A transient failure is retried automatically a few times with backoff before the job is marked failed permanently
- [x] The UI shows processing/completed/failed status and offers a manual retry action that re-enqueues the job
- [x] Alignment data is persisted and retrievable for a completed analysis, alongside the landmarks already computed during detection

### Blocked by

#49 Photo pose detection: joint classification + review UI
