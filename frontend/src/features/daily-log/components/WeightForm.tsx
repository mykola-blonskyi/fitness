'use client';

import { useActionState } from 'react';
import {
  clearWeight,
  setWeight,
  type DailyLog,
} from '@features/daily-log/actions';

export function WeightForm({
  date,
  dailyLog,
}: {
  date: string;
  dailyLog: DailyLog | null;
}) {
  const [state, formAction, pending] = useActionState(
    setWeight.bind(null, date),
    {},
  );

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <form action={formAction} className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="weight" className="text-sm font-medium">
            Weight today (kg)
          </label>
          <input
            id="weight"
            name="weight"
            type="number"
            step="0.1"
            min={0.1}
            defaultValue={dailyLog?.weight ?? undefined}
            required
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="bg-foreground text-background rounded px-4 py-2 disabled:opacity-50"
        >
          {pending ? 'Saving…' : dailyLog?.weight != null ? 'Update' : 'Log'}
        </button>
      </form>

      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      {dailyLog?.weight != null && (
        <form action={clearWeight.bind(null, date)}>
          <button
            type="submit"
            className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Remove today&apos;s weigh-in
          </button>
        </form>
      )}
    </div>
  );
}
