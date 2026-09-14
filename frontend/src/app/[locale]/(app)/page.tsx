import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { apiFetch, fetchOr404 } from '@libs/api-client';
import { todayIso } from '@libs/date';
import type {
  DailyLog,
  WeightTrendResponse,
} from '@features/daily-log/actions';
import type { CalorieTarget, DietResponse } from '@features/diet/actions';
import type { PhotoSession } from '@features/photo-sessions/actions';
import type { TrainingProgram } from '@shared/types/training-program';
import type { UserProfile } from '@shared/types/user';
import type { WorkoutLog } from '@shared/types/workout-log';
import { Page, PageHeader } from '@shared/ui/components/Page';
import { Ring } from '@shared/ui/components/Ring';
import { Skeleton } from '@shared/ui/components/Skeleton';
import { Sparkline } from '@shared/ui/components/Sparkline';
import {
  ArrowIcon,
  CameraIcon,
  DietIcon,
  FlameIcon,
  FoodIcon,
  PlusIcon,
  ScaleIcon,
  TrainingIcon,
} from '@shared/ui/icons';
import {
  dateFromDayIndex,
  dayIndex,
} from '@features/daily-log/components/WeightTrendChart';
import { ActiveBadge } from '@features/training-programs/components/ActiveBadge';

const SPAN = {
  weight: 'col-span-2 md:col-span-6 md:row-span-2 xl:col-span-5',
  calories: 'col-span-2 md:col-span-3 md:row-span-2 xl:col-span-3',
  macros: 'col-span-2 md:col-span-3 md:row-span-2 xl:col-span-4',
  week: 'col-span-2 md:col-span-6 xl:col-span-8',
  diary: 'col-span-2 md:col-span-3 md:row-span-2 xl:col-span-4 xl:row-span-1',
  training: 'col-span-2 md:col-span-3 md:row-span-2 xl:col-span-4',
  plan: 'col-span-2 md:col-span-4 md:row-span-2 xl:col-span-5',
  photos: 'col-span-2 md:col-span-2 md:row-span-2 xl:col-span-3',
};

function Tile({
  className = '',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`tile ${className}`}>{children}</div>;
}

function TileSkeleton({ span, lines }: { span: string; lines: number }) {
  return (
    <Tile className={`${span} justify-between`}>
      <Skeleton className="h-3 w-24" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="h-5 w-full" />
      ))}
    </Tile>
  );
}

function TileTitle({
  icon,
  children,
}: {
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-xs font-semibold text-muted">
      <span>{children}</span>
      {icon && (
        <span className="text-accent-strong [&>svg]:size-[18px]">{icon}</span>
      )}
    </div>
  );
}

function MacroBar({
  label,
  planned,
  target,
  colorClass,
}: {
  label: string;
  planned: number;
  target: number;
  colorClass: string;
}) {
  const ratio = target > 0 ? Math.min(1, planned / target) : 0;
  return (
    <div className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-2.5 text-xs">
      <span>{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-track">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <b className="whitespace-nowrap font-semibold tabular-nums text-muted">
        {Math.round(planned)} / {Math.round(target)} g
      </b>
    </div>
  );
}

// Monday-first week containing `today`.
function weekDays(today: string) {
  const todayIndex = dayIndex(today);
  const weekday = (new Date(today + 'T00:00:00Z').getUTCDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) =>
    dateFromDayIndex(todayIndex - weekday + i),
  );
}

async function WeightTile({ locale }: { locale: string }) {
  const t = await getTranslations('Home');
  const format = await getFormatter();
  const shortDate = (iso: string) =>
    format.dateTime(new Date(iso + 'T00:00:00Z'), {
      day: 'numeric',
      month: 'short',
    });
  const [latestWeighIn, trend] = await Promise.all([
    fetchOr404<DailyLog>('/daily-logs/latest-weigh-in'),
    apiFetch<WeightTrendResponse>('/daily-logs/weight-trend?days=30'),
  ]);

  return (
    <Tile className={`hero-tile ${SPAN.weight} justify-between border-0`}>
      <TileTitle icon={<ScaleIcon className="text-hero-accent" />}>
        <span className="text-hero-muted">{t('weight.label')}</span>
      </TileTitle>
      {latestWeighIn ? (
        <div>
          <div className="font-display text-[52px] font-extrabold leading-none tracking-tight md:text-[60px]">
            {latestWeighIn.weight}
            <small className="ml-1.5 text-xl font-semibold opacity-70">
              {latestWeighIn.weightUnit}
            </small>
          </div>
          <div className="mt-1 text-[13px] text-hero-muted">
            {t('weight.last', { date: shortDate(latestWeighIn.date) })}
          </div>
        </div>
      ) : (
        <div>
          <div className="font-display text-2xl font-extrabold">
            {t('weight.empty')}
          </div>
          <Link
            href={`/${locale}/diary`}
            className="text-[13px] text-hero-muted underline"
          >
            {t('weight.cta')}
          </Link>
        </div>
      )}
      <div className="text-hero-accent">
        <Sparkline values={trend.points.map((p) => p.weight)} />
      </div>
    </Tile>
  );
}

