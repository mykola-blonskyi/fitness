import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from './setup/render-with-intl';
import { WorkoutSetList } from '@features/workout-logs/components/WorkoutSetList';
import { useOfflineQueueStore } from '@shared/offline/offline-queue-store';
import { WORKOUT_SET_SYNC_TYPE } from '@features/workout-logs/offline';
import type { WorkoutSet } from '@shared/types/workout-log';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const set: WorkoutSet = {
  id: 'set-1',
  exerciseId: 'ex-1',
  exerciseName: 'Bench Press',
  exerciseCategory: 'chest',
  setNumber: 1,
  weight: 60,
  weightUnit: 'kg',
  reps: 8,
  durationSeconds: null,
};

// Regression test for FITNESS-67 - these all threw ("Maximum update depth
// exceeded") before the fix in WorkoutSetList.tsx.
describe('WorkoutSetList render', () => {
  afterEach(() => {
    useOfflineQueueStore.setState({ queue: [] });
  });

  it('does not crash when rendered with an empty queue', () => {
    renderWithIntl(
      <WorkoutSetList workoutLogId="log-1" sets={[]} exercises={[]} />,
    );
    expect(screen.getByText('No sets logged yet.')).toBeInTheDocument();
  });

  it('does not crash rendering an already-synced set with an empty queue', () => {
    renderWithIntl(
      <WorkoutSetList workoutLogId="log-1" sets={[set]} exercises={[]} />,
    );
    expect(screen.getByText('Bench Press')).toBeInTheDocument();
    expect(screen.getByText('60kg × 8')).toBeInTheDocument();
  });

  it('does not crash with a pending (offline-queued) set in the store', () => {
    useOfflineQueueStore.setState({
      queue: [
        {
          id: 'queued-1',
          type: WORKOUT_SET_SYNC_TYPE,
          payload: {
            workoutLogId: 'log-1',
            input: { exerciseId: 'ex-1', weight: 60, reps: 8 },
          },
          createdAt: 0,
        },
      ],
    });

    renderWithIntl(
      <WorkoutSetList workoutLogId="log-1" sets={[]} exercises={[]} />,
    );
    expect(screen.getByText('60kg × 8')).toBeInTheDocument();
  });
});
