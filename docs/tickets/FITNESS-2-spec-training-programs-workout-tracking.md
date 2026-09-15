---
id: FITNESS-2
title: "Spec: Training Programs & Workout Tracking"
state: Done
state_group: completed
priority: none
labels: [spec, ready-for-agent]
module: "Training Programs & Workout Tracking"
parent: null
created: 2026-08-15
updated: 2026-08-27
plane_id: be2d4544-dd02-404f-a52c-18e4b50b4db4
---

# FITNESS-2: Spec: Training Programs & Workout Tracking

### Problem Statement

Users who train want to follow a structured plan and see what they actually did over time, but paper logs and generic notes apps don't understand sets/reps/weight vs. duration, don't let someone run more than one program at once (e.g. lifting and running in parallel), and lose history the moment a plan changes.

### Solution

Let users build reusable Training Programs made of ordered exercises, activate several of them at once, and log Workout Logs (planned or ad hoc) against a catalog of exercises seeded from wger/ExerciseDB plus their own manual entries. History is permanent — editing or archiving a program never alters past logs.

### User Stories

1. As a user, I want to browse a catalog of exercises by muscle-group category, so that I can find exercises to add to my program without typing them from scratch.
2. As a user, I want to search the exercise catalog by name, so that I can quickly find a specific exercise.
3. As a user, I want to manually create a custom exercise not in the catalog, so that I can track movements specific to my training.
4. As a user, I want to create a new Training Program with a title, so that I can organize a plan around a goal (e.g. "Push Pull Legs").
5. As a user, I want to add exercises to my program in a specific order, so that the program reflects the sequence I actually train in.
6. As a user, I want to set target sets/reps for a strength exercise in my program, so that I know what I'm aiming for each session.
7. As a user, I want to set a target duration for a cardio exercise in my program, so that I know how long to run/row/etc.
8. As a user, I want to reorder exercises within a program, so that I can adjust the sequence without recreating the whole program.
9. As a user, I want to remove an exercise from a program, so that I can adapt it as my training evolves.

10. As a user, I want to have more than one Training Program active at the same time (e.g. a strength program and a running program), so that I can pursue multiple training goals in parallel.

11. As a user, I want to archive a Training Program I'm no longer following, so that it stops cluttering my active list but stays available for reference.

12. As a user, I want to reactivate an archived program, so that I can resume it later without rebuilding it.

13. As a user, I want to start a Workout Log from one of my active programs, so that logging follows the plan I already set up.

14. As a user, I want to log an ad hoc workout not tied to any program, so that I can record a spontaneous training session too.

15. As a user, I want to log each set's weight and reps for a strength exercise, so that I can track my progress over time.

16. As a user, I want to log duration for a cardio exercise instead of reps/weight, so that the input matches how that exercise is actually measured.

17. As a user, I want to see my workout history even after editing or deleting the Training Program a past workout came from, so that my training record is never silently altered.

18. As a user, I want to see my past Workout Logs listed by date, so that I can review what I've done recently.

19. As a user, I want to see my personal best (heaviest weight or most reps) for a given exercise, so that I can track strength progress.

20. As a user with no internet connection at the gym, I want to view my active program(s) and the exercise catalog anyway, so that I can still see my plan.

21. As a user with no internet connection at the gym, I want to log sets as I complete them, so that I don't have to remember and re-enter everything once I'm back online.

22. As a user who just regained connectivity, I want my offline-logged sets to sync automatically to the server, so that I don't have to manually resubmit anything.

23. As a user, I want to see a clear indicator when the app is offline vs. syncing vs. fully synced, so that I trust my data isn't lost.

24. As a mobile user, I want the workout-logging screen to be usable one-handed with large touch targets, so that I can log a set between reps without fumbling.

### Implementation Decisions

- Entities per

  `knowledge/domain-model.md`

  : Training Program, Program Exercise (ordered, with target_sets/target_reps/target_duration_seconds), Exercise (catalog, category enum), Workout Log (optionally linked to a Training Program), Workout Set.

- **Multiple concurrent active programs**

  :

  `UserActiveProgram`

  is a plain many-to-many join (user_id, training_id), not one-to-one — see

  `docs/decisions.md`

  ADR-004 context and

  `knowledge/business-rules.md`

  "Multiple concurrent active Training Programs."

- **Reps/weight vs. duration is inferred from `exercises.category`**

  :

  `category === 'cardio'`

  drives a duration input; everything else drives reps+weight. No separate tracking-type field (explicit trade-off — accepted that a duration-based non-cardio exercise like a plank won't get a duration input unless

  `category`

  is stretched to cover it later).

- **History is immutable relative to program edits**

  : Workout Logs/Sets reference

  `exercise_id`

  directly, not through

  `program_exercises`

  — editing or deleting a Training Program never changes past Workout Logs.

- Exercise catalog is seeded once from wger/ExerciseDB via a curated import script (see

  `knowledge/business-rules.md`

  "Food/exercise data import is a one-time curated seed") — same script family as the food import, mapping source data into this schema and marking

  `is_verified=false`

  until reviewed. Per-locale exercise names come from the accompanying translations table, machine-translated at import time.

- Offline support (per

  `knowledge/business-rules.md`

  "PWA offline supports queued writes"): service worker caches active programs, the exercise catalog, and recent workout logs for offline viewing. Logging a set while offline queues the write in IndexedDB; on reconnect, the service worker flushes the queue to the NestJS API in order. No conflict resolution needed — Workout Sets are append-only, never concurrently edited.

### Testing Decisions

- **NestJS seam**

  : integration tests (real test Postgres) covering program CRUD, activating/archiving multiple concurrent programs, logging workout sets against both program-linked and ad hoc workout logs, and confirming that editing/deleting a Training Program leaves prior Workout Logs/Sets untouched.

- **Next.js seam**

  : Playwright E2E for the core loop — build a program, activate it alongside a second program, start a workout from it, log a few sets, view it in history. A separate E2E scenario drives the offline path: go offline (Playwright network conditions), log a set, go back online, assert the set appears server-side.

- **Import script**

  : a small, separate test asserting the wger/ExerciseDB mapping produces valid rows against the current schema (category, translations, is_verified) using a fixture subset of source data, not the live external API.

### Out of Scope

- Auto-generated training programs (this spec covers user-built programs only, not an AI/algorithmic program generator).
- Wearable device integration (heart rate, GPS tracking for runs).
- Social features (sharing programs, following other users' workouts).
- Video demonstrations of exercises (only name/image/category from the catalog).

### Further Notes

Depends on Spec: Auth & User Profile for identity. Independent of Spec: Diet Engine and Spec: Progress Photos & Pose Analysis — no shared entities beyond User and Daily Log.
