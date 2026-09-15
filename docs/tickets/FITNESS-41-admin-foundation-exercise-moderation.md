---
id: FITNESS-41
title: "Admin foundation + Exercise moderation"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: "Catalog Moderation & Virtualized Browsing"
parent: FITNESS-40
created: 2026-08-25
updated: 2026-08-27
plane_id: 23011e19-b9b7-41aa-af7b-1469522f04e5
---

# FITNESS-41: Admin foundation + Exercise moderation

### Parent

FITNESS-40 — Spec: Catalog Moderation & Virtualized Browsing

### What to build

Let the site owner review, approve, unapprove, and delete unverified Exercises through a new admin-only page, and establish the shared cursor-paginated, virtualized list machinery the rest of this spec reuses.

### Acceptance criteria

- [x] A new `isAdmin` flag exists on the User entity; only an admin identity can reach the admin endpoints/page, others are rejected
- [x] An admin page lists unverified Exercises, cursor-paginated and rendered as a virtualized infinite-scroll list (not the full result set at once)
- [x] Each row shows the Exercise's existing fields plus source and source id
- [x] An admin can approve an Exercise (unverified → verified), removing it from the queue
- [x] An admin can unapprove a previously-approved Exercise, returning it to the queue
- [x] An admin can delete an Exercise not referenced by any Program Exercise; its own translations are removed with it
- [x] Deleting an Exercise referenced by a Program Exercise is rejected with a descriptive error, not a raw DB error
- [x] Delete requires an explicit confirm step before it fires
- [x] The admin page has a Food/Exercises tab switch (the Food tab may be a stub in this ticket) and is reachable via a header nav link, visible only to an admin identity
- [x] Approving, unapproving, or deleting an item while scrolling never skips or duplicates the next item in the queue

### Blocked by

None — can start immediately.
