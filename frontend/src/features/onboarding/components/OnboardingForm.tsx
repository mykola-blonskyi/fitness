'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  userProfileSchema,
  type UserProfileInput,
} from '@shared/schemas/user-profile';
import { ProfileFields } from '@shared/ui/components/ProfileFields';
import { FieldError } from '@shared/ui/components/FieldError';
import { useZodForm } from '@shared/libs/use-zod-form';
import { applyFormActionError } from '@shared/libs/apply-form-action-error';
import { completeOnboarding } from '@features/onboarding/actions';

export function OnboardingForm() {
  const t = useTranslations('Onboarding');
  const tv = useTranslations('Validation');
  const schema = useMemo(() => userProfileSchema(tv), [tv]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useZodForm(schema);

  async function onSubmit(input: UserProfileInput) {
    const result = await completeOnboarding(input);
    if (!result) return; // success - completeOnboarding already redirected
    applyFormActionError(setError, result);
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <ProfileFields register={register} errors={errors} showPlaceholder />

      <FieldError message={errors.root?.message} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-foreground text-background rounded px-4 py-2 disabled:opacity-50"
      >
        {isSubmitting ? t('saving') : t('submit')}
      </button>
    </form>
  );
}
