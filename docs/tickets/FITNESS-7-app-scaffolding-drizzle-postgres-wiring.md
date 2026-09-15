---
id: FITNESS-7
title: "App scaffolding + Drizzle/Postgres wiring"
state: Done
state_group: completed
priority: urgent
labels: [ready-for-agent]
module: null
parent: null
created: 2026-08-15
updated: 2026-08-15
plane_id: b02ffc8a-a56a-4fb7-a110-4158f0e2e6a1
---

# FITNESS-7: App scaffolding + Drizzle/Postgres wiring

### What to build

Stand up the Next.js frontend and NestJS backend skeletons per the grooming note's frontend structure (app/, shared/, features/), wire NestJS to Drizzle against the shared Postgres instance, and get an empty migration running.

### Acceptance criteria

- [x] Next.js app and NestJS app both start locally with a single documented command
- [x] Drizzle is connected to the shared Postgres instance and an empty migration runs successfully
- [x] Repository follows the frontend structure defined in the grooming note (app/, shared/, features/)
- [x] A bare health-check route responds on both the Next.js and NestJS apps

### Blocked by

None — can start immediately
