'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { apiFetch, ApiError } from '@libs/api-client';
import {
  createDietPreferenceSchema,
  createFoodPreferenceSchema,
  type CreateDietPreferenceInput,
  type CreateFoodPreferenceInput,
} from '@shared/schemas/preferences';
import type { DietPreference, FoodPreference } from '@shared/types/preferences';
import {
  submitFormAction,
  type FormActionError,
} from '@shared/libs/form-action';
import { firstFieldErrors } from '@shared/schemas/zod-errors';

const PREFERENCES_PAGE = '/[locale]/settings/preferences';

export type CreateFoodPreferenceState =
  FormActionError<CreateFoodPreferenceInput>;

export async function createFoodPreference(
  input: CreateFoodPreferenceInput,
): Promise<CreateFoodPreferenceState> {
  // Not submitFormAction - a favorite/exclude conflict needs its 409
  // message surfaced verbatim, same pattern as deleteFoodItem/deleteExercise.
  return Sentry.withServerActionInstrumentation(
    'createFoodPreference',
    {},
    async () => {
      const parsed = createFoodPreferenceSchema.safeParse(input);
      if (!parsed.success) {
        return {
          fieldErrors: firstFieldErrors(parsed.error) as Partial<
            Record<keyof CreateFoodPreferenceInput, string>
          >,
        };
      }

      try {
        await apiFetch<FoodPreference>('/food-preferences', {
          method: 'POST',
          body: JSON.stringify(parsed.data),
        });
        revalidatePath(PREFERENCES_PAGE, 'page');
        return {};
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          return { error: err.message };
        }
        return { error: "Couldn't save that preference — try again." };
      }
    },
  );
}

export async function removeFoodPreference(id: string): Promise<void> {
  return Sentry.withServerActionInstrumentation(
    'removeFoodPreference',
    {},
    async () => {
      try {
        await apiFetch<FoodPreference>(`/food-preferences/${id}`, {
          method: 'DELETE',
        });
      } catch (err) {
        // Already removed (e.g. a stale UI double-click) is not a real
        // failure - anything else is genuinely unexpected and should
        // propagate to Sentry via the instrumentation wrapper above.
        if (!(err instanceof ApiError && err.status === 404)) {
          throw err;
        }
      }
      revalidatePath(PREFERENCES_PAGE, 'page');
    },
  );
}

export type CreateDietPreferenceState =
  FormActionError<CreateDietPreferenceInput>;

export async function createDietPreference(
  input: CreateDietPreferenceInput,
): Promise<CreateDietPreferenceState> {
  return submitFormAction({
    name: 'createDietPreference',
    schema: createDietPreferenceSchema,
    input,
    errorMessage: "Couldn't save that diet preference — try again.",
    async mutate(parsed) {
      await apiFetch<DietPreference>('/diet-preferences', {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      revalidatePath(PREFERENCES_PAGE, 'page');
      return {};
    },
  });
}

export async function removeDietPreference(id: string): Promise<void> {
  return Sentry.withServerActionInstrumentation(
    'removeDietPreference',
    {},
    async () => {
      try {
        await apiFetch<DietPreference>(`/diet-preferences/${id}`, {
          method: 'DELETE',
        });
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) {
          throw err;
        }
      }
      revalidatePath(PREFERENCES_PAGE, 'page');
    },
  );
}
