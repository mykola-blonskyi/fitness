'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { apiFetch, ApiError } from '@libs/api-client';
import { weightSchema, type WeightInput } from '@shared/schemas/weight';
import {
  submitFormAction,
  type FormActionError,
} from '@shared/libs/form-action';

export interface DailyLog {
  id: string;
  date: string;
  weight: number | null;
  createdAt: string;
  updatedAt: string;
}

export type WeightFormState = FormActionError<WeightInput>;

export async function setWeight(
  date: string,
  input: WeightInput,
): Promise<WeightFormState> {
  // No `formData` option - see features/onboarding/actions.ts for why
  // (this one carries a weight value, ADR-006's own named example of
  // health data that must never reach Sentry).
  return submitFormAction({
    name: 'setWeight',
    schema: weightSchema,
    input,
    errorMessage: "Couldn't save your weight — try again.",
    async mutate(parsed) {
      await apiFetch<DailyLog>(`/daily-logs/${date}/weight`, {
        method: 'PUT',
        body: JSON.stringify(parsed),
      });
      revalidatePath('/[locale]/diary', 'page');
      return {};
    },
  });
}

export async function clearWeight(date: string): Promise<void> {
  return Sentry.withServerActionInstrumentation('clearWeight', {}, async () => {
    try {
      await apiFetch<DailyLog>(`/daily-logs/${date}/weight`, {
        method: 'DELETE',
      });
    } catch (err) {
      // Already cleared (e.g. a stale UI double-click) is not a real
      // failure - anything else is genuinely unexpected and should
      // propagate to Sentry via the instrumentation wrapper above.
      if (!(err instanceof ApiError && err.status === 404)) {
        throw err;
      }
    }

    revalidatePath('/[locale]/diary', 'page');
  });
}
