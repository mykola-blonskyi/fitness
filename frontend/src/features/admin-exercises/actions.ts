'use server';

import { revalidatePath } from 'next/cache';
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
        return { error: "Couldn't approve this exercise — try again." };
      }
    },
  );
}

// Reachable from the plain Exercise Catalog page (admin-only affordance
// there, not the moderation queue) as a plain <form action>, so it
// returns void like clearWeight/removeFoodPreference - the moderation
// queue's own approve/delete instead return a result the client
// component can show inline.
export async function unapproveExercise(id: string): Promise<void> {
  return Sentry.withServerActionInstrumentation(
    'unapproveExercise',
    {},
    async () => {
      await apiFetch(`/admin/exercises/${id}/unapprove`, { method: 'POST' });
      revalidatePath('/[locale]/exercises', 'page');
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
        return { error: "Couldn't delete this exercise — try again." };
      }
    },
  );
}
