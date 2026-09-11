import {
  pgTable,
  uuid,
  text,
  date,
  numeric,
  timestamp,
  pgEnum,
  unique,
  uniqueIndex,
  index,
  boolean,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

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
export const weightUnitEnum = pgEnum('weight_unit', ['kg', 'lb']);

// identitySub is login.blonskyi.dev's OIDC `sub`, kept as its own column
// rather than reused as `id`: every other table references users.id
// without a cascade, so a re-issued sub must never move the primary key
// (ADR-018).
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  identitySub: text('identity_sub').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  dateOfBirth: date('date_of_birth').notNull(),
  height: numeric('height').notNull(),
  gender: genderEnum('gender').notNull(),
  goal: goalEnum('goal').notNull(),
  activityLevel: activityLevelEnum('activity_level').notNull(),
  avatarUrl: text('avatar_url'),
  // Single-user personal app - no self-service grant flow. Set directly
  // in the DB by whoever operates the deployment.
  isAdmin: boolean('is_admin').notNull().default(false),
  // How many equal-calorie meal positions ("Meal 1".."Meal N") diet
  // generation splits a day's calorie target across.
  mealCount: integer('meal_count').notNull().default(3),
  // Plain text, not a pgEnum, matching exerciseTranslations.locale /
  // foodCalorieTranslations.locale - valid values enforced at the DTO
  // layer instead. Deliberately NOT next-intl's route-based locale segment
  // (FITNESS-11 hasn't landed).
  locale: text('locale').notNull().default('en'),
  defaultWeightUnit: weightUnitEnum('default_weight_unit')
    .notNull()
    .default('kg'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// weight is nullable by design: no daily activity should require a
// weigh-in first. The row is created lazily on first write and never
// deleted - clearing a weight entry just nulls the column. weightUnit
// mirrors that nullability; null (pre-dating this column) means kg.
export const dailyLogs = pgTable(
  'daily_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    date: date('date').notNull(),
    weight: numeric('weight'),
    weightUnit: weightUnitEnum('weight_unit'),
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
  (table) => [
    unique().on(table.source, table.sourceId),
    index().on(table.category),
  ],
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
export const trainingPrograms = pgTable(
  'training_programs',
  {
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
  },
  (table) => [index().on(table.userId)],
);

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
export const programExercises = pgTable(
  'program_exercises',
  {
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
  },
  (table) => [index().on(table.trainingProgramId)],
);

// A completed (or in-progress) training session. trainingProgramId is
// nullable for ad hoc workouts, and title is copied from the program at
// start time rather than joined live - so later renaming/archiving the
// program never changes what an already-logged Workout Log displays. No
// userId column - ownership is verified by joining through dailyLogId.
export const workoutLogs = pgTable(
  'workout_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dailyLogId: uuid('daily_log_id')
      .notNull()
      .references(() => dailyLogs.id),
    trainingProgramId: uuid('training_program_id').references(
      () => trainingPrograms.id,
    ),
    title: text('title').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index().on(table.dailyLogId)],
);

// One logged set. exerciseId references the Exercise catalog directly,
// never a Program Exercise row - so removing/reordering a program's
// exercises can't affect a set already logged against this Exercise.
// Exactly one of (weight + reps) or durationSeconds is set, depending on
// the exercise's category - enforced in workout-set-values.ts, same
// pattern as programExercises' targets, not a DB CHECK constraint.
// weightUnit mirrors weight's own nullability; null (pre-dating this
// column) means kg.
export const workoutSets = pgTable(
  'workout_sets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workoutLogId: uuid('workout_log_id')
      .notNull()
      .references(() => workoutLogs.id),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id),
    setNumber: integer('set_number').notNull(),
    weight: numeric('weight'),
    weightUnit: weightUnitEnum('weight_unit'),
    reps: integer('reps'),
    durationSeconds: integer('duration_seconds'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index().on(table.workoutLogId), index().on(table.exerciseId)],
);

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

// The level below Subcategory that decides interchangeability (ADR-020): a
// Meal Slot draws from a Family, a swap offers within one. Rows are the
// fixed FOOD_FAMILIES list in scripts/food-families.ts.
export const foodFamilies = pgTable('food_families', {
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
    // Nullable on purpose: a Food Item with no Family is never generated,
    // only browsed and logged by hand (ADR-020).
    familyId: uuid('family_id').references(() => foodFamilies.id),
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
  (table) => [
    unique().on(table.source, table.sourceId),
    // roleId + categoryId/subcategoryId are diet generation's hot filter
    // columns (diets.service.ts's findCandidatesByRole), queried on every
    // generate() call.
    index().on(table.roleId),
    index().on(table.categoryId),
    index().on(table.subcategoryId),
    index().on(table.familyId),
  ],
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
  // Unlike allergy/exclude, only ever targets a specific food_item (see
  // FoodPreferencesService.create) - favoriting a whole category/role
  // wouldn't disambiguate anything a generation role-slot needs.
  'favorite',
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

// Never updated in place - regenerating always inserts a new row; the
// current diet for a user is just the most recent one (`ORDER BY
// created_at DESC LIMIT 1`), not a stored flag. calculationMetadata
// snapshots the algorithm's raw inputs/outputs at generation time.
export const diets = pgTable(
  'diets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
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
  },
  // Rows are never updated/deleted (history grows unboundedly - see comment
  // above); findCurrent/findOwnedDiet filter by userId, and findCurrent
  // orders by createdAt desc, on every diet read.
  (table) => [index().on(table.userId, table.createdAt)],
);

// orderIndex is scoped within its own mealPosition (0-based), not across
// the whole Diet. mealPosition (1-based) is computed fresh at generation
// time, not a stored category - see ADR-016.
export const dietItems = pgTable(
  'diet_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dietId: uuid('diet_id')
      .notNull()
      .references(() => diets.id),
    foodItemId: uuid('food_item_id')
      .notNull()
      .references(() => foodCalories.id),
    mealPosition: integer('meal_position').notNull(),
    weightGrams: numeric('weight_grams').notNull(),
    orderIndex: integer('order_index').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index().on(table.dietId), index().on(table.foodItemId)],
);

// One row per meal actually reordered - absent a row for a given
// (dietId, mealPosition), display order falls back to mealPosition itself.
// mealPosition here is a stable meal identifier, not a duplicate of
// diet_items' own column - see ADR-017.
export const dietMealOrder = pgTable(
  'diet_meal_order',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dietId: uuid('diet_id')
      .notNull()
      .references(() => diets.id),
    mealPosition: integer('meal_position').notNull(),
    displayOrder: integer('display_order').notNull(),
  },
  (table) => [unique().on(table.dietId, table.mealPosition)],
);

