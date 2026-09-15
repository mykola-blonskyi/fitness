---
id: FITNESS-23
title: "Photo-analysis queue plumbing + worker skeleton (stub)"
state: Done
state_group: completed
priority: high
labels: [ready-for-agent]
module: "Progress Photos & Pose Analysis"
parent: FITNESS-4
created: 2026-08-15
updated: 2026-08-29
plane_id: 7547562b-3d92-40f0-8d0c-aaab4d657511
---

# FITNESS-23: Photo-analysis queue plumbing + worker skeleton (stub)

### Parent

FITNESS-4 — Spec: Progress Photos & Pose Analysis

### What to build

Get the photo-analysis queue plumbing working per ADR-003/ADR-013 (plain Redis list/stream, not BullMQ): confirming an upload dispatches a `detect` job to a Python worker skeleton, which writes back a stub pose assignment and moves the session into review. Confirming/editing that review and dispatching the alignment stage is a separate, blocked ticket.

### Acceptance criteria

- [x] Confirming a photo upload pushes a `detect` job onto the Redis queue (payload: session id + each photo's objectKey)
- [x] Photo Session gains a `status` field (uploading/detecting/needs_review/confirmed), separate from each Progress Photo's existing `analysis_status`
- [x] The Python worker consumes a `detect` job, reads all of the session's objects from MinIO with its own credentials, and writes back a stub per-photo pose assignment + landmarks, transitioning the session to `needs_review`
- [x] `progress_photos.pose` is nullable until the owning session is `confirmed`

### Blocked by

#22 Photo upload pipeline
