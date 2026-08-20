-- Seeds the single required row calorie-targets/algorithm-registry.ts's
-- 'mifflin_v1' key looks up for display metadata (see docs/decisions.md
-- ADR-010). Unlike the food/exercise catalogs, this isn't optional
-- imported data - the calorie-target feature can't function without it,
-- so it's a migration (mandatory pre-deploy gate, ADR-005) rather than a
-- manual `pnpm db:seed:*` script someone could forget to run.
INSERT INTO "diet_calculation_algorithms" ("code", "name", "description", "formula")
VALUES (
	'mifflin_v1',
	'Mifflin-St Jeor',
	'Estimates daily calorie and macro targets from your profile and most recent weigh-in using the Mifflin-St Jeor BMR equation, adjusted for activity level and goal.',
	'BMR = 10*weight(kg) + 6.25*height(cm) - 5*age(yr) + 5 (male) or -161 (female); TDEE = BMR x activity multiplier (sedentary 1.2, light 1.375, moderate 1.55, active 1.725, very_active 1.9); calories = TDEE + goal adjustment (weight_loss -500, maintenance 0, muscle_gain +300), floored at 1200 kcal; protein = 2.0 g/kg bodyweight; fat = 25% of calories; carbs = remaining calories.'
)
ON CONFLICT ("code") DO NOTHING;
