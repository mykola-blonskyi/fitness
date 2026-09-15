---
id: FITNESS-36
title: "Daily-log weight form validation (Zod + react-hook-form)"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: "Frontend Form Validation with Zod"
parent: FITNESS-35
created: 2026-08-16
updated: 2026-08-16
plane_id: f8741a7e-30df-442a-8a3b-cebe6928ddf1
---

# FITNESS-36: Daily-log weight form validation (Zod + react-hook-form)

### Parent

FITNESS-35 — Spec: Frontend Form Validation with Zod

### What to build

Real-time client-side validation and Server Action input parsing for the weight-logging form, replacing today's single generic error message with field-level errors.

### Acceptance criteria

- [x] Submitting an invalid weight (e.g. 0 or negative) shows an inline error next to the weight field before any network request is made
- [x] setWeight's Server Action parses input with the shared weight Zod schema before calling apiFetch, short-circuiting with a field-level error on failure
- [x] A valid weight submission still saves successfully with no behavior change from today
- [x] zod, react-hook-form, and @hookform/resolvers are added as frontend dependencies

### Blocked by

None — can start immediately
