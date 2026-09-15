---
id: FITNESS-13
title: "Offline write-queue + sync + indicator"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: "Internationalization & Offline PWA"
parent: FITNESS-6
created: 2026-08-15
updated: 2026-08-24
plane_id: e156cdd4-89d2-4ffc-bce7-3a6bee266b74
---

# FITNESS-13: Offline write-queue + sync + indicator

### Parent

FITNESS-6 — Spec: Internationalization & Offline PWA

### What to build

Build the generic IndexedDB write-queue mechanism (queue while offline, flush in order on reconnect) and an offline/syncing/synced indicator, reusable by any feature's write endpoint.

### Acceptance criteria

- [x] A write made while offline is queued in IndexedDB rather than failing
- [x] Queued writes flush to the API in submission order automatically once connectivity returns
- [x] A visible indicator distinguishes offline / syncing / synced states
- [x] The queue mechanism is generic enough to be reused by a future write endpoint, not hardcoded to one feature

### Blocked by

#6 PWA installability + offline read caching
