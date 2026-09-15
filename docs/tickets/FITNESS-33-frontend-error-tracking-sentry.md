---
id: FITNESS-33
title: "Frontend error tracking (Sentry)"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: null
parent: null
created: 2026-08-16
updated: 2026-08-17
plane_id: 255c5d22-d66c-432b-876f-76b402c912ce
---

# FITNESS-33: Frontend error tracking (Sentry)

### What to build

Wire Sentry error tracking into the Next.js frontend, client- and server-side (see docs/decisions.md ADR-006, docs/architecture.md Observability). Requires a Sentry org/project and DSN to already exist — a manual signup step, not part of this ticket.

### Acceptance criteria

- [x] An unhandled client-side error is reported to Sentry
- [x] An unhandled server-side error (Server Action or Route Handler) is reported to Sentry
- [x] Reported events carry only the user's UUID as identifying context — no email, IP, or request/response body in breadcrumbs (verified after fixing a real leak a security review caught: withServerActionInstrumentation's formData option attaches to the transaction pipeline, which beforeSend never sees — fixed by not passing formData and adding beforeSendTransaction scrubbing, re-verified with a distinctively-marked real submission producing zero leakage)
- [x] Sentry reporting is active only in production, not during local development
- [x] Stack traces in Sentry resolve to real source locations via uploaded source maps, not minified bundle output — three real build-time bugs found and fixed (silent flag hid errors on Coolify, empty SENTRY_RELEASE crashed the upload, node:slim missing CA certs broke sentry-cli's HTTPS calls), each confirmed via a real build reproduction on the VPS with production credentials (\"Successfully uploaded source maps to Sentry\"). The `/releases/{version}/files/` API returning 0 was a false negative (wrong endpoint for the newer debug-id upload mechanism — confirmed by checking a manually-verified-successful release through the same endpoint and getting the same 0). Full ingestion pipeline re-verified end-to-end with a real distinctively-labeled exception landing in the fitness-front project under environment=production with the correct release.

### Blocked by

None — can start immediately
