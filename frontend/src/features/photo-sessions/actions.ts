'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { apiFetch } from '@libs/api-client';

export type PhotoPose = 'front' | 'side' | 'back';
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ProgressPhoto {
  id: string;
  pose: PhotoPose;
  analysisStatus: AnalysisStatus;
  createdAt: string;
}

export interface PhotoSession {
  id: string;
  date: string;
  isBaseline: boolean;
  createdAt: string;
  updatedAt: string;
  photos: ProgressPhoto[];
}

// Two-leg upload (docs/architecture.md's "Photo upload + analysis" data
// flow): this only mints the PUT URL - the browser uploads the file
// bytes directly to MinIO itself, never through this server.
export async function requestUploadUrl(
  pose: PhotoPose,
): Promise<{ objectKey: string; uploadUrl: string }> {
  return Sentry.withServerActionInstrumentation(
    'requestUploadUrl',
    {},
    async () =>
      apiFetch<{ objectKey: string; uploadUrl: string }>(
        `/photo-sessions/upload-url`,
        { method: 'POST', body: JSON.stringify({ pose }) },
      ),
  );
}

export async function confirmPhotoSession(
  date: string,
  photos: { pose: PhotoPose; objectKey: string }[],
): Promise<PhotoSession> {
  return Sentry.withServerActionInstrumentation(
    'confirmPhotoSession',
    {},
    async () => {
      const session = await apiFetch<PhotoSession>(`/photo-sessions/${date}`, {
        method: 'POST',
        body: JSON.stringify({ photos }),
      });
      revalidatePath('/[locale]/photos', 'page');
      return session;
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
