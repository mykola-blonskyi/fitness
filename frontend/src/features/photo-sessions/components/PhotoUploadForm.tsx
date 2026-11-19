'use client';

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FieldError } from '@shared/ui/components/FieldError';
import {
  confirmPhotoSession,
  requestUploadUrl,
} from '@features/photo-sessions/actions';

const MAX_PHOTOS = 3;
const MAX_PHOTO_MB = 10;
const MAX_SESSIONS_PER_DAY = 3;

export function PhotoUploadForm({ date }: { date: string }) {
  const t = useTranslations('PhotoSessions.uploadForm');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function onFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length > MAX_PHOTOS) {
      setError(t('maxPhotosError', { max: MAX_PHOTOS }));
      setFiles([]);
      event.target.value = '';
      return;
    }
    if (selected.some((file) => file.size > MAX_PHOTO_MB * 1024 * 1024)) {
      setError(t('tooLarge', { max: MAX_PHOTO_MB }));
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
      setError(t('selectAtLeastOne'));
      return;
    }

    setError(undefined);
    setIsSubmitting(true);
    try {
      const objectKeys: string[] = [];
      for (const file of files) {
        const target = await requestUploadUrl();
        if ('dailyLimitReached' in target) {
          setError(t('dailyLimit', { max: MAX_SESSIONS_PER_DAY }));
          return;
        }
        // Uploads straight to MinIO, bypassing this app's server - see
        // docs/architecture.md's "Photo upload + analysis" data flow. The
        // fields hold Content-Type as the policy's `image/` prefix; set, not append.
        const body = new FormData();
        for (const [key, value] of Object.entries(target.fields)) {
          body.append(key, value);
        }
        body.set('Content-Type', file.type);
        body.append('file', file);
        const res = await fetch(target.uploadUrl, { method: 'POST', body });
        if (!res.ok) {
          throw new Error('Upload failed');
        }
        objectKeys.push(target.objectKey);
      }

      await confirmPhotoSession(date, objectKeys);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    } catch {
      setError(t('uploadError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="photos" className="label">
          {t('photosLabel', { max: MAX_PHOTOS })}
        </label>
        <input
          ref={inputRef}
          id="photos"
          type="file"
          accept="image/*"
          multiple
          onChange={onFilesSelected}
          className="text-sm file:mr-3 file:rounded file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:font-medium"
        />
        <p className="text-xs text-muted">{t('photosHint')}</p>
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-primary">
        {isSubmitting ? t('uploading') : t('submit')}
      </button>

      <FieldError message={error} />
    </form>
  );
}
