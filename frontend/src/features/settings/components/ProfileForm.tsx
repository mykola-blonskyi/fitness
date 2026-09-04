'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  userProfileSchema,
  type UserProfileInput,
} from '@shared/schemas/user-profile';
import type { UserProfile } from '@shared/types/user';
import { ProfileFields } from '@shared/ui/components/ProfileFields';
import { FieldError } from '@shared/ui/components/FieldError';
import { useZodForm } from '@shared/libs/use-zod-form';
import { applyFormActionError } from '@shared/libs/apply-form-action-error';
import { updateProfile } from '@features/settings/actions';

export function ProfileForm({ profile }: { profile: UserProfile }) {
  const [saved, setSaved] = useState(false);
  const t = useTranslations('Settings.profileForm');
  const tv = useTranslations('Validation');
  const schema = useMemo(() => userProfileSchema(tv), [tv]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useZodForm<UserProfileInput>(schema, {
    defaultValues: {
      name: profile.name,
      gender: profile.gender,
      dateOfBirth: profile.dateOfBirth,
      height: profile.height,
      goal: profile.goal,
      activityLevel: profile.activityLevel,
      mealCount: profile.mealCount,
      locale: profile.locale,
      defaultWeightUnit: profile.defaultWeightUnit,
    },
  });

  async function onSubmit(input: UserProfileInput) {
    setSaved(false);
    const result = await updateProfile(input);
    if (!applyFormActionError(setError, result)) setSaved(true);
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <p className="text-sm text-muted">
        {t('emailAge', { email: profile.email, age: profile.age })}
      </p>

      <ProfileFields register={register} errors={errors} />

      <FieldError message={errors.root?.message} />
      {saved && !errors.root && (
        <p className="text-sm text-ok" role="status">
          {t('saved')}
        </p>
      )}

      <button type="submit" disabled={isSubmitting} className="btn-primary">
        {isSubmitting ? t('saving') : t('submit')}
      </button>
    </form>
  );
}
