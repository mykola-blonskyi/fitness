import Link from 'next/link';
import type { ReactNode } from 'react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { WeightForm, WeightTrend, WeightTrendChart } from '@features/daily-log';
import {
  dateFromDayIndex,
  dayIndex,
} from '@features/daily-log/components/WeightTrendChart';
import type {
  DailyLog,
  WeightTrendResponse,
} from '@features/daily-log/actions';
import type { DietResponse } from '@features/diet/actions';
import { apiFetch, fetchOr404 } from '@libs/api-client';
import { todayIso } from '@libs/date';
import { WEIGHT_TREND_WINDOWS } from '@shared/constants/daily-log';
import type { TrainingProgram } from '@shared/types/training-program';
import type { UserProfile } from '@shared/types/user';
import type { WorkoutLog } from '@shared/types/workout-log';
import { Page } from '@shared/ui/components/Page';
import {
  ArrowIcon,
  CameraIcon,
  CheckIcon,
  FoodIcon,
  ScaleIcon,
  TrainingIcon,
} from '@shared/ui/icons';

type WeightTrendWindow = (typeof WEIGHT_TREND_WINDOWS)[number];
const DEFAULT_WEIGHT_TREND_WINDOW: WeightTrendWindow = 30;

// Built on the same dayIndex()/dateFromDayIndex() pair the chart uses to
// position points - one definition of "one day" for the whole feature,
// rather than a second UTC date computation that could drift from it.
// Also matches the backend's own UTC-based window math (see
// daily-logs.service.ts's getWeightTrend), so the chart's x-axis bounds
// stay in lockstep with which rows the backend actually returned.
function windowStartIso(endIso: string, days: number): string {
  return dateFromDayIndex(dayIndex(endIso) - (days - 1));
}

function parseWindow(raw: string | undefined): WeightTrendWindow {
  const parsed = Number(raw);
  return (WEIGHT_TREND_WINDOWS as readonly number[]).includes(parsed)
    ? (parsed as WeightTrendWindow)
    : DEFAULT_WEIGHT_TREND_WINDOW;
}

