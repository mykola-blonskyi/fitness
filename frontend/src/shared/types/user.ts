export const GENDERS = ['male', 'female'] as const;
export const GOALS = ['weight_loss', 'maintenance', 'muscle_gain'] as const;
export const ACTIVITY_LEVELS = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
] as const;

export type Gender = (typeof GENDERS)[number];
export type Goal = (typeof GOALS)[number];
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

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
  createdAt: string;
  updatedAt: string;
}

// UserProfileInput was replaced by z.infer<typeof userProfileSchema> in
// shared/schemas/user-profile.ts - shape and validation now live in one
// place instead of two.
