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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-5 pb-10 md:px-7 md:py-6">
      <h1 className="text-2xl font-extrabold md:text-[26px]">
        {t('pageTitle')}
      </h1>

      <TrainingProgramList programs={programs} locale={locale} />

      <section className="card flex w-full flex-col gap-3 p-4 md:p-5">
        <h2 className="text-[15px] font-bold">{t('newProgramHeading')}</h2>
        <CreateTrainingProgramForm />
      </section>
    </main>
  );
}
