'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { apiFetch, ApiError } from '@libs/api-client';
import {
  addProgramExerciseSchema,
  createTrainingProgramSchema,
  type AddProgramExerciseInput,
  type CreateTrainingProgramInput,
} from '@shared/schemas/training-program';
import type {
  ProgramExercise,
  TrainingProgram,
} from '@shared/types/training-program';
import {
  submitFormAction,
  type FormActionError,
} from '@shared/libs/form-action';

const PROGRAMS_PAGE = '/[locale]/training';
const PROGRAM_PAGE = '/[locale]/training/[id]';

export type CreateTrainingProgramState =
  FormActionError<CreateTrainingProgramInput>;

export async function createTrainingProgram(
  input: CreateTrainingProgramInput,
): Promise<CreateTrainingProgramState> {
  // No `formData` option - see features/onboarding/actions.ts for why.
  return submitFormAction({
    name: 'createTrainingProgram',
    schema: createTrainingProgramSchema,
    input,
    errorMessage: "Couldn't create that program — try again.",
    async mutate(parsed) {
      await apiFetch<TrainingProgram>('/training-programs', {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      revalidatePath(PROGRAMS_PAGE, 'page');
      return {};
    },
  });
}

export type AddProgramExerciseState = FormActionError<AddProgramExerciseInput>;

export async function addProgramExercise(
  programId: string,
  input: AddProgramExerciseInput,
): Promise<AddProgramExerciseState> {
  return submitFormAction({
    name: 'addProgramExercise',
    schema: addProgramExerciseSchema,
    input,
    errorMessage: "Couldn't add that exercise — try again.",
    async mutate(parsed) {
      await apiFetch<ProgramExercise>(
        `/training-programs/${programId}/exercises`,
        {
          method: 'POST',
          body: JSON.stringify(parsed),
        },
      );
      revalidatePath(PROGRAM_PAGE, 'page');
      return {};
    },
  });
}

export async function removeProgramExercise(
  programId: string,
  programExerciseId: string,
): Promise<void> {
  return Sentry.withServerActionInstrumentation(
    'removeProgramExercise',
    {},
    async () => {
      try {
        await apiFetch<ProgramExercise>(
          `/training-programs/${programId}/exercises/${programExerciseId}`,
          { method: 'DELETE' },
        );
      } catch (err) {
        // Already removed (e.g. a stale UI double-click) is not a real
        // failure - anything else is genuinely unexpected and should
        // propagate to Sentry via the instrumentation wrapper above, same
        // convention as removeFoodPreference/removeDietPreference.
        if (!(err instanceof ApiError && err.status === 404)) {
          throw err;
        }
      }
      revalidatePath(PROGRAM_PAGE, 'page');
    },
  );
}

// Swaps a Program Exercise with its neighbor in the given direction. The
// backend's reorder endpoint (training-programs.service.ts's
// reorderExercises) always takes a full replacement of the ordered id
// list, not a single-position move, so this reads the program's current
// order first, swaps the two adjacent ids, and sends the whole list back
// - a program's exercise list is short enough that re-fetching here is
// never meaningfully slower than diffing what the page already rendered.
export async function moveProgramExercise(
  programId: string,
  programExerciseId: string,
  direction: 'up' | 'down',
): Promise<void> {
  return Sentry.withServerActionInstrumentation(
    'moveProgramExercise',
    {},
    async () => {
      const program = await apiFetch<TrainingProgram>(
        `/training-programs/${programId}`,
      );
      const ids = program.exercises.map((exercise) => exercise.id);
      const index = ids.indexOf(programExerciseId);
      const swapWith = direction === 'up' ? index - 1 : index + 1;
      if (index === -1 || swapWith < 0 || swapWith >= ids.length) {
        return;
      }

      [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];

      await apiFetch<TrainingProgram>(
        `/training-programs/${programId}/exercises/reorder`,
        {
          method: 'PUT',
          body: JSON.stringify({ orderedIds: ids }),
        },
      );
      revalidatePath(PROGRAM_PAGE, 'page');
    },
  );
}

// Shared by archiveTrainingProgram/reactivateTrainingProgram below - same
// request/revalidate shape either way, only the endpoint segment and
// Sentry action name differ. Mirrors training-programs.service.ts's own
// private setArchived() on the backend.
async function setProgramArchived(
  programId: string,
  action: 'archive' | 'reactivate',
): Promise<void> {
  return Sentry.withServerActionInstrumentation(
    `${action}TrainingProgram`,
    {},
    async () => {
      await apiFetch<TrainingProgram>(
        `/training-programs/${programId}/${action}`,
        { method: 'PATCH' },
      );
      revalidatePath(PROGRAMS_PAGE, 'page');
      revalidatePath(PROGRAM_PAGE, 'page');
    },
  );
}

export async function archiveTrainingProgram(programId: string): Promise<void> {
  return setProgramArchived(programId, 'archive');
}

export async function reactivateTrainingProgram(
  programId: string,
): Promise<void> {
  return setProgramArchived(programId, 'reactivate');
}
