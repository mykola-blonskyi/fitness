---
id: FITNESS-61
title: "Diet becomes a user-scoped record valid until regenerated"
state: Done
state_group: completed
priority: none
labels: [ready-for-agent]
module: "Diet Validity Spans a Period Until Regenerated"
parent: FITNESS-58
created: 2026-09-03
updated: 2026-09-03
plane_id: 84cd830b-f1dd-4e29-a14e-31368544b33d
---

# FITNESS-61: Diet becomes a user-scoped record valid until regenerated

### Parent

FITNESS-58

### What to build

Diet generation and lookup stop being scoped to a specific day. A diet becomes a record owned directly by the user, with generation timestamp used to determine recency; the generate and current-diet endpoints drop their date parameter entirely. "Current diet" means the most recently generated one, regardless of how long ago it was created.

### Acceptance criteria

- [x] A diet record is linked directly to its user; it no longer requires a link to a specific day's Daily Log
- [x] The generate-diet endpoint no longer takes a date parameter
- [x] The current-diet endpoint no longer takes a date parameter and returns the most recently generated diet for the user, regardless of when it was generated
- [x] Generating a new diet immediately supersedes whatever was previously current
- [x] Requesting the current diet when none has ever been generated for that user returns a clear not-found response
- [x] Reroll and Swap actions on individual food items continue to work unchanged
- [x] No migration of existing diet-related rows is performed (test data only)

### Blocked by

None (can start immediately)
