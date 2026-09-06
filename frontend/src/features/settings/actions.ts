'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { apiFetch } from '@libs/api-client';
import {
  userProfileSchema,
  type UserProfileInput,
} from '@shared/schemas/user-profile';
import type { UserProfile } from '@shared/types/user';
import {
  submitFormAction,
  type FormActionError,
} from '@shared/libs/form-action';

export type UpdateProfileState = FormActionError<UserProfileInput> & {
  success?: boolean;
};

export async function updateProfile(
  input: UserProfileInput,
): Promise<UpdateProfileState> {
  const [tv, t] = await Promise.all([
    getTranslations('Validation'),
    getTranslations('Settings.errors'),
  ]);
  // No `formData` option - see the identical comment in
  // features/onboarding/actions.ts for why.
  return submitFormAction({
    name: 'updateProfile',
    schema: userProfileSchema(tv),
    input,
    errorMessage: t('saveFailed'),
    async mutate(parsed) {
      await apiFetch<UserProfile>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(parsed),
      });
      // Layout-wide, not just this page: the profile carries the locale
      // that catalog display names resolve against.
      revalidatePath('/', 'layout');
      return { success: true };
    },
  });
}
