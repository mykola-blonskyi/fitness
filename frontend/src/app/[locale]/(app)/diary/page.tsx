import { WeightForm, WeightTrend, WeightTrendChart } from '@features/daily-log';
import {
  dateFromDayIndex,
  dayIndex,
} from '@features/daily-log/components/WeightTrendChart';
import type { DailyLog, WeightTrendPoint } from '@features/daily-log/actions';
import { apiFetch, ApiError } from '@libs/api-client';
import { WEIGHT_TREND_WINDOWS } from '@shared/constants/daily-log';

type WeightTrendWindow = (typeof WEIGHT_TREND_WINDOWS)[number];
const DEFAULT_WEIGHT_TREND_WINDOW: WeightTrendWindow = 30;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

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

  let dailyLog: DailyLog | null = null;
  try {
    dailyLog = await apiFetch<DailyLog>(`/daily-logs/${date}`);
  } catch (err) {
    // No Daily Log for today yet is expected, not an error — anything
    // else (auth failure, backend down) should surface as a real error.
    if (!(err instanceof ApiError && err.status === 404)) {
      throw err;
    }
    dailyLog = null;
  }

  const trend = await apiFetch<WeightTrendPoint[]>(
    `/daily-logs/weight-trend?days=${windowDays}`,
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">Diary — {date}</h1>
      <WeightForm date={date} dailyLog={dailyLog} />

      <section className="flex w-full flex-col gap-4">
        <WeightTrend windowDays={windowDays} locale={locale} />
        <WeightTrendChart
          points={trend}
          windowStart={windowStart}
          windowEnd={date}
          windowDays={windowDays}
        />
      </section>
    </main>
  );
}
