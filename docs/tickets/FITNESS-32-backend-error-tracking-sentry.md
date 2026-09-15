---
id: FITNESS-32
title: "Backend error tracking (Sentry)"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: null
parent: null
created: 2026-08-16
updated: 2026-08-16
plane_id: 7002dff8-df30-4e43-b883-feea98b8de29
---

# FITNESS-32: Backend error tracking (Sentry)

### What to build

Wire Sentry error tracking into the NestJS backend (see docs/decisions.md ADR-006, docs/architecture.md Observability). Requires a Sentry org/project and DSN to already exist — a manual signup step, not part of this ticket.

### Acceptance criteria

- [x] An unhandled exception or 5xx-class response is reported to Sentry with only the triggering user\'s UUID attached as identifying context — no email, IP, or request body
- [x] A deliberately-thrown 4xx HttpException (validation, 404, 401/403) is never reported to Sentry
- [x] Sentry reporting is active only when running in production, not during local development
- [x] Reported events are tagged with the deploying commit SHA as the Sentry release — confirmed in production: SENTRY_RELEASE=5f5c17ed7c3bd05856357be0ad41ff43b55faa7a matches the deployed commit exactly on both containers

### Blocked by

None — can start immediately
