---
id: FITNESS-51
title: "Multi-select upload + needs-review visibility"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: "Progress Photos & Pose Analysis"
parent: FITNESS-4
created: 2026-08-27
updated: 2026-08-29
plane_id: aa1b13fe-df35-4255-bdb5-4fb0c5bf522c
---

# FITNESS-51: Multi-select upload + needs-review visibility

### Parent

FITNESS-4 — Spec: Progress Photos & Pose Analysis

### What to build

Simplify the upload form to a single unlabeled multi-select input, and surface sessions awaiting review in the Photo Session list. Works against the stub pipeline from FITNESS-23 — doesn't need real detection or the confirm endpoint.

### Acceptance criteria

- [x] The upload form is a single multi-select file input (capped at 3), replacing the three separately-labeled Front/Side/Back inputs
- [x] Requesting an upload URL and confirming a session's upload no longer require a per-photo pose label
- [x] A session in `needs_review` (stub or real) shows a badge in the Photo Session list

### Blocked by

#23 Photo-analysis queue plumbing + worker skeleton (stub)
