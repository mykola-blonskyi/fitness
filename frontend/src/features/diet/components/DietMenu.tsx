'use client';

import { useTranslations } from 'next-intl';
import type { DietItemResponse, DietResponse } from '@features/diet/actions';
import { DietItemActions } from '@features/diet/components/DietItemActions';
import { RegenerateButton } from '@features/diet/components/RegenerateButton';

function groupByMealPosition(items: DietItemResponse[]) {
  const positions = [...new Set(items.map((item) => item.mealPosition))].sort(
    (a, b) => a - b,
  );
  return positions.map((position) => ({
    position,
    items: items
      .filter((item) => item.mealPosition === position)
      .sort((a, b) => a.orderIndex - b.orderIndex),
  }));
}

export function DietMenu({ diet }: { diet: DietResponse }) {
  const t = useTranslations('Diet');
  const groups = groupByMealPosition(diet.items);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <p className="text-4xl font-semibold">
          {diet.totalCalories}{' '}
          <span className="text-lg font-normal text-zinc-500">
            {t('perDay')}
          </span>
        </p>
        <p className="text-sm text-zinc-500">
          {t('macroSummary', {
            protein: diet.totalProtein,
            carbs: diet.totalCarbs,
            fat: diet.totalFat,
          })}
        </p>
      </div>

      {groups.map((group) => (
        <section key={group.position} className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            {t('mealPosition', { position: group.position })}
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
                    {t('itemSummary', {
                      weight: item.weightGrams,
                      calories: item.calories,
                      protein: item.proteinG,
                      carbs: item.carbsG,
                      fat: item.fatG,
                    })}
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
