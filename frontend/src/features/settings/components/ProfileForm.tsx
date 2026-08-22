'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  userProfileSchema,
  type UserProfileInput,
} from '@shared/schemas/user-profile';
import type { UserProfile } from '@shared/types/user';
import { ProfileFields } from '@shared/ui/components/ProfileFields';
import { FieldError } from '@shared/ui/components/FieldError';
import { updateProfile } from '@features/settings/actions';

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
      locale: profile.locale,
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

      <ProfileFields register={register} errors={errors} />

      <FieldError message={errors.root?.message} />
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
