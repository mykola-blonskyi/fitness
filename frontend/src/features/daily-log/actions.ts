'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { apiFetch, ApiError } from '@libs/api-client';
import { weightSchema, type WeightInput } from '@shared/schemas/weight';
import type { WeightUnit } from '@shared/types/user';
import {
  submitFormAction,
  type FormActionError,
} from '@shared/libs/form-action';

export interface DailyLog {
  id: string;
  date: string;
  weight: number | null;
  weightUnit: WeightUnit | null;
  createdAt: string;
  updatedAt: string;
}

// One point in the weight-trend chart (FITNESS-15) - always a real
// weigh-in, never gap-filled. See daily-log.mapper.ts's WeightTrendPoint
// on the backend, which this mirrors.
export interface WeightTrendPoint {
  date: string;
  weight: number;
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
