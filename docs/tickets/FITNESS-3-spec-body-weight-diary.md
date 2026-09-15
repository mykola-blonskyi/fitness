---
id: FITNESS-3
title: "Spec: Body-Weight Diary"
state: Done
state_group: completed
priority: none
labels: [spec, ready-for-agent]
module: "Body-Weight Diary"
parent: null
created: 2026-08-15
updated: 2026-08-24
plane_id: 4f21176a-db6b-4fe4-b57c-e06475172b31
---

# FITNESS-3: Spec: Body-Weight Diary

### Problem Statement

Tracking body weight is only useful if it's easy to log consistently and easy to see trending over time — but forcing a weigh-in before any other daily action (workouts, photos, diet) creates friction that stops people from using the app on the days that matter most.

### Solution

A lightweight Daily Log per user per date, where weight is one optional field among several. Users can log weight whenever they actually weigh in, independent of whether they train or take photos that day, and see their weight trend over time.

### User Stories

1. As a user, I want to log my body weight for today, so that I can track it over time.
2. As a user, I want to log a workout or upload a progress photo on a day I didn't weigh in, so that skipping a weigh-in doesn't block anything else.
3. As a user, I want to edit a weight entry I logged for the wrong value, so that I can correct a typo without creating a duplicate entry.
4. As a user, I want to see my weight history as a trend line over time, so that I can see whether I'm moving toward my goal.
5. As a user, I want to see my weight change over a selectable window (e.g. last 7/30/90 days), so that I can focus on recent trends rather than the whole history.
6. As a user, I want to see my most recent weigh-in date on my dashboard, so that I'm reminded if it's been a while.
7. As a user, I want only one weight value per day, so that my trend line isn't confused by accidental duplicate entries.
8. As a user, I want the weight trend to clearly show gaps (days with no weigh-in), so that the chart doesn't misleadingly interpolate data I never entered.
9. As a user, I want my weight logged in kilograms, so that it matches the metric system used throughout the app.

10. As a user, I want to see my current weight next to my goal, so that I have context for how far along I am.

11. As a user, I want to delete a mistaken weight entry entirely (not just edit it), so that bad data doesn't stay in my history.

12. As a user, I want the Daily Log for today to be automatically available (not something I have to explicitly "create") the first time I log anything against it, so that weigh-in, workout, and photo logging all feel like one continuous day rather than separate setup steps.

### Implementation Decisions

- Entity: **Daily Log** (`daily_logs`, formerly `diary_entries` — see `docs/decisions.md` ADR-004 and `knowledge/glossary.md`), keyed by `(user_id, date)` unique, with `weight` nullable.
- A Daily Log row is created lazily on first write of any kind against a given `(user_id, date)` — logging weight, starting a workout, or uploading a photo session on a new date all upsert the Daily Log rather than requiring a separate "create today's log" step.
- Editing weight is an update to the same Daily Log row (unique per user/date), not an append — so there is exactly one weight value per user per day by construction, not by application-level de-duplication logic.
- Weight-trend queries read the `daily_logs` table directly, filtered to rows where `weight IS NOT NULL`, ordered by date — gaps are simply dates with no row/no weight, and the frontend chart must not interpolate across them as if they were consecutive.
- This spec is intentionally weight-only for the "diary" concept; Workout Logs and Diets (which also attach to Daily Log) are covered by their own specs.

### Testing Decisions

- **NestJS seam**: integration tests (real test Postgres) covering: creating a Daily Log implicitly via a weight-log call, updating an existing day's weight (asserts still one row), deleting a weight entry, and a trend-query endpoint returning only dated rows with non-null weight in range.
- **Next.js seam**: Playwright E2E — log a weight today, edit it, confirm the trend chart updates; log a workout on a day with no weight and confirm no weight-entry prompt blocks it.

### Out of Scope

- Body measurements beyond weight (waist, body fat %, etc.) — not in the grooming note's scope.
- Weight goal-setting with target dates or projected timelines.
- Any automatic weight-change-triggered notifications (diet regeneration stays a manual action — see `knowledge/business-rules.md`).

### Further Notes

Depends on Spec: Auth & User Profile for identity. Spec: Diet Engine and Spec: Progress Photos & Pose Analysis both attach to the same Daily Log this spec introduces — build this one first among the daily-activity specs since the others assume `daily_logs` already exists.
