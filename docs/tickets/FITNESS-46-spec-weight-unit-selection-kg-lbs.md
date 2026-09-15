---
id: FITNESS-46
title: "Spec: Weight Unit Selection (kg/lbs)"
state: Done
state_group: completed
priority: none
labels: [spec, ready-for-agent]
module: "Weight Unit Selection (kg/lbs)"
parent: null
created: 2026-08-25
updated: 2026-08-30
plane_id: c397a7b1-e851-48d6-9a97-b94191c9ae71
---

# FITNESS-46: Spec: Weight Unit Selection (kg/lbs)

### Problem Statement

A user logging body weight or a workout set's weight can only enter kg — there's no way to enter or view values in pounds, even though many gyms have equipment marked in lbs and some users think in lbs by habit.

### Solution

Let a user pick kg or lbs for each individual weight entry (body weight or a workout set), defaulting to a stored profile preference that pre-fills the choice. Stored values keep the exact unit and number as entered; anywhere the app needs to compare or combine values across entries (the weight trend chart's single axis, the calorie/macro calculation) converts at read time using one shared conversion function.

### User Stories

1. As a user logging today's body weight, I want to enter it in kg or lbs, so that I can use whatever unit I think in.
2. As a user logging a workout set's weight, I want to enter it in kg or lbs, so that I can match the units marked on my gym's equipment.
3. As a user who trains at a gym with lb-marked plates but weighs myself on a kg scale, I want each entry to remember its own unit, so that I don't have to convert numbers in my head before typing them.
4. As a user, I want the weight-entry unit selector to default to whatever I used last, so that logging repeated sets in the same session doesn't make me reselect the unit every time.
5. As a user, I want a profile-level default weight unit setting, so that new entries start pre-filled with the unit I actually use, without relying on browser/session memory alone.
6. As a user, I want the same default unit setting to apply to both body-weight and workout-set entries, so that I only have to configure my unit preference once.
7. As a user, I want to still be able to override the default unit on any single entry, so that an occasional different-unit gym or scale doesn't require changing my whole profile setting.
8. As a user viewing my weight trend chart, I want all my weigh-ins shown on one consistent axis regardless of what unit each was logged in, so that the trend line is meaningful.
9. As a user, I want my weight trend chart's axis unit to reflect my current default unit preference, so that the numbers I see match what I expect to see.

10. As a user, I want my calorie/macro targets to stay correct regardless of which unit I logged my weight in, so that switching units for convenience never silently breaks my nutrition targets.

11. As a user re-opening or viewing a previously logged weight entry, I want to see it in the unit I originally entered it in, so that the number matches what I actually typed and reflects what my scale/gym used.

12. As a user, I want an obviously wrong weight value (e.g. a typo like 423432) to be rejected with a clear error regardless of which unit I'm entering in, so that garbage data never gets silently accepted.

13. As a user entering a decimal weight value, I want the input to accept any reasonable number of decimal places, so that I'm not blocked by an arbitrary precision restriction unrelated to my actual data.

14. As a developer maintaining this codebase, I want weight-unit conversion logic centralized in one tested function, so that the chart and the calorie calculation can't drift into inconsistent conversion math.

### Implementation Decisions

- New `weightUnit` enum column (`'kg'`/`'lbs'`) added to both `daily_logs` and `workout_sets` tables, alongside the existing `weight` numeric column. Existing rows backfill as `'kg'`, matching the app's prior hardcoded assumption.
- The stored `weight` number is always the raw value exactly as entered by the user — no conversion happens at write time. A 225 lbs entry stores `225`, tagged `weightUnit: 'lbs'`.
- New `defaultWeightUnit` column on the User entity (enum `'kg'`/`'lbs'`, default `'kg'`), same profile-setting pattern as the existing `locale`/`mealCount` fields — editable through the existing profile-update endpoint/Settings form. One shared default across both body-weight and workout-set contexts, not two separate preferences.
- `defaultWeightUnit` is used only to pre-fill the unit selector's initial value on a new entry form; it never forces or overrides what a specific entry is stored as, and it never retroactively changes how already-logged entries display.
- The weight-entry unit selector also remembers the last unit picked within the current session/form (so logging several sets back-to-back doesn't require reselecting every time), seeded initially from `defaultWeightUnit`.
- A single pure `convertWeight(value, fromUnit, toUnit)` function is the one shared conversion implementation, used by exactly two read-time consumers:
  - The weight trend chart converts every plotted point to the profile's current `defaultWeightUnit`, for that one chart's consistent axis only — doesn't change how an individual entry displays elsewhere.
  - The Mifflin-St Jeor calorie/macro calculation converts the resolved current body weight to kg before applying the formula, regardless of what unit it was entered in or what the profile default is — this is a fixed correctness requirement of the formula's constants (ADR-010), not a user-facing choice.
- Anywhere a specific logged entry is displayed or re-edited directly (workout set history, a single daily-log row), it shows in its own originally-entered unit, unconverted.
- New upper sanity-bound validation added to both body-weight and workout-set weight (roughly 500kg/1100lbs, generous enough for any real lift or body weight), applied in whichever unit was selected for that entry, in addition to the existing lower bound. This also happens to close the concrete bug that prompted this spec (a typo like `423432` was only rejected by an unrelated, now-fixed input side effect, not real validation).
- The pre-existing weight-input step-mismatch bug (native browser validation rejecting most values due to a `min`/`step` grid offset) is already fixed separately (FITNESS-45, not part of this spec's scope) — new inputs built for this spec should use the same `step="any"` pattern from the start, not reintroduce the old bug.

### Testing Decisions

- Only test external behavior via a small, directly-callable pure function — this repo's established pattern (mirrors `mifflin-v1.ts`, `greedy-heuristic.ts`, `program-exercise-targets.ts`, `workout-set-values.ts`; no service-level or HTTP-level tests exist anywhere in the codebase today).
- `convertWeight(value, fromUnit, toUnit)`: one pure function, one dedicated test module, covering kg→lbs, lbs→kg, and same-unit (no-op) conversion, with a known reference value pair for precision-sanity (e.g. 100 kg ≈ 220.46 lbs).
- No frontend test seam beyond what already exists — the conversion function is the only new logic; the chart and BMR calculation are existing, already-exercised call sites that just gain one additional conversion step using the shared function.

### Out of Scope

- Any unit besides kg/lbs (e.g. stone).
- Converting/normalizing historical data in bulk — existing rows just backfill as `'kg'`, no retroactive per-row unit correction.
- A dedicated "which unit is this gym's equipment in" per-location/per-gym setting — the per-entry override already covers this without needing a separate concept.
- Workout-set weight's "total volume" (weight × reps, summed across a session) — not a feature that exists today, so its unit-mixing implications aren't addressed here; would need its own design if built later.
- The FITNESS-45 step-validation bug fix itself — already shipped separately, referenced here only as prior art for input attributes.

### Further Notes

Worth an ADR once implemented: choosing per-entry raw-value storage (never converting at write time) over storing everything canonically in kg was a deliberate, harder-to-reverse trade-off — the simpler canonical-storage alternative was presented and explicitly rejected in favor of preserving exactly what the user typed. Recommend documenting this the same way ADR-012 documented FITNESS-11's real architectural choices, as part of (or immediately after) whichever ticket implements the schema change.
