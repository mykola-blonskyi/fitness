---
id: FITNESS-48
title: "Read-time weight-unit conversion (trend chart + calorie calculation)"
state: Done
state_group: completed
priority: medium
labels: [ready-for-agent]
module: "Weight Unit Selection (kg/lbs)"
parent: FITNESS-46
created: 2026-08-25
updated: 2026-08-29
plane_id: fad34b1b-74b4-491d-ba76-cd789a775e9a
---

# FITNESS-48: Read-time weight-unit conversion (trend chart + calorie calculation)

### Parent

FITNESS-46 — Spec: Weight Unit Selection (kg/lbs)

### What to build

Make the weight trend chart and the calorie/macro calculation correct regardless of which unit each underlying entry was logged in, via one shared conversion function.

### Acceptance criteria

- [x] A single pure weight-conversion function (kg↔lbs) is unit-tested directly and is the only conversion implementation in the codebase
- [x] The weight trend chart converts every plotted point to the profile's current default weight unit, so the chart's axis is always internally consistent even when underlying entries were logged in different units
- [x] The calorie/macro calculation converts the resolved current body weight to kg before computing, regardless of which unit that weigh-in was logged in or what the profile's default unit currently is
- [x] Neither conversion changes how an individual entry displays elsewhere in the app — conversion is scoped to these two read paths only

### Blocked by

#1 Weight unit selection (body weight + workout sets)
