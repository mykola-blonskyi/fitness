import Image from 'next/image';
import { apiFetch } from '@libs/api-client';
import {
  setBaseline,
  type PhotoPose,
  type PhotoSession,
} from '@features/photo-sessions/actions';
import { PhotoSessionReview } from './PhotoSessionReview';

const POSE_LABELS: Record<PhotoPose, string> = {
  front: 'Front',
  side: 'Side',
  back: 'Back',
};

function poseLabel(pose: PhotoPose | null): string {
  return pose ? POSE_LABELS[pose] : 'Unassigned';
}

async function fetchViewUrl(photoId: string): Promise<string | null> {
  try {
    const { url } = await apiFetch<{ url: string }>(
      `/photo-sessions/photos/${photoId}/view`,
    );
    return url;
  } catch {
    return null;
  }
}

export async function PhotoSessionList({
  sessions,
}: {
  sessions: PhotoSession[];
}) {
  if (sessions.length === 0) {
    return <p className="text-sm text-zinc-500">No progress photos yet.</p>;
  }

  return (
    <ul className="flex w-full flex-col gap-6">
      {sessions.map((session) => (
        <PhotoSessionRow key={session.id} session={session} />
      ))}
    </ul>
  );
}

async function PhotoSessionRow({ session }: { session: PhotoSession }) {
  const photosWithUrls = await Promise.all(
    session.photos.map(async (photo) => ({
      photo,
      url: await fetchViewUrl(photo.id),
    })),
  );

  return (
    <li className="flex flex-col gap-3 border-b border-zinc-200 pb-6 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{session.date}</span>
          {session.status === 'needs_review' && (
            <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Needs review
            </span>
          )}
        </div>
        {session.isBaseline ? (
          <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            Baseline
          </span>
        ) : (
          session.status === 'confirmed' && (
            <form action={setBaseline.bind(null, session.id)}>
              <button
                type="submit"
                className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Mark as baseline
              </button>
            </form>
          )
        )}
      </div>

      {session.status === 'needs_review' ? (
        <PhotoSessionReview
          sessionId={session.id}
          photos={photosWithUrls.map(({ photo, url }) => ({
            id: photo.id,
            pose: photo.pose,
            url,
          }))}
        />
      ) : (
        <div className="flex gap-3">
          {photosWithUrls.map(({ photo, url }) => (
            <div key={photo.id} className="flex flex-col items-center gap-1">
              {url ? (
                <Image
                  src={url}
                  alt={`${poseLabel(photo.pose)} progress photo`}
                  width={96}
                  height={96}
                  className="size-24 rounded-md object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="size-24 rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
                />
              )}
              <span className="text-xs text-zinc-500">
                {poseLabel(photo.pose)}
              </span>
            </div>
          ))}
        </div>
      )}
    </li>
  );
}
