---
id: FITNESS-71
title: "Author and seed the curated staples set (~80-120 foods)"
state: In Progress
state_group: started
priority: high
labels: []
module: "Menu Composition (Archetypes & Food Families)"
parent: FITNESS-69
created: 2026-09-11
updated: 2026-09-12
plane_id: 52bd8c17-8c46-41f3-ace6-decc73e86258
---

# FITNESS-71: Author and seed the curated staples set (~80-120 foods)

The catalog cannot build the target plan: there is no plain dry rice or buckwheat in it, and the only rice is "Rice Porridge" (79 kcal, cooked). Author a staples set — the foods every generated plan is actually built from.

Chicken and turkey breast, lean beef, white and red fish, tuna, eggs, cottage cheese, greek yogurt, kefir, oats, buckwheat, rice, pasta, potato, salad vegetables, berries, fruit, olive oil, nuts. Macros in **dry/raw** weight (ADR-020), a Family each, names in all four locales.

Delivered as a reviewable file **before** seeding — the RU import shipped 57 mistranslated names into every locale at once because nobody read the list first.

**Acceptance criteria**

- [ ] Staples file committed (name, macros, family, en/uk/ru/es names) and reviewed before any seeding
- [x] Seed script imports it idempotently and marks the rows verified
- [ ] Seeded to dev and production
- [x] Every Meal Slot family named in ADR-020 has at least three staple members, so generation always has a choice

Part of ADR-020 phase 1 — see `plans/current.md`.

---

## Comments

### 2026-09-12

Merged as `48e810c` via [#95](https://github.com/mykola-blonskyi/fitness/pull/95). 120 staples seeded to dev; the generation pool went from 430 candidates to 526 and from 176 carrying a Family to 268. AC2 and AC4 are ticked. **AC1 and AC3 stay open**, so this ticket stays In Progress.

**AC1.** Nobody has read the file. A machine cross-check found four genuine macro errors and ten name errors an hour after the rows were written, so treat that as the rate a human read would still find. Start with `shrimp-raw` at 85 kcal / 0.5 g fat, where USDA SR Legacy says 106 / 1.73 and the Foundation entry says roughly what the file has. The Spanish column is coherently peninsular, which was a deliberate choice, but `muslo` for chicken thigh is the drumstick in peninsular butchery and `requesón` for cottage cheese is strictly a whey cheese. Carbs on three CIS grain rows sit 3-5% under USDA total carbohydrate, which is correct for that convention and documented in `business-rules.md`.

**AC3.** Production is not seeded. After a Coolify deploy: `node dist/scripts/seed-food-staples.js`. Not the pnpm script, the image has no ts-node. Production also still needs FITNESS-70's classification run, and that must come from a build at or newer than this commit, because an older one has no `curated_staples` branch in `resolveFamily` and would strip the Family off all 120 staples. Verified both ways against dev: old code reports 120 would change, current reports 0.

**Finding worth acting on.** 24 of the 120 staples are seeded and unreachable by generation: 8 `casein_dairy` (Role `dairy`), 10 `fruit` and 6 `berries` (Role `fruit`). `MEAL_ROLE_CHAINS` has no chain for either Role. Measured precisely: seeding 120 grew the pool by exactly 96. Keeping those Roles is what ADR-020 requires so "exclude dairy" and "exclude fruit" keep working, so this is not a misclassification. It does mean ADR-020's target plan is not yet buildable, since its breakfast is porridge plus fruit plus eggs and its dinner is a slow protein plus fruit. All 24 come into play in Phase 2 when an Archetype's Slots draw by Family instead of by Role.

Also fixed here: ten staples shared an exact English name with an RU-import twin in the same Family, which would have let one day hold both copies since the no-repeat rule matches on item id. The RU twins are overridden out of the pool.
