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
  integer,
  jsonb,
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

// id is NOT locally generated — it's always set to the Hub's own user id,
// so cross-project identity stays aligned.
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
  // How many meal slots (breakfast/lunch/dinner/snack, in that fixed
  // order) diet generation splits a day's calorie target across.
  mealCount: integer('meal_count').notNull().default(3),
  // Plain text, not a pgEnum, matching exerciseTranslations.locale /
  // foodCalorieTranslations.locale - valid values enforced at the DTO
  // layer instead. Deliberately NOT next-intl's route-based locale segment
  // (FITNESS-11 hasn't landed).
  locale: text('locale').notNull().default('en'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// weight is nullable by design: no daily activity should require a
// weigh-in first. The row is created lazily on first write and never
// deleted - clearing a weight entry just nulls the column.
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

// source/sourceId let a re-run of the import script upsert idempotently
// without duplicating; manually created exercises leave both null.
// isVerified starts false for every seeded row and is flipped only by a
// human reviewer, never by the import script.
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

// Never created for 'en' - Exercise.name is already the canonical English
// name. isVerified mirrors Exercise.isVerified's meaning.
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

// Training Program (see knowledge/domain-model.md). isArchived and "active"
// (userActivePrograms below) are independent axes - a program can be
// non-archived and inactive at the same time, e.g. right after creation.
export const trainingPrograms = pgTable('training_programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// A user's currently-active Training Programs (many-to-many, see
// knowledge/domain-model.md). userId is redundant with the FK chain through
// trainingProgramId, kept anyway to match foodPreferences/dietPreferences.
export const userActivePrograms = pgTable(
  'user_active_programs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    trainingProgramId: uuid('training_program_id')
      .notNull()
      .references(() => trainingPrograms.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.userId, table.trainingProgramId)],
);

// Program Exercise. Exactly one of (targetSets + targetReps) or
// targetDurationSeconds is set, depending on the exercise's category -
// enforced in program-exercise-targets.ts, not a DB CHECK constraint.
export const programExercises = pgTable('program_exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  trainingProgramId: uuid('training_program_id')
    .notNull()
    .references(() => trainingPrograms.id),
  exerciseId: uuid('exercise_id')
    .notNull()
    .references(() => exercises.id),
  orderIndex: integer('order_index').notNull(),
  targetSets: integer('target_sets'),
  targetReps: integer('target_reps'),
  targetDurationSeconds: integer('target_duration_seconds'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Real tables, not enums: Food Preference needs a stable row id to target
// polymorphically ("exclude everything in this category"), which a pgEnum
// can't provide. Rows are fixed and seeded once by seed-food-catalog.ts.
export const foodCategories = pgTable('food_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
});

export const foodSubcategories = pgTable('food_subcategories', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => foodCategories.id),
  name: text('name').notNull().unique(),
});

export const foodRoles = pgTable('food_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
});

// Food Item (table name `food_calories`). source/sourceId/isVerified follow
// the same import-idempotency convention as `exercises`. Macro fields are
// per-100g so Diet Item can scale by weight_grams.
export const foodCalories = pgTable(
  'food_calories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    imageUrl: text('image_url'),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => foodCategories.id),
    subcategoryId: uuid('subcategory_id')
      .notNull()
      .references(() => foodSubcategories.id),
    roleId: uuid('role_id')
      .notNull()
      .references(() => foodRoles.id),
    caloriesPer100g: numeric('calories_per_100g').notNull(),
    proteinPer100g: numeric('protein_per_100g').notNull(),
    carbsPer100g: numeric('carbs_per_100g').notNull(),
    fatPer100g: numeric('fat_per_100g').notNull(),
    source: text('source'),
    sourceId: text('source_id'),
    isVerified: boolean('is_verified').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.source, table.sourceId)],
);

// Never created for 'en', same convention as exerciseTranslations.
export const foodCalorieTranslations = pgTable(
  'food_calorie_translations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foodCalorieId: uuid('food_calorie_id')
      .notNull()
      .references(() => foodCalories.id),
    locale: text('locale').notNull(),
    name: text('name').notNull(),
    isVerified: boolean('is_verified').notNull().default(false),
  },
  (table) => [unique().on(table.foodCalorieId, table.locale)],
);

export const foodPreferenceTypeEnum = pgEnum('food_preference_type', [
  'allergy',
  'exclude',
]);
export const foodPreferenceTargetTypeEnum = pgEnum(
  'food_preference_target_type',
  ['category', 'subcategory', 'role', 'food_item'],
);

// targetId is deliberately not a real FK - it points at one of four
// different tables depending on targetType, and Postgres has no
// polymorphic FK. Existence is validated in food-preferences.service.ts
// instead. The unique constraint stops exact duplicates, not overlapping
// preferences (e.g. excluding both a category and one of its items).
export const foodPreferences = pgTable(
  'food_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    type: foodPreferenceTypeEnum('type').notNull(),
    targetType: foodPreferenceTargetTypeEnum('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique().on(table.userId, table.type, table.targetType, table.targetId),
  ],
);

export const dietTypeEnum = pgEnum('diet_type', [
  'vegetarian',
  'vegan',
  'keto',
  'paleo',
]);

// A user may hold several at once (e.g. vegetarian + keto) - each is an
// independent filter, not a mutually exclusive single choice.
export const dietPreferences = pgTable(
  'diet_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    dietType: dietTypeEnum('diet_type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.userId, table.dietType)],
);

// `formula` is human-readable text for display/audit only, never parsed
// or evaluated at runtime - the real calculation is versioned backend
// code in calorie-targets/algorithm-registry.ts, looked up by `code`.
export const dietCalculationAlgorithms = pgTable(
  'diet_calculation_algorithms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    formula: text('formula').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const mealTypeEnum = pgEnum('meal_type', [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
]);

// Never updated in place - regenerating always inserts a new row; the
// current diet for a Daily Log is just the most recent one (`ORDER BY
// created_at DESC LIMIT 1`), not a stored flag. calculationMetadata
// snapshots the algorithm's raw inputs/outputs at generation time.
export const diets = pgTable('diets', {
  id: uuid('id').primaryKey().defaultRandom(),
  dailyLogId: uuid('daily_log_id')
    .notNull()
    .references(() => dailyLogs.id),
  algorithmId: uuid('algorithm_id')
    .notNull()
    .references(() => dietCalculationAlgorithms.id),
  totalCalories: numeric('total_calories').notNull(),
  totalProtein: numeric('total_protein').notNull(),
  totalCarbs: numeric('total_carbs').notNull(),
  totalFat: numeric('total_fat').notNull(),
  calculationMetadata: jsonb('calculation_metadata').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// orderIndex is scoped within its own mealType (0-based), not across the
// whole Diet.
export const dietItems = pgTable('diet_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  dietId: uuid('diet_id')
    .notNull()
    .references(() => diets.id),
  foodItemId: uuid('food_item_id')
    .notNull()
    .references(() => foodCalories.id),
  mealType: mealTypeEnum('meal_type').notNull(),
  weightGrams: numeric('weight_grams').notNull(),
  orderIndex: integer('order_index').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
