'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { moveDietMeal, reorderDietMeals } from '@features/diet/actions';
import type { DietItemResponse, DietResponse } from '@features/diet/actions';
import { DietItemActions } from '@features/diet/components/DietItemActions';
import { RegenerateButton } from '@features/diet/components/RegenerateButton';
import { ArrowDownIcon, ArrowUpIcon } from '@shared/ui/icons';

function arraysEqual(a: number[], b: number[]) {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

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
  const [movingPosition, setMovingPosition] = useState<number | undefined>();

  // Local, optimistic copy of mealOrder so a drag can reflow the list live
  // as the pointer moves over other sections, without waiting on a round
  // trip per position crossed. Resynced during render (not an effect, to
  // avoid a cascading re-render) whenever the diet prop itself changes -
  // i.e. once the server confirms a drop and router.refresh() lands a new
  // diet.mealOrder, or on a freshly generated diet.
  const [renderedDiet, setRenderedDiet] = useState(diet);
  const [order, setOrder] = useState(diet.mealOrder);
  if (diet !== renderedDiet) {
    setRenderedDiet(diet);
    setOrder(diet.mealOrder);
  }

  const [draggingPosition, setDraggingPosition] = useState<
    number | undefined
  >();
  const sectionRefs = useRef(new Map<number, HTMLElement>());

  const groups = groupByMealPosition(diet.items, order);
  const interactionsDisabled =
    movingPosition !== undefined || draggingPosition !== undefined;
  const hasFreeFoods = diet.items.some((item) => !item.isCounted);

  async function onMove(mealPosition: number, direction: 'up' | 'down') {
    setMovingPosition(mealPosition);
    await moveDietMeal(diet.id, mealPosition, direction);
    router.refresh();
    setMovingPosition(undefined);
  }

  function onDragHandlePointerDown(
    event: React.PointerEvent<HTMLDivElement>,
    mealPosition: number,
  ) {
    if (interactionsDisabled) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingPosition(mealPosition);
  }

  // Pointer capture keeps every subsequent event routed to the handle that
  // started the drag, regardless of what the pointer is visually over - so
  // hit-testing here is done by comparing clientY against each section's
  // own layout rect rather than relying on the event target.
  function onDragHandlePointerMove(event: React.PointerEvent) {
    if (draggingPosition === undefined) return;
    let closestPosition = draggingPosition;
    let closestDistance = Infinity;
    for (const [position, element] of sectionRefs.current) {
      const rect = element.getBoundingClientRect();
      const distance = Math.abs(event.clientY - (rect.top + rect.height / 2));
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPosition = position;
      }
    }
    if (closestPosition === draggingPosition) return;
    setOrder((current) => {
      const from = current.indexOf(draggingPosition);
      const to = current.indexOf(closestPosition);
      if (from === -1 || to === -1) return current;
      const next = [...current];
      next.splice(from, 1);
      next.splice(to, 0, draggingPosition);
      return next;
    });
  }

  async function onDragHandlePointerUp() {
    if (draggingPosition === undefined) return;
    setDraggingPosition(undefined);
    if (!arraysEqual(order, diet.mealOrder)) {
      await reorderDietMeals(diet.id, order);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line-soft pb-4">
        <div className="flex flex-col">
          <span className="kicker">{t('plannedLabel')}</span>
          <p className="font-display text-3xl font-extrabold tabular-nums tracking-tight">
            {diet.totalCalories}{' '}
            <span className="text-sm font-medium text-muted">
              {t('perDay')}
            </span>
          </p>
        </div>
        <p className="text-xs text-muted">
          {t('macroSummary', {
            protein: diet.totalProtein,
            carbs: diet.totalCarbs,
            fat: diet.totalFat,
          })}
        </p>
      </div>

      {hasFreeFoods && (
        <p className="text-xs text-muted">{t('freeFood.dayNote')}</p>
      )}

      {groups.map((group, index) => (
        <section
          key={group.position}
          ref={(element) => {
            if (element) sectionRefs.current.set(group.position, element);
            else sectionRefs.current.delete(group.position);
          }}
          className={`flex flex-col gap-3 motion-safe:transition-opacity motion-safe:duration-150 ${
            draggingPosition === group.position ? 'opacity-60' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Pointer-only affordance, not a keyboard control - the
                  up/down buttons are the real accessible reorder path (AC
                  requires them to stay available), so this is hidden from
                  assistive tech rather than exposed as a button that would
                  do nothing on Enter/Space. */}
              <div
                onPointerDown={(event) =>
                  onDragHandlePointerDown(event, group.position)
                }
                onPointerMove={onDragHandlePointerMove}
                onPointerUp={onDragHandlePointerUp}
                onPointerCancel={onDragHandlePointerUp}
                aria-hidden="true"
                title={t('mealActions.dragHandle', {
                  position: group.position,
                })}
                className={`flex size-11 shrink-0 touch-none items-center justify-center rounded text-muted transition-colors ${
                  movingPosition !== undefined
                    ? 'pointer-events-none opacity-30'
                    : 'cursor-grab hover:bg-hover active:cursor-grabbing'
                }`}
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-4"
                  aria-hidden="true"
                >
                  <circle cx="7" cy="4" r="1.5" />
                  <circle cx="13" cy="4" r="1.5" />
                  <circle cx="7" cy="10" r="1.5" />
                  <circle cx="13" cy="10" r="1.5" />
                  <circle cx="7" cy="16" r="1.5" />
                  <circle cx="13" cy="16" r="1.5" />
                </svg>
              </div>
              <h2 className="kicker">
                {t('mealPosition', { position: group.position })}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onMove(group.position, 'up')}
                disabled={index === 0 || interactionsDisabled}
                aria-label={t('mealActions.moveUp', {
                  position: group.position,
                })}
                className="btn-ghost size-11 !px-0 disabled:pointer-events-none disabled:opacity-30"
              >
                <ArrowUpIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => onMove(group.position, 'down')}
                disabled={index === groups.length - 1 || interactionsDisabled}
                aria-label={t('mealActions.moveDown', {
                  position: group.position,
                })}
                className="btn-ghost size-11 !px-0 disabled:pointer-events-none disabled:opacity-30"
              >
                <ArrowDownIcon className="size-4" />
              </button>
            </div>
          </div>
          <ul className="flex flex-col gap-2">
            {group.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-ctl border border-line-soft bg-surface-2 px-3 py-2.5"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {item.foodItem.name}
                    {!item.isCounted && (
                      <span className="rounded-full bg-hover px-2 py-0.5 text-[11px] font-bold text-muted">
                        {t('freeFood.badge')}
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-muted">
                    {item.isCounted
                      ? t('itemSummary', {
                          weight: item.weightGrams,
                          calories: item.calories,
                          protein: item.proteinG,
                          carbs: item.carbsG,
                          fat: item.fatG,
                        })
                      : t('freeFood.itemSummary', {
                          weight: item.weightGrams,
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
