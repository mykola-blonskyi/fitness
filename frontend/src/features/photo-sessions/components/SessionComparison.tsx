import Image from 'next/image';
import type {
  PhotoPose,
  PhotoSession,
  ProgressPhoto,
} from '@features/photo-sessions/actions';
import { fetchPhotoViewUrl } from '@features/photo-sessions/photo-view-url';
import { pairPhotosByPose } from '@features/photo-sessions/photo-pairing';

const POSE_LABELS: Record<PhotoPose, string> = {
  front: 'Front',
  side: 'Side',
  back: 'Back',
};

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
  if (!baseline) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-500">
          No baseline session set yet — mark a confirmed session as baseline on
          the Photos page to compare against it.
        </p>
        <SessionPhotos session={session} />
      </div>
    );
  }

  if (baseline.id === session.id) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-500">This is your baseline session.</p>
        <SessionPhotos session={session} />
      </div>
    );
  }

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
        <h2 className="text-sm font-medium text-zinc-500">
          Baseline &middot; {baseline.date}
        </h2>
        {pairsWithUrls.map((pair) => (
          <PhotoSlot
            key={pair.pose}
            label={POSE_LABELS[pair.pose]}
            entry={pair.baseline}
          />
        ))}
      </div>
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-zinc-500">{session.date}</h2>
        {pairsWithUrls.map((pair) => (
          <PhotoSlot
            key={pair.pose}
            label={POSE_LABELS[pair.pose]}
            entry={pair.comparison}
          />
        ))}
      </div>
    </div>
  );
}

async function SessionPhotos({ session }: { session: PhotoSession }) {
  const photosWithUrls = await Promise.all(
    session.photos.map((photo) => withUrl(photo)),
  );

  return (
    <div className="flex gap-3">
      {photosWithUrls.map(
        (entry) =>
          entry && (
            <PhotoSlot
              key={entry.photo.id}
              label={
                entry.photo.pose ? POSE_LABELS[entry.photo.pose] : 'Unassigned'
              }
              entry={entry}
            />
          ),
      )}
    </div>
  );
}

function PhotoSlot({
  label,
  entry,
}: {
  label: string;
  entry: PhotoWithUrl | null;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {entry?.url ? (
        <Image
          src={entry.url}
          alt={`${label} progress photo`}
          width={200}
          height={200}
          className="aspect-square w-full rounded-md object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="aspect-square w-full rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
        />
      )}
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  );
}
