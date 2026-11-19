'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { ApiError, apiFetch } from '@libs/api-client';

export type PhotoPose = 'front' | 'side' | 'back';
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PhotoSessionStatus =
  'uploading' | 'detecting' | 'needs_review' | 'confirmed';

export interface ProgressPhoto {
  id: string;
  pose: PhotoPose | null;
  analysisStatus: AnalysisStatus;
  alignmentData?: unknown;
  createdAt: string;
}

export interface PhotoSession {
  id: string;
  date: string;
  isBaseline: boolean;
  status: PhotoSessionStatus;
  createdAt: string;
  updatedAt: string;
  photos: ProgressPhoto[];
}

export interface UploadTarget {
  objectKey: string;
  uploadUrl: string;
  fields: Record<string, string>;
}

// Two-leg upload (docs/architecture.md's "Photo upload + analysis" data
// flow): this only mints the POST policy - the browser uploads the file
// bytes directly to MinIO itself, never through this server. The daily
// limit is returned, not thrown, since production hides a thrown message.
export async function requestUploadUrl(): Promise<
  UploadTarget | { dailyLimitReached: true }
> {
  return Sentry.withServerActionInstrumentation(
    'requestUploadUrl',
    {},
    async () => {
      try {
        return await apiFetch<UploadTarget>(`/photo-sessions/upload-url`, {
          method: 'POST',
        });
      } catch (err) {
        if (err instanceof ApiError && err.status === 429) {
          return { dailyLimitReached: true as const };
        }
        throw err;
      }
    },
  );
}

export async function confirmPhotoSession(
  date: string,
  objectKeys: string[],
): Promise<PhotoSession> {
  return Sentry.withServerActionInstrumentation(
    'confirmPhotoSession',
    {},
    async () => {
      const session = await apiFetch<PhotoSession>(`/photo-sessions/${date}`, {
        method: 'POST',
        body: JSON.stringify({
          photos: objectKeys.map((objectKey) => ({ objectKey })),
        }),
      });
      revalidatePath('/[locale]/photos', 'page');
      return session;
    },
  );
}

export async function confirmReview(
  sessionId: string,
  assignments: { photoId: string; pose: PhotoPose }[],
): Promise<PhotoSession> {
  return Sentry.withServerActionInstrumentation(
    'confirmReview',
    {},
    async () => {
      const session = await apiFetch<PhotoSession>(
        `/photo-sessions/${sessionId}/review`,
        { method: 'PATCH', body: JSON.stringify({ photos: assignments }) },
      );
      revalidatePath('/[locale]/photos', 'page');
      return session;
    },
  );
}

export async function retryPhotoAnalysis(photoId: string): Promise<void> {
  return Sentry.withServerActionInstrumentation(
    'retryPhotoAnalysis',
    {},
    async () => {
      await apiFetch<ProgressPhoto>(
        `/photo-sessions/photos/${photoId}/retry-analysis`,
        { method: 'POST' },
      );
      revalidatePath('/[locale]/photos', 'page');
    },
  );
}

// void return, not the updated session - bound directly into a <form
// action> (see PhotoSessionList.tsx), which requires void|Promise<void>.
export async function setBaseline(id: string): Promise<void> {
  return Sentry.withServerActionInstrumentation('setBaseline', {}, async () => {
    await apiFetch<PhotoSession>(`/photo-sessions/${id}/baseline`, {
      method: 'PATCH',
    });
    revalidatePath('/[locale]/photos', 'page');
  });
}

export async function deletePhotoSession(id: string): Promise<void> {
  return Sentry.withServerActionInstrumentation(
    'deletePhotoSession',
    {},
    async () => {
      await apiFetch<PhotoSession>(`/photo-sessions/${id}`, {
        method: 'DELETE',
      });
      revalidatePath('/[locale]/photos', 'page');
      revalidatePath('/[locale]/photos/gallery', 'page');
    },
  );
}
