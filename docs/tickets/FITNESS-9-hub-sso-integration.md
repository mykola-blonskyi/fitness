---
id: FITNESS-9
title: "Hub SSO integration"
state: Done
state_group: completed
priority: urgent
labels: [ready-for-agent]
module: "Auth & User Profile"
parent: FITNESS-1
created: 2026-08-15
updated: 2026-08-15
plane_id: 13655d27-21bc-4cc0-8b9d-92bbdb671ff3
---

# FITNESS-9: Hub SSO integration

### Parent

FITNESS-1 — Spec: Auth & User Profile

### What to build

Reuse the Hub's Auth.js cookie pattern (see docs/architecture.md Security, and the todolist project) so users sign in with their existing blonskyi.dev account.

### Acceptance criteria

- [x] An unauthenticated request to any app route redirects to the Hub's login
- [x] After logging in via the Hub, the user reaches an authenticated placeholder page
- [x] NestJS receives and trusts forwarded x-user-id/x-user-email headers on every request, without touching the auth cookie itself
- [x] The fitness project slug is registered and access-granted in the Hub's project_access table

### Blocked by

#1 App scaffolding + Drizzle/Postgres wiring
