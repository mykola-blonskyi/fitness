---
id: FITNESS-73
title: "Picking rules: no repeated item per day, max two meals per protein family"
state: Done
state_group: completed
priority: high
labels: []
module: "Menu Composition (Archetypes & Food Families)"
parent: FITNESS-69
created: 2026-09-11
updated: 2026-09-12
plane_id: 7133ad28-4ff5-49a3-8d9d-f01113763799
---

# FITNESS-73: Picking rules: no repeated item per day, max two meals per protein family

Each meal currently picks independently, so the same food routinely lands in three of four meals (a real plan had cod in three). Item-level no-repeat alone is not enough either — chicken breast, chicken thigh and turkey is still a poultry day.

No Food Item twice in a day, falling back to a repeat only when the family genuinely has nothing else eligible (heavy exclusions must never fail generation). At most two meals per day drawing from the same protein family.

**Acceptance criteria**

- [x] No Food Item appears twice in one generated Diet when an alternative exists in its family
- [x] At most two meals draw from the same protein family
- [x] Generation still succeeds when exclusions leave a single eligible candidate for a role
- [x] Both rules covered by tests in `greedy-heuristic.spec.ts`

Part of ADR-020 phase 1 — see `plans/current.md`.

---

## Comments

### 2026-09-12

Merged as `c4faaca` via [#94](https://github.com/mykola-blonskyi/fitness/pull/94). All four ACs met.

Verified with the committed harness ([#93](https://github.com/mykola-blonskyi/fitness/pull/93)) rather than a one-off probe, across two target profiles and both candidate pools, 300 seeded menus per meal count. Days repeating a Food Item went from 45/69/126/169 (whole catalog, meals 3-6) and 262/300/300/300 (Family-carrying pool) to **zero everywhere**. Worst repeat count 3-6 to 1. Days over the protein-family cap 17-297 to zero, worst 3-6 to 2. Nothing failed to generate on any pool, which is AC3 on real data.

The trade is real and recorded in the PR: on the Family-carrying pool, mean absolute protein miss roughly doubles (0.7-2.7 g to 1.7-4.5 g) and fat roughly doubles to triples (0.6-1.4 g to 1.7-3.2 g), because the filter forces the generator off its best-fitting candidate. Worth it, but not free. FITNESS-74 should recover part of the carb figure.

Two things deliberately left alone, each worth its own decision if you disagree. The Role chain does not advance when the day filter empties a Role, so with one lean and one fatty protein available meal 2 repeats the lean one via the last fallback tier rather than moving down the chain; per ADR-011 the chain is a Food Preference fallback, not a variety mechanism. And `recordPick` runs before the fit, so an item later rounded below 1 g still occupies the day; that over-restricts and never under-restricts.
