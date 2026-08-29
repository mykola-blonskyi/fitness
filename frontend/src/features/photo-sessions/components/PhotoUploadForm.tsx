'use client';

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { FieldError } from '@shared/ui/components/FieldError';
import {
  confirmPhotoSession,
  requestUploadUrl,
} from '@features/photo-sessions/actions';

const MAX_PHOTOS = 3;

export function PhotoUploadForm({ date }: { date: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function onFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length > MAX_PHOTOS) {
      setError(`Pick at most ${MAX_PHOTOS} photos`);
      setFiles([]);
      event.target.value = '';
      return;
    }
    setError(undefined);
    setFiles(selected);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (files.length === 0) {
      setError('Select at least one photo');
      return;
    }

    setError(undefined);
    setIsSubmitting(true);
    try {
      const objectKeys: string[] = [];
      for (const file of files) {
        const { objectKey, uploadUrl } = await requestUploadUrl();
        // Uploads straight to MinIO, bypassing this app's server - see
        // docs/architecture.md's "Photo upload + analysis" data flow.
        const res = await fetch(uploadUrl, { method: 'PUT', body: file });
        if (!res.ok) {
          throw new Error('Upload failed');
        }
        objectKeys.push(objectKey);
      }

      await confirmPhotoSession(date, objectKeys);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    } catch {
      setError("Couldn't upload your photos — try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="photos" className="text-sm font-medium">
          Photos (up to {MAX_PHOTOS})
        </label>
        <input
          ref={inputRef}
          id="photos"
          type="file"
          accept="image/*"
          multiple
          onChange={onFilesSelected}
          className="text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium dark:file:bg-zinc-800"
        />
        <p className="text-xs text-zinc-500">
          Front, side, and back — we&apos;ll sort out which is which.
        </p>
      </div>

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
