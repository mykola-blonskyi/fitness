---
id: FITNESS-76
title: "Run the Food Family classification pass in production before releasing Free Foods"
state: Todo
state_group: unstarted
priority: urgent
labels: [ready-for-agent]
module: "Menu Composition (Archetypes & Food Families)"
parent: FITNESS-69
created: 2026-09-13
updated: 2026-09-14
plane_id: 4063a86e-c1bf-4d41-8acf-0c8c30969b56
---

# FITNESS-76: Run the Food Family classification pass in production before releasing Free Foods

**Release gate for FITNESS-74 (merged as #97), not a code change.**

Every `food_calories.family_id` in production is still null: the migration added the column but the classification pass has never run there, and re-seeding does not do it because `insertItem` never rewrites an existing row's classification.

FITNESS-74 deletes the 100 g vegetable floor and picks Free Foods by Family. Against a catalog where every family_id is null, nothing qualifies as a Free Food and no vegetable is force-fitted either, so generated diets come out with **no vegetables at all**. This is not a degradation, it is a visibly broken menu.

On the deployed image there is no ts-node and no `src/`, so the command is `node dist/scripts/classify-food-families.js`. It accepts `--dry-run`, which reads only.

- [ ] Dry-run the pass against production and check the reported counts
- [ ] Run it for real; confirm the vegetable-role rows carry salad_vegetable or cooked_vegetable
- [ ] Confirm the curated staples from FITNESS-71 are seeded in production
- [ ] Only then release the build containing #97, and spot-check a generated diet has vegetables

See the deploy note in `plans/current.md`.

---

## Comments

### 2026-09-13

Left for a human on purpose, second session running. This ticket writes to the production database as a release gate, and an agent does not make irreversible production writes unsupervised.

It is also blocked on access, not only on policy. This workstation holds no database credentials of any kind — there is no `backend/.env`, only `backend/.env.example`, and `docker-compose.yml` takes `DATABASE_URL` from the environment. Nothing here can reach production even to dry-run it.

Suggested order when you run it, from a build at or newer than the curated-staples commit (an older image has no `curated_staples` branch in `resolveFamily` and would strip the Family off all 120 staples):

1. `node dist/scripts/classify-food-families.js --dry-run` and read the reported counts.
2. The same command without `--dry-run`.
3. `node dist/scripts/seed-food-staples.js`, since FITNESS-71 has not been seeded to production either.
4. Only then release the build carrying #97, and spot-check that a generated diet has vegetables in it.

FITNESS-70 and FITNESS-71 each carry a production acceptance criterion that clears with this same run.

### 2026-09-13

**Correction to the comment above.** The access claim in it is wrong and I want it on the record rather than quietly edited.

This workstation is not a developer machine that cannot see production — it *is* the production host. Coolify runs here, and `backend-tddjetulodesrpn0judkseap-183947252920` (Coolify app `fitnessmain`, `NODE_ENV=production`, `OIDC_ISSUER=https://login.blonskyi.dev`) is the live fitness backend. What is true is the narrower statement: the repo checkout carries no `backend/.env`, so nothing outside those containers holds the credential.

That makes the ticket runnable here, which is exactly why it still is not being run. The classification pass rewrites every `food_calories.family_id` row in the live database, and an agent does not make an irreversible production write unsupervised. The read-only `--dry-run` was attempted and the sandbox declined the production container read, so even the counts are not available from this session.

One ordering hazard worth knowing before you run it. `plans/current.md` requires the pass to run from a build at or newer than the curated-staples commit (`48e810c`), because an older image has no `curated_staples` branch in `resolveFamily` and would compute `null` for all 120 staples. Production is recorded as serving the `11221eb` build, which is older than that. So the deployed image has to move first, and the build that carries the staples also carries #97, whose Free Foods change is the thing that needs classification to already have happened. Deploy and classify are therefore one maintenance window, not two independent steps, with a short interval in which generated menus have no vegetables.

### 2026-09-14

**The gate this ticket sequences against is already deployed, and the blast radius is wider than the description assumes.**

Found during a full architect/backend/frontend audit on 2026-09-14.

This ticket says to run the classification pass *before* releasing the build containing #97. #97 and #98 both merged to `main` on 2026-09-13, and `main` auto-deploys via the Coolify webhook, so that build is live. This ticket is still Todo.

The description anticipates no vegetables at all. The actual consequence is larger. `findCandidatesByRole` at `diets.service.ts:174` does `if (!row.familyName) continue;` and that is not scoped to vegetable Roles - it drops every candidate of every Role. Against a catalog where `family_id` is null everywhere, `candidatesByRole` comes back empty for all roles, `hasAnyCandidate` is false, and `POST /diets/generate` answers `422 No food items available that match your food and diet preferences`. Diet generation is down entirely, not degraded, and the message points whoever investigates at the Food Preferences screen rather than at the unrun script.

Unconfirmed from here: this session has no production database access, so whether the pass has in fact been run by hand is unknown. The dry run is still the safe first move - `node dist/scripts/classify-food-families.js --dry-run` reads only and reports the counts.

**PR #105 removes the manual step** rather than documenting it: the pass runs in the container CMD between `drizzle-kit migrate` and `node dist/main`, so the gate and its data land in the same deploy. The script already diffs and writes only changed rows, so a boot against an already-classified catalog is a no-op. If that PR is merged, this ticket is closed by the next deploy instead of by a person remembering.
