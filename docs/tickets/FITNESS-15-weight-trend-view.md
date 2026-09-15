---
id: FITNESS-15
title: "Weight trend view"
state: Done
state_group: completed
priority: low
labels: [ready-for-agent]
module: "Body-Weight Diary"
parent: FITNESS-3
created: 2026-08-15
updated: 2026-08-22
plane_id: 7e4b3c5e-28db-4ecb-8ff9-074c352945cb
---

# FITNESS-15: Weight trend view

### Parent

FITNESS-3 — Spec: Body-Weight Diary

### What to build

Show the user's weight over time as a trend chart with an honest gap for days with no weigh-in.

### Acceptance criteria

- [x] A chart shows weight over a selectable window (7/30/90 days)
- [x] Days with no weigh-in are shown as gaps, not interpolated
- [x] The most recent weigh-in date is visible on the dashboard

### Blocked by

#8 Daily Log + weight logging
