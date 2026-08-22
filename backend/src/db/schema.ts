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
  // How many meal slots (see mealTypeEnum below - breakfast/lunch/dinner/
  // snack, in that fixed order) diet generation splits a day's calorie
  // target across (FITNESS-30). Defaults to 3 (breakfast/lunch/dinner)
  // so existing rows and the not-yet-built profile UI both get a sane
  // value without requiring an explicit choice.
  mealCount: integer('meal_count').notNull().default(3),
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

// Food Category / Food Subcategory / Food Role (see
// knowledge/domain-model.md "Food Category / Food Subcategory / Food
// Role"). Real tables, not enums: Food Preference (a later ticket) needs
// a stable row id to target polymorphically ("exclude everything in this
// category"), which a pgEnum can't provide. Rows are fixed and seeded
// once by seed-food-catalog.ts's upsertTaxonomy() - never created by
// end-user action. Category and Role are independent classifications
// (Role is not derived from Category) - see the domain-model note.
export const foodCategories = pgTable('food_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Fixed set: meat, fish, dairy, vegetables, fruits, grains, legumes,
  // nuts, oils, eggs
  name: text('name').notNull().unique(),
});

export const foodSubcategories = pgTable('food_subcategories', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => foodCategories.id),
  // Fixed set per category - meat: lean_meat/fatty_meat/processed_meat;
  // fish: lean_fish/fatty_fish/shellfish; dairy: low_fat_dairy/
  // full_fat_dairy/fermented_dairy; vegetables: leafy_vegetables/
  // cruciferous_vegetables/starchy_vegetables/other_vegetables;
  // fruits: fresh_fruit/dried_fruit; grains: complex_carbs/simple_carbs;
  // legumes: beans/lentils_and_peas; nuts: tree_nuts/seeds; oils:
  // healthy_oils/saturated_oils; eggs: whole_eggs/egg_whites
  name: text('name').notNull().unique(),
});

export const foodRoles = pgTable('food_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Fixed set: lean_protein, fatty_protein, plant_protein, complex_carb,
  // simple_carb, vegetable, fruit, healthy_fat, saturated_fat, dairy,
  // treat
  name: text('name').notNull().unique(),
});

// Food Item (table name `food_calories` per knowledge/glossary.md).
// Seeded rows carry source/sourceId so a re-run of the import script can
// upsert idempotently without duplicating; manually created items leave
// both null. is_verified starts false for every seeded row, same
// convention as `exercises`. Macro fields are per-100g so Diet Item can
// scale by weight_grams (see knowledge/business-rules.md).
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

// Food Item Translation - per-locale display name for a Food Item. Never
// created for 'en' (foodCalories.name is already the canonical English
// name). isVerified mirrors exerciseTranslations' convention.
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

// Food Preference (see knowledge/domain-model.md,
// knowledge/business-rules.md "Food Preferences target structured
// entities, not free text"). targetId is deliberately not a real FK —
// it points at one of four different tables (foodCategories/
// foodSubcategories/foodRoles/foodCalories) depending on targetType, and
// Postgres has no polymorphic FK. Existence is validated in
// food-preferences.service.ts instead. The unique constraint stops a
// user from declaring the exact same preference twice, not from
// declaring overlapping ones (e.g. excluding both a category and one of
// its items) — diet generation treats those as redundant, not invalid.
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

// Diet Preference (see knowledge/domain-model.md). A user may hold
// several at once (e.g. vegetarian + keto) — each is an independent
// filter applied during diet generation, not a mutually exclusive
// single choice.
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

// Diet Calculation Algorithm (see knowledge/domain-model.md,
// knowledge/business-rules.md "Diet Calculation Algorithm formula is
// documentation only", docs/decisions.md ADR-010). `formula` is
// human-readable text for display/audit only — the real calculation is
// versioned backend code in calorie-targets/algorithm-registry.ts, looked
// up by `code`. Never parsed or evaluated at runtime.
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

// Fixed, ordered set of meal slots a generated Diet can use - see
// users.mealCount above and diets/greedy-heuristic.ts, which always takes
// the first N of this exact order (breakfast/lunch/dinner/snack).
export const mealTypeEnum = pgEnum('meal_type', [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
]);

// Diet (see knowledge/domain-model.md, knowledge/business-rules.md "Diet
// menu generation is a greedy heuristic" and "Current diet resolution",
// docs/decisions.md ADR-010, FITNESS-30). Never updated in place -
// regenerating always inserts a new row; the current diet for a Daily Log
// is simply the most recently created one (`ORDER BY created_at DESC
// LIMIT 1`), resolved in diets.service.ts, not a stored flag.
// calculationMetadata snapshots the algorithm's raw inputs/outputs at
// generation time for audit purposes, independent of whether the
// algorithm's own logic changes later.
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

// Diet Item (see knowledge/domain-model.md). orderIndex is scoped within
// its own mealType (0-based), not across the whole Diet - matches
// programExercises' ordering convention for a list a UI renders in order.
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
