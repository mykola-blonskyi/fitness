import Link from 'next/link';
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { apiFetch, fetchOr404 } from '@libs/api-client';
import { todayIso } from '@libs/date';
import type { DailyLog } from '@features/daily-log/actions';
import type { CalorieTarget, DietResponse } from '@features/diet/actions';
import type { PhotoSession } from '@features/photo-sessions/actions';
import type { TrainingProgram } from '@shared/types/training-program';
import type { WorkoutLog } from '@shared/types/workout-log';

function DashboardCard({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded border border-zinc-200 p-4 transition-colors hover:border-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-700 dark:focus-visible:ring-zinc-100"
    >
      <span className="text-sm font-medium text-zinc-500">{label}</span>
      {children}
    </Link>
  );
}

function CardStat({ children }: { children: ReactNode }) {
  return <span className="text-lg font-semibold">{children}</span>;
}

function CardHint({ children }: { children: ReactNode }) {
  return <span className="text-sm text-zinc-500">{children}</span>;
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('Home');
  const today = todayIso();

  const [
    latestWeighIn,
    todayLog,
    calorieTarget,
    diet,
    programs,
    workoutLogs,
    photoSessions,
  ] = await Promise.all([
    fetchOr404<DailyLog>('/daily-logs/latest-weigh-in'),
    fetchOr404<DailyLog>(`/daily-logs/${today}`),
    fetchOr404<CalorieTarget>('/calorie-targets'),
    fetchOr404<DietResponse>('/diets/current'),
    apiFetch<TrainingProgram[]>('/training-programs'),
    apiFetch<WorkoutLog[]>('/workout-logs'),
    apiFetch<PhotoSession[]>('/photo-sessions'),
  ]);

  const activeProgramCount = programs.filter((p) => p.isActive).length;
  // Backend orders by date desc, createdAt desc - [0] is today's log if
  // one was started, otherwise the most recent past one.
  const latestWorkout = workoutLogs[0] ?? null;
  const needsReviewCount = photoSessions.filter(
    (session) => session.status === 'needs_review',
  ).length;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard href={`/${locale}/diary`} label={t('weight.label')}>
          {latestWeighIn ? (
            <>
              <CardStat>
                {t('weight.value', {
                  weight: latestWeighIn.weight ?? '',
                  unit: latestWeighIn.weightUnit ?? '',
                })}
              </CardStat>
              <CardHint>
                {t('weight.last', { date: latestWeighIn.date })}
              </CardHint>
            </>
          ) : (
            <>
              <CardHint>{t('weight.empty')}</CardHint>
              <CardHint>{t('weight.cta')}</CardHint>
            </>
          )}
        </DashboardCard>

        <DashboardCard href={`/${locale}/diary`} label={t('diary.label')}>
          {todayLog ? (
            <CardStat>{t('diary.loggedToday')}</CardStat>
          ) : (
            <>
              <CardHint>{t('diary.notLoggedToday')}</CardHint>
              <CardHint>{t('diary.cta')}</CardHint>
            </>
          )}
        </DashboardCard>

        <DashboardCard href={`/${locale}/diet`} label={t('diet.label')}>
          {!calorieTarget && (
            <>
              <CardHint>{t('diet.noTarget')}</CardHint>
              <CardHint>{t('diet.noTargetCta')}</CardHint>
            </>
          )}
          {calorieTarget && !diet && (
            <>
              <CardHint>{t('diet.targetNoMenu')}</CardHint>
              <CardHint>{t('diet.targetNoMenuCta')}</CardHint>
            </>
          )}
          {calorieTarget && diet && (
            <CardStat>
              {t('diet.value', {
                total: diet.totalCalories,
                target: calorieTarget.calories,
              })}
            </CardStat>
          )}
        </DashboardCard>

        <DashboardCard href={`/${locale}/training`} label={t('training.label')}>
          {activeProgramCount > 0 ? (
            <CardStat>
              {t('training.activeProgramCount', { count: activeProgramCount })}
            </CardStat>
          ) : (
            <>
              <CardHint>{t('training.empty')}</CardHint>
              <CardHint>{t('training.cta')}</CardHint>
            </>
          )}
        </DashboardCard>

        <DashboardCard
          href={
            latestWorkout
              ? `/${locale}/workouts/${latestWorkout.id}`
              : `/${locale}/workouts`
          }
          label={t('workout.label')}
        >
          {latestWorkout ? (
            <>
              <CardStat>
                {latestWorkout.date === today
                  ? t('workout.startedToday')
                  : t('workout.last', { date: latestWorkout.date })}
              </CardStat>
              <CardHint>
                {t('workout.setsLogged', {
                  count: latestWorkout.sets.length,
                })}
              </CardHint>
            </>
          ) : (
            <>
              <CardHint>{t('workout.empty')}</CardHint>
              <CardHint>{t('workout.cta')}</CardHint>
            </>
          )}
        </DashboardCard>

        <DashboardCard href={`/${locale}/photos`} label={t('photos.label')}>
          {needsReviewCount > 0 ? (
            <span className="flex items-center gap-2">
              <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                {t('photos.needsReview', { count: needsReviewCount })}
              </span>
            </span>
          ) : (
            <CardHint>{t('photos.allCaughtUp')}</CardHint>
          )}
        </DashboardCard>
      </div>
    </main>
  );
}
