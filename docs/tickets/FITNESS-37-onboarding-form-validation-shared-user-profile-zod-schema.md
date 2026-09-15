---
id: FITNESS-37
title: "Onboarding form validation + shared user-profile Zod schema"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: "Frontend Form Validation with Zod"
parent: FITNESS-35
created: 2026-08-16
updated: 2026-08-16
plane_id: 55ca0a6a-28bb-4b04-8354-9bf3f6bbfeca
---

# FITNESS-37: Onboarding form validation + shared user-profile Zod schema

### Parent

FITNESS-35 — Spec: Frontend Form Validation with Zod

### What to build

Create the shared userProfileSchema (Zod), replacing the hand-written UserProfileInput type. Wire the onboarding form to react-hook-form + zodResolver for real-time field validation, and completeOnboarding's Server Action to parse with the same schema before calling apiFetch.

### Acceptance criteria

- [x] The shared user-profile Zod schema exists, mirrors the backend's current class-validator rules (height bounds, enum values, date format), and UserProfileInput is replaced by its inferred type
- [x] The onboarding form shows an inline error next to the relevant field as soon as an invalid value is entered or left (real-time, not just on submit)
- [x] completeOnboarding's Server Action parses input with the schema before calling apiFetch, short-circuiting with field-level errors on failure
- [x] A valid onboarding submission still saves successfully and redirects as before

### Blocked by

None — can start immediately
