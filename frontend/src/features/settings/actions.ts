'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import { apiFetch } from '@libs/api-client';
import {
  userProfileSchema,
  type UserProfileInput,
} from '@shared/schemas/user-profile';
import { firstFieldErrors } from '@shared/schemas/zod-errors';
import type { UserProfile } from '@shared/types/user';

export interface UpdateProfileState {
  error?: string;
  fieldErrors?: Partial<Record<keyof UserProfileInput, string>>;
  success?: boolean;
}

export async function updateProfile(
  input: UserProfileInput,
): Promise<UpdateProfileState> {
  // No `formData` option - see the identical comment in
  // features/onboarding/actions.ts for why.
  return Sentry.withServerActionInstrumentation(
    'updateProfile',
    {},
    async () => {
      // react-hook-form's own zodResolver already validated client-side -
      // this is a defensive re-check, not the primary gate.
      const parsed = userProfileSchema.safeParse(input);
      if (!parsed.success) {
        return { fieldErrors: firstFieldErrors(parsed.error) };
      }

      try {
        await apiFetch<UserProfile>('/users/me', {
          method: 'PATCH',
          body: JSON.stringify(parsed.data),
        });
      } catch {
        return {
          error:
            "Couldn't save your profile — check your inputs and try again.",
        };
      }

      revalidatePath('/[locale]/settings/profile', 'page');
      return { success: true };
    },
  );
}
