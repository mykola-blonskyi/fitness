import { WeightForm } from '@features/daily-log';
import type { DailyLog } from '@features/daily-log/actions';
import { apiFetch, ApiError } from '@libs/api-client';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function DiaryPage() {
  const date = todayIso();

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

  return (
    <main className="flex flex-1 flex-col items-center gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Diary — {date}</h1>
      <WeightForm date={date} dailyLog={dailyLog} />
    </main>
  );
}
