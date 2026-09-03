import { getTranslations } from 'next-intl/server';
import { WeightForm, WeightTrend, WeightTrendChart } from '@features/daily-log';
import {
  dateFromDayIndex,
  dayIndex,
} from '@features/daily-log/components/WeightTrendChart';
import type {
  DailyLog,
  WeightTrendResponse,
} from '@features/daily-log/actions';
import { apiFetch, fetchOr404 } from '@libs/api-client';
import { todayIso } from '@libs/date';
import { WEIGHT_TREND_WINDOWS } from '@shared/constants/daily-log';
import type { UserProfile } from '@shared/types/user';

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
  const dailyLog = await fetchOr404<DailyLog>(`/daily-logs/${date}`);

  const trend = await apiFetch<WeightTrendResponse>(
    `/daily-logs/weight-trend?days=${windowDays}`,
  );
  const profile = await apiFetch<UserProfile>('/users/me');

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('title', { date })}</h1>
      <WeightForm
        date={date}
        dailyLog={dailyLog}
        defaultWeightUnit={profile.defaultWeightUnit}
      />

      <section className="flex w-full flex-col gap-4">
        <WeightTrend windowDays={windowDays} locale={locale} />
        <WeightTrendChart
          points={trend.points}
          unit={trend.unit}
          windowStart={windowStart}
          windowEnd={date}
          windowDays={windowDays}
        />
      </section>
    </main>
  );
}
