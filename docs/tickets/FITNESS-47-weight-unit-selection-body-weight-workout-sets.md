---
id: FITNESS-47
title: "Weight unit selection (body weight + workout sets)"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: "Weight Unit Selection (kg/lbs)"
parent: FITNESS-46
created: 2026-08-25
updated: 2026-08-29
plane_id: d149d2cc-b6c9-4289-841f-bfe8ca93ce5b
---

# FITNESS-47: Weight unit selection (body weight + workout sets)

### Parent

FITNESS-46 — Spec: Weight Unit Selection (kg/lbs)

### What to build

Let a user pick kg or lbs when logging body weight or a workout set's weight, with a profile-level default that pre-fills new entries and a per-entry override.

### Acceptance criteria

- [x] A new `defaultWeightUnit` preference exists on the User entity (kg/lbs, default kg), editable through the existing profile Settings form
- [x] Logging today's body weight lets the user pick kg or lbs for that entry, pre-filled from the profile default
- [x] Logging a workout set's weight lets the user pick kg or lbs for that entry, pre-filled from the profile default
- [x] The unit selector remembers the last unit picked within the current session, so logging several entries back-to-back doesn't require reselecting every time
- [x] A logged entry's stored value is the raw number exactly as entered, tagged with its own unit — no conversion happens at write time
- [x] Viewing or re-editing a specific logged entry (body weight or a workout set) shows it in its own originally-entered unit, unconverted
- [x] Both weight inputs accept any decimal value (no native browser step-mismatch rejection) and reject an unrealistic value (roughly above 500kg/1100lbs, in whichever unit was selected) with a clear error, in addition to the existing lower bound
- [x] Existing logged rows are treated as kg, matching the app's prior behavior before this ticket

### Blocked by

None — can start immediately.
