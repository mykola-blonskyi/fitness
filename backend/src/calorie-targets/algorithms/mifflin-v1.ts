// mifflin_v1 - see docs/decisions.md ADR-010 for why these specific
// constants (activity multipliers, goal adjustment, macro split, safety
// floor) were chosen. Pure function, no I/O - the DB row this algorithm
// is registered under (code='mifflin_v1') only carries display metadata,
// never the calculation itself (business-rules.md "Diet Calculation
// Algorithm formula is documentation only").

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
} as const;

const GOAL_CALORIE_ADJUSTMENT = {
  weight_loss: -500,
  maintenance: 0,
  muscle_gain: 300,
} as const;

// No calorie target is ever computed below this, regardless of goal -
// a deficit that would push below it is capped instead.
const MINIMUM_CALORIES = 1200;

const PROTEIN_G_PER_KG = 2.0;
const FAT_CALORIE_SHARE = 0.25;
const FAT_KCAL_PER_G = 9;
const CARB_KCAL_PER_G = 4;

export interface MifflinV1Input {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: 'male' | 'female';
  activityLevel: keyof typeof ACTIVITY_MULTIPLIERS;
  goal: keyof typeof GOAL_CALORIE_ADJUSTMENT;
}

export interface MifflinV1Result {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function mifflinV1(input: MifflinV1Input): MifflinV1Result {
  const bmr =
    10 * input.weightKg +
    6.25 * input.heightCm -
    5 * input.age +
    (input.gender === 'male' ? 5 : -161);

  const tdee = bmr * ACTIVITY_MULTIPLIERS[input.activityLevel];

  const calories = Math.max(
    MINIMUM_CALORIES,
    Math.round(tdee + GOAL_CALORIE_ADJUSTMENT[input.goal]),
  );

  const proteinG = Math.round(PROTEIN_G_PER_KG * input.weightKg);
  const fatG = Math.round((calories * FAT_CALORIE_SHARE) / FAT_KCAL_PER_G);
  // Clamped at 0 rather than rebalanced against protein/fat - a
  // heavy-bodyweight edge case hitting the calorie floor is rare enough
  // that this "close enough" simplification (matching business-rules.md's
  // greedy-heuristic tolerance philosophy elsewhere in diet generation)
  // isn't worth a more elaborate rebalancing pass.
  const carbsG = Math.max(
    0,
    Math.round(
      (calories - proteinG * 4 - fatG * FAT_KCAL_PER_G) / CARB_KCAL_PER_G,
    ),
  );

  return { calories, proteinG, carbsG, fatG };
}
