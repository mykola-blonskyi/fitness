'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import * as Sentry from '@sentry/nextjs';
import { apiFetch } from '@libs/api-client';
import {
  createExerciseSchema,
  type CreateExerciseInput,
} from '@shared/schemas/exercise';
import type { Exercise } from '@shared/types/exercise';
import type { CursorPage } from '@shared/types/admin';
import {
  submitFormAction,
  type FormActionError,
} from '@shared/libs/form-action';

export type CreateExerciseFormState = FormActionError<CreateExerciseInput>;

export async function listExercises(
  cursor: string,
  category?: string,
  search?: string,
): Promise<CursorPage<Exercise>> {
  return Sentry.withServerActionInstrumentation(
    'listExercises',
    {},
    async () => {
      const query = new URLSearchParams({ cursor });
      if (category) query.set('category', category);
      if (search) query.set('search', search);
      return apiFetch<CursorPage<Exercise>>(`/exercises?${query.toString()}`);
    },
  );
}

export async function createExercise(
  input: CreateExerciseInput,
): Promise<CreateExerciseFormState> {
  const [tv, t] = await Promise.all([
    getTranslations('Validation'),
    getTranslations('Exercises.errors'),
  ]);
  // No `formData` option - see features/onboarding/actions.ts for why.
  return submitFormAction({
    name: 'createExercise',
    schema: createExerciseSchema(tv),
    input,
    errorMessage: t('addFailed'),
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
