---
id: FITNESS-14
title: "Daily Log + weight logging"
state: Done
state_group: completed
priority: high
labels: [ready-for-agent]
module: "Body-Weight Diary"
parent: FITNESS-3
created: 2026-08-15
updated: 2026-08-16
plane_id: 807105ba-72a4-4235-a0b9-3062abfa4f75
---

# FITNESS-14: Daily Log + weight logging

### Parent

FITNESS-3 — Spec: Body-Weight Diary

### What to build

Introduce the Daily Log entity (lazily created per user/date) and let users log/edit/delete today's weight.

### Acceptance criteria

- [x] Logging a weight for today creates a Daily Log row if none exists yet for that (user, date)
- [x] Editing today's weight updates the same row rather than creating a duplicate
- [x] Deleting a weight entry removes the value while leaving the Daily Log row available for other attachments
- [x] The database enforces at most one Daily Log per (user, date)

### Blocked by

#4 User profile creation & completion gate
