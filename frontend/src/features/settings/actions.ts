'use server';

import { revalidatePath } from 'next/cache';
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
  // No `formData` option - see the identical comment in
  // features/onboarding/actions.ts for why.
  return submitFormAction({
    name: 'updateProfile',
    schema: userProfileSchema,
    input,
    errorMessage:
      "Couldn't save your profile — check your inputs and try again.",
    async mutate(parsed) {
      await apiFetch<UserProfile>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(parsed),
      });
      revalidatePath('/[locale]/settings/profile', 'page');
      return { success: true };
    },
  });
}
