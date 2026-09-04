import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import {
  DeleteSessionButton,
  SessionComparison,
} from '@features/photo-sessions';
import type { PhotoSession } from '@features/photo-sessions/actions';
import { apiFetch } from '@libs/api-client';

export default async function PhotoGalleryDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations('PhotoSessions');
  const sessions = await apiFetch<PhotoSession[]>('/photo-sessions');

  const session = sessions.find((candidate) => candidate.id === id);
  // Same confirmed-only scope as GalleryList - see its comment for why.
  if (!session || session.status !== 'confirmed') {
    notFound();
  }

  const baseline = sessions.find((candidate) => candidate.isBaseline) ?? null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-5 pb-10 md:px-7 md:py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/${locale}/photos/gallery`}
            className="text-sm text-muted transition-colors hover:text-ink"
          >
            &larr; {t('galleryHeading')}
          </Link>
          <h1 className="text-2xl font-extrabold md:text-[26px]">
            {session.date}
          </h1>
        </div>
        <DeleteSessionButton
          sessionId={session.id}
          isBaseline={session.isBaseline}
          redirectTo={`/${locale}/photos/gallery`}
        />
      </div>

      <SessionComparison session={session} baseline={baseline} />
    </main>
  );
}
