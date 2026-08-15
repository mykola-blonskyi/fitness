'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/shared/libs/api-client';
import type {
  ActivityLevel,
  Gender,
  Goal,
  UserProfile,
} from '@/shared/types/user';

export interface UpdateProfileState {
  error?: string;
  success?: boolean;
}

export async function updateProfile(
  _prevState: UpdateProfileState | undefined,
  formData: FormData,
): Promise<UpdateProfileState> {
  try {
    await apiFetch<UserProfile>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({
        name: String(formData.get('name') ?? '').trim(),
        gender: formData.get('gender') as Gender,
        dateOfBirth: String(formData.get('dateOfBirth') ?? ''),
        height: Number(formData.get('height')),
        goal: formData.get('goal') as Goal,
        activityLevel: formData.get('activityLevel') as ActivityLevel,
      }),
    });
  } catch {
    return {
      error: "Couldn't save your profile — check your inputs and try again.",
    };
  }

  revalidatePath('/[locale]/settings/profile', 'page');
  return { success: true };
}
