import {
  pgTable,
  uuid,
  text,
  date,
  numeric,
  timestamp,
  pgEnum,
  unique,
  boolean,
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

export const exerciseCategoryEnum = pgEnum('exercise_category', [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'legs',
  'core',
  'cardio',
  'full_body',
]);

// Exercise (see knowledge/domain-model.md, knowledge/business-rules.md
// "Food/exercise data import"). Seeded rows carry `source`/`sourceId` from
// the external catalog (e.g. 'wger') so a re-run of the import script can
// upsert idempotently without duplicating; manually created exercises
// leave both null. is_verified starts false for every seeded row and is
// flipped by a human reviewer later — never by the import script itself.
export const exercises = pgTable(
  'exercises',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    imageUrl: text('image_url'),
    category: exerciseCategoryEnum('category').notNull(),
    source: text('source'),
    sourceId: text('source_id'),
    isVerified: boolean('is_verified').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.source, table.sourceId)],
);

// Exercise Translation — per-locale display name for an Exercise. Never
// created for 'en' (Exercise.name is already the canonical English name).
// isVerified mirrors Exercise.isVerified's meaning: true only once a human
// reviewer has confirmed the name, regardless of whether it came from the
// source API's own translation or a machine-translation fallback.
export const exerciseTranslations = pgTable(
  'exercise_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id),
    locale: text('locale').notNull(),
    name: text('name').notNull(),
    isVerified: boolean('is_verified').notNull().default(false),
  },
  (table) => [unique().on(table.exerciseId, table.locale)],
);
