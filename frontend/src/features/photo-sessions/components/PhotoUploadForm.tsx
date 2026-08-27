'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { FieldError } from '@shared/ui/components/FieldError';
import {
  confirmPhotoSession,
  requestUploadUrl,
  type PhotoPose,
} from '@features/photo-sessions/actions';

const POSES: { value: PhotoPose; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'side', label: 'Side' },
  { value: 'back', label: 'Back' },
];

export function PhotoUploadForm({ date }: { date: string }) {
  const [files, setFiles] = useState<Partial<Record<PhotoPose, File>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const router = useRouter();

  function setFile(pose: PhotoPose, file: File | undefined) {
    setFiles((prev) => {
      const next = { ...prev };
      if (file) {
        next[pose] = file;
      } else {
        delete next[pose];
      }
      return next;
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const selected = Object.entries(files) as [PhotoPose, File][];
    if (selected.length === 0) {
      setError('Select at least one photo');
      return;
    }

    setError(undefined);
    setIsSubmitting(true);
    try {
      const confirmed: { pose: PhotoPose; objectKey: string }[] = [];
      for (const [pose, file] of selected) {
        const { objectKey, uploadUrl } = await requestUploadUrl(pose);
        // Uploads straight to MinIO, bypassing this app's server - see
        // docs/architecture.md's "Photo upload + analysis" data flow.
        const res = await fetch(uploadUrl, { method: 'PUT', body: file });
        if (!res.ok) {
          throw new Error(`Upload failed for ${pose}`);
        }
        confirmed.push({ pose, objectKey });
      }

      await confirmPhotoSession(date, confirmed);
      setFiles({});
      router.refresh();
    } catch {
      setError("Couldn't upload your photos — try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
      {POSES.map(({ value, label }) => (
        <div key={value} className="flex flex-col gap-1">
          <label htmlFor={`photo-${value}`} className="text-sm font-medium">
            {label}
          </label>
          <input
            id={`photo-${value}`}
            type="file"
            accept="image/*"
            onChange={(event) => setFile(value, event.target.files?.[0])}
            className="text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium dark:file:bg-zinc-800"
          />
        </div>
      ))}

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-foreground text-background rounded px-4 py-2 disabled:opacity-50"
      >
        {isSubmitting ? 'Uploading…' : 'Upload session'}
      </button>

      <FieldError message={error} />
    </form>
  );
}
