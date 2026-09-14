import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import {
  setBaseline,
  type PhotoPose,
  type PhotoSession,
} from '@features/photo-sessions/actions';
import { fetchPhotoViewUrl } from '@features/photo-sessions/photo-view-url';
import { PhotoSessionReview } from './PhotoSessionReview';
import { RetryAnalysisButton } from './RetryAnalysisButton';

export async function PhotoSessionList({
  sessions,
}: {
  sessions: PhotoSession[];
}) {
  const t = await getTranslations('PhotoSessions');
  if (sessions.length === 0) {
    return <p className="text-sm text-muted">{t('list.empty')}</p>;
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
  const [t, tPoses, tAnalysis, photosWithUrls] = await Promise.all([
    getTranslations('PhotoSessions.list'),
    getTranslations('PhotoSessions.poses'),
    getTranslations('PhotoSessions.analysisStatus'),
    Promise.all(
      session.photos.map(async (photo) => ({
        photo,
        url: await fetchPhotoViewUrl(photo.id),
      })),
    ),
  ]);
  const poseLabel = (pose: PhotoPose | null) => tPoses(pose ?? 'unassigned');

  return (
    <li className="flex flex-col gap-3 border-b border-line pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{session.date}</span>
          {session.status === 'needs_review' && (
            <span className="rounded bg-warn-soft px-2 py-1 text-xs font-medium text-warn">
              {t('needsReview')}
            </span>
          )}
        </div>
        {session.isBaseline ? (
          <span className="rounded bg-surface-2 px-2 py-1 text-xs font-medium text-muted">
            {t('baseline')}
          </span>
        ) : (
          session.status === 'confirmed' && (
            <form action={setBaseline.bind(null, session.id)}>
              <button
                type="submit"
                className="text-xs text-muted underline hover:text-ink"
              >
                {t('markBaseline')}
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
                  alt={t('photoAlt', { pose: poseLabel(photo.pose) })}
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
              <span className="text-xs text-muted">
                {poseLabel(photo.pose)}
              </span>
              {session.status === 'confirmed' && (
                <>
                  <span
                    className={`text-xs ${
                      photo.analysisStatus === 'failed'
                        ? 'text-warn'
                        : 'text-muted'
                    }`}
                  >
                    {tAnalysis(photo.analysisStatus)}
                  </span>
                  {photo.analysisStatus !== 'completed' && (
                    <RetryAnalysisButton photoId={photo.id} />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </li>
  );
}
