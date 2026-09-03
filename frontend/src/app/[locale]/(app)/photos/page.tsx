import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PhotoSessionList, PhotoUploadForm } from '@features/photo-sessions';
import type { PhotoSession } from '@features/photo-sessions/actions';
import { apiFetch } from '@libs/api-client';
import { todayIso } from '@libs/date';

export default async function PhotosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('PhotoSessions');
  const date = todayIso();
  const sessions = await apiFetch<PhotoSession[]>('/photo-sessions');

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('pageTitle')}</h1>
      <PhotoUploadForm date={date} />

      <section className="flex w-full flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">{t('historyHeading')}</h2>
          <Link
            href={`/${locale}/photos/gallery`}
            className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            {t('viewGallery')}
          </Link>
        </div>
        <PhotoSessionList sessions={sessions} />
      </section>
    </main>
  );
}
