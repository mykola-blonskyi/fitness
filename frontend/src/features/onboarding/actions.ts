'use server';

import { redirect } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import { apiFetch } from '@libs/api-client';
import type {
  ActivityLevel,
  Gender,
  Goal,
  UserProfile,
  UserProfileInput,
} from '@shared/types/user';

export interface OnboardingState {
  error?: string;
}

export async function completeOnboarding(
  _prevState: OnboardingState | undefined,
  formData: FormData,
): Promise<OnboardingState | undefined> {
  // Deliberately not passing `formData` here - Sentry's own docs describe
  // that option as "attach form data to events", which would put this
  // profile's name/date of birth/height into Sentry (ADR-006 explicitly
  // forbids this, and it happens on the transaction pipeline, which
  // sentry-shared.ts's beforeSend never even sees - only beforeSendTransaction does).
  const result = await Sentry.withServerActionInstrumentation(
    'completeOnboarding',
    {},
    async () => {
      const input: UserProfileInput = {
        name: String(formData.get('name') ?? '').trim(),
        gender: formData.get('gender') as Gender,
        dateOfBirth: String(formData.get('dateOfBirth') ?? ''),
        height: Number(formData.get('height')),
        goal: formData.get('goal') as Goal,
        activityLevel: formData.get('activityLevel') as ActivityLevel,
      };

      try {
        await apiFetch<UserProfile>('/users/me', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      } catch {
        return {
          error:
            "Couldn't save your profile — check your inputs and try again.",
        };
      }

      return undefined;
    },
  );

  if (result) return result;

  // TODO(FITNESS-11): locale-aware redirect once next-intl lands.
  // Outside the instrumentation callback - redirect() works by throwing,
  // and doing that inside withServerActionInstrumentation would report it
  // to Sentry as a real error.
  redirect('/en');
}
