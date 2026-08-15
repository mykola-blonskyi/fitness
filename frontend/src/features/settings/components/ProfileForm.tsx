'use client';

import { useActionState } from 'react';
import {
  ACTIVITY_LEVELS,
  GENDERS,
  GOALS,
  type UserProfile,
} from '@/shared/types/user';
import { updateProfile } from '../actions';

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
  const [state, formAction, pending] = useActionState(updateProfile, {
    error: undefined,
    success: undefined,
  });

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <p className="text-sm text-zinc-500">
        {profile.email} &middot; {profile.age} years old
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={profile.name}
          required
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="gender" className="text-sm font-medium">
          Gender
        </label>
        <select
          id="gender"
          name="gender"
          required
          defaultValue={profile.gender}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {g === 'male' ? 'Male' : 'Female'}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dateOfBirth" className="text-sm font-medium">
          Date of birth
        </label>
        <input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          defaultValue={profile.dateOfBirth}
          required
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="height" className="text-sm font-medium">
          Height (cm)
        </label>
        <input
          id="height"
          name="height"
          type="number"
          min={30}
          max={300}
          defaultValue={profile.height}
          required
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="goal" className="text-sm font-medium">
          Goal
        </label>
        <select
          id="goal"
          name="goal"
          required
          defaultValue={profile.goal}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {GOALS.map((g) => (
            <option key={g} value={g}>
              {GOAL_LABELS[g]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="activityLevel" className="text-sm font-medium">
          Activity level
        </label>
        <select
          id="activityLevel"
          name="activityLevel"
          required
          defaultValue={profile.activityLevel}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {ACTIVITY_LEVELS.map((a) => (
            <option key={a} value={a}>
              {ACTIVITY_LABELS[a]}
            </option>
          ))}
        </select>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600" role="status">
          Saved.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-foreground text-background rounded px-4 py-2 disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
