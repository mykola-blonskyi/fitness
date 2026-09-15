---
id: FITNESS-8
title: "CI/CD + deployment pipeline"
state: Done
state_group: completed
priority: high
labels: [ready-for-agent]
module: null
parent: null
created: 2026-08-15
updated: 2026-08-16
plane_id: 868d6747-6f98-41ec-9809-d13dc160c537
---

# FITNESS-8: CI/CD + deployment pipeline

### What to build

Wire the lint/test/migrate-then-deploy pipeline described in docs/architecture.md, deploying via Coolify/Docker Compose.

### Acceptance criteria

- [x] Pushing to a branch runs ESLint, Prettier, and the (currently empty) frontend/backend test suites
- [x] Pushing to main additionally runs drizzle migrate against the shared Postgres instance before deploy
- [x] A failed migration blocks the deploy and leaves the previous version running
- [x] The app is reachable at its Coolify-provisioned URL after a successful deploy

### Blocked by

#1 App scaffolding + Drizzle/Postgres wiring
