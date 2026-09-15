---
id: FITNESS-58
title: "Spec: Diet Validity Spans a Period Until Regenerated"
state: Done
state_group: completed
priority: none
labels: [spec, ready-for-agent]
module: "Diet Validity Spans a Period Until Regenerated"
parent: null
created: 2026-09-03
updated: 2026-09-03
plane_id: 8ba6eb63-3dc4-410c-9c3b-0de3b2859e60
---

# FITNESS-58: Spec: Diet Validity Spans a Period Until Regenerated

### Problem Statement

Diets currently expire the moment the calendar rolls to a new day that doesn't have its own generated diet row — viewing a diet plan tomorrow throws "No Diet generated for this date yet" unless the user regenerates every single day. In practice, people don't change their diet plan daily; a diet plan is meant to be followed for a stretch of time (a week, sometimes a month) until it visibly affects their body (fat loss/muscle gain), at which point they decide to regenerate. The current one-diet-per-day data model doesn't match this real usage pattern at all.

### Solution

A generated diet stays "current" indefinitely — across however many real-world days — until the user explicitly generates a new one. Diets stop being scoped to a single day's Daily Log and become a user-level record with its own generation timestamp; looking up "my current diet" returns the most recently generated one, regardless of how long ago that was, rather than requiring an exact match for today's date.

### User Stories

1. As a user, I want my generated diet to remain visible and usable every day until I decide to regenerate it, so that I don't have to regenerate daily just to keep seeing my plan.
2. As a user, I want to view my diet on any day after generating it and see the exact same plan I generated, so that I can follow a consistent multi-day/multi-week plan.
3. As a user, I want no automatic expiration of my diet based on time or a new weigh-in, so that I stay in full control of when my plan changes.
4. As a user, I want to explicitly trigger a new diet generation whenever I decide it's time for a change, so that regeneration remains a deliberate action, not something sprung on me.
5. As a developer, I want "get my current diet" to mean "the most recently generated diet for this user, whenever it was created" rather than "the diet generated for this exact date," so that the lookup matches how diets are actually used.
6. As a developer, I want a diet to be a user-scoped record rather than a record scoped to one specific day's Daily Log, so that its lifetime isn't artificially bound to a single day.
7. As a developer, I want the diet-generation endpoint to no longer require a date parameter, since generating a diet is no longer a per-day action.
8. As a QA/developer, I want a request for the current diet before any diet has ever been generated to still return a clear "not found" response, so that the change in scoping doesn't paper over a genuinely missing diet.
9. As a developer, I want this change to not require migrating existing diet-related rows, given only test data exists for this feature today.

10. As a user, I want my Reroll/Swap actions on individual food items to continue working exactly as they do today, since this change only affects how a diet's lifetime is scoped, not its internal content-editing actions.

11. As a developer, I want the "which day's data (e.g. weigh-in) this diet's calorie/macro calc was based on" provenance to remain determinable after this change, even though the diet is no longer tied to a specific Daily Log row.

### Implementation Decisions

- The core lookup this affects is finding "the current diet for a user" — this shifts from an exact-date match against a specific day's Daily Log to "the most recently generated diet record for this user," with no date parameter involved in the lookup at all.
- A diet record becomes tied directly to the user rather than to a specific Daily Log row; it gains its own generation timestamp, which is what "most recent" is computed from.
- Diet generation is no longer a per-date action — the generation entry point drops its date parameter; a newly generated diet immediately becomes "the current diet," superseding whatever was current before.
- No automatic invalidation: a new weigh-in, a profile change, or the passage of time never forces regeneration or invalidates the current diet. Regeneration is always a deliberate, explicit user action.
- The diet's calculation snapshot (calorie/macro targets and the data used to compute them, e.g. weight at time of generation) continues to be captured in the diet's own stored calculation data, independent of any Daily Log link — provenance is preserved without requiring the Daily Log relationship.
- Existing diet-related rows are not migrated; only test data exists today.
- This change is a prerequisite for a separate meal-reordering spec: reordering only makes sense against a diet that persists as one stable record across its active period, rather than one that's re-created daily.

### Testing Decisions

- Good tests here assert on the externally observable "current diet" contract: given a user who generated a diet several (simulated) days ago and never regenerated, requesting "current" today returns that same diet; given a user who has since generated a newer one, requesting "current" returns the newer one; given a user who never generated one, requesting "current" returns a clear not-found result.
- **Primary seam**

  : the diet service's generate/current-lookup entry points — this is the one place the day-scoping assumption lives today, and there is no existing spec file for this service, so this spec introduces the first one. Tests should cover: generate-then-fetch-current on the same day, fetch-current many days later without regenerating, fetch-current after a second generation supersedes the first, and fetch-current with no diet ever generated.

- No frontend seam changes are needed for this spec specifically — the Diet page already calls a "get current diet" endpoint; this spec only changes what that endpoint's lookup logic considers "current," not the page's own rendering.

### Out of Scope

- Automatic diet expiration or regeneration prompts based on weight change, time elapsed, or profile edits — explicitly deferred as a separate, future feature.
- Meal reordering — covered in its own spec, which depends on this one.
- The kcal/macro-scaling correction bug — an unrelated, independent fix tracked in its own spec.
- Migrating existing diet data — not needed, test data only.

### Further Notes

This spec is a direct prerequisite for a separate "meal reordering" spec, which relies on a diet being one persistent record across its active period rather than a fresh one per day.
