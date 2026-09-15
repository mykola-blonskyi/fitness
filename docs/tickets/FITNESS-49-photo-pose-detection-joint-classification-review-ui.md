---
id: FITNESS-49
title: "Photo pose detection: joint classification + review UI"
state: Done
state_group: completed
priority: high
labels: [ready-for-agent]
module: "Progress Photos & Pose Analysis"
parent: FITNESS-4
created: 2026-08-27
updated: 2026-08-29
plane_id: 373ffb9e-b87e-4076-9d0c-bc00cec98dac
---

# FITNESS-49: Photo pose detection: joint classification + review UI

### Parent

FITNESS-4 — Spec: Progress Photos & Pose Analysis

### What to build

Replace the `detect` job's stub with real pose classification — a geometry heuristic over MediaPipe Pose Landmarker output, solved as a joint assignment across all photos in a session — plus the review screen for confirming or correcting the result via FITNESS-50's confirm endpoint. Per ADR-013.

### Acceptance criteria

- [x] The `detect` job runs MediaPipe Pose Landmarker on each photo in the session and derives a front/side/back score from landmark geometry, not a separately trained classifier
- [x] Scores across the session's photos are resolved via joint assignment (maximize total confidence, no pose used twice) rather than classifying each photo in isolation
- [x] A low-confidence or ambiguous result leaves the session in `needs_review` rather than a high-confidence wrong guess
- [x] Opening a `needs_review` session shows the 3 suggested poses as independently editable dropdowns, pre-filled with the detected assignment
- [x] The confirm action is disabled until every photo has a distinct pose assigned, then submits to the confirm endpoint
- [x] Landmarks computed during detection are persisted and reused by the alignment-analysis stage — never recomputed after confirm

### Blocked by

#50 Review confirm endpoint: session reaches confirmed
