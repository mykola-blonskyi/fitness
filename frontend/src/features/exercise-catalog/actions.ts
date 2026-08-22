'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@libs/api-client';
import {
  createExerciseSchema,
  type CreateExerciseInput,
} from '@shared/schemas/exercise';
import type { Exercise } from '@shared/types/exercise';
import {
  submitFormAction,
  type FormActionError,
} from '@shared/libs/form-action';

export type CreateExerciseFormState = FormActionError<CreateExerciseInput>;

export async function createExercise(
  input: CreateExerciseInput,
): Promise<CreateExerciseFormState> {
  // No `formData` option - see features/onboarding/actions.ts for why.
  return submitFormAction({
    name: 'createExercise',
    schema: createExerciseSchema,
    input,
    errorMessage: "Couldn't add that exercise — try again.",
    async mutate(parsed) {
      await apiFetch<Exercise>('/exercises', {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      revalidatePath('/[locale]/exercises', 'page');
      return {};
    },
  });
}
