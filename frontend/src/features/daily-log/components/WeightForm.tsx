'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { weightSchema, type WeightInput } from '@shared/schemas/weight';
import { FieldError } from '@shared/ui/components/FieldError';
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
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WeightInput>({
    resolver: zodResolver(weightSchema),
    defaultValues: { weight: dailyLog?.weight ?? undefined },
    // Real-time field validation (on-blur, then on every change once a
    // field has an error) - react-hook-form defaults to submit-only.
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  async function onSubmit(input: WeightInput) {
    const result = await setWeight(date, input);
    if (result.error) {
      setError('root', { message: result.error });
    }
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      setError(field as keyof WeightInput, { message });
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="weight" className="text-sm font-medium">
            Weight today (kg)
          </label>
          <input
            id="weight"
            type="number"
            step="0.1"
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            {...register('weight', { valueAsNumber: true })}
          />
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
