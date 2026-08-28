'use client';

import { useState } from 'react';
import { weightSchema, type WeightInput } from '@shared/schemas/weight';
import { WEIGHT_UNITS, type WeightUnit } from '@shared/types/user';
import { FieldError } from '@shared/ui/components/FieldError';
import { useZodForm } from '@shared/libs/use-zod-form';
import { useLastWeightUnit } from '@shared/libs/use-last-weight-unit';
import { applyFormActionError } from '@shared/libs/apply-form-action-error';
import { clearWeight, type DailyLog } from '@features/daily-log/actions';
import { syncedSetWeight } from '@features/daily-log/offline';

export function WeightForm({
  date,
  dailyLog,
  defaultWeightUnit,
}: {
  date: string;
  dailyLog: DailyLog | null;
  defaultWeightUnit: WeightUnit;
}) {
  // Set (not replaced) when a submit gets queued instead of saved
  // immediately (FITNESS-13) - cleared on the next submit attempt so it
  // never lingers past a subsequent successful/errored save.
  const [queued, setQueued] = useState(false);

  // Falls back to the session/profile default only when today has no
  // weigh-in yet - re-editing today's entry always shows its own unit.
  const [rememberedUnit, rememberUnit] = useLastWeightUnit(defaultWeightUnit);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useZodForm<WeightInput>(weightSchema, {
    defaultValues: {
      weight: dailyLog?.weight ?? undefined,
      unit: dailyLog?.weightUnit ?? rememberedUnit,
    },
  });
  const unitField = register('unit');

  async function onSubmit(input: WeightInput) {
    setQueued(false);
    const outcome = await syncedSetWeight({ date, input });
    if (outcome.queued) {
      // Offline (or the request just failed on the network) - the
      // write is safely in IndexedDB and will flush automatically once
      // connectivity returns (see OfflineIndicator in the header for
      // sync status), not lost.
      setQueued(true);
      return;
    }
    applyFormActionError(setError, outcome.result);
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="weight" className="text-sm font-medium">
            Weight today
          </label>
          <div className="flex gap-2">
            <input
              id="weight"
              type="number"
              step="any"
              className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              {...register('weight', { valueAsNumber: true })}
            />
            <select
              id="unit"
              aria-label="Weight unit"
              className="rounded border border-zinc-300 px-2 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              {...unitField}
              onChange={(e) => {
                unitField.onChange(e);
                rememberUnit(e.target.value as WeightUnit);
              }}
            >
              {WEIGHT_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <FieldError message={errors.weight?.message} />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-foreground text-background rounded px-4 py-2 disabled:opacity-50"
        >
          {isSubmitting
            ? 'Saving…'
            : dailyLog?.weight != null
              ? 'Update'
              : 'Log'}
        </button>
      </form>

      <FieldError message={errors.root?.message} />

      {queued && (
        <p className="text-sm text-zinc-500" role="status">
          Saved offline — will sync automatically once you&apos;re back online.
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
