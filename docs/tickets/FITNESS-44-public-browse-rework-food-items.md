---
id: FITNESS-44
title: "Public browse rework: Food Items"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: "Catalog Moderation & Virtualized Browsing"
parent: FITNESS-40
created: 2026-08-25
updated: 2026-08-28
plane_id: a0b7ab07-77ab-4333-963f-50fe45d8a1d4
---

# FITNESS-44: Public browse rework: Food Items

### Parent

FITNESS-40 — Spec: Catalog Moderation & Virtualized Browsing

### What to build

Rework the public Food Item catalog browse page the same way the previous ticket did for Exercises.

### Acceptance criteria

- [x] The public Food Item browse page only ever shows verified Food Items
- [x] The list is cursor-paginated and rendered as a virtualized infinite-scroll list
- [x] The verified indicator/badge is removed from the row display
- [x] Creating a custom Food Item through the existing manual-creation flow sets it verified immediately

### Blocked by

#1 Admin foundation + Exercise moderation
