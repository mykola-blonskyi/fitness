---
id: FITNESS-43
title: "Public browse rework: Exercises"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: "Catalog Moderation & Virtualized Browsing"
parent: FITNESS-40
created: 2026-08-25
updated: 2026-08-29
plane_id: f9d88e44-5af0-4f81-b289-2cbcd57e60d4
---

# FITNESS-43: Public browse rework: Exercises

### Parent

FITNESS-40 — Spec: Catalog Moderation & Virtualized Browsing

### What to build

Rework the public Exercise catalog browse page to show only verified Exercises, using the cursor-paginated virtualized list machinery from the admin foundation ticket, and make manually-created Exercises appear immediately by defaulting them to verified.

### Acceptance criteria

- [x] The public Exercise browse page only ever shows verified Exercises
- [x] The list is cursor-paginated and rendered as a virtualized infinite-scroll list, not the full result set at once
- [x] The verified indicator/badge is removed from the row display (redundant once the list is verified-only)
- [x] Creating a custom Exercise through the existing manual-creation flow sets it verified immediately, so it appears in the browse list right away

### Blocked by

#1 Admin foundation + Exercise moderation
