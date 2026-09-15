---
id: FITNESS-42
title: "Admin moderation: Food Items"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: "Catalog Moderation & Virtualized Browsing"
parent: FITNESS-40
created: 2026-08-25
updated: 2026-08-28
plane_id: 4e341ed8-3eca-4c56-86be-13d924eb6568
---

# FITNESS-42: Admin moderation: Food Items

### Parent

FITNESS-40 — Spec: Catalog Moderation & Virtualized Browsing

### What to build

Extend the admin dashboard's Food tab to moderate unverified Food Items using the same actions and list machinery the previous ticket built for Exercises.

### Acceptance criteria

- [x] The admin page's Food tab lists unverified Food Items, cursor-paginated and virtualized, same as Exercises
- [x] Each row shows the Food Item's existing fields plus source and source id
- [x] An admin can approve, unapprove, and delete a Food Item, with the same in-use guard (blocked if referenced by a Diet Item) and confirm-before-delete behavior as Exercises

### Blocked by

#1 Admin foundation + Exercise moderation
