'use server';

import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
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

export type OnboardingState = FormActionError<UserProfileInput>;

export async function completeOnboarding(
  input: UserProfileInput,
): Promise<OnboardingState | undefined> {
  // Deliberately not passing `formData` here - Sentry's own docs describe
  // that option as "attach form data to events", which would put this
  // profile's name/date of birth/height into Sentry (ADR-006 explicitly
  // forbids this, and it happens on the transaction pipeline, which
  // sentry-shared.ts's beforeSend never even sees - only beforeSendTransaction does).
  const result = await submitFormAction({
    name: 'completeOnboarding',
    schema: userProfileSchema,
    input,
    errorMessage:
      "Couldn't save your profile — check your inputs and try again.",
    async mutate(parsed) {
      await apiFetch<UserProfile>('/users/me', {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      return undefined;
    },
  });

  if (result) return result;

  // Outside submitFormAction's instrumentation callback - redirect() works
  // by throwing, and doing that inside withServerActionInstrumentation
  // would report it to Sentry as a real error.
  const locale = await getLocale();
  redirect({ href: '/', locale });
}
