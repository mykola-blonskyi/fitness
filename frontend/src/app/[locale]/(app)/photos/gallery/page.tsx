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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-16">
      <div>
        <Link
          href={`/${locale}/photos`}
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          &larr; {t('galleryBackLink')}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{t('galleryHeading')}</h1>
      </div>

      <GalleryList sessions={sessions} locale={locale} />
    </main>
  );
}
