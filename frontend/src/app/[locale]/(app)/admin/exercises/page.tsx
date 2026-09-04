import { getTranslations } from 'next-intl/server';
import { AdminNav } from '@features/admin';
import { AdminExerciseQueue } from '@features/admin-exercises';
import { apiFetch } from '@libs/api-client';
import type { AdminExercise, CursorPage } from '@shared/types/admin';

export default async function AdminExercisesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('Admin.exercisesPage');
  const firstPage =
    await apiFetch<CursorPage<AdminExercise>>('/admin/exercises');

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-5 pb-10 md:px-7 md:py-6">
      <AdminNav locale={locale} active="exercises" />
      <h1 className="text-2xl font-extrabold md:text-[26px]">{t('title')}</h1>
      <AdminExerciseQueue
        initialItems={firstPage.items}
        initialCursor={firstPage.nextCursor}
      />
    </main>
  );
}
