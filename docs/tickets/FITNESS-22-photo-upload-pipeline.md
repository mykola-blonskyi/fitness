---
id: FITNESS-22
title: "Photo upload pipeline"
state: Done
state_group: completed
priority: high
labels: [ready-for-agent]
module: "Progress Photos & Pose Analysis"
parent: FITNESS-4
created: 2026-08-15
updated: 2026-08-27
plane_id: 455f59d6-8b61-4b3b-81aa-3db87dd627cd
---

# FITNESS-22: Photo upload pipeline

### Parent

FITNESS-4 — Spec: Progress Photos & Pose Analysis

### What to build

Presigned upload to a private MinIO bucket, Photo Session/Progress Photo records, baseline flag, and presigned reads.

### Acceptance criteria

- [x] A user can request a presigned upload URL and upload front/side/back photos directly to MinIO
- [x] Confirming the upload creates a Photo Session and its Progress Photo rows, linked to the current Daily Log
- [x] A user can mark a session as baseline; attempting to mark a second session baseline is rejected by the database constraint
- [x] Viewing a photo generates a short-lived presigned GET URL after verifying the requester owns it; no permanent public URL is ever returned

### Blocked by

#8 Daily Log + weight logging, #4 User profile creation & completion gate
