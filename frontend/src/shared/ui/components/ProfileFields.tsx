import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { UserProfileInput } from '@shared/schemas/user-profile';
import { ACTIVITY_LEVELS, GENDERS, GOALS } from '@shared/types/user';
import { FieldError } from '@shared/ui/components/FieldError';

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

// Shared by OnboardingForm and ProfileForm - both edit the same
// UserProfileInput shape via the same six fields, differing only in
// whether react-hook-form already has a real defaultValue for the three
// selects. Onboarding starts blank and needs a disabled placeholder
// option; Profile always opens with the existing profile's values (set
// via useForm's own defaultValues), so a placeholder would be wrong.
export function ProfileFields({
  register,
  errors,
  showPlaceholder = false,
}: {
  register: UseFormRegister<UserProfileInput>;
  errors: FieldErrors<UserProfileInput>;
  showPlaceholder?: boolean;
}) {
  return (
    <>
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
        <FieldError message={errors.name?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="gender" className="text-sm font-medium">
          Gender
        </label>
        <select
          id="gender"
          defaultValue={showPlaceholder ? '' : undefined}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('gender')}
        >
          {showPlaceholder && (
            <option value="" disabled>
              Select…
            </option>
          )}
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {g === 'male' ? 'Male' : 'Female'}
            </option>
          ))}
        </select>
        <FieldError message={errors.gender?.message} />
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
        <FieldError message={errors.dateOfBirth?.message} />
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
        <FieldError message={errors.height?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="goal" className="text-sm font-medium">
          Goal
        </label>
        <select
          id="goal"
          defaultValue={showPlaceholder ? '' : undefined}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('goal')}
        >
          {showPlaceholder && (
            <option value="" disabled>
              Select…
            </option>
          )}
          {GOALS.map((g) => (
            <option key={g} value={g}>
              {GOAL_LABELS[g]}
            </option>
          ))}
        </select>
        <FieldError message={errors.goal?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="activityLevel" className="text-sm font-medium">
          Activity level
        </label>
        <select
          id="activityLevel"
          defaultValue={showPlaceholder ? '' : undefined}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          {...register('activityLevel')}
        >
          {showPlaceholder && (
            <option value="" disabled>
              Select…
            </option>
          )}
          {ACTIVITY_LEVELS.map((a) => (
            <option key={a} value={a}>
              {ACTIVITY_LABELS[a]}
            </option>
          ))}
        </select>
        <FieldError message={errors.activityLevel?.message} />
      </div>
    </>
  );
}
