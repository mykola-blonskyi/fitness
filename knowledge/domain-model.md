# Domain Model

See [[glossary]] for term definitions and [[business-rules]] for the rules referenced below.

Full history and rationale for this model's shape: `~/Documents/obsidian-notes/projects_history/fitness/knowledge/domain-model.md`.

## Entities

### User

Responsibilities:

Owns profile data used for calorie/macro calculation; owns Daily Logs, Training Programs, Diets, and Food/Diet Preferences. Identity itself is owned by login — this table stores fitness-specific profile fields only, keyed by its own locally generated `id`.

Fields:

- identity_sub — login's OIDC `sub` for this user (unique). Kept separate from `id` so a re-issued sub never moves the primary key every other table references; see ADR-018
- name, email, date_of_birth, height (metric), gender (male/female)
- goal (weight_loss/maintenance/muscle_gain)
- activity_level (sedentary/light/moderate/active/very_active) — used for calorie calculation
- avatar_url
- meal_count (3-6, default 3) — how many meals a generated day has; meal 1 takes the breakfast Archetype, the last the dinner Archetype, the rest are mains (ADR-020 narrowed the range from 1-6: below 3 the Archetypes can't produce a plan worth showing)
- breakfast_variant, dinner_variant (default `vary`) — pins that end of the day to one Archetype variant, or lets generation pick a different one each time (ADR-020)
- locale (en/uk/ru/es, default en) — the user's stored UI locale preference, set at onboarding and editable in Settings; catalog browse endpoints resolve translated display names against it (see [[business-rules]])

Relationships:

- one_to_many Daily Logs
- one_to_many Training Programs
- many_to_many active Training Programs (via UserActiveProgram — see Business Rules: multiple concurrent active programs)
- one_to_many Diets
- one_to_many Food Preferences, Diet Preferences
- one_to_many Photo Sessions

---

### Daily Log

Responsibilities:

The per-day anchor a user's activity attaches to. See [[glossary]] "Daily Log" — weight is optional, not required.

Fields:

- user_id, date (unique together)
- weight (nullable)

Relationships:

- one_to_many Progress Photos
- one_to_many Workout Logs

---

### Photo Session

Responsibilities:

Groups Progress Photos captured together on one occasion; owns the joint pose-detection/review lifecycle for those photos (see ADR-013); tracks whether this occasion is the user's baseline reference point.

Fields:

- user_id, date, is_baseline (only one true per user, enforced by unique partial index; settable only once `status = confirmed`)
- status (uploading/detecting/needs_review/confirmed)

Relationships:

- one_to_many Progress Photos
- many_to_one User

---

### Progress Photo

Responsibilities:

A single tagged image. Pose is machine-suggested then human-confirmed (session-level, see ADR-013); alignment analysis is async ML output scoped to one photo.

Fields:

- pose (front/side/back, nullable until the owning Photo Session is `confirmed`)
- image location (private MinIO object key — see Business Rules: photo access)
- analysis_status (pending/processing/completed/failed) — the post-confirm alignment-analysis stage only, not the pose-detection stage
- pose_landmarks (JSON; computed once during the detection stage, reused by alignment analysis rather than recomputed), alignment_data (JSON, populated by the Python worker)

Relationships:

- many_to_one Daily Log
- many_to_one Photo Session

---

### Training Program

Responsibilities:

A reusable, editable plan of exercises. Multiple programs may be active for a user at once.

Fields:

- title, is_archived

Relationships:

- many_to_one User
- one_to_many Program Exercises (ordered)
- many_to_many active status via UserActiveProgram

---

### User Active Program

Responsibilities:

A plain many-to-many join marking which of a user's Training Programs are currently active. Independent of `Training Program.is_archived` — see Business Rules: multiple concurrent active programs.

Relationships:

- many_to_one User
- many_to_one Training Program

---

### Program Exercise

Responsibilities:

One planned exercise slot within a Training Program.

Fields:

- order_index, target_sets, target_reps, target_duration_seconds (nullable — depends on exercise type)

Relationships:

- many_to_one Training Program
- many_to_one Exercise

---

### Workout Log

Responsibilities:

A record of a completed session. Survives edits/deletion of the source Training Program (history is never retroactively altered).

Fields:

- title

Relationships:

- many_to_one Daily Log
- many_to_one Training Program (nullable — ad hoc workouts allowed)
- one_to_many Workout Sets

---

### Workout Set

Responsibilities:

One logged set of an exercise. Reps/weight vs. duration is inferred from the Exercise's category (`cardio` → duration; everything else → reps/weight) — see Business Rules.

Fields:

- set_number, weight (nullable), reps (nullable), duration_seconds (nullable)

Relationships:

- many_to_one Workout Log
- many_to_one Exercise

---

### Exercise

Responsibilities:

A catalog entry (from wger/ExerciseDB or manually created) used to build programs and log sets.

Fields:

- name, image_url, category (chest/back/shoulders/biceps/triceps/legs/core/cardio/full_body)

Relationships:

- one_to_many Program Exercises, Workout Sets
- one_to_many Exercise Translations (per-locale name)

---

### Diet

Responsibilities:

A user's current generated meal plan, valid until they regenerate it (ADR-022). Regenerating inserts a new Diet; swapping an item edits the existing one in place and re-derives its totals.

Fields:

- total_calories, total_protein, total_carbs, total_fat
- calculation_metadata (JSON snapshot of algorithm inputs/outputs)

Relationships:

- many_to_one User
- many_to_one Diet Calculation Algorithm
- one_to_many Diet Items

---

### Diet Item

Responsibilities:

One food entry within a generated Diet.

Fields:

- weight_grams (can change after generation via swap/reroll, which rescale it to hold the item's calorie contribution), meal_position (1-based position within the day, "Meal 1".."Meal N" — see ADR-016), order_index (scoped within its meal_position)
- slot_key (nullable — which Meal Slot of the meal's Archetype this item fills, e.g. `main.salad`; several items sharing one slot_key render as one labelled group. ADR-020)
- is_counted (Free Foods are listed but excluded from the Diet's totals and from the macro fit — ADR-020)

Relationships:

- many_to_one Diet
- many_to_one Food Item

---

### Diet Meal Order

Responsibilities:

Holds one meal's on-screen display order, independent of its meal_position (the generation slot driving its macro taper — see ADR-016). A meal with no row here falls back to its own meal_position for display order — see ADR-017.

Fields:

- meal_position (identifies the meal within its Diet; not a duplicate of Diet Item's own column), display_order

Relationships:

- many_to_one Diet

---

### Meal Archetype / Meal Slot

Responsibilities:

Code-level domain objects, not tables — the shape of each meal and its components (see [[glossary]]). An Archetype declares its Slots and its relative share of the day's protein/carb/fat; a Slot declares the Food Family it draws from, how many items it takes, the macro it carries, and its portion range. Versioned in code like the Diet Calculation Algorithm registry, and deliberately serialisable so moving them into rows later is a migration rather than a rewrite. Introduced by ADR-020.

Relationships:

- a generated Diet Item records which Slot it filled via `slot_key`; nothing else persists

---

### Diet Calculation Algorithm

Responsibilities:

A versioned, named calorie/macro formula. `formula` is documentation only — see Business Rules: algorithm implementation.

Fields:

- code (unique), name, description, formula (human-readable text)

Relationships:

- one_to_many Diets

---

### Food Item

Responsibilities:

A catalog entry classified by Category → Subcategory → Role, from Open Food Facts/USDA or manual entry.

Fields:

- name, image_url, protein, carbs, fat, calories (per reference unit — dry/raw weight for anything cooked before eating, see ADR-020)
- source (open_food_facts/usda/manual), is_verified
- family_id (nullable — a Food Item with no Food Family is never generated into a Diet; ADR-020)
- serving_unit, serving_grams (both nullable — only foods nobody weighs carry a Serving; ADR-020)

Relationships:

- many_to_one Food Category, Food Subcategory, Food Role, Food Family (nullable)
- one_to_many Diet Items
- one_to_many Food Item Translations (per-locale name)

---

### Food Category / Food Subcategory / Food Role / Food Family

Responsibilities:

Fixed taxonomies. Category/Subcategory drive browsing; Role is what Food Preferences target and what the macro fit sizes against; **Food Family** (ADR-020) is what a Meal Slot draws from, what a swap offers, and what a favorite narrows. Category and Role are independent classifications on the same Food Item, not hierarchical with each other — a `legumes`-category item's Role is `plant_protein`, not derived from its category name. The same independence holds for potato: Category stays `vegetables` (so browsing and "exclude vegetables" keep working) while its Role is `complex_carb` and its Family `starchy_vegetable`.

Fixed values:

- Category → Subcategory: `meat` (lean_meat, fatty_meat, processed_meat) · `fish` (lean_fish, fatty_fish, shellfish) · `dairy` (low_fat_dairy, full_fat_dairy, fermented_dairy) · `vegetables` (leafy_vegetables, cruciferous_vegetables, starchy_vegetables, other_vegetables) · `fruits` (fresh_fruit, dried_fruit) · `grains` (complex_carbs, simple_carbs) · `legumes` (beans, lentils_and_peas) · `nuts` (tree_nuts, seeds) · `oils` (healthy_oils, saturated_oils) · `eggs` (whole_eggs, egg_whites) · `sweets` (confectionery) · `beverages` (alcoholic_beverages, non_alcoholic_beverages)
- Role: `lean_protein`, `fatty_protein`, `plant_protein`, `complex_carb`, `simple_carb`, `vegetable`, `fruit`, `healthy_fat`, `saturated_fat`, `dairy`, `treat`, `beverage`
- Family (ADR-020): proteins — `poultry`, `red_meat`, `white_fish`, `red_fish`, `seafood`, `eggs`, `casein_dairy`, `legume_protein` · carbs — `porridge`, `grain_garnish`, `starchy_vegetable`, `bread` · vegetables — `salad_vegetable`, `accent_vegetable`, `cooked_vegetable`, `mushroom` · fruit — `berries`, `fruit` · fats — `culinary_oil`, `nuts_seeds`, `fatty_fruit`
- `sweets`/`beverages` (and the `beverage` role) exist for browsing and logging only. Under ADR-020 they need no special case: nothing selects a Food Item that carries no Family, which is also how flours, branded breads, offal and babyfood stay out of generated plans.

Relationships:

- Food Subcategory many_to_one Food Category
- Food Item many_to_one each of the three

---

### Food Preference

Responsibilities:

A user's allergy, exclusion, or favorite, targeting a taxonomy node or a specific Food Item — see Business Rules and [[glossary]] "Food Preference".

Fields:

- type (allergy/exclude/favorite) — favorite always has target_type=food_item
- target_type (category/subcategory/role/food_item)
- target_id (polymorphic FK)

Relationships:

- many_to_one User

---

### Diet Preference

Responsibilities:

A user's declared diet type (vegetarian/vegan/keto/paleo), used as an additional filter during diet generation.

Relationships:

- many_to_one User
