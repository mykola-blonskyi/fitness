'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { apiFetch } from '@libs/api-client';
import {
  startWorkoutLogSchema,
  logWorkoutSetSchema,
  type StartWorkoutLogInput,
  type LogWorkoutSetInput,
} from '@shared/schemas/workout-log';
import type { WorkoutLog, WorkoutSet } from '@shared/types/workout-log';
import {
  submitFormAction,
  type FormActionError,
} from '@shared/libs/form-action';

const WORKOUTS_PAGE = '/[locale]/workouts';
const WORKOUT_PAGE = '/[locale]/workouts/[id]';

export type StartWorkoutLogState = FormActionError<StartWorkoutLogInput>;

export async function startWorkoutLog(
  locale: string,
  date: string,
  input: StartWorkoutLogInput,
): Promise<StartWorkoutLogState | undefined> {
  let created: WorkoutLog | undefined;

  const result = await submitFormAction({
    name: 'startWorkoutLog',
    schema: startWorkoutLogSchema,
    input,
    errorMessage: "Couldn't start a workout — try again.",
    async mutate(parsed) {
      created = await apiFetch<WorkoutLog>(`/workout-logs/${date}`, {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      revalidatePath(WORKOUTS_PAGE, 'page');
      return undefined;
    },
  });

  if (result) return result;

  // Outside submitFormAction's instrumentation callback - redirect() works
  // by throwing (see features/onboarding/actions.ts for why).
  redirect(`/${locale}/workouts/${created!.id}`);
}

export type LogWorkoutSetState = FormActionError<LogWorkoutSetInput>;

export async function logWorkoutSet(
  workoutLogId: string,
  input: LogWorkoutSetInput,
): Promise<LogWorkoutSetState> {
  return submitFormAction({
    name: 'logWorkoutSet',
    schema: logWorkoutSetSchema,
    input,
    errorMessage: "Couldn't log that set — try again.",
    async mutate(parsed) {
      await apiFetch<WorkoutSet>(`/workout-logs/${workoutLogId}/sets`, {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      revalidatePath(WORKOUT_PAGE, 'page');
      return {};
    },
  });
}
