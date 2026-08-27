'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOfflineQueueStore } from '@shared/offline/offline-queue-store';
import type { QueuedWrite } from '@shared/offline/types';
import type { Exercise } from '@shared/types/exercise';
import type { WorkoutSet } from '@shared/types/workout-log';
import {
  WORKOUT_SET_SYNC_TYPE,
  type LogWorkoutSetPayload,
} from '@features/workout-logs/offline';

// Pure so it's directly unit-testable (mirrors WeightTrendChart's
// connectedPairs/dayIndex) rather than only reachable through the store hook.
export function pendingSetsFor(
  queue: readonly QueuedWrite[],
  workoutLogId: string,
  exercises: readonly Exercise[],
): WorkoutSet[] {
  return queue
    .filter(
      (item) =>
        item.type === WORKOUT_SET_SYNC_TYPE &&
        (item.payload as LogWorkoutSetPayload).workoutLogId === workoutLogId,
    )
    .map((item): WorkoutSet => {
      const { input } = item.payload as LogWorkoutSetPayload;
      const exercise = exercises.find((e) => e.id === input.exerciseId);
      return {
        id: item.id,
        exerciseId: input.exerciseId,
        exerciseName: exercise?.name ?? input.exerciseId,
        exerciseCategory: exercise?.category ?? 'full_body',
        setNumber: 0,
        weight: input.weight ?? null,
        reps: input.reps ?? null,
        durationSeconds: input.durationSeconds ?? null,
      };
    });
}

export function WorkoutSetList({
  workoutLogId,
  sets,
  exercises,
}: {
  workoutLogId: string;
  sets: WorkoutSet[];
  exercises: Exercise[];
}) {
  // Reads straight from the offline write-queue (not local component
  // state) so a set logged offline shows up here immediately.
  const pendingSets = useOfflineQueueStore((state) =>
    pendingSetsFor(state.queue, workoutLogId, exercises),
  );
  const pendingIds = new Set(pendingSets.map((set) => set.id));
  const allSets = [...sets, ...pendingSets];

  const router = useRouter();
  const previousPendingCount = useRef(pendingSets.length);
  useEffect(() => {
    // drainQueue() only removes an item from the queue after its Server
    // Action has actually succeeded - a drop here means a queued set for
    // this log just made it to the server. `sets` is a Server Component
    // prop fetched once at request time, so without this it would drop out
    // of `pendingSets` and briefly disappear from the list entirely until
    // the next navigation re-fetches it.
    if (pendingSets.length < previousPendingCount.current) {
      router.refresh();
    }
    previousPendingCount.current = pendingSets.length;
  }, [pendingSets.length, router]);

  if (allSets.length === 0) {
    return <p className="text-sm text-zinc-500">No sets logged yet.</p>;
  }

  const byExercise = new Map<string, WorkoutSet[]>();
  for (const set of allSets) {
    const group = byExercise.get(set.exerciseId) ?? [];
    group.push(set);
    byExercise.set(set.exerciseId, group);
  }

  return (
    <ul className="flex flex-col gap-4">
      {[...byExercise.values()].map((group) => (
        <li key={group[0].exerciseId} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{group[0].exerciseName}</h3>
          <ul className="flex flex-col gap-1">
            {group.map((set) => (
              <li
                key={set.id}
                className="flex items-center justify-between gap-3 rounded border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <span className="text-zinc-500">
                  {pendingIds.has(set.id) ? 'Set —' : `Set ${set.setNumber}`}
                </span>
                <span>
                  {set.durationSeconds != null
                    ? `${set.durationSeconds}s`
                    : `${set.weight} kg × ${set.reps}`}
                </span>
                {pendingIds.has(set.id) && (
                  <span className="text-xs text-zinc-500" role="status">
                    Queued offline
                  </span>
                )}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
