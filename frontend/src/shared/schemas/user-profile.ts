import * as z from 'zod';
import {
  ACTIVITY_LEVELS,
  GENDERS,
  GOALS,
  LOCALES,
  MEAL_COUNTS,
  WEIGHT_UNITS,
} from '@shared/types/user';
import type { ValidationTranslator } from '@shared/schemas/validation-translator';

// Mirrors backend/src/users/dto/create-user.dto.ts by hand — the backend
// DTO stays authoritative, this is a client-side UX layer only.
// avatarUrl is omitted - no UI sets it yet.
export function userProfileSchema(t: ValidationTranslator) {
  return z.object({
    name: z.string().min(1, t('userProfile.nameRequired')),
    gender: z.enum(GENDERS, t('userProfile.genderRequired')),
    dateOfBirth: z.iso.date(t('userProfile.dateInvalid')),
    height: z
      .number()
      .min(30, t('userProfile.heightMin'))
      .max(300, t('userProfile.heightMax')),
    goal: z.enum(GOALS, t('userProfile.goalRequired')),
    activityLevel: z.enum(
      ACTIVITY_LEVELS,
      t('userProfile.activityLevelRequired'),
    ),
    mealCount: z
      .number(t('userProfile.mealCountRequired'))
      .int()
      .min(MEAL_COUNTS[0])
      .max(MEAL_COUNTS[MEAL_COUNTS.length - 1]),
    locale: z.enum(LOCALES, t('userProfile.localeRequired')),
    defaultWeightUnit: z.enum(
      WEIGHT_UNITS,
      t('userProfile.weightUnitRequired'),
    ),
  });
}

export type UserProfileInput = z.infer<ReturnType<typeof userProfileSchema>>;
