---
id: FITNESS-38
title: "Settings/profile form validation (reuses onboarding's schema)"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: "Frontend Form Validation with Zod"
parent: FITNESS-35
created: 2026-08-16
updated: 2026-08-16
plane_id: a5f12354-3ded-4109-8e6a-15878dc5f4f1
---

# FITNESS-38: Settings/profile form validation (reuses onboarding's schema)

### Parent

FITNESS-35 — Spec: Frontend Form Validation with Zod

### What to build

Apply the same react-hook-form + shared user-profile schema pattern to the settings/profile edit form and its updateProfile Server Action.

### Acceptance criteria

- [x] The settings form reuses the exact same shared user-profile schema created for onboarding, not a redefinition
- [x] The settings form shows inline field-level errors in real time, matching onboarding's behavior
- [x] updateProfile's Server Action parses input with the schema before calling apiFetch, short-circuiting with field-level errors on failure
- [x] A valid settings update still saves successfully with no behavior change from today

### Blocked by

#B (Onboarding form validation) — reuses the shared schema it creates
