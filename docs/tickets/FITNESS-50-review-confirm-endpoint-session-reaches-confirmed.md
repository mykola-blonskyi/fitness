---
id: FITNESS-50
title: "Review confirm endpoint: session reaches confirmed"
state: Done
state_group: completed
priority: high
labels: [ready-for-agent]
module: "Progress Photos & Pose Analysis"
parent: FITNESS-4
created: 2026-08-27
updated: 2026-08-29
plane_id: 6b48a493-49db-4d3c-87a2-2936cb9e165a
---

# FITNESS-50: Review confirm endpoint: session reaches confirmed

### Parent

FITNESS-4 — Spec: Progress Photos & Pose Analysis

### What to build

An endpoint that confirms a `needs_review` session's (possibly edited) pose assignments, moving it to `confirmed` and dispatching the (stub) alignment-analysis stage. Per ADR-013.

### Acceptance criteria

- [x] A new endpoint confirms a `needs_review` session's pose assignments (as submitted, whether machine-suggested or user-edited), rejecting the request if any two photos in the session share the same pose
- [x] Confirming transitions the session's status to `confirmed` and pushes a stub `analyze-alignment` job per photo onto the queue
- [x] `progress_photos.analysis_status` transitions pending -> processing -> completed (or failed) for the stub `analyze-alignment` job, end to end through the real queue
- [x] A session can only be marked baseline once its status is `confirmed`

### Blocked by

#23 Photo-analysis queue plumbing + worker skeleton (stub)
