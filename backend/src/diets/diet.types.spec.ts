import { mealTargetsForCount, resolveMealOrder } from './diet.types';

describe('mealTargetsForCount', () => {
  it('gives every meal an equal share of the day calories', () => {
    const targets = mealTargetsForCount(4, {
      calories: 2000,
      proteinG: 150,
      carbsG: 200,
      fatG: 60,
    });
    expect(targets.map((t) => t.calories)).toEqual([500, 500, 500, 500]);
  });

  it('applies no carb-free tail and a normal decreasing taper at count 1-2', () => {
    const one = mealTargetsForCount(1, {
      calories: 2000,
      proteinG: 150,
      carbsG: 200,
      fatG: 60,
    });
    // Raw calorie-remainder protein would be 165g here, over the 150g day
    // target - the single meal absorbs the whole day, so it's rescaled
    // down to exactly the day target rather than exceeding it.
    expect(one).toHaveLength(1);
    expect(one[0].position).toBe(1);
    expect(one[0].calories).toBe(2000);
    expect(one[0].carbsG).toBe(200);
    expect(one[0].fatG).toBe(60);
    expect(one[0].carbEligible).toBe(true);
    expect(one[0].proteinG).toBeCloseTo(150);

    const two = mealTargetsForCount(2, {
      calories: 2000,
      proteinG: 150,
      carbsG: 200,
      fatG: 60,
    });
    expect(two.every((t) => t.carbEligible)).toBe(true);
    expect(two[0].carbsG).toBeGreaterThan(two[1].carbsG);
    expect(two[0].fatG).toBeGreaterThan(two[1].fatG);
    expect(two[0].carbsG + two[1].carbsG).toBeCloseTo(200);
    expect(two[0].fatG + two[1].fatG).toBeCloseTo(60);
  });

  it('makes the last meal carb-free at count 3, redistributing its share across the rest', () => {
    const targets = mealTargetsForCount(3, {
      calories: 1800,
      proteinG: 150,
      carbsG: 180,
      fatG: 60,
    });
    expect(targets[2].carbEligible).toBe(false);
    expect(targets[2].carbsG).toBe(0);
    expect(targets[2].fatG).toBe(0);

    // Taper weights 2:1 across the two eligible meals.
    expect(targets[0].carbsG).toBeCloseTo(120);
    expect(targets[1].carbsG).toBeCloseTo(60);
    expect(targets[0].carbsG).toBeGreaterThan(targets[1].carbsG);
    expect(targets[0].fatG).toBeGreaterThan(targets[1].fatG);

    const totalCarbs = targets.reduce((sum, t) => sum + t.carbsG, 0);
    const totalFat = targets.reduce((sum, t) => sum + t.fatG, 0);
    expect(totalCarbs).toBeCloseTo(180);
    expect(totalFat).toBeCloseTo(60);
  });

  it('makes the last two meals carb-free once count exceeds 3', () => {
    const targets = mealTargetsForCount(5, {
      calories: 2500,
      proteinG: 180,
      carbsG: 250,
      fatG: 70,
    });
    expect(targets.map((t) => t.carbEligible)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
    expect(targets[3].carbsG).toBe(0);
    expect(targets[3].fatG).toBe(0);
    expect(targets[4].carbsG).toBe(0);
    expect(targets[4].fatG).toBe(0);

    // Strictly decreasing across the 3 eligible meals.
    expect(targets[0].carbsG).toBeGreaterThan(targets[1].carbsG);
    expect(targets[1].carbsG).toBeGreaterThan(targets[2].carbsG);

    const totalCarbs = targets.reduce((sum, t) => sum + t.carbsG, 0);
    const totalFat = targets.reduce((sum, t) => sum + t.fatG, 0);
    expect(totalCarbs).toBeCloseTo(250);
    expect(totalFat).toBeCloseTo(70);
  });

  it('increases protein grams as carb/fat taper down, filling the remaining calorie share', () => {
    const targets = mealTargetsForCount(4, {
      calories: 2000,
      proteinG: 150,
      carbsG: 200,
      fatG: 60,
    });
    // Equal calories + decreasing carb/fat calories means protein must rise.
    for (let i = 1; i < targets.length; i++) {
      expect(targets[i].proteinG).toBeGreaterThanOrEqual(
        targets[i - 1].proteinG,
      );
    }
    expect(targets[3].proteinG).toBeGreaterThan(targets[0].proteinG);
  });

  it('never lets the day-level protein ceiling exceed the target, even when a steep taper drives an early meal negative before clamping', () => {
    // pos1's taper share of carbs/fat alone exceeds its equal calorie
    // share, driving its raw residual deeply negative before the 0-floor.
    const targets = mealTargetsForCount(10, {
      calories: 2000,
      proteinG: 150,
      carbsG: 200,
      fatG: 50,
    });
    const totalProtein = targets.reduce((sum, t) => sum + t.proteinG, 0);
    expect(totalProtein).toBeLessThanOrEqual(150 + 1e-9);
    expect(targets.every((t) => t.proteinG >= 0)).toBe(true);
    for (let i = 1; i < targets.length; i++) {
      expect(targets[i].proteinG).toBeGreaterThanOrEqual(
        targets[i - 1].proteinG - 1e-9,
      );
    }
  });
});

describe('resolveMealOrder', () => {
  it('falls back to ascending mealPosition order when there are no overrides', () => {
    expect(resolveMealOrder([3, 1, 2], [])).toEqual([1, 2, 3]);
  });

  it('sorts by displayOrder when a full override set is given', () => {
    expect(
      resolveMealOrder(
        [1, 2, 3],
        [
          { mealPosition: 1, displayOrder: 2 },
          { mealPosition: 2, displayOrder: 0 },
          { mealPosition: 3, displayOrder: 1 },
        ],
      ),
    ).toEqual([2, 3, 1]);
  });

  it('falls back to its own mealPosition for any position missing from a partial override set', () => {
    expect(
      resolveMealOrder([1, 2, 3], [{ mealPosition: 3, displayOrder: 0 }]),
    ).toEqual([3, 1, 2]);
  });
});
