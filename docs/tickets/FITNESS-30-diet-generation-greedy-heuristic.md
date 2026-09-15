---
id: FITNESS-30
title: "Diet generation (greedy heuristic)"
state: Done
state_group: completed
priority: high
labels: [ready-for-agent]
module: "Diet Engine"
parent: FITNESS-5
created: 2026-08-15
updated: 2026-08-22
plane_id: 5ccd8348-fa73-4099-bd22-1266351fd043
---

# FITNESS-30: Diet generation (greedy heuristic)

### Parent

FITNESS-5 — Spec: Diet Engine

### What to build

Generate a full day's menu on demand using the greedy heuristic, respecting meal count and active preferences, with current-diet resolution by recency.

### Acceptance criteria

- [x] Generating a menu produces a Diet + Diet Items split across the user's configured meal count
- [x] Generated items exclude anything matching an active Food Preference at any of its granularities (category/subcategory/role/item)
- [x] The day's total calories/macros land within tolerance of the calculated target
- [x] Regenerating creates a new Diet row rather than editing the previous one; the most recently created Diet is what's shown as "today's menu"

### Blocked by

#20 Calorie/macro calculation, #23 Food & Diet Preferences, #8 Daily Log + weight logging
