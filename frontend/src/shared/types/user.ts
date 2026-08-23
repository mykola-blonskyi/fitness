export const GENDERS = ['male', 'female'] as const;
export const GOALS = ['weight_loss', 'maintenance', 'muscle_gain'] as const;
export const ACTIVITY_LEVELS = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
] as const;
// Matches backend/src/users/dto/create-user.dto.ts's LOCALES. Deliberately
// not next-intl's route-based locale segment - FITNESS-11 hasn't landed yet.
export const LOCALES = ['en', 'uk', 'ru', 'es'] as const;

export type Gender = (typeof GENDERS)[number];
export type Goal = (typeof GOALS)[number];
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];
export type Locale = (typeof LOCALES)[number];

// Mirrors backend/src/users/user.mapper.ts's UserResponse.
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  dateOfBirth: string;
  age: number;
  height: number;
  gender: Gender;
  goal: Goal;
  activityLevel: ActivityLevel;
  avatarUrl: string | null;
  locale: Locale;
  createdAt: string;
  updatedAt: string;
}
