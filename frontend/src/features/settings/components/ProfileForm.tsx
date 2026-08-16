'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  userProfileSchema,
  type UserProfileInput,
} from '@shared/schemas/user-profile';
import {
  ACTIVITY_LEVELS,
  GENDERS,
  GOALS,
  type UserProfile,
} from '@shared/types/user';
import { updateProfile } from '@features/settings/actions';

const GOAL_LABELS: Record<(typeof GOALS)[number], string> = {
  weight_loss: 'Weight loss',
  maintenance: 'Maintenance',
  muscle_gain: 'Muscle gain',
};

const ACTIVITY_LABELS: Record<(typeof ACTIVITY_LEVELS)[number], string> = {
  sedentary: 'Sedentary',
  light: 'Light',
  moderate: 'Moderate',
  active: 'Active',
  very_active: 'Very active',
};

export function ProfileForm({ profile }: { profile: UserProfile }) {
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserProfileInput>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      name: profile.name,
      gender: profile.gender,
      dateOfBirth: profile.dateOfBirth,
      height: profile.height,
      goal: profile.goal,
      activityLevel: profile.activityLevel,
    },
    // Real-time field validation (on-blur, then on every change once a
    // field has an error) - react-hook-form defaults to submit-only.
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  async function onSubmit(input: UserProfileInput) {
    setSaved(false);
    const result = await updateProfile(input);
    if (result.error) {
      setError('root', { message: result.error });
    }
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      setError(field as keyof UserProfileInput, { message });
    }
    if (result.success) setSaved(true);
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <p className="text-sm text-zinc-500">
        {profile.email} &middot; {profile.age} years old
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          type="text"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-red-600" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="gender" className="text-sm font-medium">
          Gender
        </label>
        <select
          id="gender"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('gender')}
        >
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {g === 'male' ? 'Male' : 'Female'}
            </option>
          ))}
        </select>
        {errors.gender && (
          <p className="text-sm text-red-600" role="alert">
            {errors.gender.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dateOfBirth" className="text-sm font-medium">
          Date of birth
        </label>
        <input
          id="dateOfBirth"
          type="date"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('dateOfBirth')}
        />
        {errors.dateOfBirth && (
          <p className="text-sm text-red-600" role="alert">
            {errors.dateOfBirth.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="height" className="text-sm font-medium">
          Height (cm)
        </label>
        <input
          id="height"
          type="number"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('height', { valueAsNumber: true })}
        />
        {errors.height && (
          <p className="text-sm text-red-600" role="alert">
            {errors.height.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="goal" className="text-sm font-medium">
          Goal
        </label>
        <select
          id="goal"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('goal')}
        >
          {GOALS.map((g) => (
            <option key={g} value={g}>
              {GOAL_LABELS[g]}
            </option>
          ))}
        </select>
        {errors.goal && (
          <p className="text-sm text-red-600" role="alert">
            {errors.goal.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="activityLevel" className="text-sm font-medium">
          Activity level
        </label>
        <select
          id="activityLevel"
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('activityLevel')}
        >
          {ACTIVITY_LEVELS.map((a) => (
            <option key={a} value={a}>
              {ACTIVITY_LABELS[a]}
            </option>
          ))}
        </select>
        {errors.activityLevel && (
          <p className="text-sm text-red-600" role="alert">
            {errors.activityLevel.message}
          </p>
        )}
      </div>

      {errors.root?.message && (
        <p className="text-sm text-red-600" role="alert">
          {errors.root.message}
        </p>
      )}
      {saved && !errors.root && (
        <p className="text-sm text-green-600" role="status">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-foreground text-background rounded px-4 py-2 disabled:opacity-50"
      >
        {isSubmitting ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
