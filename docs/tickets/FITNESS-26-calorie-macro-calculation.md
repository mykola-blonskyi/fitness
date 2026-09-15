---
id: FITNESS-26
title: "Calorie/macro calculation"
state: Done
state_group: completed
priority: high
labels: [ready-for-agent]
module: "Diet Engine"
parent: FITNESS-5
created: 2026-08-15
updated: 2026-08-20
plane_id: 46fdb32e-6768-43f5-ba38-04c436084bfb
---

# FITNESS-26: Calorie/macro calculation

### Parent

FITNESS-5 — Spec: Diet Engine

### What to build

Compute calorie/macro targets from profile + most recent weigh-in via a versioned algorithm registry.

### Acceptance criteria

- [x] Calorie and macro (protein/carbs/fat) targets are computed from the user's profile and most recent weigh-in using the mifflin_v1 algorithm
- [x] The calculation is implemented as versioned code registered under its algorithm code, not a runtime-evaluated formula string
- [x] The computed targets are displayed to the user with a clear breakdown

### Blocked by

#4 User profile creation & completion gate, #8 Daily Log + weight logging

### Implementation notes

mifflin_v1 formula (BMR, activity multiplier, goal adjustment, safety floor, macro split) documented in docs/decisions.md ADR-010. diet_calculation_algorithms seeded via a data migration, not a manual seed script, since the feature can't function without that one row. No diets/diet_items tables added - out of scope, owned by FITNESS-30.
