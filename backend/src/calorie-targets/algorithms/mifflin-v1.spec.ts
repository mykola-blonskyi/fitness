import { mifflinV1 } from './mifflin-v1';

describe('mifflinV1', () => {
  it('computes calories/macros for a male, moderate activity, maintenance profile', () => {
    const result = mifflinV1({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      gender: 'male',
      activityLevel: 'moderate',
      goal: 'maintenance',
    });

    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 1780; TDEE = 1780*1.55 = 2759
    expect(result.calories).toBe(2759);
    expect(result.proteinG).toBe(160); // 2g/kg * 80kg
    expect(result.fatG).toBe(77); // 25% of 2759 / 9
    expect(result.carbsG).toBe(357); // remainder / 4
  });

  it('clamps calories at the 1200 floor for a low-BMR weight-loss profile', () => {
    const result = mifflinV1({
      weightKg: 60,
      heightCm: 165,
      age: 25,
      gender: 'female',
      activityLevel: 'sedentary',
      goal: 'weight_loss',
    });

    // BMR = 1345.25, TDEE = 1614.3, TDEE - 500 = 1114.3 < 1200 floor
    expect(result.calories).toBe(1200);
    expect(result.proteinG).toBe(120);
  });

  it('applies the muscle_gain surplus on top of TDEE', () => {
    const maintenance = mifflinV1({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      gender: 'male',
      activityLevel: 'moderate',
      goal: 'maintenance',
    });
    const surplus = mifflinV1({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      gender: 'male',
      activityLevel: 'moderate',
      goal: 'muscle_gain',
    });

    expect(surplus.calories - maintenance.calories).toBe(300);
  });

  it('never returns negative carbs when protein+fat alone would exceed the calorie target', () => {
    // Synthetic extreme inputs (not a realistic human) chosen purely to
    // force protein (2g/kg) + fat (25% of calories) past the total -
    // the clamp this exercises is a genuine safety net, not something
    // realistic profiles hit (see mifflin-v1.ts's comment on carbsG).
    const result = mifflinV1({
      weightKg: 200,
      heightCm: 100,
      age: 100,
      gender: 'male',
      activityLevel: 'sedentary',
      goal: 'weight_loss',
    });

    expect(result.carbsG).toBe(0);
    expect(result.proteinG).toBeGreaterThan(0);
  });

  it('uses the female BMR offset', () => {
    const male = mifflinV1({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      gender: 'male',
      activityLevel: 'sedentary',
      goal: 'maintenance',
    });
    const female = mifflinV1({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      gender: 'female',
      activityLevel: 'sedentary',
      goal: 'maintenance',
    });

    // BMR differs by 5 - (-161) = 166, scaled by the 1.2 sedentary multiplier
    expect(male.calories - female.calories).toBe(Math.round(166 * 1.2));
  });
});
