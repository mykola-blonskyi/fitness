import Link from 'next/link';
import Image from 'next/image';
import type { PhotoSession } from '@features/photo-sessions/actions';
import { fetchPhotoViewUrl } from '@features/photo-sessions/photo-view-url';
import { groupSessionsByDate } from '@features/photo-sessions/session-grouping';
import { DeleteSessionButton } from './DeleteSessionButton';

export async function GalleryList({
  sessions,
  locale,
}: {
  sessions: PhotoSession[];
  locale: string;
}) {
  // Only confirmed sessions have final poses/are baseline-eligible - see
  // knowledge/business-rules.md "Photo pose is machine-suggested, then confirmed".
  const confirmed = sessions.filter(
    (session) => session.status === 'confirmed',
  );
  const pendingCount = sessions.length - confirmed.length;

  if (confirmed.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        {pendingCount > 0
          ? `${pendingCount} session${pendingCount === 1 ? '' : 's'} still need review on the Photos page before they can appear here.`
          : "No confirmed sessions yet — confirm a photo session's poses on the Photos page to see it here."}
      </p>
    );
  }

  const groups = groupSessionsByDate(confirmed);

  return (
    <div className="flex w-full flex-col gap-6">
      {pendingCount > 0 && (
        <p className="text-xs text-zinc-500">
          {pendingCount} session{pendingCount === 1 ? '' : 's'} still need
          review on the Photos page before they can appear here.
        </p>
      )}
      {groups.map((group) => (
        <section key={group.date} className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-500">{group.date}</h2>
          <ul className="flex flex-col gap-2">
            {group.sessions.map((session) => (
              <GalleryRow key={session.id} session={session} locale={locale} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

async function GalleryRow({
  session,
  locale,
}: {
  session: PhotoSession;
  locale: string;
}) {
  const cover =
    session.photos.find((photo) => photo.pose === 'front') ?? session.photos[0];
  const url = cover ? await fetchPhotoViewUrl(cover.id) : null;

  return (
    <li className="flex items-center gap-3 rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <Link
        href={`/${locale}/photos/gallery/${session.id}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        {url ? (
          <Image
            src={url}
            alt="Session cover photo"
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="size-12 shrink-0 rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
          />
        )}
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="text-sm">
            {session.photos.length}{' '}
            {session.photos.length === 1 ? 'photo' : 'photos'}
          </span>
          {session.isBaseline && (
            <span className="shrink-0 rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Baseline
            </span>
          )}
        </span>
      </Link>
      <DeleteSessionButton
        sessionId={session.id}
        isBaseline={session.isBaseline}
      />
    </li>
  );
}
