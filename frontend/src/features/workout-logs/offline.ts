'use client';

import { createSyncedWrite } from '@shared/offline/create-synced-write';
import {
  logWorkoutSet,
  type LogWorkoutSetState,
} from '@features/workout-logs/actions';
import type { LogWorkoutSetInput } from '@shared/schemas/workout-log';

export const WORKOUT_SET_SYNC_TYPE = 'workout-logs/log-set';

export interface LogWorkoutSetPayload {
  workoutLogId: string;
  input: LogWorkoutSetInput;
}

// Wraps the existing logWorkoutSet Server Action so LogSetForm gets offline
// queueing for free; mirrors features/daily-log/offline.ts's syncedSetWeight.
export const syncedLogWorkoutSet = createSyncedWrite<
  LogWorkoutSetPayload,
  LogWorkoutSetState
>(
  WORKOUT_SET_SYNC_TYPE,
  ({ workoutLogId, input }) => logWorkoutSet(workoutLogId, input),
  {
    getResultError: (result) =>
      result.error ?? Object.values(result.fieldErrors ?? {})[0],
  },
);
