import { getTranslations } from 'next-intl/server';
import {
  CreateTrainingProgramForm,
  TrainingProgramList,
} from '@features/training-programs';
import type { TrainingProgram } from '@shared/types/training-program';
import { apiFetch } from '@libs/api-client';

export default async function TrainingProgramsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('Training');
  const programs = await apiFetch<TrainingProgram[]>('/training-programs');

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('pageTitle')}</h1>

      <TrainingProgramList programs={programs} locale={locale} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t('newProgramHeading')}</h2>
        <CreateTrainingProgramForm />
      </section>
    </main>
  );
}
