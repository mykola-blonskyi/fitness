import { users } from '../db/schema';

export type UserRow = typeof users.$inferSelect;

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  dateOfBirth: string;
  age: number;
  height: number;
  gender: string;
  goal: string;
  activityLevel: string;
  avatarUrl: string | null;
  mealCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Age is always derived here, at read time — never stored (see
// knowledge/domain-model.md and the Auth spec's Implementation Decisions).
function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function toUserResponse(user: UserRow): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    dateOfBirth: user.dateOfBirth,
    age: calculateAge(user.dateOfBirth),
    height: Number(user.height),
    gender: user.gender,
    goal: user.goal,
    activityLevel: user.activityLevel,
    avatarUrl: user.avatarUrl,
    mealCount: user.mealCount,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