async function CaloriesTile({ locale }: { locale: string }) {
  const t = await getTranslations('Home');
  const [calorieTarget, diet] = await Promise.all([
    fetchOr404<CalorieTarget>('/calorie-targets'),
    fetchOr404<DietResponse>('/diets/current'),
  ]);

  return (
    <Tile
      className={`${SPAN.calories} items-center justify-center text-center`}
    >
      <TileTitle icon={<FlameIcon />}>
        <span className="self-stretch">{t('calories.label')}</span>
      </TileTitle>
      {calorieTarget && diet ? (
        <>
          <Ring
            value={diet.totalCalories / calorieTarget.calories}
            className="text-accent"
          >
            <b className="font-display text-[26px] font-extrabold tabular-nums text-ink">
              {Math.round(diet.totalCalories)}
            </b>
            <span className="text-xs text-muted">
              {t('calories.of', {
                target: Math.round(calorieTarget.calories),
              })}
            </span>
          </Ring>
          <span className="text-xs text-muted">
            {diet.totalCalories <= calorieTarget.calories
              ? t('calories.toSpare', {
                  kcal: Math.round(calorieTarget.calories - diet.totalCalories),
                })
              : t('calories.over', {
                  kcal: Math.round(diet.totalCalories - calorieTarget.calories),
                })}
          </span>
        </>
      ) : (
        <div className="flex flex-col gap-2 py-4">
          <span className="text-sm text-muted">
            {calorieTarget ? t('diet.targetNoMenu') : t('diet.noTarget')}
          </span>
          <Link
            href={calorieTarget ? `/${locale}/diet` : `/${locale}/diary`}
            className="btn-ghost btn-sm"
          >
            {calorieTarget ? t('diet.targetNoMenuCta') : t('diet.noTargetCta')}
          </Link>
        </div>
      )}
    </Tile>
  );
}

async function MacrosTile() {
  const t = await getTranslations('Home');
  const [calorieTarget, diet] = await Promise.all([
    fetchOr404<CalorieTarget>('/calorie-targets'),
    fetchOr404<DietResponse>('/diets/current'),
  ]);

  return (
    <Tile className={`${SPAN.macros} justify-between`}>
      <TileTitle icon={<DietIcon />}>{t('macros.label')}</TileTitle>
      {calorieTarget ? (
        <>
          <MacroBar
            label={t('macros.protein')}
            planned={diet?.totalProtein ?? 0}
            target={calorieTarget.proteinG}
            colorClass="bg-accent"
          />
          <MacroBar
            label={t('macros.carbs')}
            planned={diet?.totalCarbs ?? 0}
            target={calorieTarget.carbsG}
            colorClass="bg-accent-2"
          />
          <MacroBar
            label={t('macros.fat')}
            planned={diet?.totalFat ?? 0}
            target={calorieTarget.fatG}
            colorClass="bg-accent-3"
          />
          <span className="text-xs text-muted">
            {t('macros.basedOn', {
              algorithm: calorieTarget.algorithm.name,
              weight: calorieTarget.weighIn.weight,
              unit: calorieTarget.weighIn.unit,
            })}
          </span>
        </>
      ) : (
        <span className="text-sm text-muted">{t('diet.noTarget')}</span>
      )}
    </Tile>
  );
}

