'use server';

import { getTranslations } from 'next-intl/server';
import * as Sentry from '@sentry/nextjs';
import { apiFetch, ApiError } from '@libs/api-client';
import type { AdminExercise, CursorPage } from '@shared/types/admin';

export interface AdminActionResult {
  error?: string;
}

export async function listAdminExercises(
  cursor?: string,
): Promise<CursorPage<AdminExercise>> {
  return Sentry.withServerActionInstrumentation(
    'listAdminExercises',
    {},
    async () => {
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      return apiFetch<CursorPage<AdminExercise>>(`/admin/exercises${query}`);
    },
  );
}

export async function approveExercise(id: string): Promise<AdminActionResult> {
  return Sentry.withServerActionInstrumentation(
    'approveExercise',
    {},
    async () => {
      try {
        await apiFetch(`/admin/exercises/${id}/approve`, { method: 'POST' });
        return {};
      } catch {
        const t = await getTranslations('Admin.errors');
        return { error: t('approveExerciseFailed') };
      }
    },
  );
}

// Returns a result like approve/delete, not void - the public Exercise
// Catalog's virtualized list manages its own row state locally.
export async function unapproveExercise(
  id: string,
): Promise<AdminActionResult> {
  return Sentry.withServerActionInstrumentation(
    'unapproveExercise',
    {},
    async () => {
      try {
        await apiFetch(`/admin/exercises/${id}/unapprove`, { method: 'POST' });
        return {};
      } catch {
        const t = await getTranslations('Admin.errors');
        return { error: t('unapproveExerciseFailed') };
      }
    },
  );
}

export async function deleteExercise(id: string): Promise<AdminActionResult> {
  return Sentry.withServerActionInstrumentation(
    'deleteExercise',
    {},
    async () => {
      try {
        await apiFetch(`/admin/exercises/${id}`, { method: 'DELETE' });
        return {};
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          return { error: err.message };
        }
        const t = await getTranslations('Admin.errors');
        return { error: t('deleteExerciseFailed') };
      }
    },
  );
}
