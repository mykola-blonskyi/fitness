'use server';

import { redirect } from 'next/navigation';
import { apiFetch } from '@/shared/libs/api-client';
import type {
  ActivityLevel,
  Gender,
  Goal,
  UserProfile,
  UserProfileInput,
} from '@/shared/types/user';

export interface OnboardingState {
  error?: string;
}

export async function completeOnboarding(
  _prevState: OnboardingState | undefined,
  formData: FormData,
): Promise<OnboardingState> {
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
      error: "Couldn't save your profile — check your inputs and try again.",
    };
  }

  // TODO(FITNESS-11): locale-aware redirect once next-intl lands.
  redirect('/en');
}