async function WeekTile() {
  const format = await getFormatter();
  const today = todayIso();
  const workoutLogs = await apiFetch<WorkoutLog[]>('/workout-logs');
  const workoutDates = new Set(workoutLogs.map((log) => log.date));

  return (
    <Tile className={`${SPAN.week} flex-row items-center gap-1`}>
      {weekDays(today).map((day) => {
        const isToday = day === today;
        const date = new Date(day + 'T00:00:00Z');
        return (
          <div
            key={day}
            className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-ctl py-1.5 text-[11px] font-semibold md:text-xs ${
              isToday ? 'bg-accent text-accent-ink' : 'text-muted'
            }`}
          >
            <span>{format.dateTime(date, { weekday: 'short' })}</span>
            <b
              className={`font-display text-base md:text-lg ${isToday ? '' : 'text-ink'}`}
            >
              {date.getUTCDate()}
            </b>
            <i
              className={`size-1.5 rounded-full ${
                workoutDates.has(day)
                  ? isToday
                    ? 'bg-accent-ink'
                    : 'bg-accent-strong'
                  : 'bg-track'
              }`}
              aria-hidden="true"
            />
          </div>
        );
      })}
    </Tile>
  );
}

async function DiaryTile({ locale }: { locale: string }) {
  const t = await getTranslations('Home');
  const todayLog = await fetchOr404<DailyLog>(`/daily-logs/${todayIso()}`);

  return (
    <Tile
      className={`${SPAN.diary} flex-row items-center justify-between border-0 bg-accent text-accent-ink`}
    >
      <div className="min-w-0">
        <div className="text-xs font-semibold opacity-75">
          {t('diary.label')}
        </div>
        <div className="font-display text-lg font-extrabold leading-tight">
          {todayLog ? t('diary.loggedToday') : t('diary.notLoggedToday')}
        </div>
      </div>
      <Link href={`/${locale}/diary`} className="btn-inverse btn-sm shrink-0">
        {t('diary.cta')}
        <ArrowIcon className="size-4" />
      </Link>
    </Tile>
  );
}

async function TrainingTile({ locale }: { locale: string }) {
  const t = await getTranslations('Home');
  const format = await getFormatter();
  const shortDate = (iso: string) =>
    format.dateTime(new Date(iso + 'T00:00:00Z'), {
      day: 'numeric',
      month: 'short',
    });
  const today = todayIso();
  const [programs, workoutLogs] = await Promise.all([
    apiFetch<TrainingProgram[]>('/training-programs'),
    apiFetch<WorkoutLog[]>('/workout-logs'),
  ]);

  const activeProgram =
    programs.find((p) => p.isActive && !p.isArchived) ?? null;
  // Backend orders by date desc, createdAt desc - [0] is today's log if
  // one was started, otherwise the most recent past one.
  const latestWorkout = workoutLogs[0] ?? null;

  return (
    <Tile className={`${SPAN.training} justify-between`}>
      <TileTitle icon={<TrainingIcon />}>{t('training.label')}</TileTitle>
      {activeProgram ? (
        <div>
          <div className="font-display text-lg font-extrabold leading-tight">
            {activeProgram.title} <ActiveBadge />
          </div>
          <div className="mt-1 text-xs text-muted">
            {latestWorkout
              ? latestWorkout.date === today
                ? t('workout.startedToday')
                : t('workout.lastNamed', {
                    title: latestWorkout.title,
                    date: shortDate(latestWorkout.date),
                    count: latestWorkout.sets.length,
                  })
              : t('workout.empty')}
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted">{t('training.empty')}</div>
      )}
      <Link
        href={
          latestWorkout?.date === today
            ? `/${locale}/workouts/${latestWorkout.id}`
            : activeProgram
              ? `/${locale}/workouts`
              : `/${locale}/training`
        }
        className="btn-inverse btn-sm self-start"
      >
        {latestWorkout?.date === today
          ? t('workout.continue')
          : activeProgram
            ? t('workout.cta')
            : t('training.cta')}
        <ArrowIcon className="size-4" />
      </Link>
    </Tile>
  );
}

async function PlanTile({ locale }: { locale: string }) {
  const t = await getTranslations('Home');
  const [calorieTarget, diet] = await Promise.all([
    fetchOr404<CalorieTarget>('/calorie-targets'),
    fetchOr404<DietResponse>('/diets/current'),
  ]);

  const meals = diet
    ? [...new Set(diet.items.map((item) => item.mealPosition))]
        .sort((a, b) => diet.mealOrder.indexOf(a) - diet.mealOrder.indexOf(b))
        .map((position) => {
          const items = diet.items.filter(
            (item) => item.mealPosition === position,
          );
          return {
            position,
            calories: items.reduce((sum, item) => sum + item.calories, 0),
            names: items.map((item) => item.foodItem.name),
          };
        })
    : [];
  const shownMeals = meals.slice(0, 3);
  const remainingCalories = meals
    .slice(3)
    .reduce((sum, meal) => sum + meal.calories, 0);

  return (
    <Tile className={SPAN.plan}>
      <TileTitle icon={<FoodIcon />}>
        {diet
          ? t('plan.label', { kcal: Math.round(diet.totalCalories) })
          : t('plan.labelEmpty')}
      </TileTitle>
      {diet ? (
        <>
          {shownMeals.map((meal) => (
            <div
              key={meal.position}
              className="flex items-center justify-between gap-3 border-t border-line-soft py-2 text-[13px]"
            >
              <span className="truncate">
                {t('plan.meal', { position: meal.position })} ·{' '}
                {meal.names.join(', ')}
              </span>
              <span className="whitespace-nowrap text-muted">
                {Math.round(meal.calories)} kcal
              </span>
            </div>
          ))}
          {meals.length > 3 && (
            <div className="flex items-center justify-between gap-3 border-t border-line-soft py-2 text-[13px]">
              <span>{t('plan.remaining', { count: meals.length - 3 })}</span>
              <span className="whitespace-nowrap text-muted">
                {Math.round(remainingCalories)} kcal
              </span>
            </div>
          )}
        </>
      ) : (
        <span className="text-sm text-muted">
          {calorieTarget ? t('diet.targetNoMenu') : t('diet.noTarget')}
        </span>
      )}
      <Link
        href={`/${locale}/diet`}
        className="btn-ghost btn-sm mt-auto self-start"
      >
        {t('plan.open')}
      </Link>
    </Tile>
  );
}

async function PhotosTile({ locale }: { locale: string }) {
  const t = await getTranslations('Home');
  const photoSessions = await apiFetch<PhotoSession[]>('/photo-sessions');
  const needsReviewCount = photoSessions.filter(
    (session) => session.status === 'needs_review',
  ).length;

  return (
    <Tile className={`${SPAN.photos} justify-between`}>
      <TileTitle icon={<CameraIcon />}>{t('photos.label')}</TileTitle>
      {needsReviewCount > 0 ? (
        <span className="self-start rounded-full bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn">
          {t('photos.needsReview', { count: needsReviewCount })}
        </span>
      ) : (
        <div className="font-display text-lg font-extrabold">
          {t('photos.allCaughtUp')}
        </div>
      )}
      <Link href={`/${locale}/photos`} className="btn-ghost btn-sm self-start">
        {t('photos.cta')}
        <PlusIcon className="size-4" />
      </Link>
    </Tile>
  );
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('Home');
  const format = await getFormatter();
  const today = todayIso();
  // (app)/layout.tsx already awaited this one, and repeated endpoints across
  // the tiles below collapse the same way - fetch memoization per render pass.
  const profile = await apiFetch<UserProfile>('/users/me');

  return (
    <Page>
      <PageHeader
        title={t('greeting', { name: profile.name || profile.email })}
        description={format.dateTime(new Date(today + 'T00:00:00Z'), {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
        actions={
          <Link href={`/${locale}/diary`} className="btn-primary">
            {t('actions.logWeight')}
            <PlusIcon className="size-[18px]" />
          </Link>
        }
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-6 md:gap-4 md:[grid-auto-rows:120px] xl:grid-cols-12">
        <Suspense fallback={<TileSkeleton span={SPAN.weight} lines={2} />}>
          <WeightTile locale={locale} />
        </Suspense>
        <Suspense fallback={<TileSkeleton span={SPAN.calories} lines={2} />}>
          <CaloriesTile locale={locale} />
        </Suspense>
        <Suspense fallback={<TileSkeleton span={SPAN.macros} lines={3} />}>
          <MacrosTile />
        </Suspense>
        <Suspense fallback={<TileSkeleton span={SPAN.week} lines={1} />}>
          <WeekTile />
        </Suspense>
        <Suspense fallback={<TileSkeleton span={SPAN.diary} lines={1} />}>
          <DiaryTile locale={locale} />
        </Suspense>
        <Suspense fallback={<TileSkeleton span={SPAN.training} lines={2} />}>
          <TrainingTile locale={locale} />
        </Suspense>
        <Suspense fallback={<TileSkeleton span={SPAN.plan} lines={3} />}>
          <PlanTile locale={locale} />
        </Suspense>
        <Suspense fallback={<TileSkeleton span={SPAN.photos} lines={2} />}>
          <PhotosTile locale={locale} />
        </Suspense>
      </section>
    </Page>
  );
}
