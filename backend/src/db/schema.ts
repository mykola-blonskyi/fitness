import {
  pgTable,
  uuid,
  text,
  date,
  numeric,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const genderEnum = pgEnum('gender', ['male', 'female']);
export const goalEnum = pgEnum('goal', [
  'weight_loss',
  'maintenance',
  'muscle_gain',
]);
export const activityLevelEnum = pgEnum('activity_level', [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
]);

// User (see knowledge/domain-model.md) — profile fields owned by this
// project; identity itself belongs to the Hub.
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  dateOfBirth: date('date_of_birth').notNull(),
  height: numeric('height').notNull(),
  gender: genderEnum('gender').notNull(),
  goal: goalEnum('goal').notNull(),
  activityLevel: activityLevelEnum('activity_level').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
