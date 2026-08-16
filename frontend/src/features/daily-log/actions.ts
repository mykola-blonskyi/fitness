'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@libs/api-client';

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
}

export async function clearWeight(date: string): Promise<void> {
  await apiFetch<DailyLog>(`/daily-logs/${date}/weight`, {
    method: 'DELETE',
  });
  revalidatePath('/[locale]/diary', 'page');
}