function Entry({
  label,
  icon,
  state,
  children,
}: {
  label: string;
  icon: ReactNode;
  state: 'todo' | 'done' | 'now';
  children: ReactNode;
}) {
  const dot = {
    todo: 'border-line bg-surface text-muted',
    done: 'border-accent bg-accent text-accent-ink',
    now: 'border-inv bg-inv text-inv-ink',
  }[state];
  return (
    <div className="relative grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 pb-4 last:pb-0 md:grid-cols-[76px_24px_minmax(0,1fr)]">
      <span className="hidden pt-3 text-right text-xs font-semibold text-muted md:block">
        {label}
      </span>
      <span
        className={`z-10 mt-3 flex size-6 items-center justify-center rounded-full border-2 [&>svg]:size-3.5 ${dot}`}
        aria-hidden="true"
      >
        {state === 'done' ? <CheckIcon /> : icon}
      </span>
      <span
        className="absolute bottom-0 left-[11px] top-9 w-0.5 bg-line-soft md:left-[99px] [.last-entry_&]:hidden"
        aria-hidden="true"
      />
      <div
        className={`card flex flex-col gap-2 p-4 ${
          state === 'todo'
            ? 'border-2 border-dashed border-line bg-transparent shadow-none'
            : ''
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export default async function DiaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { locale } = await params;
  const { days: daysParam } = await searchParams;
  const windowDays = parseWindow(daysParam);
  const date = todayIso();
  const windowStart = windowStartIso(date, windowDays);

  const t = await getTranslations('Diary');
  const format = await getFormatter();

  const [dailyLog, trend, profile, diet, programs, workoutLogs] =
    await Promise.all([
      fetchOr404<DailyLog>(`/daily-logs/${date}`),
      apiFetch<WeightTrendResponse>(
        `/daily-logs/weight-trend?days=${windowDays}`,
      ),
      apiFetch<UserProfile>('/users/me'),
      fetchOr404<DietResponse>('/diets/current'),
      apiFetch<TrainingProgram[]>('/training-programs'),
      apiFetch<WorkoutLog[]>('/workout-logs'),
    ]);

  const activeProgram =
    programs.find((p) => p.isActive && !p.isArchived) ?? null;
  const todayWorkout = workoutLogs.find((log) => log.date === date) ?? null;
  const meals = diet
    ? [...new Set(diet.items.map((item) => item.mealPosition))]
        .sort((a, b) => diet.mealOrder.indexOf(a) - diet.mealOrder.indexOf(b))
        .map((position) => ({
          position,
          items: diet.items
            .filter((item) => item.mealPosition === position)
            .sort((a, b) => a.orderIndex - b.orderIndex),
        }))
    : [];

  return (
    <Page narrow>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="kicker">{t('kicker')}</span>
          <h1 className="text-3xl font-extrabold md:text-[40px] md:leading-none">
            {format.dateTime(new Date(date + 'T00:00:00Z'), {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            })}
          </h1>
        </div>
      </div>

      <section className="card p-4">
        <WeightForm
          date={date}
          dailyLog={dailyLog}
          defaultWeightUnit={profile.defaultWeightUnit}
        />
      </section>

      <section className="flex flex-col">
        <Entry
          label={t('timeline.morning')}
          icon={<ScaleIcon />}
          state={dailyLog?.weight != null ? 'done' : 'todo'}
        >
          <div className="flex items-center justify-between gap-3">
            <b className="shrink-0 font-display text-[15px] font-bold">
              {t('timeline.weighIn')}
            </b>
            <span className="text-right text-xs text-muted">
              {dailyLog?.weight != null
                ? `${dailyLog.weight} ${dailyLog.weightUnit}`
                : t('timeline.weighInHint')}
            </span>
          </div>
        </Entry>

        {meals.map((meal) => {
          const calories = meal.items.reduce(
            (sum, item) => sum + item.calories,
            0,
          );
          return (
            <Entry
              key={meal.position}
              label={t('timeline.meal', { position: meal.position })}
              icon={<FoodIcon />}
              state="todo"
            >
              <div className="flex items-center justify-between gap-3">
                <b className="font-display text-[15px] font-bold">
                  {t('timeline.meal', { position: meal.position })} ·{' '}
                  {Math.round(calories)} kcal
                </b>
                <Link href={`/${locale}/diet`} className="btn-ghost btn-sm">
                  {t('timeline.edit')}
                </Link>
              </div>
              {meal.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 border-t border-line-soft pt-2 text-[13px]"
                >
                  <span className="min-w-0 truncate">{item.foodItem.name}</span>
                  <span className="whitespace-nowrap text-muted">
                    {item.weightGrams} g · {Math.round(item.calories)} kcal
                  </span>
                </div>
              ))}
            </Entry>
          );
        })}
        {!diet && (
          <Entry label={t('timeline.meals')} icon={<FoodIcon />} state="todo">
            <div className="flex items-center justify-between gap-3">
              <b className="font-display text-[15px] font-bold">
                {t('timeline.meals')}
              </b>
              <Link href={`/${locale}/diet`} className="btn-ghost btn-sm">
                {t('timeline.openDiet')}
              </Link>
            </div>
            <span className="text-xs text-muted">{t('timeline.noDiet')}</span>
          </Entry>
        )}

        <Entry
          label={t('timeline.evening')}
          icon={<TrainingIcon />}
          state={todayWorkout ? 'done' : activeProgram ? 'now' : 'todo'}
        >
          <div className="flex items-center justify-between gap-3">
            <b className="font-display text-[15px] font-bold">
              {todayWorkout
                ? todayWorkout.title
                : activeProgram
                  ? t('timeline.workoutWith', { program: activeProgram.title })
                  : t('timeline.workout')}
            </b>
            <Link
              href={
                todayWorkout
                  ? `/${locale}/workouts/${todayWorkout.id}`
                  : `/${locale}/workouts`
              }
              className="btn-inverse btn-sm"
            >
              {todayWorkout
                ? t('timeline.continueWorkout')
                : t('timeline.startWorkout')}
              <ArrowIcon className="size-4" />
            </Link>
          </div>
          {todayWorkout && (
            <span className="text-xs text-muted">
              {t('timeline.setsLogged', { count: todayWorkout.sets.length })}
            </span>
          )}
        </Entry>

        <div className="last-entry">
          <Entry
            label={t('timeline.anytime')}
            icon={<CameraIcon />}
            state="todo"
          >
            <div className="flex items-center justify-between gap-3">
              <b className="font-display text-[15px] font-bold">
                {t('timeline.photo')}
              </b>
              <Link href={`/${locale}/photos`} className="btn-ghost btn-sm">
                {t('timeline.addPhoto')}
              </Link>
            </div>
            <span className="text-xs text-muted">
              {t('timeline.photoHint')}
            </span>
          </Entry>
        </div>
      </section>

      <section className="card flex w-full flex-col gap-4 p-4">
        <WeightTrend windowDays={windowDays} locale={locale} />
        <WeightTrendChart
          points={trend.points}
          unit={trend.unit}
          windowStart={windowStart}
          windowEnd={date}
          windowDays={windowDays}
        />
      </section>
    </Page>
  );
}
