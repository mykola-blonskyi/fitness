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

The nutritional role a Food Item plays (e.g. `lean_protein`, `complex_carb`, `healthy_fat`). Food Replacement and diet generation both operate on Role, not on Category or Subcategory — two foods with the same Role are considered interchangeable regardless of category.

### Food Preference

A user's allergy, exclusion, or favorite (`user_food_preferences`), targeting either a whole taxonomy node (Category, Subcategory, or Role) or a single Food Item, via a polymorphic `target_type`/`target_id` pair. Not free text — always a structured reference. **Favorite** is the one exception to the polymorphic targeting: it always targets a specific Food Item, never a Category/Subcategory/Role — see [[business-rules]] "Favorited Food Items narrow diet generation, per role" and ADR-014. The same Food Item can never be both favorited and excluded/allergied at once.

### login

The `login.blonskyi.dev` OpenID Provider that owns authentication for all subdomain pet projects (including this one). The Fitness Tracker's Next.js frontend is an OIDC client of it, holds its own session, and forwards trusted identity headers to the internal NestJS backend, which never touches the cookie or token directly. See ADR-018.

### Identity Sub

login's OIDC `sub` for a user, stored on `users.identity_sub`. Deliberately separate from `users.id`, which is this app's own key and never changes — resolution from one to the other happens once per request in `IdentityGuard`, and falls back to an email match that reconciles the row in place. See ADR-018.

### Hub

The `blonskyi.dev` project. Still a sibling app (the nav rail links to it), but no longer part of authentication — that moved to login (ADR-018).
