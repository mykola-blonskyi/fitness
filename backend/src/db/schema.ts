import {
  pgTable,
  uuid,
  text,
  date,
  numeric,
  timestamp,
  pgEnum,
  unique,
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
// project; identity itself belongs to the Hub. id is NOT locally
// generated — it's always set to the Hub's own user id (also a uuid,
// confirmed against my-projects/drizzle/schema.ts) so cross-project
// identity stays aligned, per the Auth spec's decision.
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
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

// Daily Log (see knowledge/glossary.md, docs/decisions.md ADR-004) — the
// per-(user, date) anchor other daily activity attaches to. weight is
// nullable by design: no daily activity should require a weigh-in first.
// The row itself is created lazily on first write against a given date,
// and never deleted once created — deleting a weight entry just nulls
// the column so the row stays available for other attachments.
export const dailyLogs = pgTable(
  'daily_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    date: date('date').notNull(),
    weight: numeric('weight'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.userId, table.date)],
);
