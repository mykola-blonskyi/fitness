'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createTrainingProgramSchema,
  type CreateTrainingProgramInput,
} from '@shared/schemas/training-program';
import { FieldError } from '@shared/ui/components/FieldError';
import { createTrainingProgram } from '@features/training-programs/actions';

export function CreateTrainingProgramForm() {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateTrainingProgramInput>({
    resolver: zodResolver(createTrainingProgramSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  async function onSubmit(input: CreateTrainingProgramInput) {
    const result = await createTrainingProgram(input);
    if (result.error) {
      setError('root', { message: result.error });
      return;
    }
    if (result.fieldErrors) {
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        setError(field as keyof CreateTrainingProgramInput, { message });
      }
      return;
    }
    reset();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-md flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          placeholder="e.g. Push/Pull/Legs"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('title')}
        />
        <FieldError message={errors.title?.message} />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-foreground text-background rounded px-4 py-2 disabled:opacity-50"
      >
        {isSubmitting ? 'Creating…' : 'Create program'}
      </button>

      <FieldError message={errors.root?.message} />
    </form>
  );
}
