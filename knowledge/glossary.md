# Glossary

## Terms

### Daily Log

The anchor row for a single `(user_id, date)`. Formerly modeled as `diary_entries` with a required weight; corrected so that weight is optional. Progress photos, workout logs, and diets all attach to a Daily Log, none of them require a weigh-in to exist.

### Weigh-In

The act of recording body weight on a Daily Log. Optional per day — a user can log a workout or upload photos on a day with no weigh-in.

### Photo Session

A single photo-capture event for a user on a date (`photo_sessions`), grouping up to three Progress Photos (front/side/back) taken together. Goes through a review status (`uploading` → `detecting` → `needs_review` → `confirmed`) before its photos' poses count as final — see ADR-013 and [[business-rules]] "Photo pose is machine-suggested, then confirmed". A Photo Session may be marked as the **baseline** — the reference point future comparisons are measured against — only once `confirmed`. Only one baseline session may exist per user at a time.

### Progress Photo

A single image (`progress_photos`) belonging to one Photo Session, tagged with a pose (front/side/back) — machine-suggested via joint classification across the session's photos, editable and finalized only when the user confirms the session — and carrying async alignment-analysis results (landmarks, alignment data, status) once confirmed. `pose_landmarks` is an unrelated ML-output field (MediaPipe skeletal keypoints), not a second name for pose. Also links directly to its Daily Log (kept alongside the Photo Session link by explicit decision, even though both encode the same day).

### Training Program

A named, reusable set of planned exercises (`training_programs` + `program_exercises`) a user creates. A user may have several Training Programs **active at the same time** (e.g. a Strength Program and a Running Program running in parallel) — this is a many-to-many relationship (`user_active_programs`), not one-to-one.

### Workout Log

A record of a completed training session (`workout_logs` + `workout_sets`), optionally linked to the Training Program it came from. Workout Logs remain intact even if the source Training Program is edited or deleted later — history is never retroactively altered.

### Diet

A single generated meal plan for one Daily Log (`diets` + `diet_items`). Diets are never edited in place — regenerating creates a new Diet row. The **current diet** for a day is simply the most recently created Diet row for that Daily Log; older ones are kept as history, not marked obsolete.

### Diet Calculation Algorithm

A versioned formula (`diet_calculation_algorithms`) used to compute calorie/macro targets (e.g. `mifflin_v1`, `adaptive_v1`). The `formula` field is human-readable documentation only — the actual computation lives in versioned backend code, looked up by the algorithm's `code`.

### Food Item

An entry in the food database (`food_calories`), classified by Category → Subcategory → Role, sourced from Open Food Facts, USDA, or manual entry. Per-locale display names live in a separate translations table, not on the Food Item itself.

### Food Role

The coarse nutritional role a Food Item plays (e.g. `lean_protein`, `complex_carb`, `healthy_fat`). Role is what Food Preferences target ("exclude all complex carbs") and what the macro fit sizes a portion against. It is **not** what decides interchangeability: oatmeal and rice share `complex_carb` but are not substitutes for each other, so generation and Food Replacement match on Food Family instead — see ADR-020.

### Food Family

The finest classification of a Food Item (`poultry`, `white_fish`, `casein_dairy`, `porridge`, `grain_garnish`, `salad_vegetable`, `culinary_oil`, …), sitting under Subcategory. A Meal Slot names the Family it draws from, a swap offers other members of the same Family, and favoriting narrows within a Family rather than across a whole Role. A Food Item with **no** Family is never generated into a plan — it stays browsable and loggable by hand, which is how flours, branded breads, offal and babyfood leave the generation pool without a rule of their own. Introduced by ADR-020.

### Food Preference

A user's allergy, exclusion, or favorite (`user_food_preferences`), targeting either a whole taxonomy node (Category, Subcategory, or Role) or a single Food Item, via a polymorphic `target_type`/`target_id` pair. Not free text — always a structured reference. **Favorite** is the one exception to the polymorphic targeting: it always targets a specific Food Item, never a Category/Subcategory/Role — see [[business-rules]] and ADR-014, as narrowed by ADR-020: a favorite restricts its own Food Family, not the whole Role. The same Food Item can never be both favorited and excluded/allergied at once.

### Meal Archetype

The shape of a meal: `breakfast` (porridge + fruit + eggs), `main` (protein + carb + salad + added fat), or `dinner` (slow protein + fruit). Assigned by position — meal 1 is always the breakfast, the last is always the dinner, everything between is a main. An Archetype lists its Meal Slots and declares how much of the day's protein/carb/fat it carries relative to the other meals, which is what makes a dinner light without a separate taper rule. Archetypes live in versioned code, not in rows. See ADR-020.

### Meal Slot

One component of a Meal Archetype — "the carb", "the salad", "the added fat". A Slot names the Food Family it draws from, how many Food Items it takes (one for most, three for a salad, one or two for a dinner protein), the macro it primarily carries, and its portion range. A Slot with several items renders as one labelled group ("Salad: tomato 80 g · cucumber 70 g · onion 20 g") rather than as loose lines. See ADR-020.

### Serving

A Food Item's natural unit and that unit's weight — 1 egg = 55 g, 1 spoon of oil = 15 g, 1 apple = 180 g. Only foods nobody weighs carry one; everything else is planned in grams. Portions of a food that has a Serving are snapped to whole units. See ADR-020.

### Free Food

A Food Item that a plan lists but does not count: all non-starchy vegetables, raw or cooked. They are given fixed nominal portions, excluded from the macro fit and from the Diet's displayed totals, and paid for instead by a flat vegetable allowance subtracted from the day's calorie target before fitting. Potato and sweet potato are carbs, not Free Foods. See ADR-020.

### login

The `login.blonskyi.dev` OpenID Provider that owns authentication for all subdomain pet projects (including this one). The Fitness Tracker's Next.js frontend is an OIDC client of it, holds its own session, and forwards trusted identity headers to the internal NestJS backend, which never touches the cookie or token directly. See ADR-018.

### Identity Sub

login's OIDC `sub` for a user, stored on `users.identity_sub`. Deliberately separate from `users.id`, which is this app's own key and never changes — resolution from one to the other happens once per request in `IdentityGuard`, and falls back to an email match that reconciles the row in place. See ADR-018.

### Hub

The `blonskyi.dev` project. Still a sibling app (the nav rail links to it), but no longer part of authentication — that moved to login (ADR-018).

## UI terminology per locale

Gym and diet terms that a general-purpose translator gets wrong in this domain — "Reps" as company representatives, "Set" as a bundle (or a set of logs), "Training" as classroom training. Reuse these when adding or reviewing `frontend/messages/*.json`.

| en | uk | ru | es |
| --- | --- | --- | --- |
| Set (of an exercise) | підхід | подход | serie |
| Reps | повторення | повторения | repeticiones |
| Target sets / Target reps | цільові підходи / цільові повторення | целевые подходы / целевые повторения | series objetivo / repeticiones objetivo |
| Training program | тренувальна програма | тренировочная программа | programa de entrenamiento |
| Workout | тренування | тренировка | entrenamiento |
| Food Item | продукт | продукт | alimento |
| Progress photo | фото прогресу | фото прогресса | foto de progreso |
| Baseline (session) | базова сесія | базовая сессия | sesión de referencia |
| Preference | вподобання | предпочтение | preferencia |
| Log (a weight, a set) | записати | записать | registrar |
| Core (muscle group) | кор | кор | core |
| Back (muscle group) | спина | спина | espalda |

Ukrainian and Russian plurals need `one`/`few`/`other` in the ICU message, not just `one`/`other` — `other` carries the 5+ form (`підходів`, `подходов`).
