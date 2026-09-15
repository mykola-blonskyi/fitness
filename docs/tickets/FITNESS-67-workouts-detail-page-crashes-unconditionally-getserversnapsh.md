---
id: FITNESS-67
title: "Workouts detail page crashes unconditionally (getServerSnapshot infinite-loop guard)"
state: Done
state_group: completed
priority: urgent
labels: []
module: null
parent: null
created: 2026-09-04
updated: 2026-09-04
plane_id: 193cee79-ca12-4846-9ffd-8806b2454555
---

# FITNESS-67: Workouts detail page crashes unconditionally (getServerSnapshot infinite-loop guard)

Opening any `/workouts/[id]` page threw a client-side exception and showed the full Next.js error boundary - reproduced on every workout log, even one with zero sets, on unmodified `main`.

**Root cause** (`frontend/src/features/workout-logs/components/WorkoutSetList.tsx`): `useOfflineQueueStore((state) => pendingSetsFor(state.queue, workoutLogId, exercises))` used `pendingSetsFor` directly as a Zustand selector, but that function always returns a brand-new array (`queue.filter(...).map(...)`) even when `state.queue` hasn't changed. React's `useSyncExternalStore` (which Zustand's `useStore` is built on) detected the ever-changing snapshot reference and threw "Maximum update depth exceeded" client-side (or "getServerSnapshot should be cached" during SSR/hydration).

**Fix**: select the raw, referentially-stable `state.queue` and derive `pendingSetsFor(queue, workoutLogId, exercises)` via `useMemo` outside the store subscription, so the derived array is only rebuilt when its inputs actually change.

Verified: reverting to the old code makes the new regression test fail with exactly this error; the fix makes it pass. Also verified live in a browser - a freshly created workout log (zero sets) loads without crashing, and submitting a set through the offline-queue path (the exact code path that crashed) renders correctly too.

Checked every other `useOfflineQueueStore` selector in the codebase (`useSyncStatus.ts`, `create-synced-write.ts`, `useOfflineSync.ts`) - all select primitives or stable function references, none reconstruct arrays/objects, so none needed the same fix. `pendingSetsFor` is only ever called from this one component.

### Acceptance criteria

- [x] /workouts/[id] loads without a client-side exception, for a workout log with zero sets and with existing sets
- [x] Regression test for pendingSetsFor/WorkoutSetList proving the selector doesn't retrigger on every render for an unchanged queue
