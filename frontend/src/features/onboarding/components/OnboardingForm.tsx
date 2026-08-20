'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  userProfileSchema,
  type UserProfileInput,
} from '@shared/schemas/user-profile';
import { ProfileFields } from '@shared/ui/components/ProfileFields';
import { FieldError } from '@shared/ui/components/FieldError';
import { completeOnboarding } from '@features/onboarding/actions';

export function OnboardingForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserProfileInput>({
    resolver: zodResolver(userProfileSchema),
    // Real-time field validation (on-blur, then on every change once a
    // field has an error) - react-hook-form defaults to submit-only.
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  async function onSubmit(input: UserProfileInput) {
    const result = await completeOnboarding(input);
    if (!result) return; // success - completeOnboarding already redirected
    if (result.error) {
      setError('root', { message: result.error });
    }
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      setError(field as keyof UserProfileInput, { message });
    }
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
        {isSubmitting ? 'Saving…' : 'Complete profile'}
      </button>
    </form>
  );
}
