import { describe, expect, it } from 'vitest';
import { pendingSetsFor } from '@features/workout-logs/components/WorkoutSetList';
import { WORKOUT_SET_SYNC_TYPE } from '@features/workout-logs/offline';
import type { QueuedWrite } from '@shared/offline/types';
import type { Exercise } from '@shared/types/exercise';

const exercises: Exercise[] = [
  {
    id: 'ex-1',
    name: 'Bench Press',
    category: 'chest',
    imageUrl: null,
    isVerified: true,
  },
  {
    id: 'ex-2',
    name: 'Running',
    category: 'cardio',
    imageUrl: null,
    isVerified: true,
  },
];

function queuedSet(
  workoutLogId: string,
  input: Record<string, unknown>,
  id = 'queued-1',
): QueuedWrite {
  return {
    id,
    type: WORKOUT_SET_SYNC_TYPE,
    payload: { workoutLogId, input },
    createdAt: 0,
  };
}

describe('pendingSetsFor', () => {
  it('maps a queued weight/reps set, resolving the exercise name from the catalog', () => {
    const queue = [
      queuedSet('log-1', { exerciseId: 'ex-1', weight: 60, reps: 10 }),
    ];

    expect(pendingSetsFor(queue, 'log-1', exercises)).toEqual([
      {
        id: 'queued-1',
        exerciseId: 'ex-1',
        exerciseName: 'Bench Press',
        exerciseCategory: 'chest',
        setNumber: 0,
        weight: 60,
        reps: 10,
        durationSeconds: null,
      },
    ]);
  });

  it('maps a queued cardio set by duration', () => {
    const queue = [
      queuedSet('log-1', { exerciseId: 'ex-2', durationSeconds: 300 }),
    ];

    expect(pendingSetsFor(queue, 'log-1', exercises)[0]).toMatchObject({
      exerciseName: 'Running',
      durationSeconds: 300,
      weight: null,
      reps: null,
    });
  });

  it('excludes queued sets for a different workout log', () => {
    const queue = [
      queuedSet('log-2', { exerciseId: 'ex-1', weight: 60, reps: 10 }),
    ];
    expect(pendingSetsFor(queue, 'log-1', exercises)).toEqual([]);
  });

  it('excludes queued writes of a different type', () => {
    const queue: QueuedWrite[] = [
      {
        id: 'x',
        type: 'daily-log/set-weight',
        payload: { workoutLogId: 'log-1', input: { exerciseId: 'ex-1' } },
        createdAt: 0,
      },
    ];
    expect(pendingSetsFor(queue, 'log-1', exercises)).toEqual([]);
  });

  it('falls back to the exercise id when the exercise is missing from the catalog', () => {
    const queue = [
      queuedSet('log-1', { exerciseId: 'unknown', weight: 5, reps: 5 }),
    ];
    expect(pendingSetsFor(queue, 'log-1', exercises)[0]).toMatchObject({
      exerciseName: 'unknown',
      exerciseCategory: 'full_body',
    });
  });
});
