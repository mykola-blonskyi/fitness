---
id: FITNESS-68
title: "Food Item names ignore the user’s language setting"
state: Done
state_group: completed
priority: high
labels: []
module: null
parent: null
created: 2026-09-06
updated: 2026-09-06
plane_id: e64fc0a4-f8ac-4e81-8ae0-d5d3498ff743
---

# FITNESS-68: Food Item names ignore the user’s language setting

Setting **Language** in Settings → Profile had no effect on any food name anywhere in the app.

The catalog data was never the problem: all 297 seeded food items already have `uk`/`ru`/`es` rows in `food_calorie_translations`, and `users.locale` was already correct. Four read paths simply did not join them — `FoodItemsService.list()` resolved its locale from a client-supplied query param (the next-intl route segment) rather than `users.locale`; `DietsService.buildResponse()` and `FoodPreferencesService.fetchTargetNames()` had no translation join at all; and the Settings → Preferences picker called `/food-items` with no `locale` param, taking the `en` default.

`knowledge/business-rules.md` already described the correct rule and flagged Food Item as “a known inconsistency, not yet fixed”. This closes that, folds `ExercisesService`’s private locale lookup into one shared `resolveUserLocale()`, and fixes the two adjacent gaps the first PR deliberately left out of scope.

**Acceptance criteria**

- [x] Food Item display names resolve from `users.locale`, read server-side — never a `locale` value the client passes in.
- [x] Diet menu items and Food Preference targets resolve their Food Item names the same way.
- [x] The Settings → Preferences food picker is localized (it sent no locale at all, so it always got `en`).
- [x] Food Item name search matches the translated name as well as the base English name.
- [x] The top-bar language switcher and Settings → Profile’s Language field both write `users.locale` and both move the route segment, so they cannot diverge.
- [x] Food taxonomy names — category, subcategory, role — are localized in all four locales instead of rendering their raw seeded keys.

---

## Comments

### 2026-09-06

Shipped in two PRs:

- [#79](https://github.com/mykola-blonskyi/fitness/pull/79) — merged: all four read paths resolve through one `resolveUserLocale(db, userId)`; `GET /food-items` drops its `locale` query param for `@CurrentUser()`; name search also matches the translated name.
- [#80](https://github.com/mykola-blonskyi/fitness/pull/80) — open: both language controls write `users.locale` and move the route together; food taxonomy labels get `FoodCategories`/`FoodSubcategories`/`FoodRoles` message namespaces.

Verified end to end against a scratch database (the dev database cannot be migrated — its schema has drifted and `0020_diet_user_scoped` fails on an already-dropped FK). The same diet rows render uk/en/es purely by flipping `users.locale`.

### 2026-09-06

Both PRs merged into `main`: [#79](https://github.com/mykola-blonskyi/fitness/pull/79) as `f9be4be`, [#80](https://github.com/mykola-blonskyi/fitness/pull/80) as `727e11b`. All six acceptance criteria satisfied.
