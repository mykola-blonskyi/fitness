import type { DietItemResponse, DietResponse } from '@features/diet/actions';
import { DietItemActions } from '@features/diet/components/DietItemActions';
import { RegenerateButton } from '@features/diet/components/RegenerateButton';
import {
  MEAL_TYPE_LABELS as MEAL_LABELS,
  MEAL_TYPE_ORDER as MEAL_ORDER,
} from '@shared/types/meal';

// A mealCount past 4 repeats mealTypes as later occurrences (ADR-015) -
// group by (mealType, occurrence) rather than mealType alone so those
// repeats render as separate sections instead of merging together.
function groupByMealSlot(items: DietItemResponse[]) {
  const maxOccurrence = new Map<(typeof MEAL_ORDER)[number], number>();
  for (const item of items) {
    const mealType = item.mealType as (typeof MEAL_ORDER)[number];
    maxOccurrence.set(
      mealType,
      Math.max(maxOccurrence.get(mealType) ?? 0, item.mealOccurrence),
    );
  }

  const groups: {
    mealType: (typeof MEAL_ORDER)[number];
    occurrence: number;
    items: DietItemResponse[];
  }[] = [];
  for (const mealType of MEAL_ORDER) {
    const occurrences = maxOccurrence.get(mealType) ?? 0;
    for (let occurrence = 1; occurrence <= occurrences; occurrence++) {
      groups.push({
        mealType,
        occurrence,
        items: items
          .filter(
            (item) =>
              item.mealType === mealType && item.mealOccurrence === occurrence,
          )
          .sort((a, b) => a.orderIndex - b.orderIndex),
      });
    }
  }
  return groups.filter((group) => group.items.length > 0);
}

export function DietMenu({ diet }: { diet: DietResponse }) {
  const groups = groupByMealSlot(diet.items);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <p className="text-4xl font-semibold">
          {diet.totalCalories}{' '}
          <span className="text-lg font-normal text-zinc-500">kcal / day</span>
        </p>
        <p className="text-sm text-zinc-500">
          {diet.totalProtein}g protein · {diet.totalCarbs}g carbs ·{' '}
          {diet.totalFat}g fat
        </p>
      </div>

      {groups.map((group) => (
        <section
          key={`${group.mealType}-${group.occurrence}`}
          className="flex flex-col gap-3"
        >
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            {MEAL_LABELS[group.mealType]}
            {group.occurrence > 1 ? ` ${group.occurrence}` : ''}
          </h2>
          <ul className="flex flex-col gap-2">
            {group.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{item.foodItem.name}</span>
                  <span className="text-sm text-zinc-500">
                    {item.weightGrams} g · {item.calories} kcal ·{' '}
                    {item.proteinG}P / {item.carbsG}C / {item.fatG}F
                  </span>
                </div>
                <DietItemActions
                  dietId={diet.id}
                  itemId={item.id}
                  foodItemId={item.foodItem.id}
                  role={item.foodItem.role}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <RegenerateButton />
    </div>
  );
}
