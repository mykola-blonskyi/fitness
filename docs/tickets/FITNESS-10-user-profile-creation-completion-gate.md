---
id: FITNESS-10
title: "User profile creation & completion gate"
state: Done
state_group: completed
priority: urgent
labels: [ready-for-agent]
module: "Auth & User Profile"
parent: FITNESS-1
created: 2026-08-15
updated: 2026-08-15
plane_id: b1e3db76-9ee9-476b-a87e-aca3469ce73d
---

# FITNESS-10: User profile creation & completion gate

### Parent

FITNESS-1 — Spec: Auth & User Profile

### What to build

Gate every feature route behind a completed profile, and let users create/edit it.

### Acceptance criteria

- [x] A newly authenticated user with no profile is redirected to a profile-completion form before reaching any other route
- [x] Submitting name, gender, date of birth, height, goal, and activity level creates the profile and unblocks the app
- [x] Age displayed anywhere in the app is derived from date_of_birth, never stored directly
- [x] An existing profile can be viewed and edited from a settings screen
- [x] A request to view or edit another user's profile is rejected

### Blocked by

#3 Hub SSO integration
