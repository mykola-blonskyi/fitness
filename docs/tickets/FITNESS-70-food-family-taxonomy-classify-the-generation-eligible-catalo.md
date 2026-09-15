---
id: FITNESS-70
title: "Food Family taxonomy + classify the generation-eligible catalog"
state: In Progress
state_group: started
priority: urgent
labels: []
module: "Menu Composition (Archetypes & Food Families)"
parent: FITNESS-69
created: 2026-09-11
updated: 2026-09-12
plane_id: 379cabaf-2c2a-46a2-b90a-651b8829b778
---

# FITNESS-70: Food Family taxonomy + classify the generation-eligible catalog

Add the Food Family level below Subcategory (ADR-020) and classify every food that should be able to appear in a generated plan. This gates every other phase-1 ticket.

~20 families: proteins `poultry, red_meat, white_fish, red_fish, seafood, eggs, casein_dairy, legume_protein`; carbs `porridge, grain_garnish, starchy_vegetable, bread`; vegetables `salad_vegetable, cooked_vegetable`; fruit `berries, fruit`; fats `culinary_oil, nuts_seeds, fatty_fruit`.

Classification is rule-based inference in the seed scripts (name + subcategory + macros) plus a reviewed override file, exactly the pattern `food-table-ru.names.json` already uses. ~570 rows are in scope; anything the rules cannot place is left without a Family on purpose.

**Acceptance criteria**

- [ ] `food_families` table + nullable `food_calories.family_id`, migration applied to dev and production
- [x] Family inference implemented in both seed scripts, with a reviewed `food-families.json` override file taking precedence
- [x] Tests assert every override key matches a real catalog row, and that no family name outside the fixed list is ever written
- [x] Classification report: how many rows got a family, how many did not, grouped by role
- [x] The 10-item RU `porridge` section lands in the `porridge` family rather than staying flattened into `complex_carb`

Part of ADR-020 phase 1 — see `plans/current.md`.

---

## Comments

### 2026-09-11

PR open: [mykola-blonskyi/fitness#90](https://github.com/mykola-blonskyi/fitness/pull/90). Migration applied to dev; production applies on its next Coolify deploy.

### 2026-09-11

Merged to `main` as `cc2ef91` via [#90](https://github.com/mykola-blonskyi/fitness/pull/90). ACs 2-5 are checked off.

**AC1 stays open.** The dev half is done; the production half needs two operator steps, in this order:

1. Trigger a release in Coolify. Actions billing means

  `main`

  does not auto-deploy, and the container self-migrates on boot, which applies

  `0025`

  .

2. Run

  `pnpm --filter backend db:classify:food-families`

  against the production database. The migration only adds a nullable

  `family_id`

  ; every existing row stays unclassified until that runs, and re-seeding does not do it, because

  `insertItem`

  never rewrites an existing row's classification.

Step 2 must happen before FITNESS-72 restricts generation to Family-carrying foods, or generation would find an empty pool. Ticket stays In Progress until both are done.

### 2026-09-12

**Correction to the production steps above.** Step 2 named a command the deployed image cannot run. The image is built with `pnpm deploy --prod`, so it carries no `ts-node` and no `src/`, and `pnpm --filter backend db:classify:food-families` will fail there.

Corrected steps, in order, after the Coolify release:

1. `node dist/scripts/classify-food-families.js --dry-run`

  on the server to check what it would do. It reads only.

2. `node dist/scripts/classify-food-families.js`

  to apply.

Running it from a laptop against the production database with `DATABASE_URL` pointed at prod also works, if reaching the container is awkward.

Found by an independent verification pass, along with a real defect: `--dry-run` was not read-only, because the taxonomy upsert ran before the dry-run guard. Both fixed in [#91](https://github.com/mykola-blonskyi/fitness/pull/91), which also corrects the classification from 238 to 242 rows.

### 2026-09-12

[#91](https://github.com/mykola-blonskyi/fitness/pull/91) merged as `5c64cdb`. `main` now carries the corrected pass: `--dry-run` reads only, writes run in a transaction, a stale override key blocks the pass instead of being reported after it wrote, and rows with no import source get no Family. Dev sits at 242 of 631 classified.

AC1 still open, and it is the only thing left on this ticket. Both remaining steps are operator actions on production, in order: a Coolify release so the container self-migrates `0025`, then `node dist/scripts/classify-food-families.js` on the server (not the pnpm script - the image has no ts-node). Breakdown and the families still too thin for FITNESS-72 are in `reports/audits/2026-09-12-food-family-classification.md`.

### 2026-09-12

[#92](https://github.com/mykola-blonskyi/fitness/pull/92) merged as `ce30a43`. That closes out the review round on this ticket: `main` is at `ce30a43`, dev sits at 242 of 631 classified, and the pass is verified idempotent with a read-only `--dry-run`.

**AC1 is the only thing left.** Two operator actions on production, in order:

1. Trigger a Coolify release. Actions billing means

  `main`

  does not auto-deploy; the container self-migrates on boot, which applies

  `0025`

  .

2. Run

  `node dist/scripts/classify-food-families.js`

  on the server (

  `--dry-run`

  first if you want the plan). Not the pnpm script - the image has no ts-node.

Note for step 2: a stale entry in `food-families.json` no longer blocks the pass, it only warns and exits non-zero. Production may legitimately hold different USDA rows than dev, since the seed scripts query live APIs at different times, so expect that warning and ignore it.

Step 2 must land before FITNESS-72 restricts generation to Family-carrying foods. `reports/audits/2026-09-12-food-family-classification.md` has the breakdown and names the families still too thin for that ticket, which is FITNESS-71's target list.
