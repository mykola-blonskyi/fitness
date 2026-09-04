'use client';

import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import type { UserProfileInput } from '@shared/schemas/user-profile';
import {
  ACTIVITY_LEVELS,
  GENDERS,
  GOALS,
  LOCALES,
  MEAL_COUNTS,
  WEIGHT_UNITS,
} from '@shared/types/user';
import { FieldError } from '@shared/ui/components/FieldError';

// Native names, not English translations - a user looking for their own
// language should be able to find it without already reading English.
const LOCALE_LABELS: Record<(typeof LOCALES)[number], string> = {
  en: 'English',
  uk: 'Українська',
  ru: 'Русский',
  es: 'Español',
};

// Shared by OnboardingForm and ProfileForm - both edit the same
// UserProfileInput shape via the same fields, differing only in
// whether react-hook-form already has a real defaultValue for the
// selects. Onboarding starts blank and needs a disabled placeholder
// option for gender/goal/activityLevel (no sensible default exists);
// Profile always opens with the existing profile's values (set via
// useForm's own defaultValues), so a placeholder would be wrong there.
// locale, defaultWeightUnit, and mealCount never use the placeholder
// pattern, in either form - each has a legitimate schema default (see
// schema.ts's users columns), so those selects always open on a real,
// valid selection.
export function ProfileFields({
  register,
  errors,
  showPlaceholder = false,
}: {
  register: UseFormRegister<UserProfileInput>;
  errors: FieldErrors<UserProfileInput>;
  showPlaceholder?: boolean;
}) {
  const t = useTranslations('ProfileFields');
  return (
    <>
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="label">
          {t('name')}
        </label>
        <input id="name" type="text" className="input" {...register('name')} />
        <FieldError message={errors.name?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="gender" className="label">
          {t('gender')}
        </label>
        <select
          id="gender"
          defaultValue={showPlaceholder ? '' : undefined}
          className="input"
          {...register('gender')}
        >
          {showPlaceholder && (
            <option value="" disabled>
              {t('selectPlaceholder')}
            </option>
          )}
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {t(`genderOptions.${g}`)}
            </option>
          ))}
        </select>
        <FieldError message={errors.gender?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dateOfBirth" className="label">
          {t('dateOfBirth')}
        </label>
        <input
          id="dateOfBirth"
          type="date"
          className="input"
          {...register('dateOfBirth')}
        />
        <FieldError message={errors.dateOfBirth?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="height" className="label">
          {t('height')}
        </label>
        <input
          id="height"
          type="number"
          className="input"
          {...register('height', { valueAsNumber: true })}
        />
        <FieldError message={errors.height?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="goal" className="label">
          {t('goal')}
        </label>
        <select
          id="goal"
          defaultValue={showPlaceholder ? '' : undefined}
          className="input"
          {...register('goal')}
        >
          {showPlaceholder && (
            <option value="" disabled>
              {t('selectPlaceholder')}
            </option>
          )}
          {GOALS.map((g) => (
            <option key={g} value={g}>
              {t(`goalOptions.${g}`)}
            </option>
          ))}
        </select>
        <FieldError message={errors.goal?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="activityLevel" className="label">
          {t('activityLevel')}
        </label>
        <select
          id="activityLevel"
          defaultValue={showPlaceholder ? '' : undefined}
          className="input"
          {...register('activityLevel')}
        >
          {showPlaceholder && (
            <option value="" disabled>
              {t('selectPlaceholder')}
            </option>
          )}
          {ACTIVITY_LEVELS.map((a) => (
            <option key={a} value={a}>
              {t(`activityOptions.${a}`)}
            </option>
          ))}
        </select>
        <FieldError message={errors.activityLevel?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="mealCount" className="label">
          {t('mealsPerDay')}
        </label>
        <select
          id="mealCount"
          defaultValue={showPlaceholder ? 3 : undefined}
          className="input"
          {...register('mealCount', { valueAsNumber: true })}
        >
          {MEAL_COUNTS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <FieldError message={errors.mealCount?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="locale" className="label">
          {t('language')}
        </label>
        <select
          id="locale"
          defaultValue={showPlaceholder ? 'en' : undefined}
          className="input"
          {...register('locale')}
        >
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {LOCALE_LABELS[l]}
            </option>
          ))}
        </select>
        <FieldError message={errors.locale?.message} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="defaultWeightUnit" className="label">
          {t('weightUnit')}
        </label>
        <select
          id="defaultWeightUnit"
          defaultValue={showPlaceholder ? 'kg' : undefined}
          className="input"
          {...register('defaultWeightUnit')}
        >
          {WEIGHT_UNITS.map((u) => (
            <option key={u} value={u}>
              {t(`weightUnitOptions.${u}`)}
            </option>
          ))}
        </select>
        <FieldError message={errors.defaultWeightUnit?.message} />
      </div>
    </>
  );
}
