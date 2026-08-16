'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { apiFetch, ApiError } from '@libs/api-client';

export interface DailyLog {
  id: string;
  date: string;
  weight: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeightFormState {
  error?: string;
}

export async function setWeight(
  date: string,
  _prevState: WeightFormState | undefined,
  formData: FormData,
): Promise<WeightFormState> {
  return Sentry.withServerActionInstrumentation(
    'setWeight',
    { formData },
    async () => {
      const weight = Number(formData.get('weight'));

      try {
        await apiFetch<DailyLog>(`/daily-logs/${date}/weight`, {
          method: 'PUT',
          body: JSON.stringify({ weight }),
        });
      } catch {
        return { error: "Couldn't save your weight — try again." };
      }

      revalidatePath('/[locale]/diary', 'page');
      return {};
    },
  );
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
