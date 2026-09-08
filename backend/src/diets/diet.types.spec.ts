import { mealTargetsForCount, resolveMealOrder } from './diet.types';

describe('mealTargetsForCount', () => {
  it('prices each meal at what its own macros cost, together no more than the day target', () => {
    const totals = { calories: 2000, proteinG: 150, carbsG: 200, fatG: 60 };
    const targets = mealTargetsForCount(4, totals);

    targets.forEach((t) => {
      expect(t.calories).toBeCloseTo(
        t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9,
      );
    });
    const dayCalories = targets.reduce((sum, t) => sum + t.calories, 0);
    expect(dayCalories).toBeLessThanOrEqual(totals.calories);
    // Front-loaded carbs and fat make the early meals the bigger ones.
    expect(targets[0].calories).toBeGreaterThan(targets[3].calories);
  });

  it('scales the day back to the calorie target when the macro targets together cost more', () => {
    // 200*4 + 200*4 + 60*9 = 2140, over the 2000 calorie target.
    const targets = mealTargetsForCount(2, {
      calories: 2000,
      proteinG: 200,
      carbsG: 200,
      fatG: 60,
    });
    const dayCalories = targets.reduce((sum, t) => sum + t.calories, 0);
    expect(dayCalories).toBeCloseTo(2000);
  });

  it('splits protein equally across meals, summing to the day target', () => {
    const targets = mealTargetsForCount(4, {
      calories: 2000,
      proteinG: 150,
      carbsG: 200,
      fatG: 60,
    });
    targets.forEach((t) => expect(t.proteinG).toBeCloseTo(150 / 4));
    const totalProtein = targets.reduce((sum, t) => sum + t.proteinG, 0);
    expect(totalProtein).toBeCloseTo(150);
  });

  it('applies no carb-free tail and a normal decreasing taper at count 1-2', () => {
    const one = mealTargetsForCount(1, {
      calories: 2000,
      proteinG: 150,
      carbsG: 200,
      fatG: 60,
    });
    expect(one).toHaveLength(1);
    expect(one[0].position).toBe(1);
    expect(one[0].proteinG).toBeCloseTo(150);
    expect(one[0].carbsG).toBe(200);
    expect(one[0].fatG).toBe(60);
    expect(one[0].carbEligible).toBe(true);

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

    // Taper weights 2:1 across the two carb-eligible meals.
    expect(targets[0].carbsG).toBeCloseTo(120);
    expect(targets[1].carbsG).toBeCloseTo(60);

    // Fat tapers across every meal, so the tail keeps a small share of it.
    expect(targets[2].fatG).toBeGreaterThan(0);
    expect(targets[0].fatG).toBeGreaterThan(targets[1].fatG);
    expect(targets[1].fatG).toBeGreaterThan(targets[2].fatG);

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
    expect(targets[4].carbsG).toBe(0);

    // Strictly decreasing across the 3 carb-eligible meals.
    expect(targets[0].carbsG).toBeGreaterThan(targets[1].carbsG);
    expect(targets[1].carbsG).toBeGreaterThan(targets[2].carbsG);

    const totalCarbs = targets.reduce((sum, t) => sum + t.carbsG, 0);
    const totalFat = targets.reduce((sum, t) => sum + t.fatG, 0);
    expect(totalCarbs).toBeCloseTo(250);
    expect(totalFat).toBeCloseTo(70);
  });

  it('keeps every meal reachable even under a steep taper, with no negative or dropped macro share', () => {
    // pos1 carries 10/55ths of the day's carbs and fat here - under the old
    // equal-calorie split that alone cost more than the meal's whole share,
    // which is what drove its protein negative before clamping (ADR-019).
    const targets = mealTargetsForCount(10, {
      calories: 2000,
      proteinG: 150,
      carbsG: 200,
      fatG: 50,
    });
    expect(targets.every((t) => t.proteinG > 0)).toBe(true);
    expect(targets.reduce((sum, t) => sum + t.proteinG, 0)).toBeCloseTo(150);
    expect(targets.reduce((sum, t) => sum + t.carbsG, 0)).toBeCloseTo(200);
    expect(targets.reduce((sum, t) => sum + t.fatG, 0)).toBeCloseTo(50);
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
