---
id: FITNESS-12
title: "PWA installability + offline read caching"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: "Internationalization & Offline PWA"
parent: FITNESS-6
created: 2026-08-15
updated: 2026-08-22
plane_id: 0d7d491d-5bb5-49cc-9007-1ec913d2457b
---

# FITNESS-12: PWA installability + offline read caching

### Parent

FITNESS-6 — Spec: Internationalization & Offline PWA

### What to build

Add a web app manifest and service worker so the app is installable and at least one authenticated view survives going offline.

### Acceptance criteria

- [x] The app is installable to a device home screen (manifest + service worker registered)
- [x] At least one authenticated route remains viewable after going offline and reloading, served from cache
- [x] Lighthouse PWA-installability checks pass in CI

### Blocked by

#4 User profile creation & completion gate
