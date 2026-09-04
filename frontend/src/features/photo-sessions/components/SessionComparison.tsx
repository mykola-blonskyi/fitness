import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import type {
  PhotoSession,
  ProgressPhoto,
} from '@features/photo-sessions/actions';
import { fetchPhotoViewUrl } from '@features/photo-sessions/photo-view-url';
import { pairPhotosByPose } from '@features/photo-sessions/photo-pairing';

interface PhotoWithUrl {
  photo: ProgressPhoto;
  url: string | null;
}

async function withUrl(
  photo: ProgressPhoto | null,
): Promise<PhotoWithUrl | null> {
  if (!photo) return null;
  return { photo, url: await fetchPhotoViewUrl(photo.id) };
}

export async function SessionComparison({
  session,
  baseline,
}: {
  session: PhotoSession;
  baseline: PhotoSession | null;
}) {
  const t = await getTranslations('PhotoSessions.comparison');

  if (!baseline) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">{t('noBaseline')}</p>
        <SessionPhotos session={session} />
      </div>
    );
  }

  if (baseline.id === session.id) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">{t('isBaseline')}</p>
        <SessionPhotos session={session} />
      </div>
    );
  }

  const tPoses = await getTranslations('PhotoSessions.poses');
  const pairs = pairPhotosByPose(baseline.photos, session.photos);
  const pairsWithUrls = await Promise.all(
    pairs.map(async (pair) => ({
      pose: pair.pose,
      baseline: await withUrl(pair.baseline),
      comparison: await withUrl(pair.comparison),
    })),
  );

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-muted">
          {t('baselineHeading', { date: baseline.date })}
        </h2>
        {pairsWithUrls.map((pair) => (
          <PhotoSlot
            key={pair.pose}
            label={tPoses(pair.pose)}
            entry={pair.baseline}
          />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-muted">{session.date}</h2>
        {pairsWithUrls.map((pair) => (
          <PhotoSlot
            key={pair.pose}
            label={tPoses(pair.pose)}
            entry={pair.comparison}
          />
        ))}
      </div>
    </div>
  );
}

async function SessionPhotos({ session }: { session: PhotoSession }) {
  const [tPoses, photosWithUrls] = await Promise.all([
    getTranslations('PhotoSessions.poses'),
    Promise.all(session.photos.map((photo) => withUrl(photo))),
  ]);

  return (
    <div className="flex gap-3">
      {photosWithUrls.map(
        (entry) =>
          entry && (
            <PhotoSlot
              key={entry.photo.id}
              label={tPoses(entry.photo.pose ?? 'unassigned')}
              entry={entry}
            />
          ),
      )}
    </div>
  );
}

async function PhotoSlot({
  label,
  entry,
}: {
  label: string;
  entry: PhotoWithUrl | null;
}) {
  const t = await getTranslations('PhotoSessions.list');
  return (
    <div className="flex flex-col items-center gap-1">
      {entry?.url ? (
        <Image
          src={entry.url}
          alt={t('photoAlt', { pose: label })}
          width={200}
          height={200}
          className="aspect-square w-full rounded-md object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="aspect-square w-full rounded-md border border-line bg-surface-2"
        />
      )}
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}
