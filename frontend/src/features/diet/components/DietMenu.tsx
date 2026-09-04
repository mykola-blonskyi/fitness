'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { moveDietMeal } from '@features/diet/actions';
import type { DietItemResponse, DietResponse } from '@features/diet/actions';
import { DietItemActions } from '@features/diet/components/DietItemActions';
import { RegenerateButton } from '@features/diet/components/RegenerateButton';

// Grouped and labeled by mealPosition (the generation slot driving each
// meal's macro taper - ADR-016) so "Meal N" always names the same taper
// share; only the groups' rendering order follows mealOrder (ADR-017).
function groupByMealPosition(items: DietItemResponse[], mealOrder: number[]) {
  const displayIndex = new Map(mealOrder.map((position, i) => [position, i]));
  const positions = [...new Set(items.map((item) => item.mealPosition))];
  return positions
    .map((position) => ({
      position,
      items: items
        .filter((item) => item.mealPosition === position)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    }))
    .sort(
      (a, b) =>
        (displayIndex.get(a.position) ?? a.position) -
        (displayIndex.get(b.position) ?? b.position),
    );
}

export function DietMenu({ diet }: { diet: DietResponse }) {
  const t = useTranslations('Diet');
  const router = useRouter();
  const groups = groupByMealPosition(diet.items, diet.mealOrder);
  const [movingPosition, setMovingPosition] = useState<number | undefined>();

  async function onMove(mealPosition: number, direction: 'up' | 'down') {
    setMovingPosition(mealPosition);
    await moveDietMeal(diet.id, mealPosition, direction);
    router.refresh();
    setMovingPosition(undefined);
  }

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

      {groups.map((group, index) => (
        <section key={group.position} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              {t('mealPosition', { position: group.position })}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onMove(group.position, 'up')}
                disabled={index === 0 || movingPosition !== undefined}
                aria-label={t('mealActions.moveUp', {
                  position: group.position,
                })}
                className="flex size-11 items-center justify-center rounded border border-zinc-300 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                &uarr;
              </button>
              <button
                type="button"
                onClick={() => onMove(group.position, 'down')}
                disabled={
                  index === groups.length - 1 || movingPosition !== undefined
                }
                aria-label={t('mealActions.moveDown', {
                  position: group.position,
                })}
                className="flex size-11 items-center justify-center rounded border border-zinc-300 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                &darr;
              </button>
            </div>
          </div>
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
