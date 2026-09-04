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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-5 pb-10 md:px-7 md:py-6">
      <h1 className="text-2xl font-extrabold md:text-[26px]">
        {t('pageTitle')}
      </h1>
      <PhotoUploadForm date={date} />

      <section className="card flex w-full flex-col gap-4 p-4 md:p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold">{t('historyHeading')}</h2>
          <Link
            href={`/${locale}/photos/gallery`}
            className="text-sm text-muted underline hover:text-ink"
          >
            {t('viewGallery')}
          </Link>
        </div>
        <PhotoSessionList sessions={sessions} />
      </section>
    </main>
  );
}
