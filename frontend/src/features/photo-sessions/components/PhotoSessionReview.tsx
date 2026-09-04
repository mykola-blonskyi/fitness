'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FieldError } from '@shared/ui/components/FieldError';
import {
  confirmReview,
  type PhotoPose,
} from '@features/photo-sessions/actions';

const POSE_VALUES: PhotoPose[] = ['front', 'side', 'back'];

export interface ReviewPhoto {
  id: string;
  pose: PhotoPose | null;
  url: string | null;
}

export function PhotoSessionReview({
  sessionId,
  photos,
}: {
  sessionId: string;
  photos: ReviewPhoto[];
}) {
  const t = useTranslations('PhotoSessions.review');
  const tPoses = useTranslations('PhotoSessions.poses');
  const [assignments, setAssignments] = useState<
    Record<string, PhotoPose | ''>
  >(() => Object.fromEntries(photos.map((p) => [p.id, p.pose ?? ''])));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const router = useRouter();

  const chosen = photos.map((p) => assignments[p.id]);
  const allSet = chosen.every((pose) => pose !== '');
  const allDistinct = new Set(chosen).size === chosen.length;
  const canConfirm = allSet && allDistinct && !isSubmitting;

  async function onConfirm() {
    setError(undefined);
    setIsSubmitting(true);
    try {
      await confirmReview(
        sessionId,
        photos.map((p) => ({
          photoId: p.id,
          pose: assignments[p.id] as PhotoPose,
        })),
      );
      router.refresh();
    } catch {
      setError(t('saveError'));
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">{t('guessHint')}</p>

      <div className="flex flex-wrap gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="flex flex-col items-center gap-1">
            {photo.url ? (
              <Image
                src={photo.url}
                alt={t('altText')}
                width={96}
                height={96}
                className="size-24 rounded-md object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="size-24 rounded-md border border-line bg-surface-2"
              />
            )}
            <label className="sr-only" htmlFor={`pose-${photo.id}`}>
              {t('poseSrLabel')}
            </label>
            <select
              id={`pose-${photo.id}`}
              value={assignments[photo.id]}
              onChange={(event) =>
                setAssignments((prev) => ({
                  ...prev,
                  [photo.id]: event.target.value as PhotoPose | '',
                }))
              }
              className="rounded border border-line bg-transparent px-2 py-1 text-xs"
            >
              <option value="">{t('choosePlaceholder')}</option>
              {POSE_VALUES.map((pose) => (
                <option key={pose} value={pose}>
                  {tPoses(pose)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {allSet && !allDistinct && (
        <p className="text-xs text-warn">{t('duplicatePoseError')}</p>
      )}

      <button
        type="button"
        onClick={onConfirm}
        disabled={!canConfirm}
        className="btn-primary self-start"
      >
        {isSubmitting ? t('confirming') : t('submit')}
      </button>

      <FieldError message={error} />
    </div>
  );
}
