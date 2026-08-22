import * as z from 'zod';
import { ACTIVITY_LEVELS, GENDERS, GOALS, LOCALES } from '@shared/types/user';

// Mirrors backend/src/users/dto/create-user.dto.ts exactly - kept in sync
// by hand, not derived from it (no practical way to share class-validator
// decorators with a Zod schema across the Next.js/NestJS boundary). The
// backend DTO stays authoritative; this is a client-side UX layer only,
// see docs/decisions.md. avatarUrl is omitted - no UI sets it yet.
export const userProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  gender: z.enum(GENDERS, 'Select a gender'),
  dateOfBirth: z.iso.date('Enter a valid date'),
  height: z
    .number()
    .min(30, 'Height must be at least 30cm')
    .max(300, 'Height must be at most 300cm'),
  goal: z.enum(GOALS, 'Select a goal'),
  activityLevel: z.enum(ACTIVITY_LEVELS, 'Select an activity level'),
  // Always has a real value ('en' by default) rather than forcing an
  // explicit choice like the fields above - see ProfileFields.tsx.
  locale: z.enum(LOCALES, 'Select a language'),
});

export type UserProfileInput = z.infer<typeof userProfileSchema>;