export const photoPoseEnum = pgEnum('photo_pose', ['front', 'side', 'back']);
export const photoAnalysisStatusEnum = pgEnum('photo_analysis_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);
export const photoSessionStatusEnum = pgEnum('photo_session_status', [
  'uploading',
  'detecting',
  'needs_review',
  'confirmed',
]);

// Groups Progress Photos captured on one occasion. isBaseline's "only one
// true per user" constraint is a real DB constraint (partial unique index
// below), not application-level validation - see knowledge/business-rules.md.
export const photoSessions = pgTable(
  'photo_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    date: date('date').notNull(),
    isBaseline: boolean('is_baseline').notNull().default(false),
    status: photoSessionStatusEnum('status').notNull().default('uploading'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('photo_sessions_one_baseline_per_user')
      .on(table.userId)
      .where(eq(table.isBaseline, true)),
  ],
);

// objectKey is the private MinIO key, never a public URL - see ADR-002.
// photoSessionId groups this with its front/side/back siblings; dailyLogId
// links it to the Daily Log it was captured against.
// pose is nullable until the owning session reaches `confirmed` (ADR-013) -
// the `detect` job assigns it, but only a human confirm makes it final.
export const progressPhotos = pgTable(
  'progress_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    photoSessionId: uuid('photo_session_id')
      .notNull()
      .references(() => photoSessions.id),
    dailyLogId: uuid('daily_log_id')
      .notNull()
      .references(() => dailyLogs.id),
    pose: photoPoseEnum('pose'),
    objectKey: text('object_key').notNull().unique(),
    analysisStatus: photoAnalysisStatusEnum('analysis_status')
      .notNull()
      .default('pending'),
    poseLandmarks: jsonb('pose_landmarks'),
    alignmentData: jsonb('alignment_data'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique().on(table.photoSessionId, table.pose),
    index().on(table.dailyLogId),
  ],
);
