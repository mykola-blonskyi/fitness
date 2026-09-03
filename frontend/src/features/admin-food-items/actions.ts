'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import * as Sentry from '@sentry/nextjs';
import { apiFetch, ApiError } from '@libs/api-client';
import type { AdminFoodItem, CursorPage } from '@shared/types/admin';

export interface AdminActionResult {
  error?: string;
}

export async function listAdminFoodItems(
  cursor?: string,
): Promise<CursorPage<AdminFoodItem>> {
  return Sentry.withServerActionInstrumentation(
    'listAdminFoodItems',
    {},
    async () => {
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      return apiFetch<CursorPage<AdminFoodItem>>(`/admin/food-items${query}`);
    },
  );
}

export async function approveFoodItem(id: string): Promise<AdminActionResult> {
  return Sentry.withServerActionInstrumentation(
    'approveFoodItem',
    {},
    async () => {
      try {
        await apiFetch(`/admin/food-items/${id}/approve`, { method: 'POST' });
        return {};
      } catch {
        const t = await getTranslations('Admin.errors');
        return { error: t('approveFoodFailed') };
      }
    },
  );
}

// Reachable from the plain Food Catalog page (admin-only affordance
// there, not the moderation queue) - same convention as
// unapproveExercise in features/admin-exercises/actions.ts.
export async function unapproveFoodItem(id: string): Promise<void> {
  return Sentry.withServerActionInstrumentation(
    'unapproveFoodItem',
    {},
    async () => {
      await apiFetch(`/admin/food-items/${id}/unapprove`, { method: 'POST' });
      revalidatePath('/[locale]/food', 'page');
    },
  );
}

export async function deleteFoodItem(id: string): Promise<AdminActionResult> {
  return Sentry.withServerActionInstrumentation(
    'deleteFoodItem',
    {},
    async () => {
      try {
        await apiFetch(`/admin/food-items/${id}`, { method: 'DELETE' });
        return {};
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          return { error: err.message };
        }
        const t = await getTranslations('Admin.errors');
        return { error: t('deleteFoodFailed') };
      }
    },
  );
}
