import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { GalleryList } from '@features/photo-sessions';
import type { PhotoSession } from '@features/photo-sessions/actions';
import { apiFetch } from '@libs/api-client';

export default async function PhotoGalleryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('PhotoSessions');
  const sessions = await apiFetch<PhotoSession[]>('/photo-sessions');

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-5 pb-10 md:px-7 md:py-6">
      <div>
        <Link
          href={`/${locale}/photos`}
          className="text-sm text-muted transition-colors hover:text-ink"
        >
          &larr; {t('galleryBackLink')}
        </Link>
        <h1 className="text-2xl font-extrabold md:text-[26px]">
          {t('galleryHeading')}
        </h1>
      </div>

      <GalleryList sessions={sessions} locale={locale} />
    </main>
  );
}
